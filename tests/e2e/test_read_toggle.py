# Not ported: the "Mark as completed" button (.completion-btn), its toggle/persistence/anon-no-API-call tests, and the haptic-on-milestone tests (study-feedback.js never ported - grep confirms zero navigator.vibrate call sites in components/lib) - completions.ts markCompleted/markUncompleted have no UI writer anywhere in the Next app (WIKI-658). Read-dot + learning-path completion wiring already covered in test_index_ux.py; this file covers the two remaining completion-state consumers, CardCompletion.tsx and PrereqStatus.tsx.

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
