"""
- Offline shelf view (#offline): lists articles cached in the SW article cache, grouped by wiki
- Empty state when nothing is cached
- Online/offline status banner reflects navigator.onLine reactively
- Uncached index cards dim while offline
- Per-article last-cached date and evict button (WIKI-298)
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


def _seed_cache(page, base_url, paths):
    page.evaluate(
        """async (paths) => {
            const cache = await caches.open('wiki-articles-v1');
            for (const p of paths) {
                await cache.put(p, new Response('# stub'));
            }
        }""",
        paths,
    )


def _open_offline_shelf(page, base_url):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.wait_for_function("() => typeof window.navigateToContent === 'function'", timeout=8_000)
    page.locator('[data-action="offline-shelf-open"]').click()
    page.wait_for_selector("#view-offline-shelf.active", timeout=8_000)


def test_offline_shelf_opens_from_home_topbar(page, base_url):
    _stub_search_index(page)
    _open_offline_shelf(page, base_url)
    assert page.locator("#view-offline-shelf.active").count() == 1


def test_offline_shelf_empty_state_when_nothing_cached(page, base_url):
    _stub_search_index(page)
    _open_offline_shelf(page, base_url)
    page.wait_for_selector(".offline-shelf-empty", timeout=5_000)
    assert "No articles saved" in page.locator(".offline-shelf-empty").inner_text()


def test_offline_shelf_lists_cached_articles_grouped_by_wiki(page, base_url):
    _stub_search_index(page)
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    _seed_cache(page, base_url, ["content/system-design/message-queues.md"])

    page.locator('[data-action="offline-shelf-open"]').click()
    page.wait_for_selector("#view-offline-shelf.active", timeout=8_000)
    page.wait_for_selector(".offline-shelf-entry", timeout=5_000)

    assert page.locator(".offline-shelf-group").count() == 1
    assert page.locator(".offline-shelf-wiki-title").inner_text() == "System Design"
    assert page.locator(".offline-shelf-entry").count() == 1
    assert "Message Queues" in page.locator(".offline-shelf-entry").first.inner_text()


def test_offline_shelf_status_banner_reflects_offline_state(page, base_url, context):
    _stub_search_index(page)
    _open_offline_shelf(page, base_url)
    page.wait_for_selector("#offline-shelf-status", timeout=5_000)
    assert "Online" in page.locator("#offline-shelf-status").inner_text()

    context.set_offline(True)
    page.wait_for_function(
        "() => document.getElementById('offline-shelf-status').textContent.includes('Offline')",
        timeout=5_000,
    )
    context.set_offline(False)


def _seed_cached_at(page, path, days_ago=0):
    page.evaluate(
        """([path, daysAgo]) => {
            const map = JSON.parse(localStorage.getItem('wiki-offline-cached-at') || '{}');
            map[path] = Date.now() - daysAgo * 86_400_000;
            localStorage.setItem('wiki-offline-cached-at', JSON.stringify(map));
        }""",
        [path, days_ago],
    )


def test_offline_shelf_entry_shows_evict_button(page, base_url):
    _stub_search_index(page)
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    _seed_cache(page, base_url, ["content/system-design/message-queues.md"])

    page.locator('[data-action="offline-shelf-open"]').click()
    page.wait_for_selector("#view-offline-shelf.active", timeout=8_000)
    page.wait_for_selector(".offline-shelf-entry", timeout=5_000)

    assert page.locator(".offline-shelf-evict-btn").count() == 1


def test_offline_shelf_entry_shows_cached_date(page, base_url):
    _stub_search_index(page)
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    _seed_cache(page, base_url, ["content/system-design/message-queues.md"])
    _seed_cached_at(page, "content/system-design/message-queues.md", days_ago=3)

    page.locator('[data-action="offline-shelf-open"]').click()
    page.wait_for_selector("#view-offline-shelf.active", timeout=8_000)
    page.wait_for_selector(".offline-shelf-entry-date", timeout=5_000)

    assert "3d ago" in page.locator(".offline-shelf-entry-date").inner_text()


def test_offline_shelf_evict_removes_entry_without_navigating(page, base_url):
    _stub_search_index(page)
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    _seed_cache(page, base_url, ["content/system-design/message-queues.md"])

    page.locator('[data-action="offline-shelf-open"]').click()
    page.wait_for_selector("#view-offline-shelf.active", timeout=8_000)
    page.wait_for_selector(".offline-shelf-entry", timeout=5_000)

    page.locator(".offline-shelf-evict-btn").first.click()

    # Clicking evict must not navigate away from the offline shelf.
    assert page.locator("#view-offline-shelf.active").count() == 1
    page.wait_for_selector(".offline-shelf-empty", timeout=5_000)
    assert "No articles saved" in page.locator(".offline-shelf-empty").inner_text()


def test_offline_shelf_evict_removes_from_cache(page, base_url):
    _stub_search_index(page)
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    _seed_cache(page, base_url, ["content/system-design/message-queues.md"])

    page.locator('[data-action="offline-shelf-open"]').click()
    page.wait_for_selector("#view-offline-shelf.active", timeout=8_000)
    page.wait_for_selector(".offline-shelf-entry", timeout=5_000)
    page.locator(".offline-shelf-evict-btn").first.click()
    page.wait_for_selector(".offline-shelf-empty", timeout=5_000)

    still_cached = page.evaluate(
        """async () => {
            const cache = await caches.open('wiki-articles-v1');
            const match = await cache.match('content/system-design/message-queues.md');
            return !!match;
        }"""
    )
    assert not still_cached, "Evict must remove the article from the SW article cache"


def test_index_card_dims_when_offline_and_uncached(page, base_url, context):
    _stub_search_index(page)
    page.route(
        "**/content/system-design/index.md",
        lambda r: r.fulfill(
            body="## Components\n\n"
            "| Component | Description |\n"
            "| --- | --- |\n"
            "| [Message Queues](./message-queues.md) | desc |\n"
            "| [Load Balancers](./load-balancers.md) | desc |\n"
        ),
    )
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    _seed_cache(page, base_url, ["content/system-design/message-queues.md"])

    page.evaluate("() => navigate('system-design')")
    page.wait_for_selector("#view-index.active", timeout=8_000)
    page.wait_for_selector(".index-card", timeout=5_000)

    context.set_offline(True)
    page.wait_for_function(
        "() => document.querySelectorAll('.index-card--offline-uncached').length > 0",
        timeout=5_000,
    )
    dimmed_titles = page.locator(".index-card--offline-uncached .index-card-title").all_inner_texts()
    assert dimmed_titles == ["Load Balancers"]
    context.set_offline(False)
