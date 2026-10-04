"""Inline structure viz (```viz fenced blocks) as the browser shows them.

Block-by-block output (node and edge counts, fallbacks for unknown types and bad literals, the
64-element cap) is asserted in lib/content/plugins/group-b.test.ts; this file only checks that the
rendered SVGs are visible and sized in a real build.
"""

import pytest
from playwright.sync_api import expect


@pytest.mark.parametrize("kind", ["bst", "heap", "linked-list", "array"])
def test_structure_viz_renders_a_visible_sized_svg(content_page, kind):
    viz = content_page("media").locator(f'.structure-viz[data-viz-type="{kind}"]')
    expect(viz).to_have_count(1)
    svg = viz.get_by_role("img")
    expect(svg).to_be_visible()
    box = svg.bounding_box()
    assert box and box["width"] > 40 and box["height"] > 20
