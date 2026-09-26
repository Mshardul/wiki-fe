"""
HTML markup integrity tests for the pipeline-rendered article body:
- Heading anchor-link icon structure (real SVG use, not an empty placeholder span)
- section-wrap container nesting (no block content leaking into <p>)
- Heading id uniqueness
- Code-header structural markup (traffic lights, lang label, copy button)
Skip-to-content, CDN-script-defer, and inline-onclick/data-action tests dropped -
grep confirms no skip-link, no CDN <script> tags (Next bundles its own JS), and no
data-action delegation exist anywhere in app/ or components/; those were vanilla-JS-era concerns.
"""

SLUG = "system-design/components/caching"


def _article(page, base_url, slug=SLUG):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


# ── Heading anchor-link icon ──────────────────────────────────────


def test_heading_anchor_link_has_svg_icon(page, base_url):
    """Each autolinked heading's <a> contains a real <svg><use> icon, not an empty span."""
    _article(page, base_url)
    svg_count = page.evaluate("""() => {
        const anchors = document.querySelectorAll('#markdown-body h2 > a[aria-hidden="true"], #markdown-body h3 > a[aria-hidden="true"]');
        return [...anchors].filter(a => a.querySelector('svg.icon > use')).length;
    }""")
    heading_count = page.locator("#markdown-body h2, #markdown-body h3").count()
    assert svg_count == heading_count, (
        f"Expected all {heading_count} heading anchor-links to contain svg.icon > use, got {svg_count}"
    )


def test_heading_anchor_link_icon_references_sprite(page, base_url):
    """The heading anchor-link <use> references #icon-anchor in the inlined sprite."""
    _article(page, base_url)
    href = page.evaluate(
        "() => document.querySelector('#markdown-body h2 a[aria-hidden=\"true\"] use')?.getAttribute('href')"
    )
    assert href == "#icon-anchor", f"Expected use href='#icon-anchor', got {href!r}"
    symbol_exists = page.evaluate(
        "() => !!document.getElementById('icon-anchor')"
    )
    assert symbol_exists, "No #icon-anchor symbol found in the inlined sprite"


# ── section-wrap nesting validity ─────────────────────────────────


def test_no_block_elements_nested_inside_paragraphs(page, base_url):
    """section-wrap and other plugins must never leave div/pre/table/list/heading inside a <p>."""
    _article(page, base_url)
    offenders = page.evaluate("""() => {
        const ps = [...document.querySelectorAll('#markdown-body p')];
        return ps.filter(p => p.querySelector('div, pre, table, ul, ol, blockquote, h1, h2, h3, h4')).length;
    }""")
    assert offenders == 0, f"Found {offenders} <p> elements with block-level children"


def test_section_wrap_containers_pair_title_and_body(page, base_url):
    """Every .section has exactly one .section-title (holding its h2) and one .section-body."""
    _article(page, base_url)
    result = page.evaluate("""() => {
        const sections = [...document.querySelectorAll('#markdown-body .section')];
        return sections.map(s => ({
            titles: s.querySelectorAll(':scope > .section-title').length,
            bodies: s.querySelectorAll(':scope > .section-body').length,
            titleHasH2: !!s.querySelector(':scope > .section-title > h2'),
        }));
    }""")
    assert len(result) > 0, "Expected at least one .section container"
    for entry in result:
        assert entry["titles"] == 1, f"Expected 1 .section-title, got {entry['titles']}"
        assert entry["bodies"] == 1, f"Expected 1 .section-body, got {entry['bodies']}"
        assert entry["titleHasH2"], ".section-title must wrap an h2"


# ── Heading id uniqueness ─────────────────────────────────────────


def test_heading_ids_are_unique(page, base_url):
    """rehype-slug must not emit duplicate ids within a single article."""
    _article(page, base_url)
    ids = page.evaluate(
        "() => [...document.querySelectorAll('#markdown-body [id]')].map(el => el.id)"
    )
    assert len(ids) == len(set(ids)), f"Duplicate ids found in article body: {ids}"


# ── Code-header structural markup ─────────────────────────────────


def test_code_block_has_traffic_lights_and_copy_button(page, base_url):
    """Each highlighted <pre> gets a .code-header with 3 traffic-light spans and a trailing .copy-btn."""
    _article(page, base_url)
    page.wait_for_selector("#markdown-body pre .code-header", timeout=8_000)
    result = page.evaluate("""() => {
        const pres = [...document.querySelectorAll('#markdown-body pre')].filter(p => !p.classList.contains('mermaid'));
        return pres.map(p => ({
            hasHeader: !!p.querySelector(':scope > .code-header'),
            lights: p.querySelectorAll(':scope > .code-header .tl').length,
            lastChildIsCopyBtn: p.lastElementChild?.classList.contains('copy-btn') ?? false,
        }));
    }""")
    assert len(result) > 0, "Expected at least one non-mermaid code block"
    for entry in result:
        assert entry["hasHeader"], "Expected .code-header as first child of <pre>"
        assert entry["lights"] == 3, f"Expected 3 traffic-light spans, got {entry['lights']}"
        assert entry["lastChildIsCopyBtn"], "Expected .copy-btn as last child of <pre>"


def test_callout_blockquote_has_icon_and_first_line_wrap(page, base_url):
    """A styled callout blockquote gets .callout-icon + .callout-first-line, not a raw emoji-prefixed paragraph."""
    _article(page, base_url)
    result = page.evaluate("""() => {
        const callouts = [...document.querySelectorAll('#markdown-body blockquote.callout')];
        return callouts.map(c => ({
            hasIcon: !!c.querySelector('.callout-first-line .callout-icon'),
            variantClass: [...c.classList].some(cls => cls.startsWith('callout-') && cls !== 'callout'),
        }));
    }""")
    assert len(result) > 0, "Expected at least one .callout blockquote in this article"
    for entry in result:
        assert entry["hasIcon"], "Expected .callout-first-line > .callout-icon"
        assert entry["variantClass"], "Expected a callout-<variant> class alongside .callout"
