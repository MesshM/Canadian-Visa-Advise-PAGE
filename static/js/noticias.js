// Base de datos simulada de noticias
const noticiasData = [
  // Noticias Importantes
  {
    id: 1,
    categoria: "importante",
    titulo: "Nuevos Cambios en Express Entry 2024: Requisitos Actualizados",
    resumen:
      "El gobierno canadiense anuncia modificaciones significativas en el sistema Express Entry que afectarán a todos los aplicantes a partir de enero 2024.",
    contenido: `
            <p>El Ministerio de Inmigración, Refugiados y Ciudadanía de Canadá (IRCC) ha anunciado cambios importantes en el sistema Express Entry que entrarán en vigor el 1 de enero de 2024.</p>
            
            <h3>Principales Cambios:</h3>
            <ul>
                <li><strong>Nuevos criterios de puntuación:</strong> Se otorgarán puntos adicionales por experiencia laboral en sectores prioritarios como salud, tecnología y oficios especializados.</li>
                <li><strong>Requisitos de idioma actualizados:</strong> Se requiere un mínimo de CLB 7 en inglés o francés para todas las categorías.</li>
                <li><strong>Educación credencial:</strong> Todos los diplomas extranjeros deben ser evaluados por organizaciones designadas.</li>
                <li><strong>Experiencia laboral canadiense:</strong> Se valorará más la experiencia previa en Canadá.</li>
            </ul>
            
            <h3>Impacto para Aplicantes Colombianos:</h3>
            <p>Los ciudadanos colombianos que planean aplicar a través de Express Entry deben prepararse con anticipación. Recomendamos:</p>
            <ul>
                <li>Mejorar el nivel de inglés o francés</li>
                <li>Obtener la evaluación de credenciales educativas</li>
                <li>Considerar programas de nominación provincial</li>
                <li>Buscar asesoría especializada</li>
            </ul>
            
            <p>En CVA, nuestros asesores especializados están actualizados con todos estos cambios y pueden ayudarte a navegar el nuevo sistema exitosamente.</p>
        `,
    imagen: "/static/uploads/notice/1_urgente.jpg",
    fecha: "2024-01-15",
    autor: "Equipo CVA",
    fechaCreacion: new Date("2024-01-15"),
  },
  {
    id: 2,
    categoria: "importante",
    titulo: "Suspensión Temporal de Visas de Trabajo para Ciertos Sectores",
    resumen:
      "IRCC anuncia suspensión temporal de permisos de trabajo en sectores específicos debido a cambios en el mercado laboral canadiense.",
    contenido: `
            <p>El gobierno canadiense ha anunciado una suspensión temporal de nuevos permisos de trabajo en ciertos sectores, efectiva desde el 1 de febrero de 2024.</p>
            
            <h3>Sectores Afectados:</h3>
            <ul>
                <li>Servicios de alimentos de bajo nivel</li>
                <li>Retail general</li>
                <li>Algunos servicios de limpieza</li>
            </ul>
            
            <h3>Sectores Priorizados:</h3>
            <ul>
                <li>Salud y cuidado</li>
                <li>Tecnología</li>
                <li>Oficios especializados</li>
                <li>Agricultura</li>
                <li>Transporte</li>
            </ul>
            
            <p>Esta medida busca equilibrar el mercado laboral y priorizar sectores con mayor demanda de trabajadores especializados.</p>
        `,
    imagen: "/static/uploads/notice/2_urgente.jpg",
    fecha: "2024-01-20",
    autor: "Departamento de Inmigración CVA",
    fechaCreacion: new Date("2024-01-20"),
  },

  // Noticias Medianas
  {
    id: 3,
    categoria: "mediana",
    titulo: "Ontario Lanza Nuevo Programa de Nominación Provincial 2024",
    resumen:
      "La provincia de Ontario introduce nuevas categorías en su Programa de Nominación Provincial con oportunidades específicas para profesionales latinos.",
    contenido: `
            <p>Ontario ha lanzado nuevas categorías dentro de su Programa de Nominación Provincial (OINP) para 2024, con oportunidades específicas para profesionales internacionales.</p>
            
            <h3>Nuevas Categorías:</h3>
            <ul>
                <li><strong>Tech Draw:</strong> Para profesionales en tecnología</li>
                <li><strong>Healthcare Stream:</strong> Para trabajadores de la salud</li>
                <li><strong>Skilled Trades:</strong> Para oficios especializados</li>
                <li><strong>French-Speaking Stream:</strong> Para francófonos</li>
            </ul>
            
            <h3>Requisitos Generales:</h3>
            <ul>
                <li>Experiencia laboral mínima de 2 años</li>
                <li>Nivel de inglés CLB 6 o superior</li>
                <li>Oferta de trabajo válida en Ontario</li>
                <li>Educación post-secundaria</li>
            </ul>
            
            <p>Los profesionales colombianos con experiencia en estos sectores tienen excelentes oportunidades de ser nominados.</p>
        `,
    imagen: "/static/uploads/notice/1_importante.jpg",
    fecha: "2024-01-18",
    autor: "Especialista en PNP - CVA",
    fechaCreacion: new Date("2024-01-18"),
  },
  {
    id: 4,
    categoria: "mediana",
    titulo: "Aumento en Tarifas de Aplicación para Visas Canadienses",
    resumen:
      "IRCC anuncia incremento en las tarifas de procesamiento para diferentes tipos de visa, efectivo a partir de abril 2024.",
    contenido: `
            <p>El gobierno canadiense ha anunciado un aumento en las tarifas de procesamiento para diversas aplicaciones de inmigración, efectivo a partir del 30 de abril de 2024.</p>
            
            <h3>Nuevas Tarifas:</h3>
            <ul>
                <li><strong>Express Entry:</strong> $1,365 CAD (antes $1,325)</li>
                <li><strong>Visa de Visitante:</strong> $100 CAD (antes $85)</li>
                <li><strong>Permiso de Trabajo:</strong> $155 CAD (antes $155)</li>
                <li><strong>Permiso de Estudio:</strong> $150 CAD (antes $150)</li>
                <li><strong>Biométricos:</strong> $85 CAD (sin cambio)</li>
            </ul>
            
            <h3>Recomendaciones:</h3>
            <p>Si estás planeando aplicar, considera hacerlo antes del 30 de abril para aprovechar las tarifas actuales.</p>
            
            <p>En CVA te ayudamos a preparar tu aplicación de manera eficiente para evitar retrasos y costos adicionales.</p>
        `,
    imagen: "/static/uploads/notice/2_importante.jpg",
    fecha: "2024-01-22",
    autor: "Departamento Financiero CVA",
    fechaCreacion: new Date("2024-01-22"),
  },
  {
    id: 5,
    categoria: "mediana",
    titulo: "British Columbia Actualiza Lista de Ocupaciones Prioritarias",
    resumen:
      "La provincia de BC actualiza su lista de ocupaciones con alta demanda, incluyendo nuevas profesiones en el sector tecnológico y de salud.",
    contenido: `
            <p>British Columbia ha actualizado su lista de ocupaciones prioritarias para el Programa de Nominación Provincial, agregando nuevas profesiones y eliminando otras.</p>
            
            <h3>Ocupaciones Agregadas:</h3>
            <ul>
                <li>Desarrolladores de software especializado</li>
                <li>Enfermeros especializados</li>
                <li>Técnicos en energías renovables</li>
                <li>Especialistas en ciberseguridad</li>
            </ul>
            
            <h3>Ocupaciones Removidas:</h3>
            <ul>
                <li>Algunos puestos administrativos generales</li>
                <li>Ciertos roles en servicios básicos</li>
            </ul>
            
            <p>Esta actualización refleja las necesidades actuales del mercado laboral de BC y las prioridades económicas de la provincia.</p>
        `,
    imagen: "/static/uploads/notice/3_importante.jpg",
    fecha: "2024-01-25",
    autor: "Especialista BC PNP - CVA",
    fechaCreacion: new Date("2024-01-25"),
  },

  // Noticias Generales
  {
    id: 6,
    categoria: "general",
    titulo: "Consejos para Preparar tu Entrevista de Visa Canadiense",
    resumen: "Guía completa con los mejores consejos para tener éxito en tu entrevista de visa canadiense.",
    contenido: `
            <p>La entrevista de visa es un paso crucial en tu proceso de inmigración. Aquí te compartimos los mejores consejos para prepararte.</p>
            
            <h3>Antes de la Entrevista:</h3>
            <ul>
                <li>Revisa todos tus documentos</li>
                <li>Practica respuestas comunes</li>
                <li>Investiga sobre Canadá</li>
                <li>Prepara preguntas para hacer</li>
            </ul>
            
            <h3>Durante la Entrevista:</h3>
            <ul>
                <li>Sé honesto y directo</li>
                <li>Mantén contacto visual</li>
                <li>Habla con confianza</li>
                <li>Proporciona documentos cuando se soliciten</li>
            </ul>
            
            <p>En CVA te preparamos completamente para tu entrevista con simulacros y asesoría personalizada.</p>
        `,
    imagen: "/static/uploads/notice/1_informativo.jpg",
    fecha: "2024-01-12",
    autor: "Consejero CVA",
    fechaCreacion: new Date("2024-01-12"),
  },
  {
    id: 7,
    categoria: "general",
    titulo: "Documentos Esenciales para tu Aplicación de Residencia",
    resumen: "Lista completa de documentos necesarios para aplicar a residencia permanente en Canadá.",
    contenido: `
            <p>Preparar la documentación correcta es fundamental para el éxito de tu aplicación de residencia permanente.</p>
            
            <h3>Documentos Personales:</h3>
            <ul>
                <li>Pasaporte vigente</li>
                <li>Certificados de nacimiento</li>
                <li>Certificados de matrimonio/divorcio</li>
                <li>Certificados de antecedentes penales</li>
            </ul>
            
            <h3>Documentos Educativos:</h3>
            <ul>
                <li>Diplomas y certificados</li>
                <li>Evaluación de credenciales (ECA)</li>
                <li>Transcripciones académicas</li>
            </ul>
            
            <h3>Documentos Laborales:</h3>
            <ul>
                <li>Cartas de referencia laboral</li>
                <li>Contratos de trabajo</li>
                <li>Certificados profesionales</li>
            </ul>
            
            <p>Nuestro equipo en CVA te ayuda a preparar y organizar todos estos documentos correctamente.</p>
        `,
    imagen: "/static/uploads/notice/2_informativo.jpg",
    fecha: "2024-01-10",
    autor: "Documentalista CVA",
    fechaCreacion: new Date("2024-01-10"),
  },
  {
    id: 8,
    categoria: "general",
    titulo: "Cómo Mejorar tu Puntaje en el Examen IELTS",
    resumen: "Estrategias efectivas para obtener el puntaje de inglés necesario para tu aplicación canadiense.",
    contenido: `
            <p>El IELTS es crucial para tu aplicación de inmigración. Aquí te compartimos estrategias para mejorar tu puntaje.</p>
            
            <h3>Preparación General:</h3>
            <ul>
                <li>Establece un horario de estudio consistente</li>
                <li>Practica las 4 habilidades diariamente</li>
                <li>Usa materiales oficiales de IELTS</li>
                <li>Toma exámenes de práctica</li>
            </ul>
            
            <h3>Consejos por Sección:</h3>
            <ul>
                <li><strong>Listening:</strong> Practica con diferentes acentos</li>
                <li><strong>Reading:</strong> Mejora tu velocidad de lectura</li>
                <li><strong>Writing:</strong> Aprende estructuras de ensayo</li>
                <li><strong>Speaking:</strong> Practica con hablantes nativos</li>
            </ul>
            
            <p>En CVA ofrecemos preparación especializada para IELTS con instructores certificados.</p>
        `,
    imagen: "/static/uploads/notice/3_informativo.jpg",
    fecha: "2024-01-08",
    autor: "Instructor IELTS - CVA",
    fechaCreacion: new Date("2024-01-08"),
  },
  {
    id: 9,
    categoria: "general",
    titulo: "Vida en Canadá: Guía para Nuevos Inmigrantes",
    resumen: "Todo lo que necesitas saber sobre la vida en Canadá: cultura, clima, sistema de salud y más.",
    contenido: `
            <p>Adaptarse a la vida en Canadá puede ser emocionante y desafiante. Esta guía te ayudará en tu transición.</p>
            
            <h3>Primeros Pasos:</h3>
            <ul>
                <li>Obtén tu SIN (Social Insurance Number)</li>
                <li>Abre una cuenta bancaria</li>
                <li>Solicita tu tarjeta de salud provincial</li>
                <li>Busca alojamiento temporal</li>
            </ul>
            
            <h3>Sistema de Salud:</h3>
            <ul>
                <li>Cada provincia tiene su propio sistema</li>
                <li>La atención básica es gratuita</li>
                <li>Necesitas registrarte en tu provincia</li>
                <li>Considera seguro privado adicional</li>
            </ul>
            
            <h3>Cultura Canadiense:</h3>
            <ul>
                <li>Multiculturalismo y diversidad</li>
                <li>Puntualidad es importante</li>
                <li>Respeto por el espacio personal</li>
                <li>Dos idiomas oficiales</li>
            </ul>
            
            <p>CVA te acompaña no solo en el proceso de inmigración, sino también en tu adaptación a la vida canadiense.</p>
        `,
    imagen: "/static/uploads/notice/4_informativo.jpg",
    fecha: "2024-01-05",
    autor: "Consejero de Integración CVA",
    fechaCreacion: new Date("2024-01-05"),
  },
]

// Variables globales
let currentPage = 1
const itemsPerPage = 12
let filteredNoticias = [...noticiasData]
let currentNoticiaId = null

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  initializeNoticias()
  setupEventListeners()
})

function initializeNoticias() {
  renderNoticias()
  setupPagination()
}

function setupEventListeners() {
  // Búsqueda
  const searchInput = document.getElementById("search-input")
  searchInput.addEventListener("input", debounce(handleSearch, 300))

  // Filtros
  const categoryFilter = document.getElementById("filter-category")
  const dateFilter = document.getElementById("filter-date")

  categoryFilter.addEventListener("change", handleFilters)
  dateFilter.addEventListener("change", handleFilters)
}

function renderNoticias() {
  const importantesContainer = document.getElementById("importantes-container")
  const medianasContainer = document.getElementById("medianas-container")
  const generalesContainer = document.getElementById("generales-container")

  // Limpiar contenedores
  importantesContainer.innerHTML = ""
  medianasContainer.innerHTML = ""
  generalesContainer.innerHTML = ""

  // Filtrar noticias por categoría
  const importantes = filteredNoticias.filter((n) => n.categoria === "importante")
  const medianas = filteredNoticias.filter((n) => n.categoria === "mediana")
  const generales = filteredNoticias.filter((n) => n.categoria === "general")

  // Renderizar cada categoría
  renderCategoriaNoticias(importantes, importantesContainer, "importante")
  renderCategoriaNoticias(medianas, medianasContainer, "mediana")
  renderCategoriaNoticias(generales, generalesContainer, "general")

  // Mostrar/ocultar secciones según contenido
  toggleSectionVisibility("noticias-importantes", importantes.length > 0)
  toggleSectionVisibility("noticias-medianas", medianas.length > 0)
  toggleSectionVisibility("noticias-generales", generales.length > 0)
}

function renderCategoriaNoticias(noticias, container, categoria) {
  noticias.forEach((noticia, index) => {
    const noticiaElement = createNoticiaElement(noticia, categoria, index)
    container.appendChild(noticiaElement)
  })
}

function createNoticiaElement(noticia, categoria, index) {
  const article = document.createElement("article")
  article.className = `bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer group animate-fade-in-up`
  article.style.animationDelay = `${index * 100}ms`
  article.onclick = () => openNoticiaModal(noticia.id)

  const categoriaStyles = {
    importante: "bg-red-100 text-red-700 border-red-200",
    mediana: "bg-blue-100 text-blue-700 border-blue-200",
    general: "bg-green-100 text-green-700 border-green-200",
  }

  const categoriaLabels = {
    importante: "Urgente",
    mediana: "Importante",
    general: "Informativo",
  }

  const imageHeight = categoria === "importante" ? "200" : categoria === "mediana" ? "160" : "120"

  article.innerHTML = `
  <div class="relative overflow-hidden rounded-t-2xl aspect-w-16 aspect-h-9 bg-gray-100">
    <img src="${noticia.imagen}" alt="${noticia.titulo}" 
         class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
    <div class="absolute top-4 left-4">
      <span class="px-3 py-1 ${categoriaStyles[categoria]} text-xs font-semibold rounded-full border">
        ${categoriaLabels[categoria]}
      </span>
    </div>
  </div>
  <div class="p-6">
      <h3 class="text-${categoria === "importante" ? "xl" : "lg"} font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors duration-300 line-clamp-2">
          ${noticia.titulo}
      </h3>
      <p class="text-gray-600 mb-4 line-clamp-3 text-sm leading-relaxed">
          ${noticia.resumen}
      </p>
      <div class="flex items-center justify-between text-sm text-gray-500">
          <div class="flex items-center">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              ${formatDate(noticia.fecha)}
          </div>
          <div class="flex items-center text-primary-600 group-hover:text-primary-700 transition-colors duration-300">
              <span class="mr-2">Leer más</span>
              <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
              </svg>
          </div>
      </div>
  </div>
`

  return article
}

function toggleSectionVisibility(sectionId, show) {
  const section = document.getElementById(sectionId)
  if (show) {
    section.classList.remove("hidden")
  } else {
    section.classList.add("hidden")
  }
}

function openNoticiaModal(noticiaId) {
  const noticia = noticiasData.find((n) => n.id === noticiaId)
  if (!noticia) return

  currentNoticiaId = noticiaId

  const modal = document.getElementById("noticia-modal")
  const modalCategoria = document.getElementById("modal-categoria")
  const modalTitulo = document.getElementById("modal-titulo")
  const modalFecha = document.getElementById("modal-fecha")
  const modalAutor = document.getElementById("modal-autor")
  const modalImagen = document.getElementById("modal-imagen")
  const modalContenido = document.getElementById("modal-contenido")

  // Configurar categoría con iconos
  const categoriaStyles = {
    importante: "bg-red-100 text-red-700 border border-red-200",
    mediana: "bg-blue-100 text-blue-700 border border-blue-200",
    general: "bg-green-100 text-green-700 border border-green-200",
  }

  const categoriaLabels = {
    importante: "🚨 Noticia Urgente",
    mediana: "📢 Noticia Importante",
    general: "📰 Noticia Informativa",
  }

  modalCategoria.className = `inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold mb-4 shadow-sm ${categoriaStyles[noticia.categoria]}`
  modalCategoria.textContent = categoriaLabels[noticia.categoria]

  // Configurar contenido
  modalTitulo.textContent = noticia.titulo
  modalFecha.textContent = formatDate(noticia.fecha)
  modalAutor.textContent = noticia.autor

  // Mejorar la imagen con overlay y efectos
  modalImagen.innerHTML = `
    <div class="relative h-80 overflow-hidden">
      <img src="${noticia.imagen}" alt="${noticia.titulo}" 
           class="w-full h-full object-cover">
      <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      <div class="absolute bottom-4 left-6 right-6">
        <div class="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg">
          <p class="sm:text-sm text-gray-700 text-xs">${noticia.resumen}</p>
        </div>
      </div>
    </div>
  `

  // Mejorar el contenido con estilos personalizados usando TailwindCSS
  modalContenido.innerHTML = `
  <div class="prose prose-lg max-w-none text-gray-700 leading-relaxed">
    ${noticia.contenido
      .replace(/<h3>/g, '<h3 class="text-red-600 font-semibold mt-8 mb-4 text-xl">')
      .replace(/<ul>/g, '<ul class="my-4">')
      .replace(/<li>/g, '<li class="my-2 pl-2">')
      .replace(/<li><strong>/g, '<li class="my-2 pl-2"><strong class="text-gray-800">')
      .replace(/<p>/g, '<p class="my-4 leading-7">')
    }
  </div>
`

  // Mostrar modal con animación mejorada
  modal.classList.remove("hidden")
  modal.classList.add("flex")

  // Animar la entrada del contenido
  const modalContent = modal.querySelector(".bg-white")
  if (modalContent) {
    modalContent.classList.add("animate-scale-in")
  }

  document.body.style.overflow = "hidden"
}

function closeNoticiaModal() {
  const modal = document.getElementById("noticia-modal")
  if (!modal) return

  // Añadir animación de cierre
  const modalContent = modal.querySelector(".bg-white")
  modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")

  setTimeout(() => {
    modal.classList.add("hidden")
    modal.classList.remove("flex")
    modalContent.classList.remove("opacity-0", "scale-95", "transition-all", "duration-300")
    document.body.style.overflow = "auto"
    currentNoticiaId = null
  }, 300)
}

function compartirNoticia() {
  if (!currentNoticiaId) return

  const noticia = noticiasData.find((n) => n.id === currentNoticiaId)
  if (!noticia) return

  if (navigator.share) {
    navigator.share({
      title: noticia.titulo,
      text: noticia.resumen,
      url: window.location.href,
    })
  } else {
    // Fallback para navegadores que no soportan Web Share API
    const url = window.location.href
    navigator.clipboard.writeText(`${noticia.titulo} - ${url}`).then(() => {
      showNotification("Enlace copiado al portapapeles", "success")
    })
  }
}

function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase().trim()

  if (searchTerm === "") {
    filteredNoticias = [...noticiasData]
  } else {
    filteredNoticias = noticiasData.filter(
      (noticia) =>
        noticia.titulo.toLowerCase().includes(searchTerm) ||
        noticia.resumen.toLowerCase().includes(searchTerm) ||
        noticia.contenido.toLowerCase().includes(searchTerm),
    )
  }

  currentPage = 1
  renderNoticias()
  setupPagination()
}

function handleFilters() {
  const categoryFilter = document.getElementById("filter-category").value
  const dateFilter = document.getElementById("filter-date").value
  const searchTerm = document.getElementById("search-input").value.toLowerCase().trim()

  let filtered = [...noticiasData]

  // Filtro de búsqueda
  if (searchTerm) {
    filtered = filtered.filter(
      (noticia) =>
        noticia.titulo.toLowerCase().includes(searchTerm) ||
        noticia.resumen.toLowerCase().includes(searchTerm) ||
        noticia.contenido.toLowerCase().includes(searchTerm),
    )
  }

  // Filtro de categoría
  if (categoryFilter) {
    filtered = filtered.filter((noticia) => noticia.categoria === categoryFilter)
  }

  // Filtro de fecha
  if (dateFilter) {
    const now = new Date()
    filtered = filtered.filter((noticia) => {
      const noticiaDate = new Date(noticia.fecha)
      switch (dateFilter) {
        case "today":
          return isSameDay(noticiaDate, now)
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return noticiaDate >= weekAgo
        case "month":
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          return noticiaDate >= monthAgo
        default:
          return true
      }
    })
  }

  filteredNoticias = filtered
  currentPage = 1
  renderNoticias()
  setupPagination()
}

function resetFilters() {
  document.getElementById("search-input").value = ""
  document.getElementById("filter-category").value = ""
  document.getElementById("filter-date").value = ""

  filteredNoticias = [...noticiasData]
  currentPage = 1
  renderNoticias()
  setupPagination()
}

function setupPagination() {
  const totalPages = Math.ceil(filteredNoticias.length / itemsPerPage)
  const paginationContainer = document.getElementById("pagination-container")

  if (totalPages <= 1) {
    paginationContainer.classList.add("hidden")
    return
  }

  paginationContainer.classList.remove("hidden")
  paginationContainer.innerHTML = ""

  // Botón anterior
  if (currentPage > 1) {
    const prevButton = createPaginationButton("Anterior", () => {
      currentPage--
      renderNoticias()
      setupPagination()
    })
    paginationContainer.appendChild(prevButton)
  }

  // Números de página
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage || i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      const pageButton = createPaginationButton(
        i.toString(),
        () => {
          currentPage = i
          renderNoticias()
          setupPagination()
        },
        i === currentPage,
      )
      paginationContainer.appendChild(pageButton)
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      const ellipsis = document.createElement("span")
      ellipsis.textContent = "..."
      ellipsis.className = "px-3 py-2 text-gray-500"
      paginationContainer.appendChild(ellipsis)
    }
  }

  // Botón siguiente
  if (currentPage < totalPages) {
    const nextButton = createPaginationButton("Siguiente", () => {
      currentPage++
      renderNoticias()
      setupPagination()
    })
    paginationContainer.appendChild(nextButton)
  }
}

function createPaginationButton(text, onClick, isActive = false) {
  const button = document.createElement("button")
  button.textContent = text
  button.onclick = onClick
  button.className = `px-4 py-2 mx-1 rounded-xl transition-all duration-300 ${
    isActive
      ? "bg-primary-600 text-white shadow-lg"
      : "bg-white text-gray-700 border border-gray-200 hover:bg-primary-50 hover:border-primary-300"
  }`
  return button
}

// Funciones utilitarias
function formatDate(dateString) {
  const date = new Date(dateString)
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Bogota",
  }
  return date.toLocaleDateString("es-CO", options)
}

function isSameDay(date1, date2) {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  )
}

function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

function showNotification(message, type = "info") {
  // Esta función debería integrarse con tu sistema de notificaciones existente
  console.log(`${type.toUpperCase()}: ${message}`)
}

// Cerrar modal con tecla Escape
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeNoticiaModal()
  }
})

// Cerrar modal al hacer clic fuera con animación
document.getElementById("noticia-modal").addEventListener("click", function (event) {
  if (event.target === this) {
    closeNoticiaModal()
  }
})
