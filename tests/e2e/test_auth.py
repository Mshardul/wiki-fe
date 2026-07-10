import re

import pytest
from playwright.sync_api import expect

from conftest import _make_cdn_fulfill_handler

_UNAUTH = '{"error":{"code":"UNAUTHORIZED","message":"no session"}}'


def _stub_logged_out(page):
    """GET /auth/me → 401 so boot resolves to anonymous quickly."""
    page.route(
        "**/api/v1/auth/me",
        lambda r: r.fulfill(
            status=401, content_type="application/json", body=_UNAUTH
        ),
    )


@pytest.mark.smoke
def test_auth_modal_opens_from_topbar(page, base_url):
    _stub_logged_out(page)
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    expect(page.locator("#auth-modal")).not_to_have_class(re.compile(r"\bhidden\b"))
    expect(page.locator("#auth-panel-login.active")).to_be_visible()


def test_auth_modal_is_bottom_sheet_on_mobile(page, base_url):
    """Below 640px the auth dialog docks to the bottom of the screen with a
    drag handle, instead of centering (which a software keyboard can push
    off-screen)."""
    _stub_logged_out(page)
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    expect(page.locator("#auth-modal")).not_to_have_class(re.compile(r"\bhidden\b"))

    box = page.evaluate("""() => {
        const r = document.querySelector('.auth-dialog').getBoundingClientRect();
        return { bottom: r.bottom, left: r.left, right: r.right, width: r.width };
    }""")
    assert box["bottom"] >= 844 - 1, (
        f"Auth dialog should dock to viewport bottom on mobile, bottom={box['bottom']}"
    )
    assert box["left"] <= 0 and box["right"] >= 390, (
        "Auth dialog should span full width as a bottom sheet on mobile"
    )

    handle_display = page.evaluate(
        "() => getComputedStyle(document.querySelector('.auth-drag-handle')).display"
    )
    assert handle_display != "none", "Drag handle should be visible on mobile"


def test_auth_btn_shows_icon_on_mobile(page, base_url):
    """Topbar auth button keeps a visible icon on mobile once its text label hides."""
    _stub_logged_out(page)
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(base_url)

    label_display = page.evaluate(
        "() => getComputedStyle(document.querySelector('#auth-btn-home .auth-btn-label')).display"
    )
    assert label_display == "none"

    svg = page.locator("#auth-btn-home svg")
    expect(svg).to_be_visible()


def test_auth_swap_links_meet_touch_target_on_mobile(page, base_url, cdn_cache):
    """Swap links (Forgot password?, Register) are at least 44px tall on touch devices."""
    ctx = page.context.browser.new_context(
        viewport={"width": 390, "height": 844},
        has_touch=True,
        is_mobile=True,
        service_workers="block",
    )
    touch_page = ctx.new_page()
    for url, (body, content_type) in cdn_cache.items():
        touch_page.route(url, _make_cdn_fulfill_handler(body, content_type))
    _stub_logged_out(touch_page)
    touch_page.goto(base_url)
    touch_page.locator("#auth-btn-home").click()
    expect(touch_page.locator("#auth-modal")).not_to_have_class(re.compile(r"\bhidden\b"))

    for link_id in ("auth-to-forgot", "auth-to-register"):
        height = touch_page.evaluate(
            f"() => document.getElementById('{link_id}').getBoundingClientRect().height"
        )
        assert height >= 44, f"#{link_id} is only {height}px tall, expected >= 44px"
    ctx.close()


def test_auth_modal_swipe_down_closes_on_mobile(page, base_url, cdn_cache):
    """Swiping down from the drag-handle area dismisses the mobile auth sheet."""
    ctx = page.context.browser.new_context(
        viewport={"width": 390, "height": 844},
        has_touch=True,
        is_mobile=True,
        service_workers="block",
    )
    touch_page = ctx.new_page()
    for url, (body, content_type) in cdn_cache.items():
        touch_page.route(url, _make_cdn_fulfill_handler(body, content_type))
    _stub_logged_out(touch_page)
    touch_page.goto(base_url)
    touch_page.wait_for_selector("#view-home.active", timeout=8_000)
    touch_page.locator("#auth-btn-home").click()
    expect(touch_page.locator("#auth-modal")).not_to_have_class(re.compile(r"\bhidden\b"))

    touch_page.evaluate("""() => {
        function touch(type, x, y, target) {
            const t = new Touch({identifier: 1, target, clientX: x, clientY: y});
            const ev = new TouchEvent(type, {
                touches: type === 'touchend' ? [] : [t],
                changedTouches: [t],
                bubbles: true,
                cancelable: true,
            });
            target.dispatchEvent(ev);
        }
        const el = document.body;
        touch('touchstart', 195, 150, el);
        touch('touchmove', 195, 250, el);
        touch('touchend', 195, 250, el);
    }""")
    touch_page.wait_for_function(
        "() => document.getElementById('auth-modal').classList.contains('hidden')",
        timeout=3_000,
    )
    ctx.close()


def test_auth_modal_centered_on_desktop(page, base_url):
    """Above 640px the auth dialog stays a centered dialog, no drag handle."""
    _stub_logged_out(page)
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    expect(page.locator("#auth-modal")).not_to_have_class(re.compile(r"\bhidden\b"))

    handle_display = page.evaluate(
        "() => getComputedStyle(document.querySelector('.auth-drag-handle')).display"
    )
    assert handle_display == "none", "Drag handle should be hidden on desktop"


def test_register_checklist_turns_green(page, base_url):
    _stub_logged_out(page)
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-to-register").click()

    pw = page.locator("#auth-reg-password")
    pw.fill("short")
    # not all rules satisfied -> submit disabled
    expect(page.locator("#auth-reg-submit")).to_be_disabled()

    pw.fill("LongEnough1!xx")
    items = page.locator("#auth-pw-checklist li")
    expect(items).to_have_count(5)
    for i in range(5):
        expect(items.nth(i)).to_have_class(re.compile(r"\bok\b"))
    expect(page.locator("#auth-reg-submit")).to_be_enabled()


def test_login_success_flips_button_to_logout(page, base_url):
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body='{"user":{"id":1,"email":"a@example.com"}}',
        ),
    )
    for path in ("bookmarks", "reads", "recents"):
        page.route(
            f"**/api/v1/{path}",
            lambda r: r.fulfill(
                status=200, content_type="application/json", body="[]"
            ),
        )

    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("a@example.com")
    page.locator("#auth-login-password").fill("LongEnough1!xx")
    page.locator("#auth-login-submit").click()
    expect(page.locator("#auth-btn-home .auth-btn-label")).to_have_text("Logout")


def test_login_submits_on_enter_key(page, base_url):
    """Pressing Enter in the login password field must submit the form -
    regression for auth panels having no <form> element, so Enter did nothing."""
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body='{"user":{"id":1,"email":"a@example.com"}}',
        ),
    )
    for path in ("bookmarks", "reads", "recents"):
        page.route(
            f"**/api/v1/{path}",
            lambda r: r.fulfill(
                status=200, content_type="application/json", body="[]"
            ),
        )

    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("a@example.com")
    page.locator("#auth-login-password").fill("LongEnough1!xx")
    page.locator("#auth-login-password").press("Enter")
    expect(page.locator("#auth-btn-home .auth-btn-label")).to_have_text("Logout")


def test_login_unverified_shows_verify_panel(page, base_url):
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=403,
            content_type="application/json",
            body='{"error":{"code":"UNVERIFIED","message":"verify first"}}',
        ),
    )

    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("a@example.com")
    page.locator("#auth-login-password").fill("LongEnough1!xx")
    page.locator("#auth-login-submit").click()
    expect(page.locator("#auth-panel-verify.active")).to_be_visible()


def test_bad_credentials_shows_error(page, base_url):
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=401,
            content_type="application/json",
            body='{"error":{"code":"BAD_CREDENTIALS","message":"Invalid email or password"}}',
        ),
    )

    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("a@example.com")
    page.locator("#auth-login-password").fill("WrongPass123!")
    page.locator("#auth-login-submit").click()
    err = page.locator("#auth-login-error")
    expect(err).to_be_visible()
    expect(err).to_have_text("Invalid email or password")


def test_concurrent_401s_fire_session_expired_once(page, base_url):
    """Regression for WIKI-403: the session-expired guard used to reset on
    the next macrotask (setTimeout(...,0)), so concurrent 401s from a
    Promise.all (e.g. Sync.pullAll) could each slip past it and fire the
    global session-expired flow more than once."""
    page.route(
        "**/api/v1/auth/me",
        lambda r: r.fulfill(
            status=200, content_type="application/json",
            body='{"user":{"id":1,"email":"a@example.com"}}',
        ),
    )
    for path in ("bookmarks", "reads", "recents"):
        page.route(
            f"**/api/v1/{path}",
            lambda r: r.fulfill(status=401, content_type="application/json", body=_UNAUTH),
        )

    # must exist before boot's own Sync.pullAll() races a listener attached after goto()
    page.add_init_script("""
        window.__sessionExpiredCount = 0;
        document.addEventListener('wiki:session-expired', () => { window.__sessionExpiredCount++; });
    """)
    page.goto(base_url)
    page.wait_for_function("window.api !== undefined || true")

    page.evaluate("""async () => {
        const { api } = await import('./js/api.js');
        await Promise.all([
            api.bookmarks.list().catch(() => []),
            api.reads.list().catch(() => []),
            api.recents.list().catch(() => []),
        ]);
    }""")
    fire_count = page.evaluate("window.__sessionExpiredCount")
    assert fire_count == 1, (
        f"expected exactly one wiki:session-expired dispatch, got {fire_count}"
    )
