import re

import pytest
from playwright.sync_api import expect

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
