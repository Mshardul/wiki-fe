def test_debug(wiki_page):
    wiki_page.set_viewport_size({"width": 375, "height": 400})
    wiki_page.locator("body").click()
    wiki_page.keyboard.press("Meta+k")
    wiki_page.wait_for_selector("#global-search-modal:not(.hidden)")

    dialog = wiki_page.locator(".gsearch-dialog")
    dialog.wait_for(state="visible", timeout=5_000)

    wiki_page.fill("#gsearch-input", "array")
    wiki_page.wait_for_selector(".gsearch-result", state="attached", timeout=10_000)

    info = wiki_page.evaluate("""() => {
        const dialog = document.querySelector('.gsearch-dialog');
        const results = document.querySelector('.gsearch-results');
        const cs = getComputedStyle(dialog);
        const csr = getComputedStyle(results);
        const dr = dialog.getBoundingClientRect();
        const rr = results.getBoundingClientRect();
        const items = [...document.querySelectorAll('.gsearch-result')];
        return {
            dialogRect: {top: dr.top, height: dr.height},
            dialogOverflow: cs.overflow,
            resultsFlex: csr.flex,
            resultsRect: {top: rr.top, height: rr.height},
            resultsOverflowY: csr.overflowY,
            resultCount: items.length,
            lastItemBottom: items.length ? items[items.length-1].getBoundingClientRect().bottom : null,
            firstItemTop: items.length ? items[0].getBoundingClientRect().top : null,
        };
    }""")
    import json
    print(json.dumps(info, indent=2))
    assert False, "debug print above"
