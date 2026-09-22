# Static server for the prototype, with caching switched off.
# python3 -m http.server sends only Last-Modified, so browsers apply heuristic
# freshness and keep serving a stale builder.js/styles.css after an edit —
# which repeatedly made fixes look like they hadn't worked.
import http.server, socketserver, sys, os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4188
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    def log_message(self, fmt, *args):
        sys.stderr.write("%s\n" % (fmt % args))

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('127.0.0.1', PORT), NoCache) as httpd:
    print('serving %s on http://localhost:%d (no-store)' % (os.getcwd(), PORT), flush=True)
    httpd.serve_forever()
