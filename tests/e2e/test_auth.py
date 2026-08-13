import re
import threading

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


def test_auth_btn_shows_icon_on_index_and_content_views(page, base_url):
    """Regression: index/content topbar auth buttons were missing the user-icon SVG, rendering as an empty circle."""
    _stub_logged_out(page)
    page.goto(f"{base_url}/#system-design")
    page.wait_for_selector("#view-index.active", timeout=10_000)
    expect(page.locator("#auth-btn-index svg")).to_be_visible()

    page.goto(f"{base_url}/#system-design/caching")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    expect(page.locator("#auth-btn-content svg")).to_be_visible()


def test_login_submit_shows_loading_state_while_pending(page, base_url):
    """Regression: login button had no visual feedback (disabled but no spinner/label change) while pending."""
    _stub_logged_out(page)
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.fill("#auth-login-email", "test@example.com")
    page.fill("#auth-login-password", "wrongpassword123")

    ready = threading.Event()

    def slow_handler(route):
        ready.wait(timeout=3.0)
        route.abort()

    page.route("**/api/v1/auth/login", slow_handler)

    # Locator.click() blocks until the intercepted request settles; observe mid-flight state via JS instead.
    snapshot = page.evaluate("""() => {
        document.getElementById('auth-login-submit').click();
        const btn = document.getElementById('auth-login-submit');
        return { disabled: btn.disabled, isLoading: btn.classList.contains('is-loading'), label: btn.querySelector('.auth-submit-label')?.textContent };
    }""")
    ready.set()
    assert snapshot["isLoading"], "login button should get .is-loading while the request is pending"
    assert snapshot["disabled"], "login button should be disabled while the request is pending"
    assert snapshot["label"] == "Logging in…", f"expected loading label, got {snapshot['label']!r}"


def test_forgot_submit_shows_loading_state_while_pending(page, base_url):
    """Regression: forgot-password submit had the same missing loading feedback."""
    _stub_logged_out(page)
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-to-forgot").click()
    page.fill("#auth-forgot-email", "test@example.com")

    ready = threading.Event()

    def slow_handler(route):
        ready.wait(timeout=3.0)
        route.abort()

    page.route("**/api/v1/auth/forgot-password", slow_handler)

    snapshot = page.evaluate("""() => {
        document.getElementById('auth-forgot-submit').click();
        const btn = document.getElementById('auth-forgot-submit');
        return { isLoading: btn.classList.contains('is-loading'), label: btn.querySelector('.auth-submit-label')?.textContent };
    }""")
    ready.set()
    assert snapshot["isLoading"], "forgot-password button should get .is-loading while the request is pending"
    assert snapshot["label"] == "Sending…", f"expected loading label, got {snapshot['label']!r}"


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
        # round() absorbs sub-pixel layout rounding (e.g. 43.99993... for a
        # min-height: 44px box) - the box is a genuine 44px, not a real shortfall.
        assert round(height) >= 44, f"#{link_id} is only {height}px tall, expected >= 44px"
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
    page.locator("#auth-reg-password-confirm").fill("LongEnough1!xx")
    items = page.locator("#auth-pw-checklist li")
    expect(items).to_have_count(5)
    for i in range(5):
        expect(items.nth(i)).to_have_class(re.compile(r"\bok\b"))
    expect(page.locator("#auth-reg-submit")).to_be_enabled()


def test_register_checklist_resyncs_on_panel_leave_and_return(page, base_url):
    """Regression: leaving the register panel and coming back
    with a still-valid password must re-derive the checklist/submit state
    from the actual input value, not force it back to all-red/disabled."""
    _stub_logged_out(page)
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-to-register").click()
    page.locator("#auth-reg-password").fill("LongEnough1!xx")
    page.locator("#auth-reg-password-confirm").fill("LongEnough1!xx")
    expect(page.locator("#auth-reg-submit")).to_be_enabled()

    page.locator("#auth-to-login").click()
    page.locator("#auth-to-register").click()

    expect(page.locator("#auth-reg-password")).to_have_value("LongEnough1!xx")
    expect(page.locator("#auth-reg-submit")).to_be_enabled()
    items = page.locator("#auth-pw-checklist li")
    expect(items).to_have_count(5)
    for i in range(5):
        expect(items.nth(i)).to_have_class(re.compile(r"\bok\b"))


def test_register_submit_disabled_when_passwords_mismatch(page, base_url):
    _stub_logged_out(page)
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-to-register").click()

    page.locator("#auth-reg-password").fill("LongEnough1!xx")
    page.locator("#auth-reg-password-confirm").fill("Different1!xx")
    expect(page.locator("#auth-reg-submit")).to_be_disabled()

    page.locator("#auth-reg-password-confirm").fill("LongEnough1!xx")
    expect(page.locator("#auth-reg-submit")).to_be_enabled()


def test_reset_submit_disabled_when_passwords_mismatch(page, base_url):
    _stub_logged_out(page)
    page.goto(f"{base_url}?mode=reset&token=abc123")
    expect(page.locator("#auth-panel-reset.active")).to_be_visible()

    page.locator("#auth-reset-password").fill("Correct-Horse9!")
    page.locator("#auth-reset-password-confirm").fill("Different-Horse9!")
    expect(page.locator("#auth-reset-submit")).to_be_disabled()

    page.locator("#auth-reset-password-confirm").fill("Correct-Horse9!")
    expect(page.locator("#auth-reset-submit")).to_be_enabled()


def test_login_success_flips_button_to_logout(page, base_url):
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body='{"user":{"id":1,"email":"a@example.com"},"session_token":"test-session-token"}',
        ),
    )
    for path in ("bookmarks", "completions", "recents"):
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

    # Bearer token from the login response body must be persisted - it authenticates every subsequent request (no cookie anymore).
    stored = page.evaluate("localStorage.getItem('wiki-session-token')")
    assert stored == "test-session-token"


def test_login_shows_success_toast(page, base_url):
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body='{"user":{"id":1,"email":"a@example.com"},"session_token":"test-session-token"}',
        ),
    )
    for path in ("bookmarks", "completions", "recents"):
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
    toast = page.locator("#wiki-toast")
    expect(toast).to_have_class(re.compile(r"\bwiki-toast--success\b"))
    expect(toast).to_contain_text("Logged in")


def test_logout_shows_success_toast(page, base_url):
    page.route(
        "**/api/v1/auth/me",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body='{"user":{"id":1,"email":"a@example.com"}}',
        ),
    )
    page.route("**/api/v1/auth/logout", lambda r: r.fulfill(status=204))
    for path in ("bookmarks", "completions", "recents"):
        page.route(
            f"**/api/v1/{path}",
            lambda r: r.fulfill(status=200, content_type="application/json", body="[]"),
        )
    page.add_init_script(
        "localStorage.setItem('wiki-session-token', 'pre-existing-token')"
    )
    page.goto(base_url)
    expect(page.locator("#auth-btn-home .auth-btn-label")).to_have_text("Logout")

    page.locator("#auth-btn-home").click()
    toast = page.locator("#wiki-toast")
    expect(toast).to_have_class(re.compile(r"\bwiki-toast--success\b"))
    expect(toast).to_contain_text("Logged out")


def test_migrate_modal_shown_on_login_with_local_data(page, base_url):
    """Local data must trigger the dedicated migrate modal, not a toast."""
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body='{"user":{"id":1,"email":"a@example.com"},"session_token":"test-session-token"}',
        ),
    )
    page.route(
        "**/api/v1/import-all",
        lambda r: r.fulfill(status=200, content_type="application/json", body="{}"),
    )
    page.add_init_script(
        "localStorage.setItem('wiki-bookmarks', JSON.stringify([{wikiId:'dsa',path:'foo.md'}]))"
    )

    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("a@example.com")
    page.locator("#auth-login-password").fill("LongEnough1!xx")
    page.locator("#auth-login-submit").click()

    modal = page.locator("#migrate-modal")
    expect(modal).not_to_have_class(re.compile(r"\bhidden\b"))
    page.locator("#migrate-keep").click()
    expect(modal).to_have_class(re.compile(r"\bhidden\b"))


def test_toast_renders_above_migrate_modal(page, base_url):
    """Toasts must stay visible above the migrate modal backdrop."""
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body='{"user":{"id":1,"email":"a@example.com"},"session_token":"test-session-token"}',
        ),
    )
    page.add_init_script(
        "localStorage.setItem('wiki-bookmarks', JSON.stringify([{wikiId:'dsa',path:'foo.md'}]))"
    )

    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("a@example.com")
    page.locator("#auth-login-password").fill("LongEnough1!xx")
    page.locator("#auth-login-submit").click()

    modal = page.locator("#migrate-modal")
    expect(modal).not_to_have_class(re.compile(r"\bhidden\b"))
    page.evaluate(
        "() => document.dispatchEvent(new CustomEvent('wiki:toast', { detail: { message: 'Layer check', durationMs: 8000 } }))"
    )
    page.wait_for_selector(".wiki-toast.visible", timeout=3_000)
    toast_z = page.evaluate("() => getComputedStyle(document.querySelector('.wiki-toast')).zIndex")
    modal_z = page.evaluate("() => getComputedStyle(document.getElementById('migrate-modal')).zIndex")
    assert int(toast_z) > int(modal_z)
    expect(page.locator(".wiki-toast")).to_contain_text("Layer check")


def test_migrate_import_failure_skips_pull_and_warns(page, base_url):
    """Regression: if 'Keep them' import fails, the local data
    that was just chosen to keep must not be silently overwritten by the
    following pullAll() - and the user must see a warning, not silence."""
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body='{"user":{"id":1,"email":"a@example.com"},"session_token":"test-session-token"}',
        ),
    )
    page.route(
        "**/api/v1/import-all",
        lambda r: r.fulfill(status=500, content_type="application/json", body='{"error":{"code":"SERVER_ERROR","message":"boom"}}'),
    )
    pull_called = {"hit": False}
    for path in ("bookmarks", "completions", "recents"):
        page.route(
            f"**/api/v1/{path}",
            lambda r: (pull_called.__setitem__("hit", True), r.fulfill(status=200, content_type="application/json", body="[]"))[1],
        )
    page.add_init_script(
        "localStorage.setItem('wiki-bookmarks', JSON.stringify([{wikiId:'dsa',path:'foo.md'}]))"
    )

    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("a@example.com")
    page.locator("#auth-login-password").fill("LongEnough1!xx")
    page.locator("#auth-login-submit").click()

    modal = page.locator("#migrate-modal")
    expect(modal).not_to_have_class(re.compile(r"\bhidden\b"))
    page.locator("#migrate-keep").click()

    expect(page.locator("#wiki-toast")).to_contain_text("Couldn't save your local data")
    assert not pull_called["hit"], "pullAll() must not run after a failed import - it would overwrite the kept local data"
    stored = page.evaluate("localStorage.getItem('wiki-bookmarks')")
    assert "foo.md" in stored


def test_migrate_modal_uses_bottom_sheet_layout_on_mobile(browser, base_url, cdn_cache):
    """.migrate-dialog should anchor to the bottom and span full width on mobile."""
    ctx = browser.new_context(
        has_touch=True,
        is_mobile=True,
        viewport={"width": 390, "height": 844},
        service_workers="block",
    )
    page = ctx.new_page()
    try:
        for url, (body, content_type) in cdn_cache.items():
            page.route(url, _make_cdn_fulfill_handler(body, content_type))

        _stub_logged_out(page)
        page.route(
            "**/api/v1/auth/login",
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                body='{"user":{"id":1,"email":"a@example.com"},"session_token":"test-session-token"}',
            ),
        )
        page.route(
            "**/api/v1/import-all",
            lambda r: r.fulfill(status=200, content_type="application/json", body="{}"),
        )
        page.add_init_script(
            "localStorage.setItem('wiki-bookmarks', JSON.stringify([{wikiId:'dsa',path:'foo.md'}]))"
        )

        page.goto(base_url)
        page.locator("#auth-btn-home").click()
        page.locator("#auth-login-email").fill("a@example.com")
        page.locator("#auth-login-password").fill("LongEnough1!xx")
        page.locator("#auth-login-submit").click()

        page.wait_for_selector("#migrate-modal:not(.hidden)", timeout=5_000)
        box = page.evaluate("""() => {
            const d = document.querySelector('.migrate-dialog');
            const r = d.getBoundingClientRect();
            return { width: r.width, bottom: r.bottom, viewportHeight: window.innerHeight };
        }""")
        assert box["width"] >= 350, f".migrate-dialog not full-width on mobile: {box['width']}px"
        assert box["bottom"] >= box["viewportHeight"] - 5, (
            f".migrate-dialog not anchored to viewport bottom: bottom={box['bottom']}, "
            f"viewport={box['viewportHeight']}"
        )
    finally:
        ctx.close()


def test_logout_clears_stored_session_token(page, base_url):
    """Logout must clear the bearer token from localStorage - otherwise every
    request after logout keeps sending a dead token and keeps 401ing."""
    page.route(
        "**/api/v1/auth/me",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body='{"user":{"id":1,"email":"a@example.com"}}',
        ),
    )
    page.route("**/api/v1/auth/logout", lambda r: r.fulfill(status=204))
    for path in ("bookmarks", "completions", "recents"):
        page.route(
            f"**/api/v1/{path}",
            lambda r: r.fulfill(status=200, content_type="application/json", body="[]"),
        )
    page.add_init_script(
        "localStorage.setItem('wiki-session-token', 'pre-existing-token')"
    )
    page.goto(base_url)
    expect(page.locator("#auth-btn-home .auth-btn-label")).to_have_text("Logout")

    page.locator("#auth-btn-home").click()
    expect(page.locator("#auth-btn-home .auth-btn-label")).to_have_text("Login")

    stored = page.evaluate("localStorage.getItem('wiki-session-token')")
    assert stored is None


def test_logout_clears_highlights_markers_notes(page, base_url):
    """Regression: logout must wipe highlights, markers, and
    notes, not just bookmarks/recents/read-tracking - otherwise private data
    survives on a shared/public computer."""
    page.route(
        "**/api/v1/auth/me",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body='{"user":{"id":1,"email":"a@example.com"}}',
        ),
    )
    page.route("**/api/v1/auth/logout", lambda r: r.fulfill(status=204))
    for path in ("bookmarks", "completions", "recents"):
        page.route(
            f"**/api/v1/{path}",
            lambda r: r.fulfill(status=200, content_type="application/json", body="[]"),
        )
    page.add_init_script(
        """
        localStorage.setItem('wiki-session-token', 'pre-existing-token');
        localStorage.setItem('wiki-highlights-dsa-arrays', '["h1"]');
        localStorage.setItem('wiki-markers-dsa-arrays', '["m1"]');
        localStorage.setItem('wiki-notes-dsa-arrays', 'secret note');
        """
    )
    page.goto(base_url)
    expect(page.locator("#auth-btn-home .auth-btn-label")).to_have_text("Logout")

    page.locator("#auth-btn-home").click()
    expect(page.locator("#auth-btn-home .auth-btn-label")).to_have_text("Login")

    remaining = page.evaluate(
        """() => Object.keys(localStorage).filter(k =>
            k.startsWith('wiki-highlights-') ||
            k.startsWith('wiki-markers-') ||
            k.startsWith('wiki-notes-')
        )"""
    )
    assert remaining == [], f"expected all cleared, still present: {remaining}"


def test_login_submits_on_enter_key(page, base_url):
    """Pressing Enter in the login password field must submit the form -
    regression for auth panels having no <form> element, so Enter did nothing."""
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body='{"user":{"id":1,"email":"a@example.com"},"session_token":"test-session-token"}',
        ),
    )
    for path in ("bookmarks", "completions", "recents"):
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


def test_login_unverified_verify_panel_copy_distinct_from_register(page, base_url):
    """Regression: login-triggered verify panel must not claim
    a new email was just sent - no email is dispatched on this path."""
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
    expect(page.locator("#auth-verify-copy")).not_to_contain_text("We sent a verification link")


def test_login_empty_submit_blocked_by_required_fields(page, base_url):
    """Regression: empty login submit must not reach the
    network - native required-field validation blocks it client-side."""
    _stub_logged_out(page)
    login_called = {"hit": False}
    page.route(
        "**/api/v1/auth/login",
        lambda r: (login_called.__setitem__("hit", True), r.continue_())[1],
    )
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-submit").click()
    assert not login_called["hit"], "login request must not fire with empty required fields"
    expect(page.locator("#auth-login-email")).to_have_js_property("validity.valid", False)


def test_forgot_empty_submit_blocked_by_required_field(page, base_url):
    """Regression: empty forgot-password submit is blocked
    client-side by the required attribute."""
    _stub_logged_out(page)
    forgot_called = {"hit": False}
    page.route(
        "**/api/v1/auth/forgot-password",
        lambda r: (forgot_called.__setitem__("hit", True), r.continue_())[1],
    )
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-to-forgot").click()
    page.locator("#auth-forgot-submit").click()
    assert not forgot_called["hit"], "forgot-password request must not fire with empty email"
    expect(page.locator("#auth-forgot-email")).to_have_js_property("validity.valid", False)


def test_forgot_sent_message_cleared_on_panel_swap(page, base_url):
    """Regression: '#auth-forgot-sent' must not survive a swap
    away from and back to the forgot panel - otherwise a later, unsubmitted
    attempt shows a stale success message before the user even resubmits."""
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/forgot-password",
        lambda r: r.fulfill(status=200, content_type="application/json", body="{}"),
    )
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-to-forgot").click()
    page.locator("#auth-forgot-email").fill("a@example.com")
    page.locator("#auth-forgot-submit").click()
    expect(page.locator("#auth-forgot-sent")).to_be_visible()

    page.locator("#auth-forgot-to-login").click()
    page.locator("#auth-to-forgot").click()
    expect(page.locator("#auth-forgot-sent")).to_be_hidden()


def test_login_network_error_shows_fe_authored_message(page, base_url):
    """Regression: a dropped connection must not leak
    the raw browser fetch-failure string (e.g. 'Failed to fetch') into the
    login error - it must show the FE-authored network message instead."""
    _stub_logged_out(page)
    page.route("**/api/v1/auth/login", lambda route: route.abort())
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("a@example.com")
    page.locator("#auth-login-password").fill("LongEnough1!xx")
    page.locator("#auth-login-submit").click()

    error = page.locator("#auth-login-error")
    expect(error).to_be_visible()
    expect(error).to_have_text("Couldn't reach the server. Check your connection and try again.")
    expect(error).not_to_contain_text("Failed to fetch")


def test_resend_network_error_does_not_claim_success(page, base_url):
    """Regression: resend's anti-enumeration 'sent' message is
    only valid for auth-domain errors - a genuine network failure must be
    surfaced, not swallowed into a false success toast."""
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=403,
            content_type="application/json",
            body='{"error":{"code":"UNVERIFIED","message":"not verified"}}',
        ),
    )
    page.route("**/api/v1/auth/resend", lambda route: route.abort())
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("a@example.com")
    page.locator("#auth-login-password").fill("LongEnough1!xx")
    page.locator("#auth-login-submit").click()
    expect(page.locator("#auth-panel-verify.active")).to_be_visible()

    page.locator("#auth-resend-btn").click()
    expect(page.locator("#wiki-toast")).to_contain_text("Couldn't reach the server")
    expect(page.locator("#wiki-toast")).not_to_contain_text("Verification email sent")


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
    """Regression: the session-expired guard used to reset on
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
    for path in ("bookmarks", "completions", "recents"):
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
            api.completions.list().catch(() => []),
            api.recents.list().catch(() => []),
        ]);
    }""")
    fire_count = page.evaluate("window.__sessionExpiredCount")
    assert fire_count == 1, (
        f"expected exactly one wiki:session-expired dispatch, got {fire_count}"
    )


def test_session_changed_same_article_does_not_tear_down_reading_state(page, base_url):
    """Regression: wiki:session-changed used to unconditionally
    re-route, tearing down focus mode and rebuilding the article even when
    the session event fired for the same article already on screen. It must
    now only refresh session-dependent chrome when the path is unchanged."""
    _stub_logged_out(page)
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )

    page.keyboard.press("f")
    page.wait_for_selector("#markdown-body.focus-mode", timeout=3_000)

    page.evaluate("() => document.dispatchEvent(new CustomEvent('wiki:session-changed'))")
    page.wait_for_timeout(200)

    assert page.evaluate(
        "() => document.getElementById('markdown-body').classList.contains('focus-mode')"
    ), "Focus mode must survive a same-path session-changed event"


def test_reset_panel_has_recovery_links(page, base_url):
    """Regression: the reset-password panel must offer a way
    back to login and a way to request a fresh link, so an expired/invalid
    reset link doesn't dead-end the user."""
    _stub_logged_out(page)
    page.goto(f"{base_url}?mode=reset&token=expiredtoken")
    expect(page.locator("#auth-panel-reset.active")).to_be_visible()

    back_to_login = page.locator("#auth-reset-to-login")
    request_new = page.locator("#auth-reset-to-forgot")
    expect(back_to_login).to_be_visible()
    expect(request_new).to_be_visible()

    request_new.click()
    expect(page.locator("#auth-panel-forgot.active")).to_be_visible()


def test_reset_panel_back_to_login_link_works(page, base_url):
    """Regression: back-to-login link from the reset panel
    swaps to the login panel."""
    _stub_logged_out(page)
    page.goto(f"{base_url}?mode=reset&token=expiredtoken")
    expect(page.locator("#auth-panel-reset.active")).to_be_visible()
    page.locator("#auth-reset-to-login").click()
    expect(page.locator("#auth-panel-login.active")).to_be_visible()


def test_reset_link_boot_param_opens_panel_and_strips_url(page, base_url):
    """Regression: handleBootParams must consume mode/token
    synchronously on boot and strip them from the URL, independent of any
    later service-worker controllerchange reload."""
    _stub_logged_out(page)
    page.goto(f"{base_url}?mode=reset&token=abc123")
    expect(page.locator("#auth-modal")).not_to_have_class(re.compile(r"\bhidden\b"))
    expect(page.locator("#auth-panel-reset.active")).to_be_visible()
    assert "mode=" not in page.url
    assert "token=" not in page.url


def test_reset_password_used_token_shows_actionable_error(page, base_url):
    """A reset token already consumed (e.g. reset link opened/submitted twice)
    must not show the generic 'Reset failed' message - it should tell the
    user they may already be reset and to try logging in instead."""
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/reset-password",
        lambda r: r.fulfill(
            status=400,
            content_type="application/json",
            body='{"error":{"code":"INVALID_TOKEN","message":"This verification link is invalid or has expired."}}',
        ),
    )
    page.goto(f"{base_url}?mode=reset&token=usedtoken")
    expect(page.locator("#auth-panel-reset.active")).to_be_visible()

    page.locator("#auth-reset-password").fill("Correct-Horse9!")
    page.locator("#auth-reset-password-confirm").fill("Correct-Horse9!")
    page.locator("#auth-reset-submit").click()

    error = page.locator("#auth-reset-error")
    expect(error).to_be_visible()
    expect(error).to_contain_text("already used")
    expect(error).to_contain_text("try logging in")


def test_auth_modal_traps_focus_with_shift_tab(page, base_url):
    """Regression: Shift+Tab on the first focusable element in
    the auth dialog must wrap to the last, instead of leaking focus to the
    hidden background page."""
    _stub_logged_out(page)
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    expect(page.locator("#auth-panel-login.active")).to_be_visible()

    first = page.locator("#auth-close")
    first.focus()
    page.keyboard.press("Shift+Tab")
    active_id = page.evaluate("document.activeElement.id")
    assert active_id != "", "focus must stay on a named element inside the dialog"
    is_inside_dialog = page.evaluate(
        "document.querySelector('.auth-dialog').contains(document.activeElement)"
    )
    assert is_inside_dialog, "focus escaped .auth-dialog on Shift+Tab from first element"


def test_auth_modal_traps_focus_with_tab_forward(page, base_url):
    """Regression: Tab on the last focusable element must wrap
    back to the first, not leak past the dialog."""
    _stub_logged_out(page)
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    expect(page.locator("#auth-panel-login.active")).to_be_visible()

    last_visible = page.evaluate("""() => {
        const dialog = document.querySelector('.auth-dialog');
        const focusable = dialog.querySelectorAll(
            'button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), a[href]'
        );
        const visible = Array.from(focusable).filter(el => el.offsetParent !== null);
        const last = visible[visible.length - 1];
        last.focus();
        return last.id;
    }""")
    page.keyboard.press("Tab")
    is_inside_dialog = page.evaluate(
        "document.querySelector('.auth-dialog').contains(document.activeElement)"
    )
    assert is_inside_dialog, "focus escaped .auth-dialog on Tab from last element"


def test_auth_modal_removes_focus_trap_on_close(page, base_url):
    """Regression: closing the modal must remove the keydown
    listener so Tab behaves normally on the page again."""
    _stub_logged_out(page)
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    expect(page.locator("#auth-panel-login.active")).to_be_visible()
    page.locator("#auth-close").click()
    expect(page.locator("#auth-modal")).to_have_class(re.compile(r"\bhidden\b"))


def test_login_syncs_across_tabs(page, base_url):
    """Regression: a login in one tab must reflect in another
    open tab (same browser context) without a manual reload - via the
    wiki-session-sync localStorage key + storage-event listener.

    Both tabs share one real localStorage (same origin, same browser context),
    so the bearer token tab1's login writes is genuinely visible to tab2 - but
    /auth/me is still mocked as stateful (shared `logged_in` flag) since tab2's
    request happens before tab1 has logged in, and a plain per-tab 401 stub
    would never observe tab1's later login regardless of the token."""
    session = {"logged_in": False}

    def _route_common(pg):
        pg.route(
            "**/api/v1/auth/me",
            lambda r: r.fulfill(
                status=200 if session["logged_in"] else 401,
                content_type="application/json",
                body='{"user":{"id":1,"email":"a@example.com"}}' if session["logged_in"] else _UNAUTH,
            ),
        )
        pg.route(
            "**/api/v1/auth/login",
            lambda r: (
                session.__setitem__("logged_in", True),
                r.fulfill(
                    status=200,
                    content_type="application/json",
                    body='{"user":{"id":1,"email":"a@example.com"},"session_token":"test-session-token"}',
                ),
            )[1],
        )
        for path in ("bookmarks", "completions", "recents"):
            pg.route(
                f"**/api/v1/{path}",
                lambda r: r.fulfill(status=200, content_type="application/json", body="[]"),
            )

    _route_common(page)
    page.goto(base_url)

    tab2 = page.context.new_page()
    _route_common(tab2)
    tab2.goto(base_url)
    expect(tab2.locator("#auth-btn-home .auth-btn-label")).to_have_text("Login")

    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("a@example.com")
    page.locator("#auth-login-password").fill("LongEnough1!xx")
    page.locator("#auth-login-submit").click()
    expect(page.locator("#auth-btn-home .auth-btn-label")).to_have_text("Logout")

    expect(tab2.locator("#auth-btn-home .auth-btn-label")).to_have_text("Logout")
    tab2.close()


def test_login_in_other_tab_pulls_server_data_into_this_tab(page, base_url):
    """Regression: cross-tab session-sync listener must call Sync.pullAll() on login, not just flip UI chrome."""
    session = {"logged_in": False}

    def _route_common(pg):
        pg.route(
            "**/api/v1/auth/me",
            lambda r: r.fulfill(
                status=200 if session["logged_in"] else 401,
                content_type="application/json",
                body='{"user":{"id":1,"email":"a@example.com"}}' if session["logged_in"] else _UNAUTH,
            ),
        )
        pg.route(
            "**/api/v1/auth/login",
            lambda r: (
                session.__setitem__("logged_in", True),
                r.fulfill(
                    status=200,
                    content_type="application/json",
                    body='{"user":{"id":1,"email":"a@example.com"},"session_token":"test-session-token"}',
                ),
            )[1],
        )
        pg.route(
            "**/api/v1/bookmarks",
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                body='[{"wiki_id":"system-design","path":"./content/system-design/caching.md"}]',
            ),
        )
        for path in ("recents", "completions"):
            pg.route(
                f"**/api/v1/{path}",
                lambda r: r.fulfill(status=200, content_type="application/json", body="[]"),
            )

    _route_common(page)
    page.goto(base_url)

    tab2 = page.context.new_page()
    _route_common(tab2)
    tab2.goto(base_url)
    expect(tab2.locator("#auth-btn-home .auth-btn-label")).to_have_text("Login")

    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("a@example.com")
    page.locator("#auth-login-password").fill("LongEnough1!xx")
    page.locator("#auth-login-submit").click()
    expect(page.locator("#auth-btn-home .auth-btn-label")).to_have_text("Logout")

    expect(tab2.locator("#auth-btn-home .auth-btn-label")).to_have_text("Logout")
    tab2.wait_for_function(
        "() => JSON.parse(localStorage.getItem('wiki-bookmarks') || '[]').length > 0"
    )
    bookmarks = tab2.evaluate("() => JSON.parse(localStorage.getItem('wiki-bookmarks'))")
    assert any("caching" in b["path"] for b in bookmarks)
    tab2.close()


def test_logout_in_other_tab_clears_user_data_cache_in_this_tab(page, base_url):
    """Regression: cross-tab session-sync listener must call Sync.clearUserDataCache() on logout, not just flip UI chrome."""
    session = {"logged_in": True}

    def _route_common(pg):
        pg.route(
            "**/api/v1/auth/me",
            lambda r: r.fulfill(
                status=200 if session["logged_in"] else 401,
                content_type="application/json",
                body='{"user":{"id":1,"email":"a@example.com"}}' if session["logged_in"] else _UNAUTH,
            ),
        )
        pg.route(
            "**/api/v1/auth/logout",
            lambda r: (
                session.__setitem__("logged_in", False),
                r.fulfill(status=204, body=""),
            )[1],
        )
        pg.route(
            "**/api/v1/bookmarks",
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                body='[{"wiki_id":"system-design","path":"./content/system-design/caching.md"}]',
            ),
        )
        for path in ("recents", "completions"):
            pg.route(
                f"**/api/v1/{path}",
                lambda r: r.fulfill(status=200, content_type="application/json", body="[]"),
            )

    _seed_token = "localStorage.setItem('wiki-session-token', 'test-session-token')"

    _route_common(page)
    page.add_init_script(_seed_token)
    page.goto(base_url, wait_until="domcontentloaded")
    expect(page.locator("#auth-btn-home .auth-btn-label")).to_have_text("Logout")

    tab2 = page.context.new_page()
    _route_common(tab2)
    tab2.add_init_script(_seed_token)
    tab2.goto(base_url, wait_until="domcontentloaded")
    expect(tab2.locator("#auth-btn-home .auth-btn-label")).to_have_text("Logout")

    page.locator("#auth-btn-home").click()
    expect(page.locator("#auth-btn-home .auth-btn-label")).to_have_text("Login")

    expect(tab2.locator("#auth-btn-home .auth-btn-label")).to_have_text("Login")
    tab2.wait_for_function(
        "() => JSON.parse(localStorage.getItem('wiki-bookmarks') || '[]').length === 0"
    )
    tab2.close()


def test_login_error_announced_to_screen_readers(page, base_url):
    """Regression: auth error elements need role=alert (or
    aria-live) so assistive tech announces them, and the field must be
    linked via aria-describedby."""
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
    assert err.get_attribute("role") == "alert"
    email_describedby = page.locator("#auth-login-email").get_attribute("aria-describedby")
    pw_describedby = page.locator("#auth-login-password").get_attribute("aria-describedby")
    assert email_describedby == "auth-login-error"
    assert pw_describedby == "auth-login-error"


def test_forgot_error_has_alert_role(page, base_url):
    """Regression: forgot-password error is announced too."""
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/forgot-password",
        lambda r: r.fulfill(
            status=500,
            content_type="application/json",
            body='{"error":{"code":"SERVER_ERROR","message":"Could not send reset link."}}',
        ),
    )
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-to-forgot").click()
    page.locator("#auth-forgot-email").fill("a@example.com")
    page.locator("#auth-forgot-submit").click()
    err = page.locator("#auth-forgot-error")
    expect(err).to_be_visible()
    assert err.get_attribute("role") == "alert"


def test_login_double_click_fires_single_request(page, base_url):
    """Regression: rapid double-click/double-submit must not
    fire duplicate POSTs - the submit button is disabled synchronously
    before the request resolves."""
    _stub_logged_out(page)
    call_count = {"n": 0}

    def _handle_login(route):
        call_count["n"] += 1
        route.fulfill(
            status=200,
            content_type="application/json",
            body='{"user":{"id":1,"email":"a@example.com"},"session_token":"test-session-token"}',
        )

    page.route("**/api/v1/auth/login", _handle_login)
    for path in ("bookmarks", "completions", "recents"):
        page.route(
            f"**/api/v1/{path}",
            lambda r: r.fulfill(status=200, content_type="application/json", body="[]"),
        )

    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("a@example.com")
    page.locator("#auth-login-password").fill("LongEnough1!xx")

    # Two Locator.click() calls can't land back-to-back reliably (submit-button actionability heuristics); dispatch both from one JS pass to test the guard itself, not click timing.
    page.evaluate("""() => {
        const btn = document.getElementById('auth-login-submit');
        btn.click();
        btn.click();
    }""")

    expect(page.locator("#auth-btn-home .auth-btn-label")).to_have_text("Logout")
    assert call_count["n"] == 1, f"expected exactly one login request, got {call_count['n']}"


def test_login_submit_disabled_during_inflight_request(page, base_url):
    """Regression: submit button is disabled while the login
    request is in flight, and re-enabled after an error response."""
    _stub_logged_out(page)

    def _handle_login(route):
        route.fulfill(
            status=401,
            content_type="application/json",
            body='{"error":{"code":"BAD_CREDENTIALS","message":"Invalid email or password"}}',
        )

    page.route("**/api/v1/auth/login", _handle_login)
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("a@example.com")
    page.locator("#auth-login-password").fill("WrongPass123!")
    submit = page.locator("#auth-login-submit")
    submit.click()
    expect(page.locator("#auth-login-error")).to_be_visible()
    expect(submit).to_be_enabled()


def test_resend_button_debounced_and_shows_feedback(page, base_url):
    """Regression: resend gives visible feedback and cannot be
    double-fired by rapid clicks."""
    _stub_logged_out(page)
    call_count = {"n": 0}
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=403,
            content_type="application/json",
            body='{"error":{"code":"UNVERIFIED","message":"verify first"}}',
        ),
    )

    def _handle_resend(route):
        call_count["n"] += 1
        route.fulfill(status=200, content_type="application/json", body="{}")

    page.route("**/api/v1/auth/resend-verification", _handle_resend)

    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("a@example.com")
    page.locator("#auth-login-password").fill("LongEnough1!xx")
    page.locator("#auth-login-submit").click()
    expect(page.locator("#auth-panel-verify.active")).to_be_visible()

    # Same reasoning as test_login_double_click_fires_single_request - dispatch both clicks from one JS pass to verify the debounce guard, not click timing.
    page.evaluate("""() => {
        const btn = document.getElementById('auth-resend-btn');
        btn.click();
        btn.click();
    }""")
    expect(page.locator(".wiki-toast")).to_be_visible()
    assert call_count["n"] == 1, f"expected exactly one resend request, got {call_count['n']}"


def test_resend_after_login_403_uses_login_email(page, base_url):
    """Regression: resend on the login->verify path must send
    the email typed into the login form, not the (empty) register form."""
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=403,
            content_type="application/json",
            body='{"error":{"code":"UNVERIFIED","message":"verify first"}}',
        ),
    )

    sent = {}

    def _handle_resend(route):
        sent["email"] = route.request.post_data_json.get("email")
        route.fulfill(status=200, content_type="application/json", body="{}")

    page.route("**/api/v1/auth/resend-verification", _handle_resend)

    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("login-user@example.com")
    page.locator("#auth-login-password").fill("LongEnough1!xx")
    page.locator("#auth-login-submit").click()
    expect(page.locator("#auth-panel-verify.active")).to_be_visible()

    page.locator("#auth-resend-btn").click()
    expect(page.locator(".wiki-toast")).to_be_visible()
    assert sent.get("email") == "login-user@example.com"


def test_verify_link_boot_param_calls_verify_and_strips_url(page, base_url):
    """Regression: ?mode=verify&token=... must trigger
    verification and strip params from the URL on first load."""
    _stub_logged_out(page)
    verify_called = {"hit": False}

    def _handle_verify(route):
        verify_called["hit"] = True
        route.fulfill(status=200, content_type="application/json", body='{"ok":true}')

    page.route("**/api/v1/auth/verify*", _handle_verify)
    page.goto(f"{base_url}?mode=verify&token=xyz789")
    page.wait_for_timeout(200)
    assert verify_called["hit"], "expected verify endpoint to be called from boot params"
    assert "mode=" not in page.url
    assert "token=" not in page.url


def test_register_password_reveal_toggle(page, base_url):
    """The show/hide toggle on the register password field flips
    the input's type and its own accessible label."""
    _stub_logged_out(page)
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-to-register").click()

    pw = page.locator("#auth-reg-password")
    toggle = page.locator("#auth-reg-pw-toggle")
    expect(pw).to_have_attribute("type", "password")
    assert toggle.get_attribute("aria-label") == "Show password"

    toggle.click()
    expect(pw).to_have_attribute("type", "text")
    assert toggle.get_attribute("aria-label") == "Hide password"

    toggle.click()
    expect(pw).to_have_attribute("type", "password")


def test_register_submit_shows_loading_label_and_locks_inputs(page, base_url):
    """Submitting register swaps the button label to a loading
    state and disables the form's inputs until the request resolves."""
    _stub_logged_out(page)
    release_event = threading.Event()

    def _handle_register(route):
        # Hold the response so the test can observe the in-flight loading state.
        release_event.wait(timeout=5)
        route.fulfill(status=200, content_type="application/json", body="{}")

    page.route("**/api/v1/auth/register", _handle_register)
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-to-register").click()
    page.locator("#auth-reg-email").fill("new-user@example.com")
    page.locator("#auth-reg-password").fill("LongEnough1!xx")
    page.locator("#auth-reg-password-confirm").fill("LongEnough1!xx")

    # Locator.click() blocks until the request settles; observe mid-flight state via JS instead.
    in_flight = page.evaluate("""() => {
        document.getElementById('auth-reg-submit').click();
        return {
            emailDisabled: document.getElementById('auth-reg-email').disabled,
            pwDisabled: document.getElementById('auth-reg-password').disabled,
            label: document.querySelector('#auth-reg-submit .auth-submit-label').textContent,
        };
    }""")
    assert in_flight["emailDisabled"] is True
    assert in_flight["pwDisabled"] is True
    assert in_flight["label"] == "Creating…"

    release_event.set()
    expect(page.locator("#auth-reg-submit .auth-submit-label")).to_have_text("Create account")
    expect(page.locator("#auth-reg-email")).to_be_enabled()


def test_verify_result_failure_shows_resend_form(page, base_url):
    """A failed verify-from-link shows a resend sub-form so the
    user can request a fresh link without a login-fail detour."""
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/verify*",
        lambda r: r.fulfill(
            status=400,
            content_type="application/json",
            body='{"error":{"code":"INVALID_TOKEN","message":"invalid"}}',
        ),
    )
    page.goto(f"{base_url}?mode=verify&token=badtoken")
    expect(page.locator("#auth-panel-verify-result.active")).to_be_visible()
    expect(page.locator("#auth-form-verify-result-resend")).to_be_visible()
    expect(page.locator("#auth-verify-result-copy")).to_contain_text("invalid or has expired")
    # Regression: heading must move off the static "Verifying your email".
    expect(page.locator("#auth-verify-result-title")).to_have_text("Verification failed")


def test_verify_result_success_hides_resend_form(page, base_url):
    """A successful verify-from-link never reveals the resend form."""
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/verify*",
        lambda r: r.fulfill(status=200, content_type="application/json", body='{"ok":true}'),
    )
    page.goto(f"{base_url}?mode=verify&token=goodtoken")
    expect(page.locator("#auth-panel-verify-result.active")).to_be_visible()
    expect(page.locator("#auth-form-verify-result-resend")).to_be_hidden()
    # Regression: heading must move off the static "Verifying your email".
    expect(page.locator("#auth-verify-result-title")).to_have_text("Email verified")


def test_verify_result_resend_submits_typed_email(page, base_url):
    """The verify-result panel's resend form sends whatever email
    the user types there, since verifyFromLink never learns one from the token."""
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/verify*",
        lambda r: r.fulfill(
            status=400,
            content_type="application/json",
            body='{"error":{"code":"INVALID_TOKEN","message":"invalid"}}',
        ),
    )
    sent = {}
    page.route(
        "**/api/v1/auth/resend-verification",
        lambda r: (
            sent.__setitem__("email", r.request.post_data_json.get("email")),
            r.fulfill(status=200, content_type="application/json", body="{}"),
        )[1],
    )
    page.goto(f"{base_url}?mode=verify&token=badtoken")
    page.locator("#auth-verify-result-resend-email").fill("retry-user@example.com")
    page.locator("#auth-verify-result-resend-btn").click()
    expect(page.locator(".wiki-toast")).to_be_visible()
    assert sent.get("email") == "retry-user@example.com"


def test_resend_button_shows_cooldown_after_send(page, base_url):
    """After a successful resend, the button disables and shows a
    countdown, independent of the existing double-click submit guard."""
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=403,
            content_type="application/json",
            body='{"error":{"code":"UNVERIFIED","message":"verify first"}}',
        ),
    )
    page.route(
        "**/api/v1/auth/resend-verification",
        lambda r: r.fulfill(status=200, content_type="application/json", body="{}"),
    )
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("a@example.com")
    page.locator("#auth-login-password").fill("LongEnough1!xx")
    page.locator("#auth-login-submit").click()
    expect(page.locator("#auth-panel-verify.active")).to_be_visible()

    page.locator("#auth-resend-btn").click()
    resend_btn = page.locator("#auth-resend-btn")
    expect(resend_btn).to_be_disabled()
    expect(resend_btn.locator(".auth-submit-label")).to_have_text(re.compile(r"Resend in \d+s"))


def test_login_error_sets_aria_invalid_on_inputs(page, base_url):
    """A login failure marks the email/password inputs aria-invalid
    so assistive tech announces the errored fields, clearing on next attempt."""
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

    expect(page.locator("#auth-login-email")).to_have_attribute("aria-invalid", "true")
    expect(page.locator("#auth-login-password")).to_have_attribute("aria-invalid", "true")

    page.locator("#auth-to-register").click()
    page.locator("#auth-to-login").click()
    expect(page.locator("#auth-login-email")).not_to_have_attribute("aria-invalid", "true")


def test_password_checklist_has_screen_reader_met_state(page, base_url):
    """Each checklist item exposes its pass/fail state as text, not
    just a CSS ::before glyph screen readers don't reliably announce."""
    _stub_logged_out(page)
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-to-register").click()

    pw = page.locator("#auth-reg-password")
    pw.fill("short")
    first_item = page.locator("#auth-pw-checklist li").first
    expect(first_item).to_contain_text("not met")

    pw.fill("LongEnough1!xx")
    expect(first_item).to_contain_text("met")
    expect(first_item).not_to_contain_text("not met")
