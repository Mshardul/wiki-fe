"""Mechanism visualizers: load, scenario tabs, stage, strip seek, read article."""

import json
import re
from pathlib import Path

import pytest
from playwright.sync_api import expect

_MANIFEST_PATH = (
    Path(__file__).resolve().parents[2] / "lib" / "visualizer" / "mechanism" / "manifest.json"
)
_MECHANISM_CASES = [
    (slug, row["scenarioCount"], row["expectReadArticle"])
    for slug, row in json.loads(_MANIFEST_PATH.read_text())["slugs"].items()
]


@pytest.mark.parametrize(
    "slug,scenario_count,expect_read_article",
    _MECHANISM_CASES,
    ids=[c[0] for c in _MECHANISM_CASES],
)
def test_mechanism_pages_load_stage_and_tabs(
    page, base_url, slug, scenario_count, expect_read_article
):
    page.goto(f"{base_url}/visualizer/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector(".viz-mech__stepwrap > .viz-mech__step h3", timeout=20_000)
    page.wait_for_selector(".viz-mech__stage > *", timeout=20_000)
    read_article = page.get_by_role("link", name="Read article")
    if expect_read_article:
        expect(read_article).to_be_visible()
    else:
        expect(read_article).to_have_count(0)
    expect(page.get_by_role("button", name="Copy link")).to_be_visible()
    tabs = page.locator(".viz-tabs__tab")
    expect(tabs).to_have_count(scenario_count)
    if scenario_count > 1:
        tabs.nth(1).click()
        page.wait_for_timeout(400)
        assert page.locator(".viz-mech__question").inner_text().strip() != ""
    expect(page.locator(".viz-strip__cell").first).to_be_visible()


def test_mechanism_strip_seek_updates_counter(page, base_url):
    page.goto(f"{base_url}/visualizer/inside-the-python-gil/")
    page.wait_for_selector(".viz-mech__stepwrap > .viz-mech__step h3", timeout=20_000)
    page.get_by_role("button", name="Pause").click()
    page.locator(".viz-strip__cell").nth(3).click()
    expect(page.get_by_text(re.compile(r"step 4 /"))).to_be_visible()
    page.wait_for_function("() => location.search.includes('i=4')", timeout=5_000)


def test_asyncio_blocking_marks_bad_steps_on_strip(page, base_url):
    page.goto(f"{base_url}/visualizer/inside-the-asyncio-event-loop/?s=blocking")
    page.wait_for_selector(".viz-mech__stepwrap > .viz-mech__step h3", timeout=20_000)
    page.get_by_role("button", name="Pause").click()
    page.locator(".viz-strip__cell").nth(5).click()
    expect(page.locator(".viz-strip__cell.is-bad").first).to_be_visible()


def test_mechanism_see_also_links(page, base_url):
    page.goto(f"{base_url}/visualizer/inside-postgres-mvcc/")
    page.wait_for_selector(".viz-mech__related a", timeout=20_000)
    expect(page.locator(".viz-mech__related a").first).to_have_attribute(
        "href", re.compile(r"/visualizer/inside-a-b-tree-index")
    )
