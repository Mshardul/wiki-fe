"""Dashboard (/dashboard/): wiki cards → section bars → learning-path bars."""


def _open_dashboard(page, base_url):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.get_by_role("link", name="Dashboard").click()
    page.wait_for_url("**/dashboard/**", timeout=8_000)
    page.wait_for_selector("#view-dashboard", timeout=8_000)


def test_dashboard_opens_from_home_topbar(page, base_url):
    _open_dashboard(page, base_url)
    assert page.locator("#view-dashboard").count() == 1
    page.wait_for_selector(".dashboard-card", timeout=5_000)


def test_dashboard_shows_both_verticals(page, base_url):
    _open_dashboard(page, base_url)
    page.wait_for_selector(".dashboard-card", timeout=5_000)
    titles = page.locator(".dashboard-card-title").all_inner_texts()
    assert "System Design" in titles
    assert any("Data Structures" in t or t == "DSA" for t in titles)


def test_dashboard_shows_zero_percent_with_no_progress(page, base_url):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.evaluate(
        """() => {
            for (const k of Object.keys(localStorage)) {
                if (k.startsWith('wiki-completed-')) localStorage.removeItem(k);
            }
        }"""
    )
    page.get_by_role("link", name="Dashboard").click()
    page.wait_for_selector(".dashboard-card", timeout=5_000)
    labels = page.locator(".dashboard-stat-label").all_inner_texts()
    assert any("(0%)" in label for label in labels)


def test_dashboard_reflects_completed_counts(page, base_url):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.evaluate(
        """() => {
            localStorage.setItem(
                'wiki-completed-system-design',
                JSON.stringify(['content/system-design/components/message-queues.md'])
            );
        }"""
    )
    page.get_by_role("link", name="Dashboard").click()
    page.wait_for_selector(".dashboard-card", timeout=5_000)

    sd = page.locator(".dashboard-card", has=page.locator(".dashboard-card-title", has_text="System Design"))
    label = sd.locator(".dashboard-stat-label").inner_text()
    assert "Completed" in label
    assert not label.startswith("0 /")
    assert "(0%)" not in label


def test_dashboard_drills_into_wiki_sections(page, base_url):
    _open_dashboard(page, base_url)
    page.wait_for_selector(".dashboard-card", timeout=5_000)

    page.locator(".dashboard-card-title", has_text="System Design").click()
    page.wait_for_url("**/dashboard/system-design/**", timeout=8_000)
    page.wait_for_selector(".dashboard-card-title", timeout=5_000)

    titles = page.locator(".dashboard-card-title").all_inner_texts()
    assert "Learning Paths" in titles
    assert any(t != "Learning Paths" for t in titles)


def test_dashboard_drills_into_learning_paths(page, base_url):
    page.goto(f"{base_url}/dashboard/system-design/", wait_until="domcontentloaded")
    page.wait_for_selector(".dashboard-card", timeout=5_000)

    page.locator(".dashboard-card-title", has_text="Learning Paths").click()
    page.wait_for_url("**/dashboard/system-design/paths/**", timeout=8_000)
    page.wait_for_selector(".dashboard-card", timeout=5_000)

    titles = page.locator(".dashboard-card-title").all_inner_texts()
    assert len(titles) >= 1
    labels = page.locator(".dashboard-stat-label").all_inner_texts()
    assert any("Completed" in label for label in labels)


def test_dashboard_breadcrumb_navigates_back_up_each_level(page, base_url):
    page.goto(f"{base_url}/dashboard/system-design/paths/", wait_until="domcontentloaded")
    page.wait_for_selector("#dashboard-breadcrumb", timeout=5_000)

    page.locator("#dashboard-breadcrumb a", has_text="System Design").click()
    page.wait_for_url("**/dashboard/system-design/", timeout=8_000)
    page.wait_for_selector(".dashboard-card-title", timeout=5_000)
    assert "Learning Paths" in page.locator(".dashboard-card-title").all_inner_texts()

    page.locator("#dashboard-breadcrumb a", has_text="Dashboard").click()
    page.wait_for_url("**/dashboard/", timeout=8_000)
    page.wait_for_selector(".dashboard-card-title:text-is('System Design')", timeout=5_000)
