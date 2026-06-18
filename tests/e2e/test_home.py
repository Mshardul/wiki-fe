"""
- search button on home view
- article count defaults to 0, not ellipsis
"""


def test_search_button_visible_on_home(wiki_page):
    """search button present and visible in home topbar."""
    btn = wiki_page.locator('.home-topbar button[title="Search all (⌘K)"]')
    assert btn.is_visible()


def test_search_button_opens_modal(wiki_page):
    """clicking search button opens global search modal."""
    wiki_page.locator('.home-topbar button[title="Search all (⌘K)"]').click()
    modal = wiki_page.locator("#global-search-modal")
    assert not modal.get_attribute("class").__contains__("hidden")


def test_article_count_never_ellipsis(wiki_page):
    """wiki card count shows '0 articles' before async load, never '… articles'."""
    count_el = wiki_page.locator(".wiki-card-count").first
    text = count_el.inner_text()
    assert "…" not in text
    assert "articles" in text


def test_article_count_updates_to_nonzero(wiki_page):
    """article count eventually resolves to a real number."""
    count_el = wiki_page.locator(".wiki-card-count").first
    wiki_page.wait_for_function(
        "() => !document.querySelector('.wiki-card-count').textContent.includes('0 articles')",
        timeout=10_000,
    )
    text = count_el.inner_text()
    assert "articles" in text
    assert "0 articles" not in text


def test_theme_applied_before_module_js_loads(page, base_url):
    """inline head script sets data-theme before app.js module executes."""
    page.goto(f"{base_url}/")
    page.wait_for_load_state("networkidle")
    page.evaluate(
        """() => localStorage.setItem('wiki-settings',
        JSON.stringify({backgroundId:'light-white',textColorId:'text-crisp-light',
        accentId:'indigo',font:'Inter',fontSize:'M',contentWidth:'Default'}))"""
    )
    # DOMContentLoaded fires after inline scripts but before ES modules
    page.goto(f"{base_url}/")
    page.wait_for_load_state("domcontentloaded")
    theme = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    assert theme == "light", (
        f"Expected 'light' at DOMContentLoaded (before module JS), got '{theme}'"
    )


def test_active_wiki_card_marked_after_navigation(page, base_url):
    """returning home after visiting a wiki marks that wiki's card .active."""
    page.goto(f"{base_url}/")
    page.wait_for_load_state("networkidle")

    first_card = page.locator(".wiki-card").first
    wiki_id = first_card.get_attribute("data-wiki-id")
    first_card.click()
    page.wait_for_selector("#view-index.active", timeout=8_000)

    page.locator(".back-btn").first.click()
    page.wait_for_selector("#view-home.active", timeout=5_000)

    assert page.evaluate(
        f"() => document.querySelector('[data-wiki-id=\"{wiki_id}\"]')"
        f".classList.contains('active')"
    )


def test_no_active_card_on_fresh_load(page, base_url):
    """on first load with no prior navigation, no wiki card is marked active."""
    page.goto(f"{base_url}/")
    page.wait_for_load_state("networkidle")
    active_count = page.locator(".wiki-card.active").count()
    assert active_count == 0


# ── PWA manifest  ────────────────────────────────────────────────


def test_manifest_link_present(page, base_url):
    """index.html links a web app manifest."""
    page.goto(f"{base_url}/")
    page.wait_for_load_state("domcontentloaded")
    href = page.locator("link[rel='manifest']").first.get_attribute("href")
    assert href and href.endswith("manifest.json")


def test_icon_and_theme_color_present(page, base_url):
    """PWA icon links and theme-color meta are present for install."""
    page.goto(f"{base_url}/")
    page.wait_for_load_state("domcontentloaded")
    assert page.locator("link[rel='icon']").count() >= 1
    assert page.locator("link[rel='apple-touch-icon']").count() == 1
    theme = page.locator("meta[name='theme-color']").first.get_attribute("content")
    assert theme and theme.startswith("#")


def test_manifest_is_valid_and_installable(page, base_url):
    """manifest.json parses and carries the fields a browser needs to offer install."""
    page.goto(f"{base_url}/")
    manifest = page.evaluate(
        """async () => {
            const href = document.querySelector("link[rel='manifest']").getAttribute('href');
            const res = await fetch(href);
            return res.ok ? await res.json() : null;
        }"""
    )
    assert manifest is not None, "manifest.json must be fetchable"
    assert manifest.get("name"), "manifest needs a name"
    assert manifest.get("start_url"), "manifest needs a start_url"
    assert manifest.get("display") == "standalone"
    assert manifest.get("icons"), "manifest needs at least one icon"
