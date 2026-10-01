#!/usr/bin/env python3
"""Serve this simulation folder with HTTP Basic auth on 127.0.0.1 (for tailscale serve).

Auth is required on every request, independent of the bind address: tailscale serve and any
reverse proxy connect as a local client, so "only on 127.0.0.1" is not a gate.
Env: BBRZ_USER, BBRZ_PASS (required, e.g. from ~/.config/bbrz-sim.env), BBRZ_PORT (default 8079).
"""
import base64, hmac, os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
USER, PASS = os.environ.get("BBRZ_USER"), os.environ.get("BBRZ_PASS")
if not USER or not PASS:
    sys.exit("BBRZ_USER/BBRZ_PASS unset - refusing to start unauthenticated")
EXPECTED = "Basic " + base64.b64encode(f"{USER}:{PASS}".encode()).decode()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def _authorized(self):
        if hmac.compare_digest(self.headers.get("Authorization", ""), EXPECTED):
            return True
        self.send_response(401)
        self.send_header("WWW-Authenticate", 'Basic realm="Tiefziehen", charset="UTF-8"')
        self.send_header("Content-Length", "0")
        self.end_headers()
        return False

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        if self._authorized():
            super().do_GET()

    def do_HEAD(self):
        if self._authorized():
            super().do_HEAD()

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    port = int(os.environ.get("BBRZ_PORT", "8079"))
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
