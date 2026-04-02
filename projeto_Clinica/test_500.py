import http.cookiejar, urllib.request, urllib.parse

cj = http.cookiejar.CookieJar()
class NR(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a):
        return None

op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), NR())
op2 = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

try:
    op.open(urllib.request.Request(
        "http://127.0.0.1:5050/login",
        data=urllib.parse.urlencode({"login": "medico1", "senha": "med123"}).encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    ))
except:
    pass

try:
    r = op2.open("http://127.0.0.1:5050/profissional")
    print("OK:", r.read().decode()[:300])
except urllib.error.HTTPError as e:
    print("STATUS:", e.code)
    body = e.read().decode()
    # Find the traceback in Flask debug page
    import re
    tb = re.search(r'<div class="traceback">(.*?)</div>', body, re.DOTALL)
    if tb:
        print(tb.group(1)[:2000])
    else:
        # Try to find pre tags or plain text error
        pre = re.findall(r'<pre[^>]*>(.*?)</pre>', body, re.DOTALL)
        if pre:
            for p in pre[-3:]:
                print(p[:500])
        else:
            # Just print the last 1500 chars
            print(body[-1500:])
