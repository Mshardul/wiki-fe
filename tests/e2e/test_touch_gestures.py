"""
Mobile touch gestures (Group 5):
- Index-card swipe: right = bookmark, left = read toggle; tap still navigates.
- Long-press internal link → bottom-sheet TLDR peek; tap-away dismisses.
- Swipe-right from left edge in content view → back to index.

Deterministic gestures are asserted by dispatching synthetic TouchEvents in the
page. Pinch-to-zoom and orientation re-fit are not reliably reproducible via dispatched
events and are covered by manual verify — see the note at the bottom of this module.
"""

import pytest

MOBILE_VIEWPORT = {"width": 390, "height": 800}


# Dispatch a single-finger swipe across the element at (start)->(end) viewport
# coordinates, targeting whatever element sits under the start point.
_SWIPE_JS = """
({sx, sy, ex, ey, steps}) => {
  const el = document.elementFromPoint(sx, sy) || document.body;
  const touch = (x, y) => new Touch({
    identifier: 1, target: el, clientX: x, clientY: y, pageX: x, pageY: y,
  });
  const fire = (type, x, y) => el.dispatchEvent(new TouchEvent(type, {
    bubbles: true, cancelable: true,
    touches: type === 'touchend' ? [] : [touch(x, y)],
    targetTouches: type === 'touchend' ? [] : [touch(x, y)],
    changedTouches: [touch(x, y)],
  }));
  fire('touchstart', sx, sy);
  const n = steps || 6;
  for (let i = 1; i <= n; i++) {
    fire('touchmove', sx + (ex - sx) * i / n, sy + (ey - sy) * i / n);
  }
  fire('touchend', ex, ey);
}
"""


def _swipe(page, sx, sy, ex, ey, steps=6):
    page.evaluate(_SWIPE_JS, {"sx": sx, "sy": sy, "ex": ex, "ey": ey, "steps": steps})


@pytest.fixture
def mobile_page(page, base_url):
    page.set_viewport_size(MOBILE_VIEWPORT)
    page.goto(f"{base_url}/")
    page.wait_for_load_state("networkidle")
    return page


def _go_to_index(page, base_url):
    page.goto(f"{base_url}/#system-design")
    page.wait_for_selector("#view-index.active", timeout=10_000)
    # wait for at least one available (non-stub) card
    page.wait_for_selector(".index-card:not(.index-card--unavailable)", timeout=10_000)


def _first_card_box(page):
    card = page.locator(".index-card:not(.index-card--unavailable)").first
    card.scroll_into_view_if_needed()
    return card, card.bounding_box()


def test_card_swipe_right_bookmarks(mobile_page, base_url):
    """right-swipe on an index card adds a bookmark chip."""
    page = mobile_page
    _go_to_index(page, base_url)
    card, box = _first_card_box(page)

    cy = box["y"] + box["height"] / 2
    _swipe(page, box["x"] + 20, cy, box["x"] + box["width"] - 10, cy)

    page.locator("#bookmarks-section .recent-chip").wait_for(state="attached", timeout=5_000)
    assert page.locator("#bookmarks-section .recent-chip").count() >= 1


def test_card_swipe_left_marks_read(mobile_page, base_url):
    """left-swipe on an index card toggles its read dot on."""
    page = mobile_page
    _go_to_index(page, base_url)
    card, box = _first_card_box(page)

    dot = card.locator(".index-card-read-dot")
    assert "visible" not in (dot.get_attribute("class") or "")

    cy = box["y"] + box["height"] / 2
    _swipe(page, box["x"] + box["width"] - 20, cy, box["x"] + 10, cy)

    # read dot becomes visible
    page.wait_for_function(
        "el => el.classList.contains('visible')",
        arg=dot.element_handle(),
        timeout=5_000,
    )


def test_card_tap_still_navigates(mobile_page, base_url):
    """a plain tap (no horizontal drag) opens the article."""
    page = mobile_page
    _go_to_index(page, base_url)
    card = page.locator(".index-card:not(.index-card--unavailable)").first
    card.click()
    page.wait_for_selector("#view-content.active", timeout=10_000)


def test_long_press_link_opens_peek_sheet(mobile_page, base_url):
    """long-press on an internal .md link slides up the preview as a sheet."""
    page = mobile_page
    # An article known to contain internal links.
    page.goto(f"{base_url}/#system-design/caching")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_selector("#markdown-body[data-render-done]", timeout=10_000)

    link = page.locator(
        "#markdown-body a[href$='.md'], #markdown-body a[href*='.md#']"
    ).first
    if link.count() == 0:
        pytest.skip("article has no internal .md links to long-press")

    box = link.bounding_box()
    cx = box["x"] + box["width"] / 2
    cy = box["y"] + box["height"] / 2

    # Hold without moving: touchstart, wait past LONGPRESS_MS, touchend.
    page.evaluate(
        """({x, y}) => {
            const el = document.elementFromPoint(x, y);
            window.__peekTarget = el;
            el.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true,
                cancelable: true, pointerType: 'touch', clientX: x, clientY: y}));
            const touch = new Touch({identifier: 1, target: el,
                clientX: x, clientY: y, pageX: x, pageY: y});
            el.dispatchEvent(new TouchEvent('touchstart', {bubbles: true,
                cancelable: true, touches: [touch], targetTouches: [touch],
                changedTouches: [touch]}));
        }""",
        {"x": cx, "y": cy},
    )
    page.wait_for_selector(
        "#hover-preview.hover-preview--sheet-open", timeout=3_000
    )

    # release
    page.evaluate(
        """({x, y}) => {
            const el = window.__peekTarget;
            const touch = new Touch({identifier: 1, target: el,
                clientX: x, clientY: y, pageX: x, pageY: y});
            el.dispatchEvent(new TouchEvent('touchend', {bubbles: true,
                cancelable: true, touches: [], targetTouches: [],
                changedTouches: [touch]}));
        }""",
        {"x": cx, "y": cy},
    )

    sheet = page.locator("#hover-preview.hover-preview--sheet")
    assert "sheet-open" in (sheet.get_attribute("class") or "")

    # tap-away dismisses
    page.evaluate(
        """() => {
            const t = new Touch({identifier: 9, target: document.body,
                clientX: 5, clientY: 5});
            document.body.dispatchEvent(new TouchEvent('touchstart',
                {bubbles: true, cancelable: true, touches: [t],
                 targetTouches: [t], changedTouches: [t]}));
        }"""
    )
    page.wait_for_function(
        "() => !document.getElementById('hover-preview')"
        ".classList.contains('hover-preview--sheet-open')",
        timeout=3_000,
    )


def test_edge_swipe_right_goes_back(mobile_page, base_url):
    """swipe right from the left edge in content view returns to the index."""
    page = mobile_page
    page.goto(f"{base_url}/#system-design/caching")
    page.wait_for_selector("#view-content.active", timeout=10_000)

    _swipe(page, 5, 400, 200, 405)
    page.wait_for_selector("#view-index.active", timeout=5_000)


def test_edge_swipe_left_opens_toc(mobile_page, base_url):
    """swipe left from the right edge in content view opens the mobile TOC."""
    page = mobile_page
    page.goto(f"{base_url}/#system-design/caching")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_selector("#markdown-body[data-render-done]", timeout=10_000)
    page.wait_for_selector("#toc-nav .toc-item", state="attached", timeout=10_000)

    w = MOBILE_VIEWPORT["width"]
    _swipe(page, w - 5, 400, w - 220, 405)
    page.wait_for_function(
        "() => document.getElementById('toc-sidebar')"
        ".classList.contains('mobile-open')",
        timeout=5_000,
    )


def test_swipe_down_closes_panel(mobile_page, base_url):
    """swipe down from the upper third closes the topmost open panel (TOC)."""
    page = mobile_page
    page.goto(f"{base_url}/#system-design/caching")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_selector("#toc-nav .toc-item", state="attached", timeout=10_000)

    # open the TOC drawer first
    page.locator("#toc-mobile-btn").click()
    page.wait_for_function(
        "() => document.getElementById('toc-sidebar')"
        ".classList.contains('mobile-open')",
        timeout=5_000,
    )

    # swipe down from the top → closeTopPanel() closes the drawer
    _swipe(page, 195, 40, 200, 200)
    page.wait_for_function(
        "() => !document.getElementById('toc-sidebar')"
        ".classList.contains('mobile-open')",
        timeout=5_000,
    )


def test_swipe_down_from_mid_sheet_closes_prefs(mobile_page, base_url):
    """swipe down from mid-sheet (not upper third) closes prefs when open."""
    page = mobile_page
    page.goto(f"{base_url}/")
    page.wait_for_selector("#view-home.active", timeout=10_000)

    page.evaluate("() => Settings.open()")
    page.wait_for_function("() => Settings.isOpen()", timeout=5_000)

    # swipe down starting from vertical midpoint — previously did nothing
    mid_y = MOBILE_VIEWPORT["height"] // 2
    _swipe(page, 195, mid_y, 195, mid_y + 120)
    page.wait_for_function("() => !Settings.isOpen()", timeout=5_000)


def test_search_modal_closes_on_resize(mobile_page, base_url):
    """search modal closes when viewport is resized (orientation change)."""
    page = mobile_page
    page.goto(f"{base_url}/")
    page.wait_for_selector("#view-home.active", timeout=10_000)

    page.keyboard.press("Meta+k")
    page.wait_for_selector("#global-search-modal:not(.hidden)", timeout=5_000)

    # simulate orientation change by resizing viewport
    page.set_viewport_size({"width": 800, "height": 390})
    page.wait_for_selector("#global-search-modal.hidden", state="attached", timeout=5_000)
