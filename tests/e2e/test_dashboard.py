"""
- Dashboard view (#dashboard): one card per vertical showing read % and completed % against total articles
- Zero-article verticals are hidden entirely, not shown disabled
- Numbers reflect getCompletedSet state regardless of which wiki is "current"
- Reachable via topbar icon and the /dashboard search command
- Drill-down: wiki card -> per-section bars (#dashboard/<wiki>) -> per-learning-path bars (#dashboard/<wiki>/paths)
"""

import json


def _stub_search_index(page, with_paths=False):
    sd_sections = [
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
    ]
    if with_paths:
        sd_sections.append(
            {
                "heading": "Learning Paths",
                "cards": [
                    {
                        "title": "Components Foundation",
                        "path": "./content/system-design/paths/components-foundation.md",
                        "slug": "components-foundation",
                        "description": "desc",
                    }
                ],
            }
        )
    index = {"system-design": sd_sections, "dsa": []}
    page.route(
        "**/content/search-index.json",
        lambda r: r.fulfill(content_type="application/json", body=json.dumps(index)),
    )


def _stub_path_markdown(page):
    md = """# Learning Path: Components Foundation

| Stage | Topic | Notes |
| --- | --- | --- |
| 1 | [Message Queues](../message-queues.md) | |
| 1 | [Load Balancers](../load-balancers.md) | |
"""
    page.route(
        "**/content/system-design/paths/components-foundation.md",
        lambda r: r.fulfill(content_type="text/markdown", body=md),
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


def test_dashboard_reflects_completed_counts(page, base_url):
    _stub_search_index(page)
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.evaluate(
        """() => {
            localStorage.setItem('wiki-completed-system-design', JSON.stringify(['content/system-design/message-queues.md']));
        }"""
    )

    page.locator('[data-action="dashboard-open"]').click()
    page.wait_for_selector("#view-dashboard.active", timeout=8_000)
    page.wait_for_selector(".dashboard-card", timeout=5_000)

    labels = page.locator(".dashboard-stat-label").all_inner_texts()
    assert any("1 / 2 (50%)" in label for label in labels)
    assert all("Read" not in label for label in labels)


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


def test_dashboard_drills_into_wiki_sections(page, base_url):
    _stub_search_index(page, with_paths=True)
    _open_dashboard(page, base_url)
    page.wait_for_selector(".dashboard-card", timeout=5_000)

    page.locator(".dashboard-card-title", has_text="System Design").click()
    page.wait_for_selector("#view-dashboard.active", timeout=8_000)
    page.wait_for_function("() => location.hash === '#dashboard/system-design'")
    page.wait_for_selector(".dashboard-card-title:text-is('Components')", timeout=5_000)

    titles = page.locator(".dashboard-card-title").all_inner_texts()
    assert titles == ["Components", "Learning Paths"]


def test_dashboard_drills_into_learning_paths(page, base_url):
    _stub_search_index(page, with_paths=True)
    _stub_path_markdown(page)
    page.goto(f"{base_url}/#dashboard/system-design", wait_until="domcontentloaded")
    page.wait_for_selector("#view-dashboard.active", timeout=8_000)
    page.wait_for_selector(".dashboard-card", timeout=5_000)

    page.locator(".dashboard-card-title", has_text="Learning Paths").click()
    page.wait_for_function("() => location.hash === '#dashboard/system-design/paths'")
    page.wait_for_selector(
        ".dashboard-card-title:text-is('Components Foundation')", timeout=5_000
    )

    titles = page.locator(".dashboard-card-title").all_inner_texts()
    assert titles == ["Components Foundation"]

    labels = page.locator(".dashboard-stat-label").all_inner_texts()
    assert any("0 / 2 (0%)" in label for label in labels)


def test_dashboard_breadcrumb_navigates_back_up_each_level(page, base_url):
    _stub_search_index(page, with_paths=True)
    _stub_path_markdown(page)
    page.goto(f"{base_url}/#dashboard/system-design/paths", wait_until="domcontentloaded")
    page.wait_for_selector("#view-dashboard.active", timeout=8_000)
    page.wait_for_selector(".dashboard-card", timeout=5_000)

    page.locator("#dashboard-breadcrumb a", has_text="System Design").click()
    page.wait_for_function("() => location.hash === '#dashboard/system-design'")
    page.wait_for_selector(".dashboard-card-title:text-is('Components')", timeout=5_000)
    titles = page.locator(".dashboard-card-title").all_inner_texts()
    assert titles == ["Components", "Learning Paths"]

    page.locator("#dashboard-breadcrumb a", has_text="Dashboard").click()
    page.wait_for_function("() => location.hash === '#dashboard'")
    page.wait_for_selector(".dashboard-card-title:text-is('System Design')", timeout=5_000)
    titles = page.locator(".dashboard-card-title").all_inner_texts()
    assert titles == ["System Design"]
