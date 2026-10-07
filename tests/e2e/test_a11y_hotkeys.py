def _go_to_article(page, base_url, slug="system-design/components/caching"):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def _open_search(page):
    page.keyboard.press("Meta+k")
    page.wait_for_selector('[role="dialog"][aria-label="Search"]', timeout=5_000)


# ── Focus trap listener leak ─────────────────────────────────────


def test_focus_trap_survives_rapid_reopen(wiki_page):
    for _ in range(5):
        wiki_page.keyboard.press("Meta+k")
        wiki_page.wait_for_selector('[role="dialog"][aria-label="Search"]')

    wiki_page.fill(".gsearch-input", "caching")
    wiki_page.wait_for_selector(".gsearch-result", timeout=8_000)

    wiki_page.focus(".gsearch-input")
    wiki_page.keyboard.press("Tab")
    focused_outside = wiki_page.evaluate("""() => {
        const modal = document.querySelector('[role="dialog"][aria-label="Search"]');
        return !modal.contains(document.activeElement);
    }""")
    assert not focused_outside, "Focus escaped modal after rapid ⌘K re-open"


def test_wiki_switcher_traps_focus(page, base_url):
    _go_to_article(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector('[role="dialog"][aria-label="Switch wiki"]', timeout=5_000)

    page.evaluate("""() => {
        const modal = document.querySelector('[role="dialog"][aria-label="Switch wiki"]');
        const focusable = [...modal.querySelectorAll('button:not([disabled]), a[href]')];
        focusable[focusable.length - 1].focus();
    }""")
    page.keyboard.press("Tab")
    focused_outside = page.evaluate("""() => {
        const modal = document.querySelector('[role="dialog"][aria-label="Switch wiki"]');
        return !modal.contains(document.activeElement);
    }""")
    assert not focused_outside, "Focus trap missing on wiki switcher modal"


# ── aria-label on copy button ─────────────────────────────────────


def test_copy_button_has_aria_label(page, base_url):
    _go_to_article(page, base_url)
    page.wait_for_selector(".copy-btn", timeout=5_000)

    missing = page.evaluate("""() => {
        const btns = [...document.querySelectorAll('.copy-btn')];
        return btns.filter(b => !b.getAttribute('aria-label')).length;
    }""")
    assert missing == 0, f"{missing} copy button(s) missing aria-label"


# ── T hotkey focuses TOC ────────────────────────────────────────


def test_t_hotkey_focuses_first_toc_item(page, base_url):
    _go_to_article(page, base_url)
    page.wait_for_selector("#toc-nav .toc-item", timeout=5_000)

    page.keyboard.press("t")

    focused_toc = page.evaluate("""() => {
        const first = document.querySelector('#toc-nav .toc-item');
        return first && first === document.activeElement;
    }""")
    assert focused_toc, "First TOC item did not receive focus after pressing T"


def test_t_hotkey_uppercase(page, base_url):
    _go_to_article(page, base_url)
    page.wait_for_selector("#toc-nav .toc-item", timeout=5_000)

    page.keyboard.press("Shift+T")

    focused_toc = page.evaluate("""() => {
        const first = document.querySelector('#toc-nav .toc-item');
        return first && first === document.activeElement;
    }""")
    assert focused_toc, (
        "First TOC item did not receive focus after pressing Shift+T"
    )


# ── Scroll position saved on scroll ─────────────────────────────


def test_scroll_position_saved_to_local_storage(page, base_url):
    _go_to_article(page, base_url)

    page.evaluate("""() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({ top: Math.floor(max * 0.5), behavior: 'instant' });
    }""")
    page.wait_for_function(
        """() => Object.keys(localStorage).some(k => k.startsWith('wiki-toc-scroll-article-'))""",
        timeout=5_000,
    )
    saved_y = page.evaluate("() => window.scrollY")
    assert saved_y > 0, "Could not scroll article (content may be too short)"


# ── Missing aria on interactive elements ────────────────────────────


def test_search_dialog_has_aria_modal(wiki_page):
    _open_search(wiki_page)
    dialog = wiki_page.locator(".gsearch-dialog")
    assert dialog.get_attribute("role") == "dialog"
    assert dialog.get_attribute("aria-modal") == "true"


def test_breadcrumb_nav_has_aria_label(page, base_url):
    page.goto(f"{base_url}/system-design/", wait_until="domcontentloaded")
    page.wait_for_selector(".index-main", timeout=10_000)
    assert page.locator(".breadcrumb").get_attribute("aria-label") == "Breadcrumb"

    _go_to_article(page, base_url)
    assert page.locator(".breadcrumb").get_attribute("aria-label") == "Breadcrumb"
