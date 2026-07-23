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
// determinista (semilla fija = mismo resultado siempre, en cualquier
// navegador). Sobre esa lista barajada se arma un ciclo: cada estudiante
// evalúa al "siguiente" de la lista, y el último evalúa al primero. Un
// ciclo garantiza matemáticamente que todos evalúan a exactamente una
// persona y son evaluados por exactamente una persona — sin repetir y sin
// que nadie quede fuera — sin necesidad de servidor ni base de datos.
//
// Para "re-barajar" en un periodo futuro (nuevos compañeros), basta con
// cambiar SEED_SALT.
// =========================================================
window.Pairing = (function () {
  'use strict';

  const SEED_SALT = 'autocoeval-2026-t1';

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

  const cicloPorGrado = {};
  function getCiclo(grade) {
    if (!cicloPorGrado[grade]) {
      cicloPorGrado[grade] = shuffle(nieesDelGrado(grade), SEED_SALT + '|' + grade);
    }
    return cicloPorGrado[grade];
  }

  // Devuelve el NIE del compañero que le toca EVALUAR a `nie` (o null si su
  // grado tiene menos de 2 estudiantes registrados).
  function getPartnerNie(nie) {
    const student = window.STUDENTS && window.STUDENTS[nie];
    if (!student) return null;
    const ciclo = getCiclo(student.grade);
    if (ciclo.length < 2) return null;
    const idx = ciclo.indexOf(nie);
    if (idx === -1) return null;
    return ciclo[(idx + 1) % ciclo.length];
  }

  function getPartner(nie) {
    const partnerNie = getPartnerNie(nie);
    if (!partnerNie) return null;
    const s = window.STUDENTS[partnerNie];
    return { nie: partnerNie, name: s.name, grade: s.grade };
  }

  return { getPartnerNie, getPartner };
})();
