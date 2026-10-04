# Not ported: the haptic-on-milestone tests (study-feedback.js never ported - grep confirms zero navigator.vibrate call sites in components/lib). Covers the end-of-article complete button, the `c` hotkey, and the two completion-state consumers, CardCompletion.tsx and PrereqStatus.tsx; read-dot + learning-path wiring is covered in test_index_ux.py.

import re

from playwright.sync_api import expect

STACK_ARTICLE = "dsa/data-structures/stack"
STACK_PREREQ_PATH = "content/dsa/data-structures/array.md"
CACHING_ARTICLE = "system-design/components/caching"
CACHING_RELATED_PATH = "content/system-design/components/cdn.md"


def _seed_completed(page, wiki_id, *paths):
    page.evaluate(
        "([key, paths]) => localStorage.setItem(key, JSON.stringify(paths))",
        [f"wiki-completed-{wiki_id}", list(paths)],
    )


def _go_to_article(page, base_url, article):
    page.goto(f"{base_url}/{article}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def test_related_card_marked_done_when_completed(page, base_url):
    _go_to_article(page, base_url, CACHING_ARTICLE)
    _seed_completed(page, "system-design", CACHING_RELATED_PATH)
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)

    card = page.locator('#related-articles .related-card[data-related-path="system-design/components/cdn"]')
    page.wait_for_function(
        """() => document.querySelector(
            '#related-articles .related-card[data-related-path="system-design/components/cdn"]'
        )?.classList.contains('related-card--done')""",
        timeout=5_000,
    )
    assert "related-card--done" in (card.get_attribute("class") or "")
    assert "chip-status--done" in (card.locator(".chip-status").get_attribute("class") or "")


def test_related_card_not_done_when_incomplete(page, base_url):
    _go_to_article(page, base_url, CACHING_ARTICLE)
    card = page.locator('#related-articles .related-card[data-related-path="system-design/components/cdn"]')
    assert "related-card--done" not in (card.get_attribute("class") or "")


def test_related_card_updates_live_on_storage_change(page, base_url):
    """CardCompletion re-applies via subscribeCompletions when the completed set changes underneath it."""
    _go_to_article(page, base_url, CACHING_ARTICLE)
    card = page.locator('#related-articles .related-card[data-related-path="system-design/components/cdn"]')
    assert "related-card--done" not in (card.get_attribute("class") or "")

    _seed_completed(page, "system-design", CACHING_RELATED_PATH)
    page.evaluate("() => window.dispatchEvent(new StorageEvent('storage', { key: 'wiki-completed-system-design' }))")
    page.wait_for_function(
        """() => document.querySelector(
            '#related-articles .related-card[data-related-path="system-design/components/cdn"]'
        )?.classList.contains('related-card--done')""",
        timeout=5_000,
    )


def test_prereq_chip_marked_done_when_completed(page, base_url):
    _go_to_article(page, base_url, STACK_ARTICLE)
    _seed_completed(page, "dsa", STACK_PREREQ_PATH)
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)

    chip = page.locator('.prereq-chip[data-prereq-path="content/dsa/data-structures/array.md"]')
    page.wait_for_function(
        """() => document.querySelector(
            '.prereq-chip[data-prereq-path="content/dsa/data-structures/array.md"]'
        )?.classList.contains('prereq-chip--done')""",
        timeout=5_000,
    )
    assert "prereq-chip--done" in (chip.get_attribute("class") or "")


def test_prereq_chip_not_done_when_incomplete(page, base_url):
    _go_to_article(page, base_url, STACK_ARTICLE)
    chip = page.locator('.prereq-chip[data-prereq-path="content/dsa/algorithms/big-o-notation.md"]')
    assert "prereq-chip--done" not in (chip.get_attribute("class") or "")


def test_completion_state_persists_on_revisit(page, base_url):
    _go_to_article(page, base_url, STACK_ARTICLE)
    _seed_completed(page, "dsa", STACK_PREREQ_PATH)

    page.goto(f"{base_url}/dsa/", wait_until="domcontentloaded")
    page.wait_for_selector(".index-card:not(.index-card--unavailable)", timeout=10_000)

    _go_to_article(page, base_url, STACK_ARTICLE)
    chip = page.locator('.prereq-chip[data-prereq-path="content/dsa/data-structures/array.md"]')
    page.wait_for_function(
        """() => document.querySelector(
            '.prereq-chip[data-prereq-path="content/dsa/data-structures/array.md"]'
        )?.classList.contains('prereq-chip--done')""",
        timeout=5_000,
    )
    assert "prereq-chip--done" in (chip.get_attribute("class") or "")


def _complete_button(page):
    return page.get_by_role("button", name="Mark as completed")


def test_complete_button_toggles_and_persists(page, base_url):
    _go_to_article(page, base_url, STACK_ARTICLE)
    button = _complete_button(page)
    expect(button).to_have_attribute("aria-pressed", "false")

    button.click()
    expect(button).to_have_attribute("aria-pressed", "true")
    expect(page.locator("#wiki-toast")).to_contain_text("Marked as completed")

    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)
    expect(_complete_button(page)).to_have_attribute("aria-pressed", "true")

    _complete_button(page).click()
    expect(_complete_button(page)).to_have_attribute("aria-pressed", "false")


def test_complete_toast_undo_reverts(page, base_url):
    _go_to_article(page, base_url, STACK_ARTICLE)
    _complete_button(page).click()
    page.get_by_role("button", name="Undo").click()
    expect(_complete_button(page)).to_have_attribute("aria-pressed", "false")


def test_c_hotkey_toggles_completion(page, base_url):
    _go_to_article(page, base_url, STACK_ARTICLE)
    page.keyboard.press("c")
    expect(_complete_button(page)).to_have_attribute("aria-pressed", "true")
    page.keyboard.press("c")
    expect(_complete_button(page)).to_have_attribute("aria-pressed", "false")


def test_completing_marks_prereq_chip_done_on_dependent_article(page, base_url):
    _go_to_article(page, base_url, "dsa/data-structures/array")
    page.keyboard.press("c")
    _go_to_article(page, base_url, STACK_ARTICLE)
    chip = page.locator('.prereq-chip[data-prereq-path="content/dsa/data-structures/array.md"]')
    expect(chip).to_have_class(re.compile(r"prereq-chip--done"))


def test_anon_completion_makes_no_api_call(page, base_url):
    calls = []
    page.route(
        "**/api/v1/auth/me",
        lambda r: r.fulfill(status=401, content_type="application/json", body='{"error":{"code":"UNAUTHORIZED","message":"x"}}'),
    )
    page.route("**/api/v1/completions**", lambda r: (calls.append(r.request.url), r.abort()))

    _go_to_article(page, base_url, STACK_ARTICLE)
    _complete_button(page).click()
    expect(_complete_button(page)).to_have_attribute("aria-pressed", "true")
    page.wait_for_timeout(150)
    assert calls == []


def _stub_logged_in_completions(page, server_up):
    """Logged-in session with a completions endpoint that rejects writes (network error) until server_up['on']."""
    page.route(
        "**/api/v1/auth/me",
        lambda r: r.fulfill(status=200, content_type="application/json", body='{"user":{"id":"1","email":"a@example.com"}}'),
    )
    page.add_init_script("localStorage.setItem('wiki-session-token', 'test-session-token')")
    for path in ("bookmarks", "recents"):
        page.route(f"**/api/v1/{path}", lambda r: r.fulfill(status=200, content_type="application/json", body="[]"))

    writes = []

    def completions(route):
        if route.request.method == "GET":
            route.fulfill(status=200, content_type="application/json", body="[]")
        elif server_up["on"]:
            writes.append(route.request.post_data_json)
            route.fulfill(status=201, content_type="application/json", body="{}")
        else:
            route.abort()

    page.route("**/api/v1/completions", completions)
    return writes


def test_failed_completion_write_survives_reload_and_replays_when_online(page, base_url):
    server_up = {"on": False}
    writes = _stub_logged_in_completions(page, server_up)

    _go_to_article(page, base_url, STACK_ARTICLE)
    page.keyboard.press("c")
    expect(_complete_button(page)).to_have_attribute("aria-pressed", "true")
    page.wait_for_function("() => localStorage.getItem('wiki-sync-outbox') !== null")

    # the boot pull must not overwrite the unsent completion with the server's empty list
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)
    expect(_complete_button(page)).to_have_attribute("aria-pressed", "true")
    assert writes == []

    server_up["on"] = True
    page.evaluate("() => window.dispatchEvent(new Event('online'))")
    page.wait_for_function("() => localStorage.getItem('wiki-sync-outbox') === null")
    assert [w["path"] for w in writes] == ["content/dsa/data-structures/stack.md"]
    assert writes[0]["client_ts"]
