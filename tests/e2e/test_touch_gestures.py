# Not ported: long-press-on-link peek sheet (HoverPreview.tsx wires mouseover/mouseout only, no touch path — real gap, skip-marked below); link-graph overlay (`g` hotkey, dropped per spec §9); sessionStorage search-index caching/dedup-on-refresh (PullToRefresh.tsx calls pullAll() instead, and SearchModal has no index cache to invalidate — see test_search.py).

import pytest

MOBILE_VIEWPORT = {"width": 390, "height": 800}


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
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    return page


def _go_to_index(page, base_url, slug="system-design"):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector(".index-card:not(.index-card--unavailable)", timeout=10_000)
    # document.elementFromPoint() hit-testing lags behind layout for a brief window right
    # after navigation in headless Chromium - a short settle avoids dispatching synthetic
    # touch events on the wrong element.
    page.wait_for_timeout(300)


def _first_card_box(page):
    card = page.locator(".index-card:not(.index-card--unavailable)").first
    card.scroll_into_view_if_needed()
    return card, card.bounding_box()


def test_card_swipe_right_bookmarks(mobile_page, base_url):
    page = mobile_page
    _go_to_index(page, base_url)
    card, box = _first_card_box(page)

    cy = box["y"] + box["height"] / 2
    _swipe(page, box["x"] + 20, cy, box["x"] + box["width"] - 10, cy)

    page.locator("#bookmarks-section .recent-chip").wait_for(state="attached", timeout=5_000)
    assert page.locator("#bookmarks-section .recent-chip").count() >= 1


def test_card_swipe_left_does_nothing(mobile_page, base_url):
    page = mobile_page
    _go_to_index(page, base_url)
    card, box = _first_card_box(page)

    cy = box["y"] + box["height"] / 2
    _swipe(page, box["x"] + box["width"] - 20, cy, box["x"] + 10, cy)

    completed = page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-completed-system-design') || '[]')"
    )
    assert len(completed) == 0


def test_card_swipe_near_left_edge_still_bookmarks(mobile_page, base_url):
    page = mobile_page
    _go_to_index(page, base_url)
    card, box = _first_card_box(page)

    cy = box["y"] + box["height"] / 2
    # start within EDGE_ZONE (44px) of the viewport's left edge
    _swipe(page, 20, cy, box["x"] + box["width"] - 10, cy)

    page.locator("#bookmarks-section .recent-chip").wait_for(state="attached", timeout=5_000)
    assert page.locator("#bookmarks-section .recent-chip").count() >= 1
    assert page.locator(".index-main").count() == 1


def test_card_tap_still_navigates(mobile_page, base_url):
    page = mobile_page
    _go_to_index(page, base_url)
    card = page.locator(".index-card:not(.index-card--unavailable)").first
    card.click()
    page.wait_for_selector("#markdown-body", timeout=10_000)


def test_pull_to_refresh_revalidates_synced_domains(page, base_url):
    page.route(
        "**/api/v1/auth/me",
        lambda r: r.fulfill(
            status=200, content_type="application/json",
            body='{"user":{"id":"1","email":"a@example.com"}}',
        ),
    )
    pull_called = {"bookmarks": False, "completions": False, "recents": False}

    def _mark(name):
        def handler(route):
            pull_called[name] = True
            route.fulfill(status=200, content_type="application/json", body="[]")

        return handler

    for path in ("bookmarks", "completions", "recents"):
        page.route(f"**/api/v1/{path}", _mark(path))
    page.add_init_script("localStorage.setItem('wiki-session-token', 'test-token')")

    page.set_viewport_size(MOBILE_VIEWPORT)
    _go_to_index(page, base_url)
    # SessionInit also calls pullAll() on boot (logged in via the seeded token) - let that
    # settle first so the counters below reflect the swipe's call, not boot's.
    page.wait_for_timeout(500)
    for k in pull_called:
        pull_called[k] = False

    container = page.locator(".index-sections")
    box = container.bounding_box()
    cx = box["x"] + box["width"] / 2
    top = box["y"] + 5

    _swipe(page, cx, top, cx, top + 100, steps=8)

    # fire-and-forget pullAll() - poll the Python-side flags a request handler already set.
    for _ in range(20):
        if any(pull_called.values()):
            break
        page.wait_for_timeout(100)
    assert any(pull_called.values()), "pull-to-refresh must call pullAll() (bookmarks/completions/recents)"


def test_edge_swipe_right_goes_back(mobile_page, base_url):
    """swipe right from the left edge triggers history.back() - navigate for real (home -> index -> article) so there's a genuine history entry to return to, since this is real browser history now, not a deterministic SPA route stack."""
    page = mobile_page
    page.locator(".wiki-card").first.click()
    page.wait_for_selector(".index-card:not(.index-card--unavailable)", timeout=10_000)
    index_url = page.url
    page.locator(".index-card:not(.index-card--unavailable)").first.click()
    page.wait_for_selector("#markdown-body", timeout=10_000)

    _swipe(page, 5, 400, 200, 405)
    page.wait_for_function(f"() => location.href === {index_url!r}", timeout=5_000)


def test_edge_swipe_left_opens_toc(mobile_page, base_url):
    page = mobile_page
    page.goto(f"{base_url}/system-design/components/caching/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)
    page.wait_for_selector("#toc-nav .toc-item", state="attached", timeout=10_000)

    w = MOBILE_VIEWPORT["width"]
    _swipe(page, w - 5, 400, w - 220, 405)
    page.wait_for_function(
        "() => document.getElementById('toc-sidebar')"
        ".classList.contains('mobile-open')",
        timeout=5_000,
    )


def test_swipe_down_closes_panel(mobile_page, base_url):
    page = mobile_page
    page.goto(f"{base_url}/system-design/components/caching/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)
    page.wait_for_selector("#toc-nav .toc-item", state="attached", timeout=10_000)

    page.locator("#toc-mobile-btn").click()
    page.wait_for_function(
        "() => document.getElementById('toc-sidebar')"
        ".classList.contains('mobile-open')",
        timeout=5_000,
    )

    _swipe(page, 195, 40, 200, 200)
    page.wait_for_function(
        "() => !document.getElementById('toc-sidebar')"
        ".classList.contains('mobile-open')",
        timeout=5_000,
    )


def test_swipe_down_from_mid_sheet_closes_prefs(mobile_page, base_url):
    page = mobile_page
    page.locator("[title='Preferences (,)']:visible").first.click()
    page.wait_for_selector('[role="dialog"][aria-label="Preferences"]', timeout=5_000)

    mid_y = MOBILE_VIEWPORT["height"] // 2
    _swipe(page, 195, mid_y, 195, mid_y + 120)
    page.wait_for_selector('[role="dialog"][aria-label="Preferences"]', state="detached", timeout=5_000)


def test_mobile_toc_survives_small_resize(mobile_page, base_url):
    page = mobile_page
    page.goto(f"{base_url}/system-design/components/caching/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)
    page.locator("#toc-mobile-btn").click()
    page.wait_for_function(
        "() => document.getElementById('toc-sidebar').classList.contains('mobile-open')",
        timeout=5_000,
    )

    w = MOBILE_VIEWPORT["width"]
    page.set_viewport_size({"width": w, "height": MOBILE_VIEWPORT["height"] - 80})
    page.wait_for_timeout(300)
    assert page.evaluate(
        "() => document.getElementById('toc-sidebar').classList.contains('mobile-open')"
    ), "TOC drawer closed on a height-only resize (no width change)"

    page.set_viewport_size({"width": 800, "height": 390})
    page.wait_for_function(
        "() => !document.getElementById('toc-sidebar').classList.contains('mobile-open')",
        timeout=5_000,
    )


def test_search_modal_closes_on_resize(mobile_page, base_url):
    page = mobile_page
    page.keyboard.press("Meta+k")
    page.wait_for_selector('[role="dialog"][aria-label="Search"]', timeout=5_000)

    page.set_viewport_size({"width": 800, "height": 390})
    page.wait_for_selector('[role="dialog"][aria-label="Search"]', state="detached", timeout=5_000)


# ── Skip-marked → not ported ──────────────────────────────────────


@pytest.mark.skip(reason="long-press peek sheet not ported on mobile — filed WIKI-657")
def test_long_press_link_opens_peek_sheet():
    pass
