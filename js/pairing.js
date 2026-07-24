// =========================================================
// Asignación de compañero para la Coevaluación.
//
// Reto: en un sitio 100% estático (GitHub Pages, sin backend) cada
// estudiante necesita un compañero distinto para evaluar, sin que nadie
// quede sin evaluar y sin que nadie se repita — y el resultado debe ser
// EXACTAMENTE el mismo sin importar en qué computadora o momento se abra.
//
// Solución: por cada grado se ordena la lista de NIE (según `order`, la
// posición oficial del registro) y se baraja con un generador aleatorio
// determinista. Sobre esa lista barajada se arma un ciclo: Inglés usa +1;
// Ciudadanía y Computación usan +2. Cada materia tiene su propio ciclo y se
// descartan automáticamente los ciclos que repetirían el mismo compañero que
// ese estudiante ya evaluó en otra materia del periodo.
//
// Cada asignación es una rotación de una lista completa: por eso todos evalúan
// a una sola persona y todos son evaluados exactamente una vez por materia.
//
// El identificador del periodo forma parte de la semilla, así que al cambiar
// el periodo también cambian las asignaciones.
// =========================================================
window.Pairing = (function () {
  'use strict';

  const SEED_SALT = 'autocoeval';

  // PRNG determinista (mulberry32): misma semilla → misma secuencia siempre.
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h;
  }

  function nieesDelGrado(grade) {
    return Object.keys(window.STUDENTS || {})
      .filter((nie) => window.STUDENTS[nie].grade === grade)
      .sort((a, b) => window.STUDENTS[a].order - window.STUDENTS[b].order);
  }

  function shuffle(arr, seedStr) {
    const rand = mulberry32(hashString(seedStr));
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  const MATERIA_CONFIG = [
    { key: 'ingles', offset: 1 },
    { key: 'ciudadania', offset: 2 },
    { key: 'computacion', offset: 2 },
  ];

  function getMateriaKey(materia) {
    const nombre = String(materia || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
    if (nombre.includes('ciudadania')) return 'ciudadania';
    if (nombre.includes('computacion')) return 'computacion';
    return 'ingles';
  }

  function getOffset(materia) {
    const key = getMateriaKey(materia);
    return MATERIA_CONFIG.find((item) => item.key === key).offset;
  }

  function mappingFromCycle(cycle, offset) {
    const mapping = Object.create(null);
    if (cycle.length < 2) return mapping;
    const safeOffset = offset % cycle.length === 0 ? 1 : offset;
    cycle.forEach((studentNie, idx) => {
      mapping[studentNie] = cycle[(idx + safeOffset) % cycle.length];
    });
    return mapping;
  }

  function isValidMapping(ids, mapping, usedPartners) {
    const recipients = new Set();
    for (const studentNie of ids) {
      const partnerNie = mapping[studentNie];
      if (!partnerNie || partnerNie === studentNie) return false;
      if (usedPartners[studentNie].has(partnerNie)) return false;
      recipients.add(partnerNie);
    }
    return recipients.size === ids.length;
  }

  const assignmentsByGrade = {};
  function getAssignments(grade) {
    const evaluacionId = (window.CONFIG && window.CONFIG.evaluacionId) || 'periodo-general';
    const cacheKey = `${evaluacionId}|${grade}`;
    if (assignmentsByGrade[cacheKey]) return assignmentsByGrade[cacheKey];

    const ids = nieesDelGrado(grade);
    const assignments = Object.create(null);
    const usedPartners = Object.fromEntries(ids.map((studentNie) => [studentNie, new Set()]));

    MATERIA_CONFIG.forEach((materiaConfig) => {
      let selectedMapping = null;
      for (let attempt = 0; attempt < 2000 && !selectedMapping; attempt++) {
        const seed = `${SEED_SALT}|${cacheKey}|${materiaConfig.key}|${attempt}`;
        const cycle = shuffle(ids, seed);
        const candidate = mappingFromCycle(cycle, materiaConfig.offset);
        if (isValidMapping(ids, candidate, usedPartners)) selectedMapping = candidate;
      }

      // Con menos de cuatro estudiantes no existen tres compañeros distintos
      // por persona. Los grados actuales superan ampliamente ese mínimo.
      if (!selectedMapping) {
        const fallbackCycle = shuffle(ids, `${SEED_SALT}|${cacheKey}|${materiaConfig.key}|fallback`);
        selectedMapping = mappingFromCycle(fallbackCycle, materiaConfig.offset);
      }

      assignments[materiaConfig.key] = selectedMapping;
      ids.forEach((studentNie) => usedPartners[studentNie].add(selectedMapping[studentNie]));
    });

    assignmentsByGrade[cacheKey] = assignments;
    return assignments;
  }

  // Devuelve el NIE del compañero que le toca EVALUAR a `nie` (o null si su
  // grado tiene menos de 2 estudiantes registrados).
  function getPartnerNie(nie, materia) {
    const student = window.STUDENTS && window.STUDENTS[nie];
    if (!student) return null;
    const assignments = getAssignments(student.grade);
    return assignments[getMateriaKey(materia)][nie] || null;
  }

  function getPartner(nie, materia) {
    const partnerNie = getPartnerNie(nie, materia);
    if (!partnerNie) return null;
    const s = window.STUDENTS[partnerNie];
    return { nie: partnerNie, name: s.name, grade: s.grade };
  }

  return { getPartnerNie, getPartner, getOffset, getMateriaKey };
})();
