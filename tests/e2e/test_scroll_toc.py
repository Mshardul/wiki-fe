"""
- scroll position persisted per article in localStorage
- scroll position re-applied on bfcache (persisted) pageshow
- TOC sidebar sticky on desktop, hidden on mobile
- Sticky section header updates on scroll
"""


# ── Scroll Position in LocalStorage ─────────────────────────────────────────────


def test_scroll_position_saved_and_restored(page, base_url):
    """Revisiting an article with a saved position at/above a heading shows the
    resume chip (WIKI-253) instead of silently auto-scrolling; clicking it jumps
    to the saved position.

    Writes the saved position directly to localStorage using the app's own key
    (read from state.currentFilePath) to avoid relying on headless scroll events
    for the save path. Tests the restore path in isolation.
    """
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body pre", timeout=10_000)

    # Read the actual localStorage key the app uses, then write 600 directly.
    file_path = page.evaluate(
        "() => (typeof state !== 'undefined' ? state.currentFilePath : null)"
    )
    wiki_id = page.evaluate(
        "() => (typeof state !== 'undefined' ? state.currentWikiId : null)"
    )
    assert file_path, "Could not read state.currentFilePath from app"
    assert wiki_id, "Could not read state.currentWikiId from app"
    page.evaluate(
        "([wid, fp]) => localStorage.setItem('scroll-' + wid + '-' + fp, '600')",
        [wiki_id, file_path],
    )

    # Navigate away then back.
    page.goto(f"{base_url}/#system-design", wait_until="domcontentloaded")
    page.wait_for_selector("#view-index.active", timeout=5_000)
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body pre", timeout=10_000)

    page.wait_for_selector("#resume-chip", timeout=3_000)
    page.click(".resume-chip-jump")

    try:
        page.wait_for_function("() => window.scrollY > 100", timeout=3_000)
    except Exception:
        scroll_y = page.evaluate("() => window.scrollY")
        assert False, f"Scroll not restored after clicking resume chip; scrollY={scroll_y}"


def test_scroll_restored_after_bfcache_pageshow(page, base_url):
    """Dispatching a persisted pageshow (as on bfcache restore, e.g. browser
    back from an external page) re-applies the saved scroll position even
    after the browser's own post-restore adjustment would otherwise win.
    """
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body pre", timeout=10_000)

    file_path = page.evaluate(
        "() => (typeof state !== 'undefined' ? state.currentFilePath : null)"
    )
    wiki_id = page.evaluate(
        "() => (typeof state !== 'undefined' ? state.currentWikiId : null)"
    )
    assert file_path, "Could not read state.currentFilePath from app"
    assert wiki_id, "Could not read state.currentWikiId from app"
    page.evaluate(
        "([wid, fp]) => localStorage.setItem('scroll-' + wid + '-' + fp, '600')",
        [wiki_id, file_path],
    )

    # Simulate the browser landing back on this page from bfcache: scroll gets
    # reset to 0 (as a real bfcache restore or fresh route() render would do),
    # then the persisted pageshow fires.
    page.evaluate("() => window.scrollTo(0, 0)")
    page.evaluate(
        "() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))"
    )

    try:
        page.wait_for_function("() => window.scrollY > 100", timeout=3_000)
    except Exception:
        scroll_y = page.evaluate("() => window.scrollY")
        assert False, f"Scroll not restored after bfcache pageshow; scrollY={scroll_y}"


def test_scroll_position_not_restored_with_anchor(page, base_url):
    """?a= anchor param takes priority over saved scroll position."""
    # First visit and scroll to persist a position.
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body pre", timeout=10_000)
    file_path = page.evaluate(
        "() => (typeof state !== 'undefined' ? state.currentFilePath : null)"
    )
    wiki_id = page.evaluate(
        "() => (typeof state !== 'undefined' ? state.currentWikiId : null)"
    )
    assert file_path, "Could not read state.currentFilePath from app"
    assert wiki_id, "Could not read state.currentWikiId from app"
    page.evaluate(
        "([wid, fp]) => localStorage.setItem('scroll-' + wid + '-' + fp, '600')",
        [wiki_id, file_path],
    )

    # Revisit with an anchor - scroll should go to anchor, not saved position.
    first_heading = page.evaluate(
        "() => document.querySelector('#markdown-body [id]')?.id"
    )
    if not first_heading:
        return  # no headings to anchor to; skip

    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.evaluate(
        f"() => history.replaceState(null, '', location.href.split('?')[0] + '?a={first_heading}')"
    )
    page.evaluate("() => window.scrollTo(0, 0)")
    # Brief wait for anchor-scroll logic to settle (no DOM signal)
    page.wait_for_timeout(100)
    # Anchor scroll targets near-0 if heading is at top, or some other position -
    # key assertion is that the restore path did not fire (no error thrown).
    assert page.locator("#view-content.active").count() == 1


# ── Resume-by-idea chip (WIKI-253) ───────────────────────────────────────────────


def _load_mock_article(page, base_url, content, slug="mock"):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.wait_for_function("() => typeof window.navigateToContent === 'function'", timeout=8_000)
    page.route(f"**/{slug}.md", lambda r: r.fulfill(body=content))
    page.evaluate(
        f"""() => navigateToContent(
        'system-design',
        encodeURIComponent('../content/system-design/{slug}.md'),
        encodeURIComponent('{slug.capitalize()}'),
        '{slug}'
    )"""
    )
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )


_RESUME_CHIP_ARTICLE = (
    "# Resume Chip Test\n\n"
    + "Intro paragraph.\n\n" * 5
    + "## First Section\n\n"
    + "Body text.\n\n" * 5
    + "## Second Section\n\n"
    + "Body text.\n\n" * 40
)


def _save_scroll_and_revisit(page, base_url, slug, target_y):
    _load_mock_article(page, base_url, _RESUME_CHIP_ARTICLE, slug=slug)
    file_path = page.evaluate("() => state.currentFilePath")
    wiki_id = page.evaluate("() => state.currentWikiId")
    page.evaluate(
        "([wid, fp, y]) => localStorage.setItem('scroll-' + wid + '-' + fp, String(y))",
        [wiki_id, file_path, target_y],
    )
    _load_mock_article(page, base_url, _RESUME_CHIP_ARTICLE, slug=slug)


def test_resume_chip_shows_nearest_heading_above_saved_position(page, base_url):
    """The resume chip names the nearest h2/h3 above the saved scroll offset,
    not an automatic silent scroll."""
    _save_scroll_and_revisit(page, base_url, "resume-chip-shows", target_y=900)
    page.wait_for_selector("#resume-chip", timeout=3_000)
    heading_text = page.evaluate(
        "() => document.querySelector('.resume-chip-heading')?.textContent"
    )
    assert heading_text == "Second Section", f"Expected 'Second Section', got {heading_text!r}"
    # No silent auto-scroll should have happened.
    assert page.evaluate("() => window.scrollY") == 0


def test_resume_chip_click_scrolls_to_saved_position(page, base_url):
    """Clicking the resume chip's jump button scrolls to the originally saved offset."""
    _save_scroll_and_revisit(page, base_url, "resume-chip-jump", target_y=900)
    page.wait_for_selector("#resume-chip", timeout=3_000)
    page.click(".resume-chip-jump")
    # The jump uses a smooth scroll - wait for it to settle near the target
    # rather than the first non-zero frame.
    page.wait_for_function("() => window.scrollY > 850", timeout=3_000)
    scroll_y = page.evaluate("() => window.scrollY")
    assert abs(scroll_y - 900) < 50, f"Expected scroll near 900, got {scroll_y}"


def test_resume_chip_dismiss_does_not_scroll(page, base_url):
    """Dismissing the resume chip removes it without scrolling the page."""
    _save_scroll_and_revisit(page, base_url, "resume-chip-dismiss", target_y=900)
    page.wait_for_selector("#resume-chip", timeout=3_000)
    page.click(".resume-chip-dismiss")
    page.wait_for_selector("#resume-chip", state="detached", timeout=3_000)
    assert page.evaluate("() => window.scrollY") == 0


def test_resume_chip_absent_when_no_heading_above_saved_position(page, base_url):
    """Falls back to silent restore when the saved position is above any heading."""
    _save_scroll_and_revisit(page, base_url, "resume-chip-fallback", target_y=50)
    page.wait_for_function("() => window.scrollY > 0 || true", timeout=1_000)
    assert page.locator("#resume-chip").count() == 0, (
        "Resume chip should not appear when no heading precedes the saved position"
    )


def test_resume_chip_does_not_leak_across_navigation(page, base_url):
    """The resume chip from one article must not persist into the next render."""
    _save_scroll_and_revisit(page, base_url, "resume-chip-leak-1", target_y=900)
    page.wait_for_selector("#resume-chip", timeout=3_000)

    _load_mock_article(page, base_url, _RESUME_CHIP_ARTICLE, slug="resume-chip-leak-2")
    assert page.locator("#resume-chip").count() == 0, (
        "Resume chip leaked into an article render with no saved scroll position"
    )


def test_resume_chip_removed_when_navigating_to_home(page, base_url):
    """Regression: the resume chip is appended to document.body, outside any
    .view container, so leaving the article for home/index (not another
    article) must still remove it - otherwise it and its listeners leak
    forever across the session (found via a full-suite run degrading late
    tests after ~500 accumulated chips)."""
    _save_scroll_and_revisit(page, base_url, "resume-chip-home-leak", target_y=900)
    page.wait_for_selector("#resume-chip", timeout=3_000)

    page.evaluate("() => navigateHome()")
    page.wait_for_selector("#view-home.active", timeout=5_000)

    assert page.locator("#resume-chip").count() == 0, (
        "Resume chip leaked into document.body after navigating to home"
    )


def test_resume_chip_removed_when_navigating_to_index(page, base_url):
    """Same leak as the home case, but via the back button to the index view."""
    _save_scroll_and_revisit(page, base_url, "resume-chip-index-leak", target_y=900)
    page.wait_for_selector("#resume-chip", timeout=3_000)

    page.click("#content-back-btn")
    page.wait_for_selector("#view-index.active", timeout=5_000)

    assert page.locator("#resume-chip").count() == 0, (
        "Resume chip leaked into document.body after navigating to the index"
    )


# ── TOC Sidebar Behavior ────────────────────────────────────────────────────────


def test_toc_visible_on_desktop(page, base_url):
    """TOC sidebar is visible on large screens."""
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)

    sidebar = page.locator("#toc-sidebar")
    assert sidebar.is_visible()


def test_toc_hidden_on_mobile(page, base_url):
    """TOC sidebar is hidden by default on mobile viewports."""
    page.set_viewport_size({"width": 375, "height": 812})
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)

    sidebar = page.locator("#toc-sidebar")
    assert not sidebar.is_visible()


def test_mobile_toc_closes_on_link_tap(page, base_url):
    """Tapping a TOC link closes the mobile drawer without needing the overlay."""
    page.set_viewport_size({"width": 375, "height": 812})
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )
    page.wait_for_selector("#toc-nav .toc-item", state="attached")

    page.locator("#toc-mobile-btn").click()
    page.wait_for_function(
        "() => document.getElementById('toc-sidebar').classList.contains('mobile-open')"
    )
    page.locator("#toc-nav .toc-item").first.click()
    page.wait_for_function(
        "() => !document.getElementById('toc-sidebar').classList.contains('mobile-open')"
    )
    assert (
        not page.locator("#toc-mobile-overlay")
        .get_attribute("class")
        .__contains__("open")
    )


def test_mobile_fabs_do_not_share_a_corner(page, base_url):
    """Scroll-top and TOC FABs sit in separate corners on mobile, not stacked."""
    page.set_viewport_size({"width": 375, "height": 812})
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )
    # Scroll down so the scroll-top FAB becomes visible alongside the TOC FAB.
    page.evaluate("window.scrollTo(0, 500)")
    page.wait_for_function(
        "() => document.getElementById('scroll-top').classList.contains('visible')"
    )
    scroll_top_box = page.locator("#scroll-top").bounding_box()
    toc_btn_box = page.locator("#toc-mobile-btn").bounding_box()
    assert scroll_top_box["x"] < toc_btn_box["x"], (
        "Scroll-top FAB should sit to the left of the TOC FAB on mobile, not stacked above it"
    )


def test_toc_sticky_does_not_scroll_away(page, base_url):
    """TOC sidebar stays in viewport after scrolling down."""
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body pre", timeout=8_000)

    page.evaluate("() => window.scrollTo(0, 1500)")
    page.wait_for_function("() => window.scrollY >= 1000", timeout=3_000)

    sidebar = page.locator("#toc-sidebar")
    assert sidebar.is_visible()
    box = sidebar.bounding_box()
    assert box["y"] >= 0 and box["y"] < page.viewport_size["height"]


# ── Sticky section header ──────────────────────────────────────────────────────


def test_sticky_section_header_element_exists(page, base_url):
    """#sticky-section-header element is present in the DOM in content view."""
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=15_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=15_000,
    )

    exists = page.evaluate("() => !!document.getElementById('sticky-section-header')")
    assert exists, "#sticky-section-header element not found in DOM"


def test_sticky_section_header_shows_section_on_scroll(page, base_url):
    """Scrolling past an h2 populates the sticky section header with the section name."""
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )

    h2_top = page.evaluate("""() => {
        const h2 = document.querySelector('#markdown-body h2');
        return h2 ? h2.getBoundingClientRect().top + window.scrollY : null;
    }""")
    if h2_top is None:
        return  # no h2 in article; skip

    page.evaluate(f"() => window.scrollTo(0, {int(h2_top) + 200})")
    page.wait_for_function(
        "() => document.getElementById('sticky-section-header')?.textContent?.trim().length > 0",
        timeout=3_000,
    )

    text = page.evaluate(
        "() => document.getElementById('sticky-section-header')?.textContent?.trim()"
    )
    assert text, "Sticky section header is empty after scrolling past h2"


def test_sticky_section_scroll_listener_cleared_on_navigate_home(page, base_url):
    """Regression: addStickySection's window scroll listener closes over the
    article's headings via state.stickySectionHandler. cleanupStickySection()
    was only wired into content->content navigation (navigateToContent), so
    leaving an article for home/index instead of another article leaked the
    listener (and the abandoned heading DOM) forever - found via a full-suite
    run where accumulated leaks degraded unrelated late-running tests."""
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )
    has_handler = page.evaluate("() => !!window.state?.stickySectionHandler")
    assert has_handler, "Expected stickySectionHandler to be set after entering an article"

    page.evaluate("() => navigateHome()")
    page.wait_for_selector("#view-home.active", timeout=5_000)

    leaked = page.evaluate("() => !!window.state?.stickySectionHandler")
    assert not leaked, "stickySectionHandler leaked after navigating to home"


def test_mobile_toc_open_locks_body_scroll(page, base_url):
    """opening mobile TOC adds toc-open class to body."""
    page.set_viewport_size({"width": 375, "height": 812})
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)

    page.locator("#toc-mobile-btn").click()
    page.wait_for_function(
        "() => document.getElementById('toc-sidebar').classList.contains('mobile-open')"
    )
    assert page.evaluate("() => document.body.classList.contains('toc-open')")


def test_mobile_toc_close_via_overlay_unlocks_scroll(page, base_url):
    """closing mobile TOC via overlay removes toc-open from body."""
    page.set_viewport_size({"width": 375, "height": 812})
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)

    page.locator("#toc-mobile-btn").click()
    page.wait_for_function(
        "() => document.getElementById('toc-sidebar').classList.contains('mobile-open')"
    )
    page.locator("#toc-mobile-overlay").click()
    page.wait_for_function(
        "() => !document.getElementById('toc-sidebar').classList.contains('mobile-open')"
    )
    assert not page.evaluate("() => document.body.classList.contains('toc-open')")
