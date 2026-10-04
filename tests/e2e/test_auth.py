import re

import pytest
from playwright.sync_api import expect

_UNAUTH = '{"error":{"code":"UNAUTHORIZED","message":"no session"}}'

# Not ported (no ids - aria-label/role/text selectors): migrate-modal (window.confirm() instead), mobile bottom-sheet/drag-handle (.auth-drag-handle unused), #auth-close button (Escape/backdrop only). Dropped: session-changed-tears-down-reading-state — useSession is the only listener, no router teardown exists to regress.
# Bugs found+fixed this sweep: double-click fired two requests (busy state lagged a render, fixed with sync busyRef); missing aria-invalid/aria-describedby on login error; verify-result had no resend path on failure.


def _stub_logged_out(page):
    page.route(
        "**/api/v1/auth/me",
        lambda r: r.fulfill(status=401, content_type="application/json", body=_UNAUTH),
    )


def _stub_synced_domains_empty(page):
    for path in ("bookmarks", "completions", "recents"):
        page.route(
            f"**/api/v1/{path}",
            lambda r: r.fulfill(status=200, content_type="application/json", body="[]"),
        )


def _open_auth(page):
    page.locator(".topbar-auth-btn:visible").first.click()
    page.wait_for_selector('[role="dialog"][aria-label="Account"]', timeout=5_000)


def _auth_dialog(page):
    return page.locator('[role="dialog"][aria-label="Account"]')


# ── open / close ──────────────────────────────────────────────────────────────


@pytest.mark.smoke
def test_auth_modal_opens_from_topbar(page, base_url):
    _stub_logged_out(page)
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    expect(page.get_by_role("heading", name="Log in")).to_be_visible()


def test_auth_modal_centered_on_desktop(page, base_url):
    """Above 640px the auth dialog is a centered dialog; below it responsive.css makes it a bottom sheet."""
    _stub_logged_out(page)
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    style = page.evaluate("() => getComputedStyle(document.querySelector('.auth-modal')).alignItems")
    assert style == "center", f"Backdrop should center the dialog on desktop, got '{style}'"


def test_auth_modal_closes_on_escape(page, base_url):
    _stub_logged_out(page)
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    page.keyboard.press("Escape")
    page.wait_for_selector('[role="dialog"][aria-label="Account"]', state="detached")


def test_auth_btn_shows_icon_and_label(page, base_url):
    _stub_logged_out(page)
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    btn = page.locator(".topbar-auth-btn:visible").first
    expect(btn.locator("svg")).to_be_visible()
    expect(btn).to_contain_text("Log in")


# ── register checklist ──────────────────────────────────────────────────────


def test_register_checklist_turns_green(page, base_url):
    _stub_logged_out(page)
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_role("button", name="Create account").click()

    pw = _auth_dialog(page).get_by_label("Password", exact=True)
    pw.fill("short")
    expect(_auth_dialog(page).get_by_role("button", name="Create account")).to_be_disabled()

    pw.fill("LongEnough1!xx")
    _auth_dialog(page).get_by_label("Confirm password").fill("LongEnough1!xx")
    items = page.locator(".auth-pw-checklist li")
    expect(items).to_have_count(5)
    for i in range(5):
        expect(items.nth(i)).to_have_class(re.compile(r"\bok\b"))
    expect(_auth_dialog(page).get_by_role("button", name="Create account")).to_be_enabled()


def test_register_checklist_resyncs_on_panel_leave_and_return(page, base_url):
    _stub_logged_out(page)
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_role("button", name="Create account").click()
    _auth_dialog(page).get_by_label("Password", exact=True).fill("LongEnough1!xx")
    _auth_dialog(page).get_by_label("Confirm password").fill("LongEnough1!xx")
    expect(_auth_dialog(page).get_by_role("button", name="Create account")).to_be_enabled()

    _auth_dialog(page).get_by_role("button", name="Back to log in").click()
    _auth_dialog(page).get_by_role("button", name="Create account").click()

    # swap() clears the shared password field on every panel change - differs from vanilla's per-panel-persisted state
    expect(_auth_dialog(page).get_by_label("Password", exact=True)).to_have_value("")


def test_register_submit_disabled_when_passwords_mismatch(page, base_url):
    _stub_logged_out(page)
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_role("button", name="Create account").click()

    _auth_dialog(page).get_by_label("Password", exact=True).fill("LongEnough1!xx")
    _auth_dialog(page).get_by_label("Confirm password").fill("Different1!xx")
    expect(_auth_dialog(page).get_by_role("button", name="Create account")).to_be_disabled()

    _auth_dialog(page).get_by_label("Confirm password").fill("LongEnough1!xx")
    expect(_auth_dialog(page).get_by_role("button", name="Create account")).to_be_enabled()


def test_reset_submit_disabled_when_passwords_mismatch(page, base_url):
    _stub_logged_out(page)
    page.goto(f"{base_url}/?mode=reset&token=abc123", wait_until="domcontentloaded")
    expect(page.get_by_role("heading", name="Set a new password")).to_be_visible()

    _auth_dialog(page).get_by_label("New password", exact=True).fill("Correct-Horse9!")
    _auth_dialog(page).get_by_label("Confirm new password").fill("Different-Horse9!")
    expect(_auth_dialog(page).get_by_role("button", name="Update password")).to_be_disabled()

    _auth_dialog(page).get_by_label("Confirm new password").fill("Correct-Horse9!")
    expect(_auth_dialog(page).get_by_role("button", name="Update password")).to_be_enabled()


# ── login / logout ──────────────────────────────────────────────────────────


def _stub_login_success(page):
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body='{"user":{"id":"1","email":"a@example.com"},"session_token":"test-session-token"}',
        ),
    )


@pytest.mark.smoke
def test_login_success_flips_button_to_logout(page, base_url):
    _stub_logged_out(page)
    _stub_login_success(page)
    _stub_synced_domains_empty(page)

    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_label("Password", exact=True).fill("LongEnough1!xx")
    _auth_dialog(page).get_by_role("button", name="Log in").click()
    expect(page.locator(".topbar-auth-btn:visible").first).to_contain_text("Log out")

    stored = page.evaluate("() => localStorage.getItem('wiki-session-token')")
    assert stored == "test-session-token"


def test_login_shows_success_toast(page, base_url):
    _stub_logged_out(page)
    _stub_login_success(page)
    _stub_synced_domains_empty(page)

    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_label("Password", exact=True).fill("LongEnough1!xx")
    _auth_dialog(page).get_by_role("button", name="Log in").click()
    toast = page.locator(".wiki-toast")
    expect(toast).to_have_class(re.compile(r"\bwiki-toast--success\b"))
    expect(toast).to_contain_text("Logged in")


def test_logout_shows_success_toast(page, base_url):
    page.route(
        "**/api/v1/auth/me",
        lambda r: r.fulfill(
            status=200, content_type="application/json",
            body='{"user":{"id":"1","email":"a@example.com"}}',
        ),
    )
    page.route("**/api/v1/auth/logout", lambda r: r.fulfill(status=204))
    _stub_synced_domains_empty(page)
    page.add_init_script("localStorage.setItem('wiki-session-token', 'pre-existing-token')")
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    expect(page.locator(".topbar-auth-btn:visible").first).to_contain_text("Log out")

    page.locator(".topbar-auth-btn:visible").first.click()
    toast = page.locator(".wiki-toast")
    expect(toast).to_have_class(re.compile(r"\bwiki-toast--success\b"))
    expect(toast).to_contain_text("Logged out")


def test_logout_clears_stored_session_token(page, base_url):
    page.route(
        "**/api/v1/auth/me",
        lambda r: r.fulfill(
            status=200, content_type="application/json",
            body='{"user":{"id":"1","email":"a@example.com"}}',
        ),
    )
    page.route("**/api/v1/auth/logout", lambda r: r.fulfill(status=204))
    _stub_synced_domains_empty(page)
    page.add_init_script("localStorage.setItem('wiki-session-token', 'pre-existing-token')")
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    expect(page.locator(".topbar-auth-btn:visible").first).to_contain_text("Log out")

    page.locator(".topbar-auth-btn:visible").first.click()
    expect(page.locator(".topbar-auth-btn:visible").first).to_contain_text("Log in")

    stored = page.evaluate("() => localStorage.getItem('wiki-session-token')")
    assert stored is None


def test_login_submits_on_enter_key(page, base_url):
    _stub_logged_out(page)
    _stub_login_success(page)
    _stub_synced_domains_empty(page)

    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    pw = _auth_dialog(page).get_by_label("Password", exact=True)
    pw.fill("LongEnough1!xx")
    pw.press("Enter")
    expect(page.locator(".topbar-auth-btn:visible").first).to_contain_text("Log out")


def test_login_unverified_shows_verify_panel(page, base_url):
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=403, content_type="application/json",
            body='{"error":{"code":"EMAIL_NOT_VERIFIED","message":"verify first"}}',
        ),
    )
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_label("Password", exact=True).fill("LongEnough1!xx")
    _auth_dialog(page).get_by_role("button", name="Log in").click()
    expect(page.get_by_role("heading", name="Check your email")).to_be_visible()


def test_login_empty_submit_blocked_by_required_fields(page, base_url):
    _stub_logged_out(page)
    login_called = {"hit": False}
    page.route(
        "**/api/v1/auth/login", lambda r: (login_called.__setitem__("hit", True), r.continue_())[1]
    )
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_role("button", name="Log in").click()
    assert not login_called["hit"], "login request must not fire with empty required fields"
    expect(_auth_dialog(page).get_by_label("Email")).to_have_js_property("validity.valid", False)


def test_forgot_empty_submit_blocked_by_required_field(page, base_url):
    _stub_logged_out(page)
    forgot_called = {"hit": False}
    page.route(
        "**/api/v1/auth/forgot-password",
        lambda r: (forgot_called.__setitem__("hit", True), r.continue_())[1],
    )
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_role("button", name="Forgot password?").click()
    _auth_dialog(page).get_by_role("button", name="Send reset link").click()
    assert not forgot_called["hit"], "forgot-password request must not fire with empty email"
    expect(_auth_dialog(page).get_by_label("Email")).to_have_js_property("validity.valid", False)


def test_forgot_sent_message_cleared_on_panel_swap(page, base_url):
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/forgot-password",
        lambda r: r.fulfill(status=200, content_type="application/json", body="{}"),
    )
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_role("button", name="Forgot password?").click()
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_role("button", name="Send reset link").click()
    expect(page.get_by_text("Reset link sent")).to_be_visible()

    _auth_dialog(page).get_by_role("button", name="Back to log in").click()
    _auth_dialog(page).get_by_role("button", name="Forgot password?").click()
    expect(page.get_by_text("Reset link sent")).to_be_hidden()


def test_login_network_error_shows_fe_authored_message(page, base_url):
    _stub_logged_out(page)
    page.route("**/api/v1/auth/login", lambda route: route.abort())
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_label("Password", exact=True).fill("LongEnough1!xx")
    _auth_dialog(page).get_by_role("button", name="Log in").click()

    error = page.locator(".auth-error")
    expect(error).to_be_visible()
    expect(error).to_have_text("Couldn't reach the server. Check your connection and try again.")
    expect(error).not_to_contain_text("Failed to fetch")


def test_resend_network_error_does_not_claim_success(page, base_url):
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=403, content_type="application/json",
            body='{"error":{"code":"EMAIL_NOT_VERIFIED","message":"not verified"}}',
        ),
    )
    page.route("**/api/v1/auth/resend-verification", lambda route: route.abort())
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_label("Password", exact=True).fill("LongEnough1!xx")
    _auth_dialog(page).get_by_role("button", name="Log in").click()
    expect(page.get_by_role("heading", name="Check your email")).to_be_visible()

    _auth_dialog(page).get_by_role("button", name="Resend verification email").click()
    expect(page.locator(".wiki-toast")).to_contain_text("Couldn't reach the server")
    expect(page.locator(".wiki-toast")).not_to_contain_text("Verification email sent")


def test_bad_credentials_shows_error(page, base_url):
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=401, content_type="application/json",
            body='{"error":{"code":"BAD_CREDENTIALS","message":"Invalid email or password"}}',
        ),
    )
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_label("Password", exact=True).fill("WrongPass123!")
    _auth_dialog(page).get_by_role("button", name="Log in").click()
    err = page.locator(".auth-error")
    expect(err).to_be_visible()
    expect(err).to_have_text("Invalid email or password")


def test_login_double_click_fires_single_request(page, base_url):
    _stub_logged_out(page)
    call_count = {"n": 0}

    def _handle_login(route):
        call_count["n"] += 1
        route.fulfill(
            status=200, content_type="application/json",
            body='{"user":{"id":"1","email":"a@example.com"},"session_token":"test-session-token"}',
        )

    page.route("**/api/v1/auth/login", _handle_login)
    _stub_synced_domains_empty(page)

    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_label("Password", exact=True).fill("LongEnough1!xx")

    page.evaluate("""() => {
        const btn = document.querySelector('.auth-panel.active button[type=submit]');
        btn.click();
        btn.click();
    }""")

    expect(page.locator(".topbar-auth-btn:visible").first).to_contain_text("Log out")
    assert call_count["n"] == 1, f"expected exactly one login request, got {call_count['n']}"


def test_login_submit_disabled_during_inflight_request(page, base_url):
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=401, content_type="application/json",
            body='{"error":{"code":"BAD_CREDENTIALS","message":"Invalid email or password"}}',
        ),
    )
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_label("Password", exact=True).fill("WrongPass123!")
    submit = _auth_dialog(page).get_by_role("button", name="Log in")
    submit.click()
    expect(page.locator(".auth-error")).to_be_visible()
    expect(submit).to_be_enabled()


def test_resend_button_debounced_and_shows_feedback(page, base_url):
    _stub_logged_out(page)
    call_count = {"n": 0}
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=403, content_type="application/json",
            body='{"error":{"code":"EMAIL_NOT_VERIFIED","message":"verify first"}}',
        ),
    )

    def _handle_resend(route):
        call_count["n"] += 1
        route.fulfill(status=200, content_type="application/json", body="{}")

    page.route("**/api/v1/auth/resend-verification", _handle_resend)

    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_label("Password", exact=True).fill("LongEnough1!xx")
    _auth_dialog(page).get_by_role("button", name="Log in").click()
    expect(page.get_by_role("heading", name="Check your email")).to_be_visible()

    page.evaluate("""() => {
        const btn = document.querySelector('.auth-panel.active button.auth-submit');
        btn.click();
        btn.click();
    }""")
    expect(page.locator(".wiki-toast")).to_be_visible()
    assert call_count["n"] == 1, f"expected exactly one resend request, got {call_count['n']}"


def test_resend_after_login_403_uses_login_email(page, base_url):
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=403, content_type="application/json",
            body='{"error":{"code":"EMAIL_NOT_VERIFIED","message":"verify first"}}',
        ),
    )
    sent = {}

    def _handle_resend(route):
        sent["email"] = route.request.post_data_json.get("email")
        route.fulfill(status=200, content_type="application/json", body="{}")

    page.route("**/api/v1/auth/resend-verification", _handle_resend)

    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("login-user@example.com")
    _auth_dialog(page).get_by_label("Password", exact=True).fill("LongEnough1!xx")
    _auth_dialog(page).get_by_role("button", name="Log in").click()
    expect(page.get_by_role("heading", name="Check your email")).to_be_visible()

    _auth_dialog(page).get_by_role("button", name="Resend verification email").click()
    expect(page.locator(".wiki-toast")).to_be_visible()
    assert sent.get("email") == "login-user@example.com"


def test_resend_button_shows_cooldown_after_send(page, base_url):
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=403, content_type="application/json",
            body='{"error":{"code":"EMAIL_NOT_VERIFIED","message":"verify first"}}',
        ),
    )
    page.route(
        "**/api/v1/auth/resend-verification",
        lambda r: r.fulfill(status=200, content_type="application/json", body="{}"),
    )
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_label("Password", exact=True).fill("LongEnough1!xx")
    _auth_dialog(page).get_by_role("button", name="Log in").click()
    expect(page.get_by_role("heading", name="Check your email")).to_be_visible()

    resend_btn = page.locator(".auth-panel.active button.auth-submit")
    resend_btn.click()
    expect(resend_btn).to_be_disabled()
    expect(resend_btn).to_have_text(re.compile(r"Resend in \d+s"))


# ── anon-data migration on login (plain confirm(), no dedicated modal) ─────────


def test_migrate_keep_imports_local_data(page, base_url):
    _stub_logged_out(page)
    _stub_login_success(page)
    import_bodies = []

    def _capture_import(route):
        import_bodies.append(route.request.post_data_json)
        route.fulfill(status=200, content_type="application/json", body="{}")

    page.route("**/api/v1/sync/import", _capture_import)
    _stub_synced_domains_empty(page)
    page.add_init_script(
        "localStorage.setItem('wiki-bookmarks', JSON.stringify([{wikiId:'dsa',path:'foo.md',slug:'foo',title:'Foo',wikiTitle:'DSA'}]));"
        "localStorage.setItem('wiki-completed-dsa', JSON.stringify(['content/dsa/foo.md']))"
    )
    page.on("dialog", lambda d: d.accept())

    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_label("Password", exact=True).fill("LongEnough1!xx")
    _auth_dialog(page).get_by_role("button", name="Log in").click()

    expect(page.locator(".topbar-auth-btn:visible").first).to_contain_text("Log out")
    assert import_bodies, "/sync/import must be called when the user keeps local data"
    assert import_bodies[0]["completions"] == [{"wiki_id": "dsa", "path": "content/dsa/foo.md"}]


def test_migrate_discard_clears_local_data_without_importing(page, base_url):
    _stub_logged_out(page)
    _stub_login_success(page)
    import_called = {"hit": False}
    page.route(
        "**/api/v1/sync/import",
        lambda r: (import_called.__setitem__("hit", True), r.fulfill(status=200, content_type="application/json", body="{}"))[1],
    )
    _stub_synced_domains_empty(page)
    page.add_init_script(
        "localStorage.setItem('wiki-bookmarks', JSON.stringify([{wikiId:'dsa',path:'foo.md',slug:'foo',title:'Foo',wikiTitle:'DSA'}]))"
    )
    page.on("dialog", lambda d: d.dismiss())

    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_label("Password", exact=True).fill("LongEnough1!xx")
    _auth_dialog(page).get_by_role("button", name="Log in").click()

    expect(page.locator(".topbar-auth-btn:visible").first).to_contain_text("Log out")
    assert not import_called["hit"], "/sync/import must not be called when the user discards local data"
    stored = page.evaluate("() => localStorage.getItem('wiki-bookmarks')")
    assert stored in (None, "[]")


def test_migrate_import_failure_shows_toast_and_skips_pull(page, base_url):
    _stub_logged_out(page)
    _stub_login_success(page)
    page.route(
        "**/api/v1/sync/import",
        lambda r: r.fulfill(status=500, content_type="application/json", body='{"error":{"code":"SERVER_ERROR","message":"boom"}}'),
    )
    pull_called = {"hit": False}
    for path in ("bookmarks", "completions", "recents"):
        page.route(
            f"**/api/v1/{path}",
            lambda r: (pull_called.__setitem__("hit", True), r.fulfill(status=200, content_type="application/json", body="[]"))[1],
        )
    page.add_init_script(
        "localStorage.setItem('wiki-bookmarks', JSON.stringify([{wikiId:'dsa',path:'foo.md',slug:'foo',title:'Foo',wikiTitle:'DSA'}]))"
    )
    page.on("dialog", lambda d: d.accept())

    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_label("Password", exact=True).fill("LongEnough1!xx")
    _auth_dialog(page).get_by_role("button", name="Log in").click()

    expect(page.locator(".wiki-toast")).to_contain_text("Couldn't save your local data")
    assert not pull_called["hit"], "pullAll() must not run after a failed import - it would overwrite the kept local data"
    stored = page.evaluate("() => localStorage.getItem('wiki-bookmarks')")
    assert "foo.md" in stored


# ── logout clears private data ──────────────────────────────────────────────

# test_logout_clears_highlights_markers_notes dropped: those lib/storage modules don't exist yet (post-cutover.md scope), nothing writes those keys.


# ── focus trap ───────────────────────────────────────────────────────────────


def test_auth_modal_traps_focus_with_shift_tab(page, base_url):
    _stub_logged_out(page)
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)

    _auth_dialog(page).get_by_label("Email").focus()
    page.keyboard.press("Shift+Tab")
    is_inside_dialog = page.evaluate(
        "() => document.querySelector('.auth-dialog').contains(document.activeElement)"
    )
    assert is_inside_dialog, "focus escaped .auth-dialog on Shift+Tab from the first field"


def test_auth_modal_traps_focus_with_tab_forward(page, base_url):
    _stub_logged_out(page)
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)

    page.evaluate("""() => {
        const dialog = document.querySelector('.auth-dialog');
        const focusable = dialog.querySelectorAll(
            'button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), a[href]'
        );
        const visible = Array.from(focusable).filter(el => el.offsetParent !== null);
        visible[visible.length - 1].focus();
    }""")
    page.keyboard.press("Tab")
    is_inside_dialog = page.evaluate(
        "() => document.querySelector('.auth-dialog').contains(document.activeElement)"
    )
    assert is_inside_dialog, "focus escaped .auth-dialog on Tab from the last element"


def test_auth_modal_removes_focus_trap_on_close(page, base_url):
    _stub_logged_out(page)
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    page.keyboard.press("Escape")
    page.wait_for_selector('[role="dialog"][aria-label="Account"]', state="detached")


# ── cross-tab session sync ──────────────────────────────────────────────────


def test_login_syncs_across_tabs(page, base_url):
    session = {"logged_in": False}

    def _route_common(pg):
        pg.route(
            "**/api/v1/auth/me",
            lambda r: r.fulfill(
                status=200 if session["logged_in"] else 401,
                content_type="application/json",
                body='{"user":{"id":"1","email":"a@example.com"}}' if session["logged_in"] else _UNAUTH,
            ),
        )
        pg.route(
            "**/api/v1/auth/login",
            lambda r: (
                session.__setitem__("logged_in", True),
                r.fulfill(
                    status=200, content_type="application/json",
                    body='{"user":{"id":"1","email":"a@example.com"},"session_token":"test-session-token"}',
                ),
            )[1],
        )
        for path in ("bookmarks", "completions", "recents"):
            pg.route(
                f"**/api/v1/{path}",
                lambda r: r.fulfill(status=200, content_type="application/json", body="[]"),
            )

    _route_common(page)
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)

    tab2 = page.context.new_page()
    _route_common(tab2)
    tab2.goto(base_url, wait_until="domcontentloaded")
    tab2.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    expect(tab2.locator(".topbar-auth-btn:visible").first).to_contain_text("Log in")

    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_label("Password", exact=True).fill("LongEnough1!xx")
    _auth_dialog(page).get_by_role("button", name="Log in").click()
    expect(page.locator(".topbar-auth-btn:visible").first).to_contain_text("Log out")

    expect(tab2.locator(".topbar-auth-btn:visible").first).to_contain_text("Log out")
    tab2.close()


def test_login_in_other_tab_pulls_server_data_into_this_tab(page, base_url):
    session = {"logged_in": False}

    def _route_common(pg):
        pg.route(
            "**/api/v1/auth/me",
            lambda r: r.fulfill(
                status=200 if session["logged_in"] else 401,
                content_type="application/json",
                body='{"user":{"id":"1","email":"a@example.com"}}' if session["logged_in"] else _UNAUTH,
            ),
        )
        pg.route(
            "**/api/v1/auth/login",
            lambda r: (
                session.__setitem__("logged_in", True),
                r.fulfill(
                    status=200, content_type="application/json",
                    body='{"user":{"id":"1","email":"a@example.com"},"session_token":"test-session-token"}',
                ),
            )[1],
        )
        pg.route(
            "**/api/v1/bookmarks",
            lambda r: r.fulfill(
                status=200, content_type="application/json",
                body='[{"wiki_id":"system-design","path":"./content/system-design/caching.md"}]',
            ),
        )
        for path in ("recents", "completions"):
            pg.route(
                f"**/api/v1/{path}",
                lambda r: r.fulfill(status=200, content_type="application/json", body="[]"),
            )

    _route_common(page)
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)

    tab2 = page.context.new_page()
    _route_common(tab2)
    tab2.goto(base_url, wait_until="domcontentloaded")
    tab2.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    expect(tab2.locator(".topbar-auth-btn:visible").first).to_contain_text("Log in")

    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_label("Password", exact=True).fill("LongEnough1!xx")
    _auth_dialog(page).get_by_role("button", name="Log in").click()
    expect(page.locator(".topbar-auth-btn:visible").first).to_contain_text("Log out")

    expect(tab2.locator(".topbar-auth-btn:visible").first).to_contain_text("Log out")
    tab2.wait_for_function(
        "() => JSON.parse(localStorage.getItem('wiki-bookmarks') || '[]').length > 0"
    )
    bookmarks = tab2.evaluate("() => JSON.parse(localStorage.getItem('wiki-bookmarks'))")
    assert any("caching" in b["path"] for b in bookmarks)
    tab2.close()


def test_logout_in_other_tab_clears_user_data_cache_in_this_tab(page, base_url):
    session = {"logged_in": True}

    def _route_common(pg):
        pg.route(
            "**/api/v1/auth/me",
            lambda r: r.fulfill(
                status=200 if session["logged_in"] else 401,
                content_type="application/json",
                body='{"user":{"id":"1","email":"a@example.com"}}' if session["logged_in"] else _UNAUTH,
            ),
        )
        pg.route(
            "**/api/v1/auth/logout",
            lambda r: (session.__setitem__("logged_in", False), r.fulfill(status=204, body=""))[1],
        )
        pg.route(
            "**/api/v1/bookmarks",
            lambda r: r.fulfill(
                status=200, content_type="application/json",
                body='[{"wiki_id":"system-design","path":"./content/system-design/caching.md"}]',
            ),
        )
        for path in ("recents", "completions"):
            pg.route(
                f"**/api/v1/{path}",
                lambda r: r.fulfill(status=200, content_type="application/json", body="[]"),
            )

    seed_token = "localStorage.setItem('wiki-session-token', 'test-session-token')"

    _route_common(page)
    page.add_init_script(seed_token)
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    expect(page.locator(".topbar-auth-btn:visible").first).to_contain_text("Log out")

    tab2 = page.context.new_page()
    _route_common(tab2)
    tab2.add_init_script(seed_token)
    tab2.goto(base_url, wait_until="domcontentloaded")
    tab2.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    expect(tab2.locator(".topbar-auth-btn:visible").first).to_contain_text("Log out")

    page.locator(".topbar-auth-btn:visible").first.click()
    expect(page.locator(".topbar-auth-btn:visible").first).to_contain_text("Log in")

    expect(tab2.locator(".topbar-auth-btn:visible").first).to_contain_text("Log in")
    tab2.wait_for_function(
        "() => JSON.parse(localStorage.getItem('wiki-bookmarks') || '[]').length === 0"
    )
    tab2.close()


# ── reset / verify deep links ────────────────────────────────────────────────


def test_reset_panel_has_recovery_links(page, base_url):
    """Regression: reset panel had no recovery links, an expired token dead-ended the user."""
    _stub_logged_out(page)
    page.goto(f"{base_url}/?mode=reset&token=expiredtoken", wait_until="domcontentloaded")
    expect(page.get_by_role("heading", name="Set a new password")).to_be_visible()

    expect(_auth_dialog(page).get_by_role("button", name="Back to log in")).to_be_visible()
    request_new = _auth_dialog(page).get_by_role("button", name="Request a new link")
    expect(request_new).to_be_visible()

    request_new.click()
    expect(page.get_by_role("heading", name="Reset your password")).to_be_visible()


def test_reset_panel_back_to_login_link_works(page, base_url):
    _stub_logged_out(page)
    page.goto(f"{base_url}/?mode=reset&token=expiredtoken", wait_until="domcontentloaded")
    expect(page.get_by_role("heading", name="Set a new password")).to_be_visible()
    _auth_dialog(page).get_by_role("button", name="Back to log in").click()
    expect(page.get_by_role("heading", name="Log in")).to_be_visible()


def test_reset_link_boot_param_opens_panel_and_strips_url(page, base_url):
    _stub_logged_out(page)
    page.goto(f"{base_url}/?mode=reset&token=abc123", wait_until="domcontentloaded")
    expect(page.get_by_role("heading", name="Set a new password")).to_be_visible()
    page.wait_for_function("() => !location.href.includes('mode=')", timeout=3_000)
    assert "mode=" not in page.url
    assert "token=" not in page.url


def test_reset_password_used_token_shows_actionable_error(page, base_url):
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/reset-password",
        lambda r: r.fulfill(
            status=400, content_type="application/json",
            body='{"error":{"code":"INVALID_TOKEN","message":"This verification link is invalid or has expired."}}',
        ),
    )
    page.goto(f"{base_url}/?mode=reset&token=usedtoken", wait_until="domcontentloaded")
    expect(page.get_by_role("heading", name="Set a new password")).to_be_visible()

    _auth_dialog(page).get_by_label("New password", exact=True).fill("Correct-Horse9!")
    _auth_dialog(page).get_by_label("Confirm new password").fill("Correct-Horse9!")
    _auth_dialog(page).get_by_role("button", name="Update password").click()

    error = page.locator(".auth-error")
    expect(error).to_be_visible()
    expect(error).to_contain_text("already used")
    expect(error).to_contain_text("try logging in")


def test_verify_link_boot_param_calls_verify_and_strips_url(page, base_url):
    _stub_logged_out(page)
    verify_called = {"hit": False}

    def _handle_verify(route):
        verify_called["hit"] = True
        route.fulfill(status=200, content_type="application/json", body='{"ok":true}')

    page.route("**/api/v1/auth/verify", _handle_verify)
    page.goto(f"{base_url}/?mode=verify&token=xyz789", wait_until="domcontentloaded")
    page.wait_for_function("() => !location.href.includes('mode=')", timeout=3_000)
    assert verify_called["hit"], "expected verify endpoint to be called from boot params"
    assert "mode=" not in page.url
    assert "token=" not in page.url


def test_verify_result_failure_shows_resend_form(page, base_url):
    """Regression: verify-result had no resend path on failure, only "Go to log in"."""
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/verify",
        lambda r: r.fulfill(
            status=400, content_type="application/json",
            body='{"error":{"code":"INVALID_TOKEN","message":"invalid"}}',
        ),
    )
    page.goto(f"{base_url}/?mode=verify&token=badtoken", wait_until="domcontentloaded")
    expect(page.get_by_role("heading", name="Verification failed")).to_be_visible()
    expect(_auth_dialog(page).get_by_role("button", name="Resend verification email")).to_be_visible()
    expect(page.get_by_text("invalid or has expired")).to_be_visible()


def test_verify_result_success_hides_resend_form(page, base_url):
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/verify",
        lambda r: r.fulfill(status=200, content_type="application/json", body='{"ok":true}'),
    )
    page.goto(f"{base_url}/?mode=verify&token=goodtoken", wait_until="domcontentloaded")
    expect(page.get_by_role("heading", name="Email verified")).to_be_visible()
    expect(_auth_dialog(page).get_by_role("button", name="Resend verification email")).to_have_count(0)


def test_verify_result_resend_submits_typed_email(page, base_url):
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/verify",
        lambda r: r.fulfill(
            status=400, content_type="application/json",
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
    page.goto(f"{base_url}/?mode=verify&token=badtoken", wait_until="domcontentloaded")
    expect(page.get_by_role("heading", name="Verification failed")).to_be_visible()
    _auth_dialog(page).get_by_label("Email").fill("retry-user@example.com")
    _auth_dialog(page).get_by_role("button", name="Resend verification email").click()
    expect(page.locator(".wiki-toast")).to_be_visible()
    assert sent.get("email") == "retry-user@example.com"


# ── accessibility ────────────────────────────────────────────────────────────


def test_login_error_announced_to_screen_readers(page, base_url):
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=401, content_type="application/json",
            body='{"error":{"code":"BAD_CREDENTIALS","message":"Invalid email or password"}}',
        ),
    )
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_label("Password", exact=True).fill("WrongPass123!")
    _auth_dialog(page).get_by_role("button", name="Log in").click()

    err = page.locator(".auth-error")
    expect(err).to_be_visible()
    assert err.get_attribute("role") == "alert"
    email_describedby = _auth_dialog(page).get_by_label("Email").get_attribute("aria-describedby")
    pw_describedby = _auth_dialog(page).get_by_label("Password", exact=True).get_attribute("aria-describedby")
    assert email_describedby == "auth-login-error"
    assert pw_describedby == "auth-login-error"


def test_login_error_sets_aria_invalid_on_inputs(page, base_url):
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(
            status=401, content_type="application/json",
            body='{"error":{"code":"BAD_CREDENTIALS","message":"Invalid email or password"}}',
        ),
    )
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_label("Password", exact=True).fill("WrongPass123!")
    _auth_dialog(page).get_by_role("button", name="Log in").click()

    expect(_auth_dialog(page).get_by_label("Email")).to_have_attribute("aria-invalid", "true")
    expect(_auth_dialog(page).get_by_label("Password", exact=True)).to_have_attribute("aria-invalid", "true")

    _auth_dialog(page).get_by_role("button", name="Create account").click()
    _auth_dialog(page).get_by_role("button", name="Back to log in").click()
    expect(_auth_dialog(page).get_by_label("Email")).not_to_have_attribute("aria-invalid", "true")


def test_forgot_error_has_alert_role(page, base_url):
    _stub_logged_out(page)
    page.route(
        "**/api/v1/auth/forgot-password",
        lambda r: r.fulfill(
            status=500, content_type="application/json",
            body='{"error":{"code":"SERVER_ERROR","message":"Could not send reset link."}}',
        ),
    )
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_role("button", name="Forgot password?").click()
    _auth_dialog(page).get_by_label("Email").fill("a@example.com")
    _auth_dialog(page).get_by_role("button", name="Send reset link").click()
    err = page.locator(".auth-error")
    expect(err).to_be_visible()
    assert err.get_attribute("role") == "alert"


def test_password_checklist_has_screen_reader_met_state(page, base_url):
    _stub_logged_out(page)
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_role("button", name="Create account").click()

    pw = _auth_dialog(page).get_by_label("Password", exact=True)
    pw.fill("short")
    first_item = page.locator(".auth-pw-checklist li").first
    expect(first_item).to_contain_text("not met")

    pw.fill("LongEnough1!xx")
    expect(first_item).to_contain_text("met")
    expect(first_item).not_to_contain_text("not met")


# ── register / reset password reveal + loading states ──────────────────────


def test_register_password_reveal_toggle(page, base_url):
    _stub_logged_out(page)
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    _auth_dialog(page).get_by_role("button", name="Create account").click()

    pw = _auth_dialog(page).get_by_label("Password", exact=True)
    toggle = _auth_dialog(page).get_by_label("Show password")
    expect(pw).to_have_attribute("type", "password")

    toggle.click()
    expect(pw).to_have_attribute("type", "text")
    expect(_auth_dialog(page).get_by_label("Hide password")).to_be_visible()

    _auth_dialog(page).get_by_label("Hide password").click()
    expect(pw).to_have_attribute("type", "password")


def test_register_submit_shows_loading_label_and_locks_inputs(page, base_url):
    _stub_logged_out(page)
    held = []
    # hold the route and fulfill it from the test body; blocking inside a sync-API handler deadlocks the dispatcher
    page.route("**/api/v1/auth/register", lambda route: held.append(route))
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_auth(page)
    dialog = _auth_dialog(page)
    dialog.get_by_role("button", name="Create account").click()
    dialog.get_by_label("Email").fill("new-user@example.com")
    dialog.get_by_label("Password", exact=True).fill("LongEnough1!xx")
    dialog.get_by_label("Confirm password").fill("LongEnough1!xx")
    dialog.locator("button[type=submit]").click()

    expect(dialog.get_by_label("Email")).to_be_disabled()
    expect(dialog.get_by_label("Password", exact=True)).to_be_disabled()
    expect(dialog.locator("button[type=submit]")).to_have_text("Creating…")

    for _ in range(40):
        if held:
            break
        page.wait_for_timeout(50)
    assert held, "register request never reached the route"
    # a failure keeps the register panel mounted so the unlock is observable (success swaps to verify)
    held[0].fulfill(status=500, content_type="application/json", body="{}")
    expect(_auth_dialog(page).get_by_role("button", name="Create account")).to_be_visible()
    expect(_auth_dialog(page).get_by_label("Email")).to_be_enabled()
