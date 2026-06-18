"""
CDN script Subresource Integrity (SRI) attributes
Error-state output escaping (err.message is HTML-escaped before innerHTML)
"""


def test_cdn_scripts_have_integrity_attribute(page, base_url):
    """Every CDN <script> tag carries a sha-based integrity (SRI) hash."""
    page.goto(f"{base_url}/")
    page.wait_for_load_state("domcontentloaded")

    cdn_scripts = page.evaluate(
        """() => [...document.querySelectorAll('script[src]')]
            .filter(s =>
                s.getAttribute('src').includes('cdn.jsdelivr') ||
                s.getAttribute('src').includes('cdnjs.cloudflare'))
            .map(s => ({
                src: s.getAttribute('src'),
                integrity: s.getAttribute('integrity') || ''
            }))"""
    )
    assert cdn_scripts, "No CDN script tags found in index.html"
    for script in cdn_scripts:
        assert script["integrity"], (
            f"Missing integrity attribute on CDN script: {script['src']}"
        )


def test_cdn_scripts_have_crossorigin_anonymous(page, base_url):
    """Every CDN <script> tag has crossorigin=anonymous so SRI checks can run."""
    page.goto(f"{base_url}/")
    page.wait_for_load_state("domcontentloaded")

    cdn_scripts = page.evaluate(
        """() => [...document.querySelectorAll('script[src]')]
            .filter(s =>
                s.getAttribute('src').includes('cdn.jsdelivr') ||
                s.getAttribute('src').includes('cdnjs.cloudflare'))
            .map(s => ({
                src: s.getAttribute('src'),
                crossorigin: s.getAttribute('crossorigin') || ''
            }))"""
    )
    assert cdn_scripts, "No CDN script tags found in index.html"
    for script in cdn_scripts:
        assert script["crossorigin"] == "anonymous", (
            f"Expected crossorigin=anonymous on {script['src']}, got '{script['crossorigin']}'"
        )


# ── Error-state output escaping ──────────────────────────────────


def test_index_load_error_escapes_message(page, base_url):
    """An index-load failure renders err.message escaped — no HTML injected.

    Forces fetch to reject with an error message containing markup; the error
    state must show it as text, never inject a live element into the DOM.
    """
    page.goto(f"{base_url}/")
    page.wait_for_load_state("networkidle")

    # Make every index.md fetch reject with a message that carries HTML.
    page.evaluate("""() => {
        const orig = window.fetch;
        window.fetch = (url, ...rest) => {
            const u = typeof url === 'string' ? url : url?.url ?? '';
            if (u.endsWith('index.md')) {
                return Promise.reject(new Error('<img src=x onerror=window.__xss=1>'));
            }
            return orig(url, ...rest);
        };
    }""")

    # Navigate to an index view to trigger the failing load + error state.
    page.evaluate("() => navigate('system-design')")
    page.wait_for_selector("#index-sections .error", timeout=8_000)

    result = page.evaluate("""() => ({
        injectedImg: !!document.querySelector('#index-sections .error img'),
        xssFired: window.__xss === 1,
        text: document.querySelector('#index-sections .error').textContent,
    })""")
    assert not result["injectedImg"], "err.message was injected as live HTML (not escaped)"
    assert not result["xssFired"], "onerror handler fired — message not escaped"
    assert "<img" in result["text"], (
        f"Escaped markup should appear as literal text, got: {result['text']!r}"
    )
