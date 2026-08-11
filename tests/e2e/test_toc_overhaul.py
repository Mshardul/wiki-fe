"""
TOC overhaul tests
"""


def _go_to_article(page, base_url, slug="system-design/caching"):
    page.goto(f"{base_url}/#{slug}", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )


# ── Storage helpers (tested indirectly via later tasks) ──────────────

def test_toggle_collapse_helper_exposed(page, base_url):
    """toggleCollapse side-effect: collapsing a TOC H2 group writes to localStorage."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)
    group = page.locator(".toc-h2-group").first
    h2_id = group.get_attribute("data-h2-id")
    page.locator(".toc-group-chevron").first.click()
    key = page.evaluate(
        """(h2Id) => {
            const wikiId = state.currentWikiId;
            const slugBase = (state.currentFilePath || '').replace(/\\//g, '-');
            return `wiki-heading-collapsed-${wikiId}-${slugBase}-${h2Id}`;
        }""",
        h2_id,
    )
    value = page.evaluate("(k) => localStorage.getItem(k)", key)
    assert value == "1", f"toggleCollapse must write '1' to localStorage[{key!r}]"


# ── H2 grouping ───────────────────────────────────────────────────────

def test_toc_h2_groups_exist(page, base_url):
    """buildTOC wraps H3 items in .toc-h2-group containers."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)
    page.wait_for_selector("#toc-nav .toc-item", timeout=5_000)

    groups = page.locator(".toc-h2-group").count()
    assert groups > 0, "Expected at least one .toc-h2-group in TOC"


def test_toc_group_chevron_exists(page, base_url):
    """Each H2 row in TOC has a .toc-group-chevron button."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)
    page.wait_for_selector("#toc-nav .toc-item", timeout=5_000)

    chevrons = page.locator(".toc-group-chevron").count()
    h2s = page.locator("#toc-nav .toc-h2").count()
    assert chevrons == h2s, f"Expected {h2s} chevrons, got {chevrons}"


def test_toc_h3_collapses_under_h2(page, base_url):
    """Clicking H2 chevron hides H3 children in that group."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)
    page.wait_for_selector(".toc-group-chevron", timeout=5_000)

    group = page.locator(".toc-h2-group").first
    h3_count = group.locator(".toc-h3").count()
    if h3_count == 0:
        return  # article has no H3s under first H2; skip

    page.locator(".toc-group-chevron").first.click()
    page.wait_for_function(
        "() => document.querySelector('.toc-h2-group.section--collapsed') !== null",
        timeout=2_000,
    )
    h3_visible = group.locator(".toc-h3").first.is_visible()
    assert not h3_visible, "H3 items must be hidden when H2 group is collapsed"


def test_toc_h2_group_collapse_persists(page, base_url):
    """Collapsing an H2 group saves state to the shared heading-collapse key."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)
    page.wait_for_selector(".toc-group-chevron", timeout=5_000)

    group = page.locator(".toc-h2-group").first
    h2_id = group.get_attribute("data-h2-id")
    page.locator(".toc-group-chevron").first.click()

    key = page.evaluate(
        """(h2Id) => {
            const wikiId = state.currentWikiId;
            const slugBase = (state.currentFilePath || '').replace(/\\//g, '-');
            return `wiki-heading-collapsed-${wikiId}-${slugBase}-${h2Id}`;
        }""",
        h2_id,
    )
    value = page.evaluate("(k) => localStorage.getItem(k)", key)
    assert value == "1", f"localStorage[{key!r}] must be '1' after collapse"


def test_toc_and_content_collapse_share_one_storage_key(page, base_url):
    """TOC chevron and in-content collapse button read/write the same key (reload-safe)."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)
    page.wait_for_selector(".toc-group-chevron", timeout=5_000)
    page.wait_for_selector(".heading-collapse-btn", timeout=5_000)

    page.locator(".toc-group-chevron").first.click()
    keys = page.evaluate("""() => {
        const out = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('wiki-heading-collapsed-') || k.startsWith('wiki-toc-h2-'))) {
                out.push([k, localStorage.getItem(k)]);
            }
        }
        return out;
    }""")
    heading_keys = [k for k, v in keys if k.startswith("wiki-heading-collapsed-") and v == "1"]
    toc_keys = [k for k, _ in keys if k.startswith("wiki-toc-h2-")]
    assert len(heading_keys) >= 1, f"expected shared wiki-heading-collapsed-* key, got {keys}"
    assert toc_keys == [], f"legacy wiki-toc-h2-* keys must not be written, got {toc_keys}"

    # Reload: both TOC group and content h2 restore collapsed from the same key
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector(".toc-h2-group", timeout=8_000)
    page.wait_for_selector("#markdown-body h2", timeout=8_000)
    both = page.evaluate("""() => {
        const group = document.querySelector('.toc-h2-group');
        const h2 = document.querySelector('#markdown-body h2');
        return {
            toc: !!(group && group.classList.contains('section--collapsed')),
            content: !!(h2 && h2.classList.contains('section--collapsed')),
        };
    }""")
    assert both["toc"] and both["content"], f"both controls must restore collapsed after reload: {both}"


# ── Breathing TOC states ─────────────────────────────────────────────

def test_toc_current_class_applied(page, base_url):
    """Scrolling into a section marks the corresponding TOC item .toc-current."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)
    page.wait_for_selector("#toc-nav .toc-item", timeout=5_000)

    page.evaluate("""() => {
        const h2 = document.querySelector('#markdown-body h2');
        if (h2) h2.scrollIntoView({ behavior: 'instant' });
    }""")
    page.wait_for_function(
        "() => document.querySelectorAll('#toc-nav .toc-current').length >= 1",
        timeout=5_000,
    )

    current_count = page.locator("#toc-nav .toc-current").count()
    assert current_count >= 1, "Expected at least one .toc-current item after scrolling"


def test_toc_passed_class_applied_after_scroll(page, base_url):
    """Headings scrolled past get .toc-passed class."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)
    page.wait_for_selector("#toc-nav .toc-item", timeout=5_000)

    h2_count = page.locator("#toc-nav .toc-h2").count()
    if h2_count < 2:
        return  # need at least 2 H2s to have a passed one

    page.evaluate("""() => {
        const h2s = document.querySelectorAll('#markdown-body h2');
        if (h2s[1]) h2s[1].scrollIntoView({ behavior: 'instant' });
    }""")
    page.wait_for_function(
        "() => document.querySelectorAll('#toc-nav .toc-passed').length >= 1",
        timeout=5_000,
    )

    passed_count = page.locator("#toc-nav .toc-passed").count()
    assert passed_count >= 1, "Expected at least one .toc-passed item after scrolling past first H2"


# ── Per-heading collapse on content page ──────────────────────────────

def test_heading_collapse_btn_exists(page, base_url):
    """Each H2 in article body has a .heading-collapse-btn."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)

    h2_count = page.locator("#markdown-body h2").count()
    btn_count = page.locator("#markdown-body .heading-collapse-btn").count()
    assert btn_count == h2_count, (
        f"Expected {h2_count} collapse buttons (one per H2), got {btn_count}"
    )


def test_heading_body_collapses_on_click(page, base_url):
    """Clicking the collapse button on an H2 hides its body content."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)

    h2_count = page.locator("#markdown-body h2").count()
    if h2_count == 0:
        return

    page.locator(".heading-collapse-btn").first.click()
    page.wait_for_function(
        "() => document.querySelector('#markdown-body h2.section--collapsed') !== null",
        timeout=2_000,
    )
    collapsed = page.locator("#markdown-body h2.section--collapsed").count()
    assert collapsed >= 1, "Expected at least one collapsed H2"


def test_heading_collapse_persists_after_reload(page, base_url):
    """Collapsing an H2 section persists to localStorage and survives a page reload."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)

    if page.locator("#markdown-body h2").count() == 0:
        return

    page.locator(".heading-collapse-btn").first.click()
    page.wait_for_function(
        "() => document.querySelector('#markdown-body h2.section--collapsed') !== null",
        timeout=2_000,
    )

    page.reload()
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )


# ── TOC/Notes rail 70/30 split ──────────────────────────────────────


def test_toc_nav_capped_at_70_percent_of_rail(page, base_url):
    """A long article's TOC fills up to ~70% of the rail height, leaving room for Notes below."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)
    page.wait_for_selector("#toc-nav .toc-item", timeout=5_000)

    metrics = page.evaluate("""() => {
        const sidebar = document.getElementById('toc-sidebar');
        const nav = document.getElementById('toc-nav');
        return {
            sidebarHeight: sidebar.getBoundingClientRect().height,
            navHeight: nav.getBoundingClientRect().height,
            overflows: nav.scrollHeight > nav.clientHeight,
        };
    }""")
    ratio = metrics["navHeight"] / metrics["sidebarHeight"]
    assert 0.65 <= ratio <= 0.75, f"TOC nav took {ratio:.2f} of the rail, expected ~0.70"
    assert metrics["overflows"], "TOC nav should scroll internally once capped, not overflow the rail"


def test_notes_fills_remaining_space_when_toc_is_short(page, base_url):
    """A short article's TOC doesn't stretch to fill the rail - Notes gets the remainder."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url, slug="system-design/cdn")
    page.evaluate("() => localStorage.removeItem(`wiki-notes-collapsed-${state.currentWikiId}`)")
    page.reload()
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )
    page.wait_for_selector("#toc-nav .toc-item", timeout=5_000)

    metrics = page.evaluate("""() => {
        const nav = document.getElementById('toc-nav');
        const notes = document.getElementById('notes-scratchpad');
        return {
            navFitsContent: nav.scrollHeight <= nav.clientHeight + 1,
            notesHeight: notes.getBoundingClientRect().height,
        };
    }""")
    assert metrics["navFitsContent"], "Short TOC should not be stretched to fill unused rail space"
    assert metrics["notesHeight"] > 80, "Notes should expand into the space the short TOC left unused"


def test_empty_heading_id_gets_stable_id_for_toc_sync(page, base_url):
    """Headings that arrive without an id still sync TOC chevron ↔ content collapse."""
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.wait_for_function("() => typeof window.navigateToContent === 'function'", timeout=8_000)
    content = "# Empty Id\n\n<h2>Raw heading without id</h2>\n\nBody under heading.\n"
    page.route("**/empty-id-sync.md", lambda r: r.fulfill(body=content))
    page.evaluate("""() => navigateToContent(
        'system-design',
        encodeURIComponent('../content/system-design/empty-id-sync.md'),
        encodeURIComponent('Empty Id'),
        'empty-id-sync'
    )""")
    page.wait_for_selector("#markdown-body[data-render-done]", timeout=8_000)
    page.wait_for_selector(".toc-group-chevron", timeout=5_000)

    ids = page.evaluate("""() => {
        const h2 = [...document.querySelectorAll('#markdown-body h2')]
            .find(h => h.textContent.includes('Raw heading'));
        const group = document.querySelector(`.toc-h2-group[data-h2-id="${h2?.id}"]`);
        return {
            h2Id: h2?.id || '',
            sectionId: h2?.dataset.sectionId || '',
            hasGroup: !!group,
        };
    }""")
    assert ids["h2Id"], f"expected stable id assigned to raw h2, got {ids!r}"
    assert ids["h2Id"] == ids["sectionId"], f"sectionId must match id, got {ids!r}"
    assert ids["hasGroup"], f"TOC group missing for assigned id, got {ids!r}"

    page.locator(f'.toc-h2-group[data-h2-id="{ids["h2Id"]}"] .toc-group-chevron').click()
    synced = page.evaluate(
        """(id) => {
            const h2 = document.querySelector(`#markdown-body h2[data-section-id="${id}"]`);
            return !!(h2 && h2.classList.contains('section--collapsed'));
        }""",
        ids["h2Id"],
    )
    assert synced, "TOC chevron must collapse the matching content h2"
