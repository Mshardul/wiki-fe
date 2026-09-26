# Not ported: custom index-view scroll persistence (indexScroll key is orphaned in keys.ts, nothing writes it - Next.js router owns scroll now), the stub-detection loading gate (.index-sections--loading never appears - isStub is known server-side, no async gate), the inline filter/read-select (#index-filter-input, #index-filter-read-select - no such controls in IndexTopbar.tsx or the index page), collapsible sections (.section--collapsed - section-header/index-card-grid render but nothing binds a click handler or reads wiki-section-collapsed-*), the unavailable-card tooltip title (no title attr on the card Link; stub articles get their own placeholder page instead), the coarse-pointer swipe hint (.index-card-swipe-hint has CSS but no component renders it), the "changed since you last read" updated-dot and index-card-meta/read-time (all orphaned CSS, no producing component), and the 44px touch-target regression check (its .index-ctrl-btn/#index-filter-input targets don't exist). Swipe-to-bookmark itself is covered in test_touch_gestures.py, not re-added here.

import pytest


def _go_to_index(page, base_url, slug="system-design"):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector(".index-card:not(.index-card--unavailable)", timeout=10_000)


def _caching_card(page):
    return page.locator('.index-card[data-article-path="content/system-design/components/caching.md"]')


def test_unavailable_card_has_grayscale_filter(page, base_url):
    _go_to_index(page, base_url)
    card = page.locator(".index-card--unavailable").first
    if card.count() == 0:
        return
    filter_value = card.evaluate("el => getComputedStyle(el).filter")
    assert "grayscale" in filter_value


def test_unavailable_card_still_navigable(page, base_url):
    """Stub cards stay real links to their placeholder page rather than being inert."""
    _go_to_index(page, base_url)
    card = page.locator(".index-card--unavailable").first
    if card.count() == 0:
        return
    href = card.get_attribute("href")
    assert href and "/system-design/" in href


def test_arrow_keys_move_focus_between_cards(page, base_url):
    _go_to_index(page, base_url)
    cards = page.locator(".index-section").first.locator(".index-card")
    cards.first.focus()
    page.keyboard.press("ArrowDown")
    focused_title = page.evaluate(
        "() => document.activeElement.querySelector('.index-card-title')?.textContent?.trim()"
    )
    second_title = cards.nth(1).locator(".index-card-title").inner_text()
    assert focused_title == second_title.strip()


def test_arrow_up_from_first_card_stays_put(page, base_url):
    _go_to_index(page, base_url)
    cards = page.locator(".index-section").first.locator(".index-card")
    cards.first.focus()
    page.keyboard.press("ArrowUp")
    focused_title = page.evaluate(
        "() => document.activeElement.querySelector('.index-card-title')?.textContent?.trim()"
    )
    assert focused_title == cards.first.locator(".index-card-title").inner_text().strip()


def test_completed_card_shows_read_dot(page, base_url):
    page.goto(f"{base_url}/system-design/components/caching/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)
    page.evaluate(
        """() => {
            localStorage.setItem('wiki-completed-system-design', JSON.stringify([
                'content/system-design/components/caching.md',
            ]));
        }"""
    )
    _go_to_index(page, base_url)
    dot = _caching_card(page).locator(".index-card-read-dot")
    page.wait_for_function(
        """() => document.querySelector(
            '.index-card[data-article-path="content/system-design/components/caching.md"] .index-card-read-dot'
        )?.classList.contains('visible')""",
        timeout=5_000,
    )
    assert "visible" in (dot.get_attribute("class") or "")


def test_incomplete_card_has_no_read_dot(page, base_url):
    _go_to_index(page, base_url)
    page.evaluate("() => localStorage.removeItem('wiki-completed-system-design')")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector(".index-card:not(.index-card--unavailable)", timeout=10_000)
    dot = _caching_card(page).locator(".index-card-read-dot")
    assert "visible" not in (dot.get_attribute("class") or "")


def test_learning_path_card_shows_zero_progress_with_no_completions(page, base_url):
    page.goto(base_url, wait_until="domcontentloaded")
    page.evaluate("() => localStorage.removeItem('wiki-completed-dsa')")
    _go_to_index(page, base_url, slug="dsa")

    bar = page.locator(".learning-path-bar", has=page.locator(".learning-path-bar-track", has_text="Standard SWE"))
    bar.wait_for(state="visible", timeout=8_000)
    count_text = bar.locator(".learning-path-bar-count").inner_text()
    assert count_text.startswith("0/")


def test_learning_path_card_reflects_completed_articles(page, base_url):
    page.goto(base_url, wait_until="domcontentloaded")
    page.evaluate(
        """() => {
            localStorage.setItem('wiki-completed-dsa', JSON.stringify([
                'content/dsa/data-structures/array.md',
                'content/dsa/data-structures/hash-table.md',
            ]));
        }"""
    )
    _go_to_index(page, base_url, slug="dsa")

    bar = page.locator(".learning-path-bar", has=page.locator(".learning-path-bar-track", has_text="Standard SWE"))
    bar.wait_for(state="visible", timeout=8_000)
    count_text = bar.locator(".learning-path-bar-count").inner_text()
    completed, total = count_text.split("/")
    assert int(completed) >= 2


def test_learning_path_bars_render_for_each_track(page, base_url):
    _go_to_index(page, base_url, slug="dsa")
    assert page.locator(".learning-path-bars").count() == 1
    assert page.locator(".learning-path-bar").count() >= 1


@pytest.mark.smoke
def test_section_shows_article_count(page, base_url):
    _go_to_index(page, base_url)
    section = page.locator(".index-section").first
    count_text = section.locator(".section-count").inner_text()
    card_count = section.locator(".index-card").count()
    assert int(count_text) == card_count
