"""Visualizer: home/landing navigation, autoplay, strip seek, panel collapse, shareable URL state."""

import re

from playwright.sync_api import expect

EVICTION = "/visualizer/eviction-policies/"
TRACE = "q=ABCADEAFBAGC"


def test_home_card_opens_visualizer_landing(page, base_url):
    """the home Visualizer card leads to the landing page, which lists eviction policies."""
    page.goto(f"{base_url}/")
    page.get_by_role("link", name=re.compile(r"Visualizer")).first.click()
    expect(page.get_by_role("heading", level=1, name="Visualizer")).to_be_visible()
    page.get_by_role("link", name=re.compile(r"Eviction policies")).click()
    expect(page).to_have_url(re.compile(re.escape(EVICTION)))
    expect(page.get_by_role("heading", level=1, name="Eviction policies")).to_be_visible()


def test_autoplay_advances_the_request_counter(page, base_url):
    """with no interaction the run plays on its own."""
    page.goto(f"{base_url}{EVICTION}?{TRACE}")
    expect(page.get_by_text("request 1 / 12")).to_be_visible()
    expect(page.get_by_text("request 2 / 12")).to_be_visible(timeout=8_000)


def test_strip_click_jumps_and_centres(page, base_url):
    """clicking a strip cell jumps there and that cell becomes current."""
    page.goto(f"{base_url}{EVICTION}?{TRACE}")
    page.get_by_role("button", name="Pause").click()
    page.get_by_role("button", name=re.compile(r"^Request 8: F")).click()
    expect(page.get_by_text("request 8 / 12")).to_be_visible()
    expect(page.locator(".viz-strip__cell.is-current")).to_have_text("F")


def test_collapsing_configure_widens_the_stage(page, base_url):
    """hiding the left panel leaves a rail and gives the stage the space."""
    page.goto(f"{base_url}{EVICTION}?{TRACE}")
    stage = page.locator(".viz-stage")
    before = stage.bounding_box()["width"]
    page.get_by_role("button", name="Hide Configure").click()
    expect(page.get_by_role("button", name="Show Configure")).to_be_visible()
    assert stage.bounding_box()["width"] > before


def test_url_state_restores_policy_step_and_rotation(page, base_url):
    """a shared URL reopens the same policy, request and orientation."""
    page.goto(f"{base_url}{EVICTION}?p=fifo&{TRACE}&i=8&rot=1")
    page.get_by_role("button", name="Pause").click()
    expect(page.get_by_text("request 8 / 12")).to_be_visible()
    expect(page.get_by_role("heading", name="FIFO")).to_be_visible()
    expect(page.get_by_role("button", name=re.compile(r"Back to the default"))).to_be_visible()
    expect(page.locator(".viz-linear")).to_have_attribute("data-axis", "vertical")
