import http.cookiejar, urllib.request, urllib.parse, json, sqlite3

cj = http.cookiejar.CookieJar()
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None
opener_nr = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), NoRedirect)
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

erros = []
ok = []

# 1) Login como medico
try:
    login_data = urllib.parse.urlencode({"login": "medico1", "senha": "med123"}).encode()
    req = urllib.request.Request("http://127.0.0.1:5050/login", data=login_data)
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    opener_nr.open(req)
except urllib.error.HTTPError as e:
    if e.code == 302:
        ok.append("1. Login medico1 -> 302 redirect OK")
    else:
        erros.append(f"1. Login falhou: {e.code}")

if not any(c.name == "session" for c in cj):
    erros.append("1b. Cookie session nao recebido")
else:
    ok.append("1b. Cookie session presente")

# 2) Acesso ao painel profissional
try:
    r = opener.open("http://127.0.0.1:5050/profissional")
    html = r.read().decode()
    checks = ["ctx-menu", "modal-bloqueio", "ctx-block-manha", "ctx-block-tarde",
              "ctx-block-dia", "prof-cal-grid", "bloqCache"]
    for c in checks:
        if c in html:
            ok.append(f'2. HTML contem "{c}"')
        else:
            erros.append(f'2. HTML NAO contem "{c}"')
except Exception as e:
    erros.append(f"2. Acesso painel falhou: {e}")

# 3) Bloquear manha
try:
    body = json.dumps({"data": "2026-04-10", "periodo": "manha", "justificativa": "Dentista pessoal"}).encode()
    req = urllib.request.Request("http://127.0.0.1:5050/api/profissional/bloqueio", data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    resp = opener.open(req)
    d = json.loads(resp.read().decode())
    if d.get("success"):
        ok.append("3. Bloquear manha -> success")
    else:
        erros.append(f"3. Bloquear manha falhou: {d}")
except Exception as e:
    erros.append(f"3. Bloquear manha erro: {e}")

# 4) Bloquear tarde
try:
    body = json.dumps({"data": "2026-04-11", "periodo": "tarde", "justificativa": "Reuniao conselho"}).encode()
    req = urllib.request.Request("http://127.0.0.1:5050/api/profissional/bloqueio", data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    resp = opener.open(req)
    d = json.loads(resp.read().decode())
    if d.get("success"):
        ok.append("4. Bloquear tarde -> success")
    else:
        erros.append(f"4. Bloquear tarde falhou: {d}")
except Exception as e:
    erros.append(f"4. Bloquear tarde erro: {e}")

# 5) Bloquear dia inteiro (sem justificativa)
try:
    body = json.dumps({"data": "2026-04-20", "periodo": "dia_inteiro", "justificativa": ""}).encode()
    req = urllib.request.Request("http://127.0.0.1:5050/api/profissional/bloqueio", data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    resp = opener.open(req)
    d = json.loads(resp.read().decode())
    if d.get("success"):
        ok.append("5. Bloquear dia inteiro -> success")
    else:
        erros.append(f"5. Bloquear dia inteiro falhou: {d}")
except Exception as e:
    erros.append(f"5. Bloquear dia inteiro erro: {e}")

# 6) Calendario - verificar bloqueios
try:
    resp = opener.open("http://127.0.0.1:5050/api/profissional/calendario/2026-04")
    d = json.loads(resp.read().decode())
    bloqs = d.get("bloqueios", {})
    if "2026-04-10" in bloqs:
        ok.append("6a. Bloqueio 10/04 presente no calendario")
    else:
        erros.append("6a. Bloqueio 10/04 NAO encontrado")
    if "2026-04-11" in bloqs:
        ok.append("6b. Bloqueio 11/04 presente")
    else:
        erros.append("6b. Bloqueio 11/04 NAO encontrado")
    if "2026-04-20" in bloqs:
        ok.append("6c. Bloqueio 20/04 presente")
    else:
        erros.append("6c. Bloqueio 20/04 NAO encontrado")
    # Verificar que justificativa NAO e retornada para medico
    just_exposta = False
    for data_key, lista in bloqs.items():
        for b in lista:
            if "justificativa" in b:
                erros.append(f"6d. SEGURANCA: justificativa exposta para medico em {data_key}!")
                just_exposta = True
                break
    if not just_exposta:
        ok.append("6d. Justificativa NAO exposta para medico (correto)")
    # Verificar periodo
    b10 = bloqs.get("2026-04-10", [{}])[0]
    if b10.get("periodo") == "manha":
        ok.append("6e. Periodo manha correto")
    else:
        erros.append(f"6e. Periodo incorreto: {b10.get('periodo')}")
except Exception as e:
    erros.append(f"6. Calendario erro: {e}")

# 7) Desbloquear
try:
    resp = opener.open("http://127.0.0.1:5050/api/profissional/calendario/2026-04")
    d = json.loads(resp.read().decode())
    bid = d["bloqueios"]["2026-04-10"][0]["id"]
    req = urllib.request.Request(f"http://127.0.0.1:5050/api/profissional/bloqueio/{bid}", method="DELETE")
    resp = opener.open(req)
    d2 = json.loads(resp.read().decode())
    if d2.get("success"):
        ok.append(f"7a. Desbloquear id={bid} -> success")
    else:
        erros.append(f"7a. Desbloquear falhou: {d2}")
    # Confirmar removido
    resp = opener.open("http://127.0.0.1:5050/api/profissional/calendario/2026-04")
    d3 = json.loads(resp.read().decode())
    if "2026-04-10" not in d3.get("bloqueios", {}):
        ok.append("7b. Bloqueio 10/04 removido com sucesso")
    else:
        erros.append("7b. Bloqueio 10/04 ainda presente apos remocao")
except Exception as e:
    erros.append(f"7. Desbloquear erro: {e}")

# 8) Verificar justificativa salva no DB
try:
    conn = sqlite3.connect(r"c:\Users\Usuario\Desktop\portifolio\projeto_Clinica\clinica.db")
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT justificativa, periodo FROM bloqueios WHERE data IN (?,?)",
                        ("2026-04-11", "2026-04-20")).fetchall()
    conn.close()
    found_tarde = False
    found_dia = False
    for r in rows:
        if r["periodo"] == "tarde" and r["justificativa"] == "Reuniao conselho":
            ok.append("8a. Justificativa tarde salva no DB corretamente")
            found_tarde = True
        elif r["periodo"] == "dia_inteiro" and r["justificativa"] == "":
            ok.append("8b. Justificativa vazia salva no DB corretamente")
            found_dia = True
    if not found_tarde:
        erros.append("8a. Justificativa tarde NAO encontrada no DB")
    if not found_dia:
        erros.append("8b. Justificativa dia_inteiro NAO encontrada no DB")
except Exception as e:
    erros.append(f"8. DB check erro: {e}")

print("=" * 55)
print(f"RESULTADOS: {len(ok)} OK | {len(erros)} ERROS")
print("=" * 55)
for o in ok:
    print(f"  [OK] {o}")
for e in erros:
    print(f"  [ERRO] {e}")
print("=" * 55)
print("CONCLUSAO:", "TUDO FUNCIONANDO!" if not erros else "HA PROBLEMAS!")
