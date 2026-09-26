"""
Dropped: CDN SRI/crossorigin tests - Next bundles all deps, no CDN <script src> tags exist (grep confirms).
Dropped: error-state HTML-escaping test - no client-side fetch-catch-innerHTML path survives; Next uses
notFound()/static not-found.tsx with no dynamic message rendering. See report for full security audit.
"""
