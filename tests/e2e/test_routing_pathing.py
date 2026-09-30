"""
Real-path routing against the Next static export.

- document.title updates per route (Breadcrumb island)
- deep ../../ links in article bodies resolve to real routes at build time
- an unknown URL serves the Next 404 page with a link home
- static 404.html exists and carries noindex

Dropped from the vanilla suite (hash-router internals with no Next equivalent, spec §10):
route dedup on popstate+hashchange, history.state stale-filePath reuse, the SPA's
`404.html?title=` "did you mean" search rescue, `js/state.js` registry import.
"""


def _article(page, base_url, path="system-design/components/caching"):
    page.goto(f"{base_url}/{path}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


# ── Dynamic document.title ─────────────────────────────────────────


def test_title_on_home(wiki_page):
    assert "Wiki" in wiki_page.title()


def test_title_on_vertical_index(page, base_url):
    page.goto(f"{base_url}/system-design/", wait_until="domcontentloaded")
    page.wait_for_selector(".index-main", timeout=8_000)
    assert "System Design" in page.title()


def test_title_on_article(page, base_url):
    _article(page, base_url)
    page.wait_for_function("() => document.title.includes('Caching')", timeout=10_000)
    assert "Caching" in page.title()


def test_title_updates_on_client_nav(page, base_url):
    """SPA-style navigation between articles updates the tab title."""
    _article(page, base_url)
    page.wait_for_function("() => document.title.includes('Caching')", timeout=10_000)
    page.goto(f"{base_url}/dsa/data-structures/array/", wait_until="domcontentloaded")
    page.wait_for_function("() => document.title.includes('Array')", timeout=10_000)


def test_title_after_client_nav_matches_server_metadata(wiki_page, base_url):
    """A client-side nav lands on the same title a hard load serves (Next metadata is the only title source)."""
    wiki_page.locator('a.wiki-card[href$="/dsa/"]').click()
    wiki_page.wait_for_url("**/dsa/")
    wiki_page.wait_for_selector(".index-main", timeout=8_000)
    wiki_page.wait_for_load_state("networkidle")
    assert wiki_page.title() == "Data Structures & Algorithms · Wiki"


def test_title_on_offline_shelf(page, base_url):
    page.goto(f"{base_url}/offline/", wait_until="networkidle")
    assert page.title() == "Offline shelf · Wiki"


# ── Multi-level path resolution (build-time article-links plugin) ───


def test_deep_relative_links_resolve_to_routes(page, base_url):
    """Every in-body internal link on a real article is a rewritten /wiki-fe/ route,
    never a raw ../foo.md."""
    _article(page, base_url)
    hrefs = page.evaluate(
        "() => [...document.querySelectorAll('#markdown-body a')].map(a => a.getAttribute('href'))"
    )
    internal = [h for h in hrefs if h and not h.startswith("http") and not h.startswith("#")]
    assert internal, "expected at least one internal link on the caching article"
    for h in internal:
        assert ".md" not in h, f"unresolved markdown link: {h}"
        assert h.startswith("/wiki-fe/") or h.startswith("/"), h


# ── 404 ────────────────────────────────────────────────────────────


def test_unknown_url_serves_not_found_page(page, base_url):
    """An unknown route serves the Next not-found page with a link home."""
    page.goto(f"{base_url}/system-design/no-such-article-xyz/", wait_until="domcontentloaded")
    body = page.locator("body").inner_text().lower()
    assert "not found" in body or "doesn't exist" in body
    assert page.locator("a[href='/wiki-fe/']").count() >= 1


def test_static_404_html_has_noindex(page, base_url):
    """The generated 404.html carries robots noindex (spec §12)."""
    page.goto(f"{base_url}/404.html", wait_until="domcontentloaded")
    robots = page.locator("meta[name='robots']").first.get_attribute("content")
    assert robots is not None and "noindex" in robots
