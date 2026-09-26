# Dropped: fetchText 404/network-error message tests (no client fetch-catch-innerHTML path
# survives - Next uses notFound()/static not-found.tsx with no dynamic message, confirmed via
# test_security.py's sweep) and the broken-slug toast-then-redirect flow (no hash router to
# catch an unresolved slug and toast before redirecting - unknown paths are real 404 routes now).
# Dropped: Advanced-tab focus button (#prefs-focus-toggle doesn't exist - focus mode is
# hotkey-only, already covered by test_settings.py::test_focus_mode_hotkey_toggles_class_on_markdown_body)
# and the Preferences Actions tab (Tab type is "general"|"keyboard"|"advanced" only - no
# "actions" tab, no #content-overflow-btn, no prefs-action-row anywhere in PreferencesModal.tsx).
# Dropped: distraction-free-exit-btn (no such element in DistractionFree.tsx) and the old
# reset-view confirm-dialog escape hatch / WIKI-278 (no confirm() tied to Escape or mode-reset
# anywhere in the app - confirm() now only guards "Clear everything" and logout-data-retention).
# Not duplicated here: `,`/`b`-toggle/`t`/`T`/`w`-basic-open hotkeys (test_keyboard_scroll.py,
# test_a11y_hotkeys.py, test_navigation_polish.py) and generic modal mechanics - body-scroll-lock,
# double-open-then-single-close, escape-closes-topmost (all covered by components/common/Modal.test.tsx
# via the shared Modal.tsx every dialog in this app is built on).

import json


def _go_to_article(page, base_url, path="system-design/components/caching/"):
    page.goto(f"{base_url}/{path}", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def _set_font_size(page, size):
    page.evaluate(
        """(size) => localStorage.setItem('wiki-settings', JSON.stringify({
            backgroundId: 'dark-void', textColorId: 'text-crisp-dark', accentId: 'indigo',
            font: 'Inter', fontSize: size, contentWidth: 'Default'
        }))""",
        size,
    )
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def _get_font_size(page):
    settings = json.loads(page.evaluate("() => localStorage.getItem('wiki-settings')"))
    return settings["fontSize"]


# ── Real 404 route ──────────────────────────────────────────────────


def test_unknown_path_renders_not_found_page(page, base_url):
    """An unresolvable path serves the static not-found page, not a client-side error div."""
    response = page.goto(f"{base_url}/system-design/this-article-does-not-exist-xyz/", wait_until="domcontentloaded")
    assert response.status == 404
    assert page.get_by_text("Page not found").count() == 1
    assert page.get_by_role("link", name="Back to the wiki").count() == 1


# ── Font size hotkeys (=/-) ──────────────────────────────────────────


def test_equals_increases_font_size(page, base_url):
    _go_to_article(page, base_url)
    _set_font_size(page, "M")

    page.keyboard.press("=")
    page.wait_for_function("() => JSON.parse(localStorage.getItem('wiki-settings')).fontSize === 'L'")
    assert _get_font_size(page) == "L"


def test_minus_decreases_font_size(page, base_url):
    _go_to_article(page, base_url)
    _set_font_size(page, "M")

    page.keyboard.press("-")
    page.wait_for_function("() => JSON.parse(localStorage.getItem('wiki-settings')).fontSize === 'S'")
    assert _get_font_size(page) == "S"


def test_font_size_does_not_exceed_large(page, base_url):
    _go_to_article(page, base_url)
    _set_font_size(page, "L")

    page.keyboard.press("=")
    page.wait_for_timeout(150)
    assert _get_font_size(page) == "L"


def test_font_size_does_not_go_below_small(page, base_url):
    _go_to_article(page, base_url)
    _set_font_size(page, "S")

    page.keyboard.press("-")
    page.wait_for_timeout(150)
    assert _get_font_size(page) == "S"


# ── Escape vs. reading-mode islands ──────────────────────────────────
# Regression: EscapeToIndex checked `document.body.classList.contains("focus-mode")`, but
# FocusMode.tsx puts that class on .markdown-body, never on body - so the guard could never
# see it, and Escape navigated to the index while focus mode was active (FocusMode itself has
# no Escape handling of its own, so this was the only Escape behavior in effect). Distraction-free
# wasn't checked at all either, and DistractionFree.tsx's own Escape listener registers after
# EscapeToIndex's (mounted later in app/layout.tsx), so it never got a chance to run before the
# navigation fired. Fixed in components/reader/EscapeToIndex.tsx: Escape while either mode is
# active is now a no-op here, deferring to whatever (if anything) else owns it.


def test_escape_does_not_navigate_away_while_focus_mode_active(page, base_url):
    _go_to_article(page, base_url)
    page.keyboard.press("f")
    page.wait_for_function(
        "() => document.querySelector('.markdown-body')?.classList.contains('focus-mode')"
    )

    page.keyboard.press("Escape")
    page.wait_for_timeout(200)
    assert page.locator("#markdown-body").count() == 1, "Escape must not navigate to the index while focus mode is active"
    assert page.evaluate(
        "() => document.querySelector('.markdown-body')?.classList.contains('focus-mode')"
    ), "focus mode itself is untouched by Escape - only the wrong navigation is fixed"


def test_escape_exits_distraction_free_instead_of_navigating_away(page, base_url):
    _go_to_article(page, base_url)
    page.keyboard.press("d")
    page.wait_for_function("() => document.body.classList.contains('distraction-free')")

    page.keyboard.press("Escape")
    page.wait_for_function("() => !document.body.classList.contains('distraction-free')")
    assert page.locator("#markdown-body").count() == 1, "Escape must exit distraction-free, not navigate to the index"


def test_escape_navigates_to_index_when_no_mode_active(page, base_url):
    """Baseline the two fixes above must not break: plain Escape still navigates up."""
    _go_to_article(page, base_url)
    page.keyboard.press("Escape")
    page.wait_for_selector(".index-card:not(.index-card--unavailable)", timeout=5_000)


# ── Wiki-switcher hotkey vs. an already-open modal ───────────────────
# Regression: lib/hotkeys.ts dispatched wiki:open-wiki-switcher unconditionally on W, so it
# could stack a second dialog (and a second focus trap) on top of an already-open modal.
# Fixed by gating W on ctx.anyModalOpen() (wired from modalRegistry.anyOpen in SettingsInit.tsx).


def test_w_does_not_stack_switcher_over_open_bookmarks_modal(page, base_url):
    _go_to_article(page, base_url)
    is_mac = "Mac" in page.evaluate("navigator.platform")
    page.keyboard.press("Meta+b" if is_mac else "Control+b")
    page.wait_for_selector('[role="dialog"][aria-label="Bookmarks"]', timeout=5_000)

    page.keyboard.press("w")
    page.wait_for_timeout(150)
    assert page.locator('[role="dialog"][aria-label="Switch wiki"]').count() == 0, (
        "wiki switcher must not open on top of the bookmarks modal"
    )
    assert page.locator('[role="dialog"][aria-label="Bookmarks"]').count() == 1


def test_w_opens_switcher_once_no_modal_is_open(page, base_url):
    """Baseline the fix above must not break: W still opens the switcher with nothing else open."""
    _go_to_article(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector('[role="dialog"][aria-label="Switch wiki"]', timeout=3_000)


# ── Toast stacking above an open modal ───────────────────────────────


def test_toast_renders_above_open_preferences_modal(page, base_url):
    _go_to_article(page, base_url)
    page.keyboard.press(",")
    dialog = page.locator('[role="dialog"][aria-label="Preferences"]')
    dialog.wait_for(timeout=5_000)
    page.get_by_role("tab", name="Advanced").click()

    page.once("dialog", lambda d: d.accept())
    dialog.get_by_role("button", name="Clear everything").click()
    page.wait_for_selector("#wiki-toast", timeout=5_000)

    assert dialog.count() == 1, "toast must not close the modal underneath it"
    toast_z = page.evaluate("() => getComputedStyle(document.getElementById('wiki-toast')).zIndex")
    modal_z = page.evaluate("() => getComputedStyle(document.querySelector('.prefs-modal')).zIndex")
    assert int(toast_z) > int(modal_z)


# ── Icon tooltip (real layout/geometry, not covered by IconTooltip.test.tsx's jsdom) ──


def test_icon_tooltip_shows_on_hover_with_real_geometry(page, base_url):
    _go_to_article(page, base_url)
    btn = page.locator('.topbar-icon-btn[aria-label="Search"]').first
    box = btn.bounding_box()
    page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2, steps=5)

    page.wait_for_selector("#icon-tooltip.visible", timeout=2_000)
    assert page.locator("#icon-tooltip").inner_text() == "Search (⌘K)"
    assert btn.get_attribute("title") is None

    page.mouse.move(5, 5, steps=5)
    page.wait_for_function(
        "() => !document.getElementById('icon-tooltip')?.classList.contains('visible')",
        timeout=2_000,
    )
    assert btn.get_attribute("title") == "Search (⌘K)"
