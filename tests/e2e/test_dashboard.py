"""
- Dashboard view (#dashboard): one card per vertical showing read % and completed % against total articles
- Zero-article verticals are hidden entirely, not shown disabled
- Numbers reflect getReadSet/getCompletedSet state regardless of which wiki is "current"
- Reachable via topbar icon and the /dashboard search command
"""

import json


def _stub_search_index(page):
    index = {
        "system-design": [
            {
                "heading": "Components",
                "cards": [
                    {
                        "title": "Message Queues",
                        "path": "./content/system-design/message-queues.md",
                        "slug": "message-queues",
                        "description": "desc",
                    },
                    {
                        "title": "Load Balancers",
                        "path": "./content/system-design/load-balancers.md",
                        "slug": "load-balancers",
                        "description": "desc",
                    },
                ],
            }
        ],
        "dsa": [],
    }
    page.route(
        "**/content/search-index.json",
        lambda r: r.fulfill(content_type="application/json", body=json.dumps(index)),
    )


def _open_dashboard(page, base_url):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.locator('[data-action="dashboard-open"]').click()
    page.wait_for_selector("#view-dashboard.active", timeout=8_000)


def test_dashboard_opens_from_home_topbar(page, base_url):
    _stub_search_index(page)
    _open_dashboard(page, base_url)
    assert page.locator("#view-dashboard.active").count() == 1


def test_dashboard_hides_zero_article_vertical(page, base_url):
    _stub_search_index(page)
    _open_dashboard(page, base_url)
    page.wait_for_selector(".dashboard-card", timeout=5_000)

    titles = page.locator(".dashboard-card-title").all_inner_texts()
    assert titles == ["System Design"], "DSA has zero articles in the stub and must not render a card"


def test_dashboard_shows_zero_percent_with_no_progress(page, base_url):
    _stub_search_index(page)
    _open_dashboard(page, base_url)
    page.wait_for_selector(".dashboard-card", timeout=5_000)

    labels = page.locator(".dashboard-stat-label").all_inner_texts()
    assert any("0 / 2 (0%)" in label for label in labels)


def test_dashboard_reflects_read_and_completed_counts(page, base_url):
    _stub_search_index(page)
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.evaluate(
        """() => {
            localStorage.setItem('wiki-read-system-design', JSON.stringify(['./content/system-design/message-queues.md']));
            localStorage.setItem('wiki-completed-system-design', JSON.stringify(['./content/system-design/message-queues.md']));
        }"""
    )

    page.locator('[data-action="dashboard-open"]').click()
    page.wait_for_selector("#view-dashboard.active", timeout=8_000)
    page.wait_for_selector(".dashboard-card", timeout=5_000)

    labels = page.locator(".dashboard-stat-label").all_inner_texts()
    assert any("1 / 2 (50%)" in label for label in labels)


def test_dashboard_reachable_via_search_command(page, base_url):
    _stub_search_index(page)
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    page.keyboard.press("Meta+k")
    page.wait_for_selector("#global-search-modal:not(.hidden)")
    page.fill("#gsearch-input", "/dashboard")
    page.wait_for_selector(".gsearch-command[data-command='dashboard']", timeout=5_000)
    page.locator(".gsearch-command[data-command='dashboard']").click()

    page.wait_for_selector("#view-dashboard.active", timeout=8_000)
    assert page.locator("#view-dashboard.active").count() == 1
