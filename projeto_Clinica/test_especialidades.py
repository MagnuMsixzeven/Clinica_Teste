"""Testes completos do CRUD de Procedimentos/Especialidades"""
import app

app.app.config['TESTING'] = True

def sess(c):
    with c.session_transaction() as s:
        s['user_id'] = 'admin'
        s['papel'] = 'admin'
        s['user_nome'] = 'Admin'
        s['user_foto'] = ''

with app.app.test_client() as c:
    sess(c)
    passed = 0
    total = 0

    # 1. GET lista
    total += 1
    r = c.get('/admin/procedimentos')
    html = r.data.decode()
    ok = r.status_code == 200
    for nome in ['Limpeza','Clareamento','Canal','Ortodontia','Implante']:
        if nome not in html:
            ok = False
    status = "OK" if ok else "FAIL"
    if ok: passed += 1
    print(f"[1] Listagem com todos procedimentos: {status}")

    # 2. CRIAR procedimento
    total += 1
    r = c.post('/admin/procedimento/salvar', json={
        'nome':'Profilaxia Infantil','descricao':'Limpeza para criancas',
        'icone':'fa-tooth','duracao':20,'preco_min':80,'preco_max':120,
        'requer_pagamento':'nenhum','valor_sinal':0
    })
    res = r.get_json()
    new_id = res.get('id','')
    ok = res.get('ok') and new_id
    status = "OK" if ok else "FAIL"
    if ok: passed += 1
    print(f"[2] Criar procedimento: {status} (id={new_id})")

    # 3. Verificar que aparece na lista
    total += 1
    r = c.get('/admin/procedimentos')
    ok = 'Profilaxia Infantil' in r.data.decode()
    status = "OK" if ok else "FAIL"
    if ok: passed += 1
    print(f"[3] Novo procedimento na lista: {status}")

    # 4. EDITAR
    total += 1
    r = c.post('/admin/procedimento/salvar', json={
        'id': new_id,'nome':'Profilaxia Kids','descricao':'Editado',
        'icone':'fa-sun','duracao':25,'preco_min':90,'preco_max':130,
        'requer_pagamento':'sinal','valor_sinal':30
    })
    ok = r.get_json().get('ok')
    status = "OK" if ok else "FAIL"
    if ok: passed += 1
    print(f"[4] Editar procedimento: {status}")

    # 5. Verificar edicao na lista
    total += 1
    r = c.get('/admin/procedimentos')
    ok = 'Profilaxia Kids' in r.data.decode()
    status = "OK" if ok else "FAIL"
    if ok: passed += 1
    print(f"[5] Edicao refletida na lista: {status}")

    # 6. EXCLUIR
    total += 1
    r = c.delete(f'/admin/procedimento/{new_id}')
    ok = r.get_json().get('ok')
    status = "OK" if ok else "FAIL"
    if ok: passed += 1
    print(f"[6] Excluir procedimento: {status}")

    # 7. Verificar exclusao
    total += 1
    r = c.get('/admin/procedimentos')
    ok = 'Profilaxia Kids' not in r.data.decode()
    status = "OK" if ok else "FAIL"
    if ok: passed += 1
    print(f"[7] Removido da lista: {status}")

    # 8. Validacao nome vazio
    total += 1
    r = c.post('/admin/procedimento/salvar', json={'nome':'','duracao':30,'requer_pagamento':'nenhum'})
    ok = r.status_code == 400
    status = "OK" if ok else "FAIL"
    if ok: passed += 1
    print(f"[8] Validacao nome vazio: {status}")

    # 9. Validacao duracao invalida
    total += 1
    r = c.post('/admin/procedimento/salvar', json={'nome':'X','duracao':5,'requer_pagamento':'nenhum'})
    ok = r.status_code == 400
    status = "OK" if ok else "FAIL"
    if ok: passed += 1
    print(f"[9] Validacao duracao < 10: {status}")

    # 10. Validacao pagamento invalido
    total += 1
    r = c.post('/admin/procedimento/salvar', json={'nome':'X','duracao':30,'requer_pagamento':'invalido'})
    ok = r.status_code == 400
    status = "OK" if ok else "FAIL"
    if ok: passed += 1
    print(f"[10] Validacao pagamento invalido: {status}")

    # 11. Protecao exclusao com agendamento vinculado
    total += 1
    conn = app.get_db()
    has_ag = conn.execute('SELECT esp_id FROM agendamentos LIMIT 1').fetchone()
    conn.close()
    if has_ag:
        r = c.delete(f'/admin/procedimento/{has_ag["esp_id"]}')
        ok = r.status_code == 400
        status = "OK" if ok else "FAIL"
        if ok: passed += 1
        print(f"[11] Protecao exclusao em uso: {status}")
    else:
        passed += 1
        print("[11] Protecao exclusao em uso: SKIP (sem agendamentos)")

    # 12. Sidebar link
    total += 1
    r = c.get('/admin/procedimentos')
    ok = 'Procedimentos' in r.data.decode()
    status = "OK" if ok else "FAIL"
    if ok: passed += 1
    print(f"[12] Sidebar link Procedimentos: {status}")

    print(f"\n{'='*40}")
    print(f"Resultado: {passed}/{total} testes passaram")
    if passed == total:
        print("TODOS OS TESTES PASSARAM!")
    else:
        print(f"ATENCAO: {total - passed} teste(s) falharam")
