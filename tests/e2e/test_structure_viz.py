"""
Inline structure viz (```viz fenced blocks):
- bst / heap / linked-list / array literals render an inline SVG
- unknown type or bad literal falls back to the raw code block
"""

ARTICLE_WITH_BST_VIZ = """\
# BST Viz Test

```viz
bst
[5,3,8,1,4]
```

Some text.
"""

ARTICLE_WITH_HEAP_VIZ = """\
# Heap Viz Test

```viz
heap
[9,7,8,3,2,5]
```
"""

ARTICLE_WITH_LINKED_LIST_VIZ = """\
# Linked List Viz Test

```viz
linked-list
[1,2,3]
```
"""

ARTICLE_WITH_ARRAY_VIZ = """\
# Array Viz Test

```viz
array
[10,20,30]
```
"""

ARTICLE_WITH_UNKNOWN_VIZ = """\
# Unknown Viz Test

```viz
graph
[1,2,3]
```
"""

ARTICLE_WITH_BAD_LITERAL_VIZ = """\
# Bad Literal Viz Test

```viz
bst
not valid json
```
"""


def _load_mock_article(page, base_url, content, slug="mock"):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.wait_for_function("() => typeof window.navigateToContent === 'function'", timeout=8_000)
    page.route(f"**/{slug}.md", lambda r: r.fulfill(body=content))
    page.evaluate(f"""() => navigateToContent(
        'system-design',
        encodeURIComponent('../content/system-design/{slug}.md'),
        encodeURIComponent('{slug.capitalize()}'),
        '{slug}'
    )""")
    page.wait_for_selector("#view-content.active", timeout=8_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=8_000,
    )


def test_bst_viz_renders_svg(page, base_url):
    """A ```viz bst block renders a .structure-viz with an inline SVG."""
    _load_mock_article(page, base_url, ARTICLE_WITH_BST_VIZ, slug="viz-bst")
    page.wait_for_selector(".structure-viz svg", timeout=8_000)
    node_count = page.evaluate(
        "() => document.querySelectorAll('.structure-viz .structure-viz-node').length"
    )
    assert node_count == 5, f"Expected 5 tree nodes, got {node_count}"


def test_heap_viz_renders_svg(page, base_url):
    """A ```viz heap block renders a .structure-viz with an inline SVG."""
    _load_mock_article(page, base_url, ARTICLE_WITH_HEAP_VIZ, slug="viz-heap")
    page.wait_for_selector(".structure-viz svg", timeout=8_000)
    viz_type = page.evaluate(
        "() => document.querySelector('.structure-viz')?.dataset.vizType"
    )
    assert viz_type == "heap"


def test_linked_list_viz_renders_svg(page, base_url):
    """A ```viz linked-list block renders nodes with connecting edges."""
    _load_mock_article(page, base_url, ARTICLE_WITH_LINKED_LIST_VIZ, slug="viz-linked-list")
    page.wait_for_selector(".structure-viz svg", timeout=8_000)
    node_count = page.evaluate(
        "() => document.querySelectorAll('.structure-viz .structure-viz-node').length"
    )
    edge_count = page.evaluate(
        "() => document.querySelectorAll('.structure-viz .structure-viz-edge').length"
    )
    assert node_count == 3, f"Expected 3 list nodes, got {node_count}"
    assert edge_count == 2, f"Expected 2 connecting edges, got {edge_count}"


def test_array_viz_renders_svg(page, base_url):
    """A ```viz array block renders one cell per element."""
    _load_mock_article(page, base_url, ARTICLE_WITH_ARRAY_VIZ, slug="viz-array")
    page.wait_for_selector(".structure-viz svg", timeout=8_000)
    cell_count = page.evaluate(
        "() => document.querySelectorAll('.structure-viz .structure-viz-cell').length"
    )
    assert cell_count == 3, f"Expected 3 array cells, got {cell_count}"


def test_unknown_viz_type_falls_back_to_raw_block(page, base_url):
    """An unrecognized structure tag leaves the raw ```viz code block intact."""
    _load_mock_article(page, base_url, ARTICLE_WITH_UNKNOWN_VIZ, slug="viz-unknown")
    page.wait_for_selector("#markdown-body[data-render-done]", timeout=8_000)
    has_viz = page.evaluate("() => !!document.querySelector('.structure-viz')")
    has_raw = page.evaluate(
        "() => !!document.querySelector('pre code.language-viz')"
    )
    assert not has_viz, "Unknown viz type should not produce a .structure-viz element"
    assert has_raw, "Unknown viz type should fall back to the raw code block"


def test_bad_literal_viz_falls_back_to_raw_block(page, base_url):
    """A non-JSON literal in a ```viz block leaves the raw code block intact."""
    _load_mock_article(page, base_url, ARTICLE_WITH_BAD_LITERAL_VIZ, slug="viz-bad-literal")
    page.wait_for_selector("#markdown-body[data-render-done]", timeout=8_000)
    has_viz = page.evaluate("() => !!document.querySelector('.structure-viz')")
    has_raw = page.evaluate(
        "() => !!document.querySelector('pre code.language-viz')"
    )
    assert not has_viz, "Bad literal should not produce a .structure-viz element"
    assert has_raw, "Bad literal should fall back to the raw code block"
