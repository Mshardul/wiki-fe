"""Admin (/admin/): role-gated nav + page; Users tab (API); Site Health (baked reports)."""

from playwright.sync_api import expect

_UNAUTH = '{"error":{"code":"UNAUTHORIZED","message":"no session"}}'


def _stub_logged_out(page):
    page.route(
        "**/api/v1/auth/me",
        lambda r: r.fulfill(status=401, content_type="application/json", body=_UNAUTH),
    )


def _stub_session(page, role):
    page.add_init_script("localStorage.setItem('wiki-session-token', 'test-token')")
    page.route(
        "**/api/v1/auth/me",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body=f'{{"user":{{"id":"1","email":"a@example.com","role":"{role}"}}}}',
        ),
    )
    for path in ("bookmarks", "completions", "recents"):
        page.route(
            f"**/api/v1/{path}",
            lambda r: r.fulfill(status=200, content_type="application/json", body="[]"),
        )


def test_admin_nav_hidden_for_anonymous(page, base_url):
    _stub_logged_out(page)
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    expect(page.locator("#admin-nav-btn")).to_be_hidden()


def test_admin_nav_hidden_for_regular_user(page, base_url):
    _stub_session(page, "user")
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    expect(page.locator("#auth-btn-home .auth-btn-label")).to_have_text("Log out")
    expect(page.locator("#admin-nav-btn")).to_be_hidden()


def test_admin_nav_visible_for_admin(page, base_url):
    _stub_session(page, "admin")
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    expect(page.locator("#admin-nav-btn")).to_be_visible()


def test_admin_page_denied_for_non_admin_direct_nav(page, base_url):
    _stub_session(page, "user")
    page.goto(f"{base_url}/admin/", wait_until="domcontentloaded")
    expect(page.locator("#admin-content")).to_contain_text("don't have access")


def test_admin_users_tab_renders_table(page, base_url):
    _stub_session(page, "admin")
    page.route(
        "**/api/v1/admin/users",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body='[{"id":"1","email":"a@example.com","role":"admin","is_active":true,'
            '"email_verified":true,"created_at":"2026-01-01T00:00:00Z"},'
            '{"id":"2","email":"b@example.com","role":"user","is_active":true,'
            '"email_verified":false,"created_at":"2026-01-02T00:00:00Z"}]',
        ),
    )
    page.goto(f"{base_url}/admin/", wait_until="domcontentloaded")
    expect(page.locator(".admin-table tbody tr")).to_have_count(2)
    expect(page.locator(".admin-table")).to_contain_text("a@example.com")
    expect(page.locator(".admin-table")).to_contain_text("b@example.com")


def test_admin_promote_user_calls_role_endpoint(page, base_url):
    _stub_session(page, "admin")
    page.route(
        "**/api/v1/admin/users",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body='[{"id":"2","email":"b@example.com","role":"user","is_active":true,'
            '"email_verified":true,"created_at":"2026-01-02T00:00:00Z"}]',
        ),
    )
    seen = {"body": ""}

    def _handle_role_patch(route):
        seen["body"] = route.request.post_data or ""
        route.fulfill(
            status=200,
            content_type="application/json",
            body='{"id":"2","email":"b@example.com","role":"admin","is_active":true,'
            '"email_verified":true,"created_at":"2026-01-02T00:00:00Z"}',
        )

    page.route("**/api/v1/admin/users/2/role", _handle_role_patch)
    page.goto(f"{base_url}/admin/", wait_until="domcontentloaded")
    with page.expect_request("**/api/v1/admin/users/2/role"):
        page.locator('[data-action="admin-toggle-role"]').click()
    assert '"role":"admin"' in seen["body"]


def test_admin_site_health_tab_shows_broken_links_and_orphans(page, base_url):
    """Site health is baked at build from real corpus — assert report sections render."""
    _stub_session(page, "admin")
    page.route(
        "**/api/v1/admin/users",
        lambda r: r.fulfill(status=200, content_type="application/json", body="[]"),
    )
    page.goto(f"{base_url}/admin/", wait_until="domcontentloaded")
    page.locator('.admin-tab[data-tab="site-health"]').click()
    expect(page.locator(".admin-report-section").nth(0)).to_contain_text("Broken Links")
    expect(page.locator(".admin-report-section").nth(1)).to_contain_text("Orphan Pages")
