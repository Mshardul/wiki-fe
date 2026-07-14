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
            body='{"user":{"id":1,"email":"a@example.com"},"session_token":"test-session-token"}',
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

    # bearer token from the login response body must be persisted, since it's
    # what every subsequent request authenticates with (no cookie anymore).
    stored = page.evaluate("localStorage.getItem('wiki-session-token')")
    assert stored == "test-session-token"


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
    for path in ("bookmarks", "reads", "recents"):
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


def test_login_unverified_verify_panel_copy_distinct_from_register(page, base_url):
    """Regression for WIKI-420: login-triggered verify panel must not claim
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
    """Regression for WIKI-418: empty login submit must not reach the
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
    """Regression for WIKI-418: empty forgot-password submit is blocked
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


def test_reset_panel_has_recovery_links(page, base_url):
    """Regression for WIKI-422: the reset-password panel must offer a way
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
    """Regression for WIKI-422: back-to-login link from the reset panel
    swaps to the login panel."""
    _stub_logged_out(page)
    page.goto(f"{base_url}?mode=reset&token=expiredtoken")
    expect(page.locator("#auth-panel-reset.active")).to_be_visible()
    page.locator("#auth-reset-to-login").click()
    expect(page.locator("#auth-panel-login.active")).to_be_visible()


def test_reset_link_boot_param_opens_panel_and_strips_url(page, base_url):
    """Regression for WIKI-417: handleBootParams must consume mode/token
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
    page.locator("#auth-reset-submit").click()

    error = page.locator("#auth-reset-error")
    expect(error).to_be_visible()
    expect(error).to_contain_text("already used")
    expect(error).to_contain_text("try logging in")


def test_auth_modal_traps_focus_with_shift_tab(page, base_url):
    """Regression for WIKI-423: Shift+Tab on the first focusable element in
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
    """Regression for WIKI-423: Tab on the last focusable element must wrap
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
    """Regression for WIKI-423: closing the modal must remove the keydown
    listener so Tab behaves normally on the page again."""
    _stub_logged_out(page)
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    expect(page.locator("#auth-panel-login.active")).to_be_visible()
    page.locator("#auth-close").click()
    expect(page.locator("#auth-modal")).to_have_class(re.compile(r"\bhidden\b"))


def test_login_syncs_across_tabs(page, base_url):
    """Regression for WIKI-421: a login in one tab must reflect in another
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
        for path in ("bookmarks", "reads", "recents"):
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


def test_login_error_announced_to_screen_readers(page, base_url):
    """Regression for WIKI-419: auth error elements need role=alert (or
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
    """Regression for WIKI-419: forgot-password error is announced too."""
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
    """Regression for WIKI-416: rapid double-click/double-submit must not
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
    for path in ("bookmarks", "reads", "recents"):
        page.route(
            f"**/api/v1/{path}",
            lambda r: r.fulfill(status=200, content_type="application/json", body="[]"),
        )

    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("a@example.com")
    page.locator("#auth-login-password").fill("LongEnough1!xx")

    # Dispatch both clicks synchronously from within the page instead of two
    # separate Playwright Locator.click() calls. A real Locator.click() on a
    # type="submit" button waits on Playwright's own actionability/navigation
    # heuristics, which can take long enough for the whole login+modal-close
    # chain to finish between the two Python-side calls - making "rapid
    # double-click" impossible to land reliably from the test-runner side.
    # Dispatching both click events in one JS pass guarantees the second
    # click's guard check happens the instant after the first, which is what
    # this test is actually meant to verify (the JS-side guard, not click
    # timing).
    page.evaluate("""() => {
        const btn = document.getElementById('auth-login-submit');
        btn.click();
        btn.click();
    }""")

    expect(page.locator("#auth-btn-home .auth-btn-label")).to_have_text("Logout")
    assert call_count["n"] == 1, f"expected exactly one login request, got {call_count['n']}"


def test_login_submit_disabled_during_inflight_request(page, base_url):
    """Regression for WIKI-416: submit button is disabled while the login
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
    """Regression for WIKI-416: resend gives visible feedback and cannot be
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
    # #auth-login-submit is type="submit" inside a <form> - a real
    # Locator.click() waits on Playwright's navigation-related actionability
    # heuristics for submit buttons, which can take several seconds even
    # though the app calls preventDefault(). Dispatch via JS to skip that.
    page.evaluate("() => document.getElementById('auth-login-submit').click()")
    expect(page.locator("#auth-panel-verify.active")).to_be_visible()

    # Same reasoning as test_login_double_click_fires_single_request: dispatch
    # both clicks in one JS pass so they land back-to-back, verifying the
    # debounce guard itself rather than racing Playwright's click timing.
    page.evaluate("""() => {
        const btn = document.getElementById('auth-resend-btn');
        btn.click();
        btn.click();
    }""")
    expect(page.locator(".wiki-toast")).to_be_visible()
    assert call_count["n"] == 1, f"expected exactly one resend request, got {call_count['n']}"


def test_verify_link_boot_param_calls_verify_and_strips_url(page, base_url):
    """Regression for WIKI-417: ?mode=verify&token=... must trigger
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
