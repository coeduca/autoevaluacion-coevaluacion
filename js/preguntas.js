// =========================================================
// Banco de preguntas — Autoevaluación y Coevaluación
// Editable: cambia textos/criterios aquí sin tocar la lógica de la app.
// =========================================================
window.PREGUNTAS = {

  autoevaluacion: {
    escalaMax: 5,
    escalaLabels: ['1', '2', '3', '4', '5'],
    escalaHint: '1 = Necesito mejorar · 5 = Excelente',
    instrucciones: 'Vas a reflexionar sobre tu propio desempeño en esta materia. Lee cada criterio y valóralo del 1 al 5, donde 1 = Necesito mejorar y 5 = Excelente.',
    criterios: [
      { id: 'responsabilidad', titulo: 'Responsabilidad', texto: 'Cumplí puntualmente con mis tareas y trabajos asignados.' },
      { id: 'participacion', titulo: 'Participación', texto: 'Participé activamente en las clases y presté atención.' },
      { id: 'comprension', titulo: 'Comprensión', texto: 'Logré entender los temas desarrollados y pregunté mis dudas.' },
      { id: 'autonomia', titulo: 'Autonomía', texto: 'Busqué información adicional y me esforcé por aprender por mi cuenta.' },
      { id: 'actitud', titulo: 'Actitud', texto: 'Mantuve una actitud de respeto hacia el docente y la clase.' },
    ],
    reflexion: {
      id: 'reflexion',
      pregunta: '¿Qué compromiso asumes para mejorar en el próximo periodo?',
      placeholder: 'Escribe tu compromiso aquí...',
    },
  },

  coevaluacion: {
    escalaMax: 3,
    // Índice 0→"Nunca"=1pt, 1→"A veces"=2pts, 2→"Siempre"=3pts
    escalaLabels: ['Nunca', 'A veces', 'Siempre'],
    escalaHint: 'Marca con honestidad el comportamiento de tu compañero(a) en el trabajo en equipo',
    instrucciones: 'Vas a evaluar a un compañero(a) de tu grado, asignado automáticamente. Responde con honestidad y respeto qué tan seguido mostró cada comportamiento: Nunca, A veces o Siempre.',
    criterios: [
      { id: 'aportes', titulo: 'Aportes', texto: 'Aportó ideas útiles y constructivas durante las clases para enriquecer el aprendizaje de todos.' },
      { id: 'colaboracion', titulo: 'Colaboración', texto: 'Mostró disposición para ayudar a sus compañeros de clase cuando tenían dudas o dificultades.' },
      { id: 'respeto', titulo: 'Respeto', texto: 'Escuchó con atención y trató con respeto las opiniones y participaciones de los demás en el aula.' },
      { id: 'organizacion', titulo: 'Organización', texto: 'Demostró responsabilidad con sus deberes escolares y mantuvo el orden con sus materiales de estudio.' },
      { id: 'integracion', titulo: 'Integración', texto: 'Fomentó un ambiente de compañerismo, empatía y buena convivencia en el salón de clases.' },
    ],
    comentario: {
      id: 'comentario',
      pregunta: 'Menciona una fortaleza o aspecto positivo de tu compañero(a) en elámbito escolar.',
      placeholder: 'Escribe un comentario constructivo aquí...',
    },
  },
};
