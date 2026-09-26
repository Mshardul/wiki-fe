"""
- Offline shelf view (/offline/): lists articles cached in the wiki-articles Cache Storage bucket, grouped by vertical
- Empty state when nothing is cached
- Online/offline status banner reflects navigator.onLine reactively
- Per-article last-cached date and evict button
- Save-for-offline from the reader topbar populates the shelf
- Dropped: bulk "Download all" and offline-dimmed index cards - grep confirms neither exists (no download-all/uncached code anywhere in components/lib/app)
"""

import pytest


@pytest.fixture
def browser_context_args(browser_context_args):
    return {**browser_context_args, "service_workers": "block"}


def _go_to_article(page, base_url, slug="system-design/components/caching"):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def _open_offline_shelf(page, base_url):
    page.goto(f"{base_url}/offline/", wait_until="domcontentloaded")
    page.wait_for_selector(".offline-shelf-status", timeout=10_000)


def _seed_cache(page, base_url, routes):
    page.evaluate(
        """async ([base, routes]) => {
            const cache = await caches.open('wiki-articles');
            for (const r of routes) {
                await cache.put(base + r, new Response('<html><body>stub</body></html>', { headers: { 'content-type': 'text/html' } }));
            }
        }""",
        [base_url, routes],
    )


def _seed_cached_at(page, route, days_ago=0):
    page.evaluate(
        """([route, daysAgo]) => {
            const map = JSON.parse(localStorage.getItem('wiki-offline-cached-at') || '{}');
            map[route] = Date.now() - daysAgo * 86_400_000;
            localStorage.setItem('wiki-offline-cached-at', JSON.stringify(map));
        }""",
        [route, days_ago],
    )


def test_offline_shelf_reachable_from_home_topbar(page, base_url):
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    page.locator('a.topbar-icon-btn[title="Offline shelf"]').click()
    page.wait_for_selector(".offline-shelf-status", timeout=10_000)
    assert "/offline/" in page.url


def test_offline_shelf_empty_state_when_nothing_cached(page, base_url):
    _open_offline_shelf(page, base_url)
    page.wait_for_selector(".offline-shelf-empty", timeout=10_000)
    assert "No articles saved" in page.locator(".offline-shelf-empty").inner_text()


def test_offline_shelf_lists_cached_articles_grouped_by_vertical(page, base_url):
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _seed_cache(page, base_url, ["/system-design/components/caching/"])

    _open_offline_shelf(page, base_url)
    page.wait_for_selector(".offline-shelf-entry", timeout=15_000)

    assert page.locator(".offline-shelf-group").count() == 1
    assert page.locator(".offline-shelf-wiki-title").inner_text() == "System Design"
    assert page.locator(".offline-shelf-entry").count() == 1
    assert "Caching" in page.locator(".offline-shelf-entry-title").inner_text()


def test_offline_shelf_status_banner_reflects_offline_state(page, base_url, context):
    _open_offline_shelf(page, base_url)
    assert "Online" in page.locator(".offline-shelf-status").inner_text()

    context.set_offline(True)
    page.wait_for_function(
        "() => document.querySelector('.offline-shelf-status').textContent.includes('Offline')",
        timeout=10_000,
    )
    context.set_offline(False)


def test_offline_shelf_entry_shows_evict_button(page, base_url):
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _seed_cache(page, base_url, ["/system-design/components/caching/"])

    _open_offline_shelf(page, base_url)
    page.wait_for_selector(".offline-shelf-entry", timeout=15_000)

    assert page.locator(".offline-shelf-evict-btn").count() == 1


def test_offline_shelf_entry_shows_cached_date(page, base_url):
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _seed_cache(page, base_url, ["/system-design/components/caching/"])
    _seed_cached_at(page, "/wiki-fe/system-design/components/caching/", days_ago=3)

    _open_offline_shelf(page, base_url)
    page.wait_for_selector(".offline-shelf-entry-date", timeout=15_000)

    assert "3d ago" in page.locator(".offline-shelf-entry-date").inner_text()


def test_offline_shelf_evict_removes_entry_without_navigating(page, base_url):
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _seed_cache(page, base_url, ["/system-design/components/caching/"])

    _open_offline_shelf(page, base_url)
    page.wait_for_selector(".offline-shelf-entry", timeout=15_000)

    page.locator(".offline-shelf-evict-btn").first.click()

    page.wait_for_selector(".offline-shelf-empty", timeout=10_000)
    assert "/offline/" in page.url
    assert "No articles saved" in page.locator(".offline-shelf-empty").inner_text()


def test_offline_shelf_evict_removes_from_cache_storage(page, base_url):
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _seed_cache(page, base_url, ["/system-design/components/caching/"])

    _open_offline_shelf(page, base_url)
    page.wait_for_selector(".offline-shelf-entry", timeout=15_000)
    page.locator(".offline-shelf-evict-btn").first.click()
    page.wait_for_selector(".offline-shelf-empty", timeout=10_000)

    still_cached = page.evaluate(
        """async (base) => {
            const cache = await caches.open('wiki-articles');
            const match = await cache.match(base + '/system-design/components/caching/');
            return !!match;
        }""",
        base_url,
    )
    assert not still_cached, "Evict must remove the article from Cache Storage"


def test_save_offline_button_populates_the_shelf(page, base_url):
    _go_to_article(page, base_url)
    save_btn = page.locator('button[aria-label="Save for offline"]')
    save_btn.click()
    page.wait_for_selector('button[aria-label="Remove offline copy"]', timeout=15_000)

    _open_offline_shelf(page, base_url)
    page.wait_for_selector(".offline-shelf-entry", timeout=15_000)
    assert "Caching" in page.locator(".offline-shelf-entry-title").inner_text()
