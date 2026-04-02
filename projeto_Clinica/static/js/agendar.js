/* ═══════════════════════════════════════════════════════════════
   agendar.js – Fluxo completo: Especialidade → Profissional →
   Calendário → Anamnese → Pagamento → Confirmação
   ═══════════════════════════════════════════════════════════════ */

const TOTAL_STEPS = 6;
let currentStep = 1;
let state = {
    espId: null, espNome: null, espIcone: null, espDuracao: null,
    profId: null, profNome: null, profFoto: null, profDiasNum: [],
    data: null, dataFmt: null, hora: null,
    requerPagamento: 'nenhum', valorSinal: 0,
};

// ── Navegação ────────────────────────────────────────────────

function goToStep(step) {
    document.querySelectorAll('.step-content').forEach(el => el.style.display = 'none');
    const target = document.getElementById('step-' + step);
    if (target) target.style.display = 'block';
    currentStep = step;
    updateStepsBar();
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function goBack(toStep) { goToStep(toStep); }

function updateStepsBar() {
    for (let i = 1; i <= TOTAL_STEPS; i++) {
        const circle = document.querySelector('.step-circle[data-step="' + i + '"]');
        if (!circle) continue;
        const label = circle.parentElement.querySelector('.step-label');
        circle.classList.remove('current', 'completed');
        if (label) label.classList.remove('current');
        if (i < currentStep) {
            circle.classList.add('completed');
            circle.innerHTML = '<i class="fas fa-check"></i>';
        } else if (i === currentStep) {
            circle.classList.add('current');
            circle.textContent = i;
            if (label) label.classList.add('current');
        } else {
            circle.textContent = i;
        }
    }
    for (let i = 1; i < TOTAL_STEPS; i++) {
        const line = document.querySelector('.step-line[data-line="' + i + '"]');
        if (!line) continue;
        line.classList.toggle('active', i < currentStep);
    }
}

// ── Step 1: Especialidade ────────────────────────────────────

function selectSpecialty(id, nome, icone) {
    state.espId = id;
    state.espNome = nome;
    state.espIcone = icone;

    document.getElementById('selected-specialty-name').textContent = nome;
    const iconEl = document.querySelector('#selected-specialty-box i');
    if (iconEl) iconEl.className = 'fas ' + icone;

    // buscar info de pagamento
    fetch('/api/especialidade/' + encodeURIComponent(id))
        .then(r => r.json())
        .then(esp => {
            state.requerPagamento = esp.requer_pagamento;
            state.valorSinal = esp.valor_sinal;
            state.espDuracao = esp.duracao;
        });

    loadProfessionals(id);
    goToStep(2);
}

// ── Step 2: Profissionais ────────────────────────────────────

function loadProfessionals(espId) {
    const container = document.getElementById('prof-list');
    const countEl = document.getElementById('prof-count');
    container.innerHTML = '<p style="color:var(--text-secondary)">Carregando...</p>';

    fetch('/api/profissionais/' + encodeURIComponent(espId))
        .then(r => r.json())
        .then(profs => {
            countEl.textContent = profs.length + ' profissional(is) disponível(is)';
            if (!profs.length) {
                container.innerHTML = '<p style="color:var(--text-secondary)">Nenhum profissional disponível.</p>';
                return;
            }
            container.innerHTML = profs.map(p => `
                <button class="prof-btn" onclick="selectProfessional('${p.id}','${esc(p.nome)}','${p.foto}', [${p.dias_num}])">
                    <img src="${p.foto}" alt="${esc(p.nome)}">
                    <div style="flex:1;min-width:0">
                        <h3>${esc(p.nome)}</h3>
                        <div class="cro">${p.cro}</div>
                        <div class="bio">${esc(p.bio)}</div>
                        <div class="tag-list" style="margin-top:10px">
                            <span class="tag tag-muted">${p.dias.join(', ')}</span>
                            <span class="tag tag-muted">${p.horario}</span>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right" style="color:var(--text-secondary);align-self:center"></i>
                </button>
            `).join('');
        })
        .catch(() => {
            container.innerHTML = '<p style="color:var(--destructive)">Erro ao carregar.</p>';
        });
}

function selectProfessional(id, nome, foto, diasNum) {
    state.profId = id;
    state.profNome = nome;
    state.profFoto = foto;
    state.profDiasNum = diasNum;

    document.getElementById('selected-prof-name').textContent = nome;
    document.getElementById('selected-prof-img').src = foto;

    renderCalendar();
    goToStep(3);
}

// ── Step 3: Calendário dinâmico ──────────────────────────────

let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();

function renderCalendar() {
    const cal = document.getElementById('calendar-grid');
    const label = document.getElementById('calendar-month-label');
    if (!cal) return;

    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    const primeiroDia = new Date(calendarYear, calendarMonth, 1);
    const ultimoDia = new Date(calendarYear, calendarMonth + 1, 0);
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    label.textContent = meses[calendarMonth] + ' ' + calendarYear;

    // dia da semana do primeiro dia (0=dom)
    let startDay = primeiroDia.getDay();

    let html = '<div class="cal-header"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span></div>';
    html += '<div class="cal-days">';

    // espaços vazios
    for (let i = 0; i < startDay; i++) html += '<span class="cal-empty"></span>';

    for (let d = 1; d <= ultimoDia.getDate(); d++) {
        const dt = new Date(calendarYear, calendarMonth, d);
        const diaSemana = dt.getDay();
        // converter para formato do banco: 0=dom,1=seg...
        const atende = state.profDiasNum.includes(diaSemana);
        const passado = dt < hoje;
        const iso = dt.toISOString().split('T')[0];
        const selecionado = state.data === iso;

        let classes = 'cal-day';
        if (passado || !atende) classes += ' disabled';
        if (selecionado) classes += ' selected';
        if (dt.toDateString() === hoje.toDateString()) classes += ' today';

        if (passado || !atende) {
            html += `<span class="${classes}">${d}</span>`;
        } else {
            html += `<span class="${classes}" onclick="selectDate('${iso}', ${d})">${d}</span>`;
        }
    }
    html += '</div>';
    cal.innerHTML = html;

    // slots
    if (state.data) loadSlots();
}

function prevMonth() {
    calendarMonth--;
    if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    renderCalendar();
}

function nextMonth() {
    calendarMonth++;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    renderCalendar();
}

function selectDate(iso, dia) {
    state.data = iso;
    const dt = new Date(iso + 'T12:00:00');
    const dias = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
    state.dataFmt = dia + '/' + String(dt.getMonth()+1).padStart(2,'0') + '/' + dt.getFullYear() + ' (' + dias[dt.getDay()] + ')';
    renderCalendar();
    loadSlots();
}

function loadSlots() {
    const container = document.getElementById('slots-container');
    container.innerHTML = '<p style="color:var(--text-secondary)">Carregando horários...</p>';

    fetch('/api/slots/' + state.profId + '/' + state.data)
        .then(r => r.json())
        .then(res => {
            if (res.modo === 'pre_agendamento') {
                /* Modo pré-agendamento: fila sequencial */
                if (!res.slots.length) {
                    container.innerHTML = '<p style="color:var(--text-secondary)"><i class="fas fa-calendar-xmark"></i> Agenda lotada nesta data.</p>';
                    return;
                }
                const proximo = res.slots[0];
                container.innerHTML = `
                    <div style="background:linear-gradient(135deg,rgba(14,116,144,.06),rgba(14,116,144,.12));border:2px solid rgba(14,116,144,.25);border-radius:14px;padding:24px;text-align:center;">
                        <div style="font-size:.78rem;text-transform:uppercase;font-weight:700;color:var(--primary);letter-spacing:.5px;margin-bottom:6px;">
                            <i class="fas fa-list-ol"></i> Pré-agendamento
                        </div>
                        <p style="font-size:.88rem;color:var(--text-secondary);margin-bottom:14px;">
                            Neste dia o atendimento funciona por <strong>ordem de chegada</strong>.<br>
                            Seu horário estimado:
                        </p>
                        <div style="font-size:1.6rem;font-weight:800;color:var(--primary);margin-bottom:6px;">
                            A partir das ${proximo}
                        </div>
                        <p style="font-size:.75rem;color:var(--text-secondary);margin-bottom:16px;">
                            Ainda ${res.slots.length} vaga${res.slots.length > 1 ? 's' : ''} disponível${res.slots.length > 1 ? 'is' : ''}
                        </p>
                        <button class="slot-btn selected" onclick="selectSlot('${proximo}')" style="padding:10px 28px;font-size:.95rem;">
                            <i class="fas fa-check"></i> Confirmar este dia
                        </button>
                    </div>`;
                state.hora = proximo;
                updateConfirmBtn();
                return;
            }
            /* Modo slots fixos (padrão) */
            if (!res.slots.length) {
                container.innerHTML = '<p style="color:var(--text-secondary)"><i class="fas fa-calendar-xmark"></i> Nenhum horário disponível nesta data.</p>';
                return;
            }
            container.innerHTML = '<p style="margin-bottom:12px;font-weight:600;">Horários disponíveis:</p><div class="slots-grid">' +
                res.slots.map(s => {
                    const sel = state.hora === s ? ' selected' : '';
                    return `<button class="slot-btn${sel}" onclick="selectSlot('${s}')">${s}</button>`;
                }).join('') + '</div>';

            if (state.hora) updateConfirmBtn();
        });
}

function selectSlot(hora) {
    state.hora = hora;
    document.querySelectorAll('.slot-btn').forEach(el => el.classList.remove('selected'));
    event.target.classList.add('selected');
    updateConfirmBtn();
}

function updateConfirmBtn() {
    const btn = document.getElementById('btn-continue-datetime');
    if (btn) btn.style.display = (state.data && state.hora) ? 'inline-flex' : 'none';
}

function continueToAnamnese() {
    if (!state.data || !state.hora) return;
    goToStep(4);
}

// ── Step 4: Anamnese ─────────────────────────────────────────

let uploadedFiles = [];

function skipAnamnese() {
    goToStep(5);
}

function continueToPayment() {
    goToStep(5);
}

// Upload de arquivos
function handleFiles(files) {
    for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
            alert('Arquivo "' + file.name + '" excede 10 MB.');
            continue;
        }
        uploadFile(file);
    }
}

function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const fileId = 'f-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const list = document.getElementById('file-list');
    const item = document.createElement('div');
    item.className = 'file-item';
    item.id = fileId;
    item.innerHTML = `
        <div class="file-item-info">
            <i class="fas ${getFileIcon(file.name)}"></i>
            <div>
                <span class="file-name">${escHtml(file.name)}</span>
                <span class="file-size">${formatSize(file.size)}</span>
            </div>
        </div>
        <div class="file-item-status uploading"><i class="fas fa-spinner fa-spin"></i></div>
    `;
    list.appendChild(item);

    fetch('/api/upload', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(res => {
            const statusEl = item.querySelector('.file-item-status');
            if (res.error) {
                statusEl.className = 'file-item-status error';
                statusEl.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
                statusEl.title = res.error;
                return;
            }
            uploadedFiles.push({ filename: res.filename, original: res.original, url: res.url });
            statusEl.className = 'file-item-status success';
            statusEl.innerHTML = '<i class="fas fa-check-circle"></i><button class="file-remove" onclick="removeFile(\'' + fileId + '\',\'' + res.filename + '\')" title="Remover"><i class="fas fa-times"></i></button>';
        })
        .catch(() => {
            const statusEl = item.querySelector('.file-item-status');
            statusEl.className = 'file-item-status error';
            statusEl.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
        });
}

function removeFile(fileId, filename) {
    uploadedFiles = uploadedFiles.filter(f => f.filename !== filename);
    const el = document.getElementById(fileId);
    if (el) el.remove();
}

function getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'fa-file-pdf';
    if (['png','jpg','jpeg','gif','webp'].includes(ext)) return 'fa-file-image';
    if (['doc','docx'].includes(ext)) return 'fa-file-word';
    return 'fa-file';
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Drag & drop
document.addEventListener('DOMContentLoaded', function() {
    const area = document.getElementById('upload-area');
    if (!area) return;
    ['dragenter','dragover'].forEach(ev => area.addEventListener(ev, function(e) { e.preventDefault(); area.classList.add('dragover'); }));
    ['dragleave','drop'].forEach(ev => area.addEventListener(ev, function(e) { e.preventDefault(); area.classList.remove('dragover'); }));
    area.addEventListener('drop', function(e) { handleFiles(e.dataTransfer.files); });
});

// ── Step 5: Dados Pessoais + Pagamento ───────────────────────

function submitBooking() {
    const nome = document.getElementById('pac-nome').value.trim();
    const tel = document.getElementById('pac-telefone').value.trim();
    const email = document.getElementById('pac-email').value.trim();
    const cpf = document.getElementById('pac-cpf').value.trim();

    if (!nome || !tel) {
        alert('Preencha nome e telefone.');
        return;
    }

    // anamnese
    const anamnese = {};
    const anamneseFields = document.querySelectorAll('#anamnese-form input, #anamnese-form textarea, #anamnese-form select');
    anamneseFields.forEach(f => {
        if (f.type === 'checkbox') anamnese[f.name] = f.checked;
        else if (f.value) anamnese[f.name] = f.value;
    });

    const pagTipo = document.querySelector('input[name="pagamento_tipo"]:checked');

    const body = {
        paciente_nome: nome,
        paciente_telefone: tel,
        paciente_email: email,
        paciente_cpf: cpf,
        prof_id: state.profId,
        esp_id: state.espId,
        data: state.data,
        hora: state.hora,
        anamnese: Object.keys(anamnese).length ? anamnese : null,
        anexos: uploadedFiles.length ? uploadedFiles : null,
        pagamento_tipo: pagTipo ? pagTipo.value : null,
        observacoes: document.getElementById('pac-obs')?.value || '',
    };

    const btn = document.getElementById('btn-confirmar');
    btn.disabled = true;
    btn.textContent = 'Processando...';

    fetch('/api/agendar', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
    })
    .then(r => r.json())
    .then(res => {
        if (res.error) {
            alert(res.error);
            btn.disabled = false;
            btn.textContent = 'Confirmar Agendamento';
            return;
        }

        // preencher resumo
        document.getElementById('conf-id').textContent = '#' + res.agendamento_id;
        document.getElementById('conf-esp').textContent = state.espNome;
        document.getElementById('conf-prof').textContent = state.profNome;
        document.getElementById('conf-data').textContent = state.dataFmt;
        document.getElementById('conf-hora').textContent = state.hora;
        document.getElementById('conf-paciente').textContent = nome;

        const pagEl = document.getElementById('conf-pagamento');
        if (res.pagamento_necessario) {
            pagEl.innerHTML = '<span class="tag tag-warning">Pendente – R$ ' +
                res.pagamento_valor.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.') +
                ' via ' + (res.pagamento_tipo || 'Pix') + '</span>';
            document.getElementById('payment-instructions').style.display = 'block';
        } else {
            pagEl.innerHTML = '<span class="tag tag-accent">Não necessário</span>';
            document.getElementById('payment-instructions').style.display = 'none';
        }

        goToStep(6);
    })
    .catch(() => {
        alert('Erro ao confirmar agendamento.');
        btn.disabled = false;
        btn.textContent = 'Confirmar Agendamento';
    });
}

// ── Utility ──────────────────────────────────────────────────

function esc(s) { return s.replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
