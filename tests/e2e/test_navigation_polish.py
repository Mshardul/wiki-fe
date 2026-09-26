# Dropped: index collapse-all/expand-all (dead per test_index_ux.py's sweep — no producing control), link-graph g/G hotkey + list/graph view toggle (dropped per migration spec §9, confirmed via grep — no link-graph-modal/index-graph string in app/ or components/), mobile bottom-sheet switcher (.wiki-switcher-dialog/-drag-handle/-hint are orphaned CSS, WikiSwitcher.tsx never renders those elements). Arrow-key next/prev-within-section already covered by test_index_ux.py, not duplicated here.

import pytest


def _go_to_index(page, base_url, slug="system-design"):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector(".index-card:not(.index-card--unavailable)", timeout=10_000)


def _go_to_article(page, base_url, path="system-design/components/caching/"):
    page.goto(f"{base_url}/{path}", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def _go_home(page, base_url):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector(".wiki-card", timeout=8_000)


SWITCHER_DIALOG = '[role="dialog"][aria-label="Switch wiki"]'


# ── Arrow key navigation (boundary + reverse-direction cases not already covered) ──

def test_arrow_down_stops_at_last_card_in_section(page, base_url):
    _go_to_index(page, base_url)
    cards = page.locator(".index-section").first.locator(".index-card")
    last_idx = cards.count() - 1
    cards.nth(last_idx).focus()
    page.keyboard.press("ArrowDown")
    focused_title = page.evaluate(
        "() => document.activeElement.querySelector('.index-card-title')?.textContent?.trim()"
    )
    last_title = cards.nth(last_idx).locator(".index-card-title").inner_text().strip()
    assert focused_title == last_title


def test_arrow_up_moves_to_previous_card(page, base_url):
    _go_to_index(page, base_url)
    cards = page.locator(".index-section").first.locator(".index-card")
    cards.nth(1).focus()
    page.keyboard.press("ArrowUp")
    focused_title = page.evaluate(
        "() => document.activeElement.querySelector('.index-card-title')?.textContent?.trim()"
    )
    first_title = cards.first.locator(".index-card-title").inner_text().strip()
    assert focused_title == first_title


def test_enter_on_focused_card_navigates(page, base_url):
    """Cards are real anchors, so Enter on a focused card is native browser navigation."""
    _go_to_index(page, base_url)
    card = page.locator(".index-card:not(.index-card--unavailable)").first
    card.focus()
    page.keyboard.press("Enter")
    page.wait_for_selector("#markdown-body", timeout=8_000)


# ── Wiki switcher hotkey (W) ─────────────────────────────────────────────────

def test_w_hotkey_opens_switcher_from_content(page, base_url):
    _go_to_article(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector(SWITCHER_DIALOG, timeout=3_000)


def test_w_hotkey_opens_switcher_from_index(page, base_url):
    _go_to_index(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector(SWITCHER_DIALOG, timeout=3_000)


def test_w_hotkey_opens_switcher_from_home(page, base_url):
    """W has no isArticle gate in lib/hotkeys.ts, so it also opens from the home view."""
    _go_home(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector(SWITCHER_DIALOG, timeout=3_000)


def test_w_hotkey_toggles_switcher_closed(page, base_url):
    """WikiSwitcherHost flips open state on every dispatch, so a second W press closes it."""
    _go_to_article(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector(SWITCHER_DIALOG, timeout=3_000)
    page.keyboard.press("w")
    page.wait_for_selector(SWITCHER_DIALOG, state="detached", timeout=2_000)


def test_escape_closes_switcher(page, base_url):
    _go_to_article(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector(SWITCHER_DIALOG, timeout=3_000)
    page.keyboard.press("Escape")
    page.wait_for_selector(SWITCHER_DIALOG, state="detached", timeout=2_000)


def test_wiki_switcher_shows_wiki_cards(page, base_url):
    _go_to_article(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector(SWITCHER_DIALOG, timeout=3_000)
    card_count = page.locator(".wiki-switcher-card").count()
    assert card_count > 0, "Wiki switcher must show at least one wiki card"


def test_wiki_switcher_card_names_not_undefined(page, base_url):
    _go_to_article(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector(SWITCHER_DIALOG, timeout=3_000)
    names = page.locator(".wiki-switcher-card-name").all_inner_texts()
    assert names, "Wiki switcher must render at least one card name"
    assert all(n.strip() and n.strip() != "undefined" for n in names), (
        f"Wiki switcher card names must not be 'undefined', got: {names}"
    )


def test_wiki_switcher_marks_current_vertical_active(page, base_url):
    _go_to_article(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector(SWITCHER_DIALOG, timeout=3_000)
    active = page.locator(".wiki-switcher-card--active")
    assert active.count() == 1
    assert "System Design" in active.inner_text()


def test_wiki_switcher_card_click_navigates(page, base_url):
    _go_to_article(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector(SWITCHER_DIALOG, timeout=3_000)
    other_card = page.locator(".wiki-switcher-card:not(.wiki-switcher-card--active)").first
    other_card.click()
    page.wait_for_selector(SWITCHER_DIALOG, state="detached", timeout=3_000)
    page.wait_for_url(lambda url: "/system-design" not in url, timeout=5_000)


def test_overlay_click_closes_switcher(page, base_url):
    """Root-cause fix: WikiSwitcher.tsx had className/backdropClassName swapped, so the dialog card covered the full viewport and no backdrop click could ever land outside it."""
    _go_to_article(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector(SWITCHER_DIALOG, timeout=3_000)
    page.locator(".wiki-switcher-modal").click(force=True, position={"x": 5, "y": 5})
    page.wait_for_selector(SWITCHER_DIALOG, state="detached", timeout=2_000)
