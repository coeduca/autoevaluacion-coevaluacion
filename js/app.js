// =========================================================
// Auto y Coevaluación — lógica de la aplicación
// Modal de NIE -> Inicio -> (elegir materia) -> Autoevaluación ->
// Coevaluación (compañero asignado automáticamente) -> descarga de PDF.
// Autoevaluación y coevaluación se completan por separado para cada
// materia. Todo se guarda en localStorage de este navegador; nada se
// envía a un servidor (sitio 100% estático, pensado para GitHub Pages).
// =========================================================
(function () {
  'use strict';

  const STORAGE_PREFIX = 'autocoeval:v1:';

  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }

  function storageKey(nieVal, materiaVal) { return `${STORAGE_PREFIX}${nieVal}::${materiaVal}`; }

  function loadRecord(nieVal, materiaVal) {
    try {
      const raw = localStorage.getItem(storageKey(nieVal, materiaVal));
      return raw ? JSON.parse(raw) : { autoeval: null, coeval: null };
    } catch (e) { return { autoeval: null, coeval: null }; }
  }
  function saveRecord(nieVal, materiaVal, rec) {
    try { localStorage.setItem(storageKey(nieVal, materiaVal), JSON.stringify(rec)); } catch (e) { /* almacenamiento no disponible */ }
  }
  function clearRecord(nieVal, materiaVal) {
    try { localStorage.removeItem(storageKey(nieVal, materiaVal)); } catch (e) {}
  }

  // ---- Estado en memoria ----
  let nie = null;
  let student = null;
  let materia = null;
  let record = null;
  let logoBase64 = null;
  let currentPartner = null;

  // Respuestas de la prueba actualmente abierta (antes de enviarla)
  let draftAutoeval = { respuestas: [], reflexion: '' };
  let draftCoeval = { respuestas: [], comentario: '' };

  // ---- Logo institucional (para el PDF) ----
  (async function loadLogo() {
    try {
      const res = await fetch('logo.png');
      if (!res.ok) throw new Error('sin logo');
      const blob = await res.blob();
      logoBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) { logoBase64 = null; }
  })();

  // ---------------------------------------------------------
  // Router de vistas
  // ---------------------------------------------------------
  function showView(name) {
    document.querySelectorAll('[data-view]').forEach((el) => {
      el.hidden = el.dataset.view !== name;
    });
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------
  // Selector de escala (compartido: 1-5 con puntos / 3 niveles segmentado)
  // ---------------------------------------------------------
  function renderCriterios(container, criterios, escalaMax, escalaLabels, respuestas, onSelect) {
    container.innerHTML = criterios.map((crit, idx) => {
      const selected = respuestas[idx] || 0;
      let scaleHtml;
      if (escalaMax === 5) {
        scaleHtml = '<div class="rating-row" data-idx="' + idx + '">' +
          Array.from({ length: escalaMax }, (_, i) => {
            const v = i + 1;
            return `<button type="button" class="rating-dot${selected === v ? ' selected' : ''}" data-val="${v}">${v}</button>`;
          }).join('') + '</div>';
      } else {
        scaleHtml = '<div class="segmented" data-idx="' + idx + '">' +
          escalaLabels.map((label, i) => {
            const v = i + 1;
            return `<button type="button" class="${selected === v ? 'selected' : ''}" data-val="${v}">${esc(label)}</button>`;
          }).join('') + '</div>';
      }
      return `
        <div class="criterio-card space-y-3">
          <div class="flex items-start gap-3">
            <span class="criterio-num">${idx + 1}</span>
            <div class="min-w-0">
              <p class="criterio-titulo">${esc(crit.titulo)}</p>
              <p class="criterio-texto">${esc(crit.texto)}</p>
            </div>
          </div>
          ${scaleHtml}
        </div>`;
    }).join('');

    container.querySelectorAll('[data-idx]').forEach((wrap) => {
      const idx = Number(wrap.dataset.idx);
      wrap.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => onSelect(idx, Number(btn.dataset.val)));
      });
    });
  }

  // ---------------------------------------------------------
  // Modal de ingreso de NIE
  // ---------------------------------------------------------
  const nieModal = document.getElementById('nie-modal');
  const nieForm = document.getElementById('nie-form');
  const nieInput = document.getElementById('nie-input');
  const nieError = document.getElementById('nie-error');

  nieForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = nieInput.value.trim();
    const found = value && window.STUDENTS[value];
    if (!found) {
      nieError.textContent = 'No encontramos ese NIE. Verifica los números e intenta de nuevo.';
      nieError.hidden = false;
      nieInput.focus();
      return;
    }
    nieError.hidden = true;
    nie = value;
    student = found;
    nieModal.hidden = true;
    renderHome();
  });

  // ---------------------------------------------------------
  // Vista: Inicio
  // ---------------------------------------------------------
  const homeGreeting = document.getElementById('home-greeting');
  const homeGrado = document.getElementById('home-grado');
  const cardAutoeval = document.getElementById('card-autoeval');

  function renderHome() {
    homeGreeting.textContent = `¡Hola, ${student.name.split(' ')[0]}!`;
    homeGrado.textContent = `${student.grade} · NIE ${nie}`;
    showView('home');
  }

  cardAutoeval.addEventListener('click', () => openMateriaModal());

  document.querySelectorAll('[data-nav="home"]').forEach((btn) => {
    btn.addEventListener('click', () => renderHome());
  });

  // ---------------------------------------------------------
  // Modal: selección de materia (por materia se autoevalúa y coevalúa aparte)
  // ---------------------------------------------------------
  const materiaModal = document.getElementById('materia-modal');
  const materiaList = document.getElementById('materia-list');
  const materiaModalClose = document.getElementById('materia-modal-close');

  function materiaEstado(rec) {
    if (rec.autoeval && rec.coeval) return 'completado';
    if (rec.autoeval) return 'progreso';
    return 'pendiente';
  }

  function estadoChipHtml(estado) {
    if (estado === 'completado') return '<span class="status-chip completado">✓ Completada</span>';
    if (estado === 'progreso') return '<span class="status-chip progreso">En progreso</span>';
    return '<span class="status-chip pendiente">Pendiente</span>';
  }

  function renderMateriaModal() {
    materiaList.innerHTML = window.MATERIAS.map((m) => {
      const rec = loadRecord(nie, m);
      const estado = materiaEstado(rec);
      const resetBtn = estado !== 'pendiente'
        ? `<button type="button" class="materia-row-reset" data-reset="${esc(m)}" title="Reiniciar ${esc(m)}">↺</button>`
        : '';
      return `
        <div class="materia-row">
          <button type="button" class="materia-row-main" data-materia="${esc(m)}">
            <span class="materia-row-name">${esc(m)}</span>
            ${estadoChipHtml(estado)}
          </button>
          ${resetBtn}
        </div>`;
    }).join('');

    materiaList.querySelectorAll('[data-materia]').forEach((btn) => {
      btn.addEventListener('click', () => onPickMateria(btn.dataset.materia));
    });
    materiaList.querySelectorAll('[data-reset]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const m = btn.dataset.reset;
        const ok = window.confirm(`Esto borrará tus respuestas de "${m}" guardadas en este navegador para volver a empezar. ¿Deseas continuar?`);
        if (!ok) return;
        clearRecord(nie, m);
        renderMateriaModal();
      });
    });
  }

  function openMateriaModal() {
    renderMateriaModal();
    materiaModal.hidden = false;
  }
  function closeMateriaModal() { materiaModal.hidden = true; }

  materiaModalClose.addEventListener('click', closeMateriaModal);
  materiaModal.addEventListener('click', (e) => {
    if (e.target === materiaModal) closeMateriaModal();
  });

  function onPickMateria(m) {
    const rec = loadRecord(nie, m);
    const estado = materiaEstado(rec);
    materia = m;
    record = rec;
    closeMateriaModal();
    if (estado === 'completado') {
      downloadPdf();
      return;
    }
    if (estado === 'progreso') {
      openCoeval();
    } else {
      openAutoeval();
    }
  }

  // ---------------------------------------------------------
  // Vista: Autoevaluación
  // ---------------------------------------------------------
  const autoevalHeaderLabel = document.getElementById('autoeval-header-label');
  const autoevalInstrucciones = document.getElementById('autoeval-instrucciones');
  const autoevalCriterios = document.getElementById('autoeval-criterios');
  const autoevalReflexionLabel = document.getElementById('autoeval-reflexion-label');
  const autoevalReflexion = document.getElementById('autoeval-reflexion');
  const autoevalProgressFill = document.getElementById('autoeval-progress-fill');
  const autoevalError = document.getElementById('autoeval-error');
  const btnAutoevalSubmit = document.getElementById('btn-autoeval-submit');

  function openAutoeval() {
    const data = window.PREGUNTAS.autoevaluacion;
    draftAutoeval = { respuestas: new Array(data.criterios.length).fill(0), reflexion: '' };
    autoevalHeaderLabel.textContent = `Autoevaluación · ${materia}`;
    autoevalInstrucciones.textContent = data.instrucciones;
    autoevalReflexionLabel.textContent = data.reflexion.pregunta;
    autoevalReflexion.value = '';
    autoevalReflexion.placeholder = data.reflexion.placeholder;
    autoevalError.hidden = true;
    paintAutoeval();
    showView('autoeval');
  }

  function onAutoevalSelect(idx, val) {
    draftAutoeval.respuestas[idx] = val;
    paintAutoeval();
  }

  function paintAutoeval() {
    const data = window.PREGUNTAS.autoevaluacion;
    renderCriterios(autoevalCriterios, data.criterios, data.escalaMax, data.escalaLabels, draftAutoeval.respuestas, onAutoevalSelect);
    const answered = draftAutoeval.respuestas.filter((v) => v > 0).length;
    autoevalProgressFill.style.width = `${(answered / data.criterios.length) * 100}%`;
    btnAutoevalSubmit.disabled = answered !== data.criterios.length;
  }

  autoevalReflexion.addEventListener('input', () => {
    draftAutoeval.reflexion = autoevalReflexion.value;
  });

  btnAutoevalSubmit.addEventListener('click', () => {
    const allAnswered = draftAutoeval.respuestas.every((v) => v > 0);
    const reflexionOk = autoevalReflexion.value.trim().length >= 3;
    if (!allAnswered || !reflexionOk) {
      autoevalError.textContent = !allAnswered
        ? 'Valora los 5 criterios antes de continuar.'
        : 'Escribe tu compromiso para el próximo periodo antes de continuar.';
      autoevalError.hidden = false;
      return;
    }
    autoevalError.hidden = true;
    const puntaje = draftAutoeval.respuestas.reduce((a, b) => a + b, 0);
    record.autoeval = {
      respuestas: draftAutoeval.respuestas.slice(),
      reflexion: autoevalReflexion.value.trim(),
      puntaje,
      completadoEn: new Date().toISOString(),
    };
    saveRecord(nie, materia, record);
    openCoeval();
  });

  // ---------------------------------------------------------
  // Vista: Coevaluación
  // ---------------------------------------------------------
  const coevalHeaderLabel = document.getElementById('coeval-header-label');
  const coevalInstrucciones = document.getElementById('coeval-instrucciones');
  const coevalPartnerName = document.getElementById('coeval-partner-name');
  const coevalPartnerAvatar = document.getElementById('coeval-partner-avatar');
  const coevalCriterios = document.getElementById('coeval-criterios');
  const coevalComentarioLabel = document.getElementById('coeval-comentario-label');
  const coevalComentario = document.getElementById('coeval-comentario');
  const coevalProgressFill = document.getElementById('coeval-progress-fill');
  const coevalError = document.getElementById('coeval-error');
  const btnCoevalSubmit = document.getElementById('btn-coeval-submit');
  const coevalNoPartner = document.getElementById('coeval-no-partner');
  const coevalBody = document.getElementById('coeval-body');

  function openCoeval() {
    coevalHeaderLabel.textContent = `Coevaluación · ${materia}`;
    currentPartner = window.Pairing.getPartner(nie);
    if (!currentPartner) {
      coevalNoPartner.hidden = false;
      coevalBody.hidden = true;
      showView('coeval');
      return;
    }
    coevalNoPartner.hidden = true;
    coevalBody.hidden = false;

    const data = window.PREGUNTAS.coevaluacion;
    draftCoeval = { respuestas: new Array(data.criterios.length).fill(0), comentario: '' };
    coevalInstrucciones.textContent = data.instrucciones;
    coevalPartnerName.textContent = currentPartner.name;
    coevalPartnerAvatar.textContent = currentPartner.name.charAt(0).toUpperCase();
    coevalComentarioLabel.textContent = data.comentario.pregunta;
    coevalComentario.value = '';
    coevalComentario.placeholder = data.comentario.placeholder;
    coevalError.hidden = true;
    paintCoeval();
    showView('coeval');
  }

  function onCoevalSelect(idx, val) {
    draftCoeval.respuestas[idx] = val;
    paintCoeval();
  }

  function paintCoeval() {
    const data = window.PREGUNTAS.coevaluacion;
    renderCriterios(coevalCriterios, data.criterios, data.escalaMax, data.escalaLabels, draftCoeval.respuestas, onCoevalSelect);
    const answered = draftCoeval.respuestas.filter((v) => v > 0).length;
    coevalProgressFill.style.width = `${(answered / data.criterios.length) * 100}%`;
    btnCoevalSubmit.disabled = answered !== data.criterios.length;
  }

  coevalComentario.addEventListener('input', () => {
    draftCoeval.comentario = coevalComentario.value;
  });

  btnCoevalSubmit.addEventListener('click', () => {
    const allAnswered = draftCoeval.respuestas.every((v) => v > 0);
    const comentarioOk = coevalComentario.value.trim().length >= 3;
    if (!allAnswered || !comentarioOk) {
      coevalError.textContent = !allAnswered
        ? 'Valora los 5 criterios antes de continuar.'
        : 'Escribe un comentario para tu compañero(a) antes de continuar.';
      coevalError.hidden = false;
      return;
    }
    coevalError.hidden = true;
    const puntaje = draftCoeval.respuestas.reduce((a, b) => a + b, 0);
    record.coeval = {
      companeroNie: currentPartner.nie,
      companeroNombre: currentPartner.name,
      respuestas: draftCoeval.respuestas.slice(),
      comentario: coevalComentario.value.trim(),
      puntaje,
      completadoEn: new Date().toISOString(),
    };
    saveRecord(nie, materia, record);
    downloadPdf();
    renderFinal();
  });

  // ---------------------------------------------------------
  // Vista: Final
  // ---------------------------------------------------------
  const finalNotaAutoeval = document.getElementById('final-nota-autoeval');
  const finalNotaCoeval = document.getElementById('final-nota-coeval');
  const finalCoevalLabel = document.getElementById('final-coeval-label');
  const btnDownloadAgain = document.getElementById('btn-download-again');

  function fmt1(n) { return Number(n).toFixed(1); }

  function renderFinal() {
    const notas = window.calcularNotas(record.autoeval, record.coeval);
    finalNotaAutoeval.textContent = fmt1(notas.notaAutoeval);
    finalNotaCoeval.textContent = fmt1(notas.notaCoeval);
    finalCoevalLabel.textContent = `Coevaluación para ${record.coeval.companeroNombre}`;
    showView('final');
  }

  btnDownloadAgain.addEventListener('click', () => downloadPdf());

  function downloadPdf() {
    if (!record.autoeval || !record.coeval) return;
    window.EvalPDF.generar(student, nie, materia, record, logoBase64, window.CONFIG);
  }

  // ---------------------------------------------------------
  // Barra lateral (dashboard) + cajón móvil
  // ---------------------------------------------------------
  const dashboard = document.querySelector('.app-shell.dashboard');
  const menuBtn = document.getElementById('menu-btn');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const navItems = document.querySelectorAll('[data-nav-item]');

  function setActiveNav(name) {
    navItems.forEach((el) => el.classList.toggle('active', el.dataset.navItem === name));
  }
  function closeDrawer() { if (dashboard) dashboard.classList.remove('nav-open'); }

  if (menuBtn) menuBtn.addEventListener('click', () => dashboard.classList.toggle('nav-open'));
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeDrawer);

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const target = item.dataset.navItem;
      closeDrawer();
      if (target === 'info') { openInfoModal(); return; }
      if (target === 'home') { setActiveNav('home'); renderHome(); return; }
      // Autoevaluación / Coevaluación: elegir materia y continuar el flujo
      setActiveNav(target);
      openMateriaModal();
    });
  });

  // Mantener el estado activo sincronizado con acciones ya existentes
  cardAutoeval.addEventListener('click', () => setActiveNav('autoeval'));
  document.querySelectorAll('[data-nav="home"]').forEach((btn) => {
    btn.addEventListener('click', () => setActiveNav('home'));
  });

  // ---------------------------------------------------------
  // Modal de Información (definiciones del manual)
  // ---------------------------------------------------------
  const infoModal = document.getElementById('info-modal');
  const infoModalClose = document.getElementById('info-modal-close');
  const infoModalOk = document.getElementById('info-modal-ok');

  function openInfoModal() { infoModal.hidden = false; }
  function closeInfoModal() { infoModal.hidden = true; }

  if (infoModalClose) infoModalClose.addEventListener('click', closeInfoModal);
  if (infoModalOk) infoModalOk.addEventListener('click', closeInfoModal);
  if (infoModal) infoModal.addEventListener('click', (e) => { if (e.target === infoModal) closeInfoModal(); });
})();
