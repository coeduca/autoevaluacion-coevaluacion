// =========================================================
// Configuración del centro educativo.
//
// Periodo / Año se pueden fijar aquí abajo, o pasarlos por la URL al
// compartir el enlace en Classroom para cada trimestre, por ejemplo:
//   index.html?periodo=Primer%20Trimestre&anio=2026
// Lo que venga en la URL siempre gana sobre los valores por defecto de aquí.
// =========================================================
window.CONFIG = (function () {
  const params = new URLSearchParams(location.search);
  const anio = params.get('anio') || String(new Date().getFullYear());
  const periodo = params.get('periodo') || '';

  return {
    institucion: 'Complejo Educativo Cantón Las Ánimas',
    codigo: '12379',
    ubicacion: 'San Lorenzo, San Vicente',
    docente: 'José Eliseo Martínez Rodríguez',

    periodo,
    anio,

    // Los datos se separan por ciclo. Al cambiar `periodo` (en este archivo o
    // en la URL), el nuevo grupo comienza en blanco sin mostrar respuestas del
    // periodo anterior. También puede usarse ?evaluacion=2026-P2.
    evaluacionId: params.get('evaluacion') || `${anio}-${periodo || 'periodo-general'}`,

    // Los registros que no se han actualizado durante este tiempo se eliminan
    // automáticamente del navegador.
    retencionDias: 90,
  };
})();

// Materias entre las que el estudiante elige al comenzar su autoevaluación.
// Autoevaluación y coevaluación se completan por separado para cada una.
window.MATERIAS = ['Inglés', 'Ciudadanía y Valores', 'Ciencias de la Computación'];

// Autoevaluación y coevaluación se convierten CADA UNA a una nota
// independiente de 1 a 10 — nunca se suman entre sí, porque pertenecen a
// dos estudiantes distintos: la de autoevaluación es del propio estudiante
// que responde; la de coevaluación es de la persona evaluada (su
// compañero(a) asignado), aunque sea este mismo estudiante quien la llena.
window.calcularNotas = function (autoeval, coeval) {
  return {
    notaAutoeval: autoeval ? (autoeval.puntaje / 25) * 10 : null,
    notaCoeval: coeval ? (coeval.puntaje / 15) * 10 : null,
  };
};
