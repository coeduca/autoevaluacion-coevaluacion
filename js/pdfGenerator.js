// =========================================================
// Generación de PDF — Autoevaluación y Coevaluación
// Usa pdfmake (cargado vía CDN en index.html). Un PDF por estudiante, con
// dos páginas: la 1.ª es la autoevaluación (nota del propio estudiante) y
// la 2.ª es la coevaluación (nota de la persona evaluada — su compañero(a),
// NO de quien llena el formulario). Se separan porque cada nota pertenece
// a un estudiante distinto.
// =========================================================

const PDF_PRIMARY = '#0284C7';
const PDF_INK = '#14212B';
const PDF_MUTED = '#5B6B77';

function pdfFechaHoyLarga() {
  const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const hoy = new Date();
  return `${hoy.getDate()} de ${MESES_ES[hoy.getMonth()]} de ${hoy.getFullYear()}`;
}

function pdfSanitizeFilename(str) {
  return (str || 'sin-dato')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function pdfFmtNota(n) {
  return (n == null || isNaN(Number(n))) ? '—' : Number(n).toFixed(1);
}

function pdfEncabezado(config, logoBase64) {
  const bloques = [];
  if (logoBase64) {
    bloques.push({ image: logoBase64, width: 56, height: 56, alignment: 'center', margin: [0, 0, 0, 6] });
  }
  bloques.push(
    { text: (config.institucion || 'Institución educativa').toUpperCase(), style: 'inst' },
    { text: `(${config.ubicacion || ''})`, style: 'loc' },
    { text: `Código: ${config.codigo || '—'}`, style: 'code' },
  );
  return bloques;
}

function pdfInfoTable(fields) {
  const cols = 3;
  const rows = [];
  for (let i = 0; i < fields.length; i += cols) {
    let slice = fields.slice(i, i + cols);
    while (slice.length < cols) slice = slice.concat([{ label: '', value: '' }]);
    rows.push(slice.map((f) => ({ text: (f.label || '').toUpperCase(), style: 'th' })));
    rows.push(slice.map((f) => ({ text: f.value || '—', style: 'val' })));
  }
  return {
    table: { widths: Array(cols).fill('*'), body: rows },
    layout: {
      hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1 : 0),
      vLineWidth: () => 0,
      hLineColor: () => '#D8E6EF',
      paddingTop: (i) => (i % 2 === 0 ? 4 : 1),
      paddingBottom: (i) => (i % 2 === 0 ? 1 : 5),
      paddingLeft: () => 4,
      paddingRight: () => 4,
    },
    margin: [0, 4, 0, 14],
  };
}

function pdfInstrucciones(texto) {
  return {
    table: { widths: ['*'], body: [[{ text: texto, style: 'instrucciones' }]] },
    layout: {
      hLineWidth: () => 0, vLineWidth: () => 0,
      paddingTop: () => 8, paddingBottom: () => 8, paddingLeft: () => 10, paddingRight: () => 10,
      fillColor: () => '#FFF4DE',
    },
    margin: [0, 0, 0, 12],
  };
}

// Tabla de criterios: Criterio (+descripción) | Valoración obtenida.
// `valorLabel(criterio)` recibe cada criterio y devuelve el texto a mostrar
// en la columna de valoración (distinto para autoeval 1-5 y coeval 3 niveles).
function pdfTablaCriterios(criterios, respuestas, valorLabel) {
  const header = [
    { text: 'CRITERIO', style: 'th2' },
    { text: 'VALORACIÓN', style: 'th2', alignment: 'center' },
  ];
  const body = criterios.map((c, i) => [
    {
      text: [
        { text: c.titulo + '\n', bold: true, color: PDF_INK },
        { text: c.texto, color: PDF_MUTED, fontSize: 8 },
      ],
      margin: [0, 3, 0, 3],
    },
    { text: valorLabel(c, respuestas[i]), style: 'valorCell', alignment: 'center' },
  ]);
  return {
    table: { widths: ['*', 90], headerRows: 1, body: [header, ...body] },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#C9D9E3',
      vLineColor: () => '#C9D9E3',
      paddingTop: () => 5,
      paddingBottom: () => 5,
      paddingLeft: () => 8,
      paddingRight: () => 8,
    },
    margin: [0, 4, 0, 8],
  };
}

function pdfPuntajeLine(label, puntaje, max) {
  return {
    columns: [
      { text: '', width: '*' },
      {
        text: [{ text: `${label}:  `, color: PDF_MUTED, fontSize: 9 }, { text: `${puntaje} / ${max}`, bold: true, color: PDF_PRIMARY, fontSize: 11 }],
        width: 'auto',
      },
    ],
    margin: [0, 0, 0, 10],
  };
}

function pdfQuoteBlock(label, texto) {
  return {
    margin: [0, 0, 0, 12],
    stack: [
      { text: label.toUpperCase(), style: 'th2', margin: [0, 0, 0, 3] },
      {
        columns: [
          { text: '', width: 3 },
          { text: texto || '—', italics: true, color: PDF_INK, fontSize: 9.5, lineHeight: 1.25 },
        ],
        columnGap: 8,
      },
    ],
  };
}

// Bloque de nota destacada (fondo de color): dice explícitamente a QUIÉN
// corresponde, porque la nota de autoevaluación es de quien llena el
// formulario, pero la de coevaluación es de la persona evaluada.
function pdfNotaDestacada(titulo, nota, deQuien) {
  return {
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: titulo.toUpperCase(), style: 'notaTitulo' },
          { text: `${pdfFmtNota(nota)} / 10`, style: 'notaValor' },
          { text: `Corresponde a: ${deQuien || '—'}`, style: 'notaDeQuien' },
        ],
      }]],
    },
    layout: {
      hLineWidth: () => 0, vLineWidth: () => 0,
      paddingTop: () => 10, paddingBottom: () => 10, paddingLeft: () => 14, paddingRight: () => 14,
      fillColor: () => PDF_PRIMARY,
    },
    margin: [0, 6, 0, 0],
  };
}

function generarPdfEvaluacion(student, nie, materia, record, logoBase64, config) {
  const notas = window.calcularNotas(record.autoeval, record.coeval);
  const fechaEmision = pdfFechaHoyLarga();
  const partnerNie = record.coeval.companeroNie;
  const partnerData = window.STUDENTS[partnerNie] || {};
  const subtitulo = [materia, config.periodo, config.anio].filter(Boolean).join(' · ');

  const content = [
    // ---------------- PÁGINA 1 — AUTOEVALUACIÓN (nota del propio estudiante) ----------------
    ...pdfEncabezado(config, logoBase64),
    { text: '', margin: [0, 0, 0, 8] },
    { text: 'AUTOEVALUACIÓN', style: 'titulo' },
    subtitulo ? { text: subtitulo, style: 'subtitulo', margin: [0, 4, 0, 10] } : { text: '', margin: [0, 0, 0, 4] },
    pdfInfoTable([
      { label: 'Estudiante', value: student.name },
      { label: 'NIE', value: nie },
      { label: 'Grado', value: student.grade },
      { label: 'Materia', value: materia },
      { label: 'Docente', value: config.docente },
      { label: 'Fecha de emisión', value: fechaEmision },
    ]),
    pdfInstrucciones(window.PREGUNTAS.autoevaluacion.instrucciones),
    pdfTablaCriterios(
      window.PREGUNTAS.autoevaluacion.criterios,
      record.autoeval.respuestas,
      (c, valor) => `${valor} / 5`,
    ),
    pdfPuntajeLine('Puntaje obtenido', record.autoeval.puntaje, 25),
    pdfQuoteBlock(window.PREGUNTAS.autoevaluacion.reflexion.pregunta, record.autoeval.reflexion),
    pdfNotaDestacada('Nota de autoevaluación', notas.notaAutoeval, student.name),

    // ---------------- PÁGINA 2 — COEVALUACIÓN (nota del compañero evaluado) ----------------
    { text: '', pageBreak: 'before' },
    ...pdfEncabezado(config, logoBase64),
    { text: '', margin: [0, 0, 0, 8] },
    { text: 'COEVALUACIÓN', style: 'titulo' },
    subtitulo ? { text: subtitulo, style: 'subtitulo', margin: [0, 4, 0, 10] } : { text: '', margin: [0, 0, 0, 4] },
    pdfInfoTable([
      { label: 'Estudiante evaluado', value: record.coeval.companeroNombre },
      { label: 'NIE del evaluado', value: partnerNie },
      { label: 'Grado', value: partnerData.grade || student.grade },
      { label: 'Materia', value: materia },
      { label: 'Evaluado por', value: student.name },
      { label: 'Fecha de emisión', value: fechaEmision },
    ]),
    pdfInstrucciones(window.PREGUNTAS.coevaluacion.instrucciones),
    pdfTablaCriterios(
      window.PREGUNTAS.coevaluacion.criterios,
      record.coeval.respuestas,
      (c, valor) => `${window.PREGUNTAS.coevaluacion.escalaLabels[valor - 1]} (${valor})`,
    ),
    pdfPuntajeLine('Puntaje obtenido', record.coeval.puntaje, 15),
    pdfQuoteBlock(window.PREGUNTAS.coevaluacion.comentario.pregunta, record.coeval.comentario),
    pdfNotaDestacada('Nota de coevaluación', notas.notaCoeval, record.coeval.companeroNombre),
    {
      text: 'Esta nota de coevaluación corresponde al estudiante evaluado, no a quien llenó este formulario. Ambas evaluaciones se completaron con honestidad, responsabilidad y sentido crítico, conforme a la Normativa de Evaluación al Servicio del Aprendizaje y del Desarrollo.',
      style: 'nota',
    },
  ];

  const docDefinition = {
    pageSize: 'LETTER',
    pageMargins: [50, 44, 50, 40],
    content,
    defaultStyle: { fontSize: 9, color: PDF_INK },
    styles: {
      inst: { fontSize: 11, bold: true, alignment: 'center', color: PDF_INK, margin: [0, 0, 0, 2] },
      loc: { fontSize: 9.5, bold: true, alignment: 'center', color: PDF_INK },
      code: { fontSize: 9.5, alignment: 'center', color: PDF_INK, margin: [0, 2, 0, 0] },
      titulo: { fontSize: 14, bold: true, color: PDF_PRIMARY, alignment: 'center', margin: [0, 6, 0, 2] },
      subtitulo: { fontSize: 9, color: PDF_MUTED, alignment: 'center' },
      th: { fontSize: 6.5, bold: true, color: PDF_MUTED },
      val: { fontSize: 8.5, color: PDF_INK },
      th2: { fontSize: 7.5, bold: true, color: PDF_MUTED },
      valorCell: { fontSize: 10, bold: true, color: PDF_PRIMARY },
      instrucciones: { fontSize: 8.5, italics: true, color: '#8A5A00' },
      seccion: { fontSize: 11.5, bold: true, color: PDF_INK, margin: [0, 10, 0, 4] },
      nota: { fontSize: 8, italics: true, color: PDF_MUTED, alignment: 'justify', margin: [0, 8, 0, 0] },
      notaTitulo: { fontSize: 8, bold: true, color: '#FFFFFF', alignment: 'center' },
      notaValor: { fontSize: 20, bold: true, color: '#FFFFFF', alignment: 'center', margin: [0, 2, 0, 2] },
      notaDeQuien: { fontSize: 8.5, color: '#FFFFFF', alignment: 'center' },
    },
  };

  const filename = `${pdfSanitizeFilename(materia)}_Autoeval_Coeval_${pdfSanitizeFilename(nie)}_${pdfSanitizeFilename(student.name)}.pdf`;
  pdfMake.createPdf(docDefinition).download(filename);
}

window.EvalPDF = { generar: generarPdfEvaluacion };
