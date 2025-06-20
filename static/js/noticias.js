// noticias.js
document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll("[data-tab]")
  const tabContents = document.querySelectorAll(".tab-content")
  const featuredNewsSection = document.getElementById("featured-news-section")
  const featuredNewsContainer = document.getElementById("featured-news-container")
  const minorNewsSection = document.getElementById("minor-news-section")
  const minorNewsContainer = document.getElementById("minor-news-container")

  const newsGrids = {
    "visa-news": document.getElementById("news-grid-visa-news"),
    "canada-news": document.getElementById("news-grid-canada-news"),
    "platform-news": document.getElementById("news-grid-platform-news"),
  }
  const loadingSpinners = {
    "visa-news": document.getElementById("loading-spinner-visa-news"),
    "canada-news": document.getElementById("loading-spinner-canada-news"),
    "platform-news": document.getElementById("loading-spinner-platform-news"),
    featured: featuredNewsContainer.querySelector("p"), // Usar el p de carga dentro del contenedor
    minor: minorNewsContainer.querySelector("p"), // Usar el p de carga dentro del contenedor
  }

  // Función para crear un elemento HTML de tarjeta de noticia normal
  function createNewsCard(newsItem, index) {
    const card = document.createElement("div")
    card.classList.add(
      "bg-white",
      "rounded-2xl",
      "p-6",
      "shadow-lg",
      "border",
      "border-gray-100",
      "hover:shadow-xl",
      "transition-all",
      "duration-300",
      "flex",
      "flex-col",
      "news-card",
      "opacity-0", // Estado inicial para la animación
      "translate-y-[30px]", // Estado inicial para la animación
    )
    card.style.animationDelay = `${0.1 * index}s` // Retraso escalonado para la animación

    card.innerHTML = `
            <img src="${newsItem.imageUrl}" alt="${newsItem.title}" class="rounded-lg mb-4 object-cover w-full h-48">
            <h3 class="text-xl font-bold text-gray-900 mb-2 font-roboto">${newsItem.title}</h3>
            <p class="text-sm text-gray-500 mb-3">Fecha: ${newsItem.date}</p>
            <p class="text-gray-600 leading-relaxed flex-grow">${newsItem.description}</p>
            <a href="#" class="inline-flex items-center text-primary-600 font-medium hover:text-primary-700 transition-colors duration-300 mt-4">
                <span>Leer más</span>
                <svg class="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                </svg>
            </a>
        `
    return card
  }

  // Función para crear la tarjeta de noticia destacada
  function createFeaturedNewsCard(newsItem) {
    const cardContent = `
            <img src="${newsItem.imageUrl}" alt="${newsItem.title}" class="rounded-2xl mb-6 lg:mb-0 lg:mr-8 object-cover w-full lg:w-1/2 h-64 lg:h-auto max-h-96">
            <div class="flex-1">
                <span class="inline-flex items-center px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-4">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.519 4.674c.3.921-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.785.57-1.838-.197-1.539-1.118l1.519-4.674a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z"></path>
                    </svg>
                    Noticia Destacada
                </span>
                <h3 class="text-3xl lg:text-4xl font-bold text-gray-900 font-roboto mb-4 leading-tight">${newsItem.title}</h3>
                <p class="text-lg text-gray-700 mb-6 leading-relaxed">${newsItem.description}</p>
                <p class="text-sm text-gray-500 mb-4">Fecha: ${newsItem.date}</p>
                <a href="#" class="relative overflow-hidden group bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-600 text-white font-roboto py-3 px-6 rounded-xl shadow-lg hover:shadow-primary-500/30 transition-all duration-300 cursor-pointer inline-flex items-center justify-center">
                    <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
                    <div class="relative flex items-center justify-center">
                        <span>Leer Noticia Completa</span>
                        <svg class="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                        </svg>
                    </div>
                </a>
            </div>
        `
    featuredNewsContainer.innerHTML = cardContent
    featuredNewsSection.classList.remove("hidden")
  }

  // Función para crear un elemento de noticia rápida
  function createMinorNewsItem(newsItem, index) {
    const item = document.createElement("div")
    item.classList.add(
      "bg-gray-50",
      "rounded-xl",
      "p-4",
      "border",
      "border-gray-200",
      "hover:shadow-md",
      "transition-all",
      "duration-300",
      "flex",
      "flex-col",
      "minor-news-item",
      "opacity-0", // Estado inicial para la animación
      "translate-y-[30px]", // Estado inicial para la animación
    )
    item.style.animationDelay = `${0.1 * index}s` // Retraso escalonado para la animación

    item.innerHTML = `
            <h4 class="text-lg font-semibold text-gray-900 mb-2">${newsItem.title}</h4>
            <p class="text-sm text-gray-600 mb-3 flex-grow">${newsItem.description}</p>
            <p class="text-xs text-gray-500">Fecha: ${newsItem.date}</p>
        `
    return item
  }

  // Función para obtener y mostrar noticias para una categoría dada
  async function loadNews(category) {
    const newsGrid = newsGrids[category]
    const spinner = loadingSpinners[category]

    // Limpia y muestra spinner para la sección principal de noticias
    newsGrid.innerHTML = ""
    spinner.classList.remove("hidden")

    // Limpia y muestra spinner para la sección de noticias destacadas y rápidas
    if (category === "visa-news") {
      // Solo cargamos destacadas y rápidas con la primera categoría
      featuredNewsContainer.innerHTML = `
                <div class="flex justify-center items-center py-8 w-full">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-primary-600"></div>
                    <p class="ml-3 text-primary-600 text-sm">Cargando noticia destacada...</p>
                </div>
            `
      minorNewsContainer.innerHTML = `
                <div class="flex justify-center items-center py-8 w-full md:col-span-2">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-primary-600"></div>
                    <p class="ml-3 text-primary-600 text-sm">Cargando noticias rápidas...</p>
                </div>
            `
      featuredNewsSection.classList.add("hidden")
      minorNewsSection.classList.add("hidden")
    }

    try {
      const response = await fetch(`/user/api/news?category=${category}`)
      if (!response.ok) {
        throw new Error(`Error HTTP! estado: ${response.status}`)
      }
      const allNewsData = await response.json()

      const featuredNews = allNewsData.find((item) => item.priority === "featured")
      const normalNews = allNewsData.filter((item) => item.priority === "normal")
      const minorNews = allNewsData.filter((item) => item.priority === "minor")

      // Renderizar Noticia Destacada
      if (featuredNews && category === "visa-news") {
        // Solo una noticia destacada para la primera carga
        createFeaturedNewsCard(featuredNews)
      } else if (category === "visa-news") {
        featuredNewsContainer.innerHTML = `<p class="text-gray-500 text-center w-full">No hay noticia destacada disponible.</p>`
      }

      // Renderizar Noticias Principales
      if (normalNews.length === 0) {
        newsGrid.innerHTML = `<p class="text-gray-500 text-center col-span-full">No hay noticias disponibles en esta categoría.</p>`
      } else {
        normalNews.forEach((newsItem, index) => {
          const card = createNewsCard(newsItem, index)
          newsGrid.appendChild(card)
        })
        // Activa la animación para las tarjetas recién añadidas
        const newsCards = newsGrid.querySelectorAll(".news-card")
        newsCards.forEach((card) => {
          card.classList.remove("opacity-0", "translate-y-[30px]")
          card.classList.add("opacity-100", "translate-y-0")
        })
      }

      // Renderizar Noticias Rápidas
      if (minorNews.length > 0 && category === "visa-news") {
        // Solo cargamos noticias rápidas con la primera categoría
        minorNewsContainer.innerHTML = "" // Limpiar el spinner
        minorNews.forEach((newsItem, index) => {
          const item = createMinorNewsItem(newsItem, index)
          minorNewsContainer.appendChild(item)
        })
        minorNewsSection.classList.remove("hidden")
        // Activa la animación para los elementos recién añadidos
        const minorNewsItems = minorNewsContainer.querySelectorAll(".minor-news-item")
        minorNewsItems.forEach((item) => {
          item.classList.remove("opacity-0", "translate-y-[30px]")
          item.classList.add("opacity-100", "translate-y-0")
        })
      } else if (category === "visa-news") {
        minorNewsContainer.innerHTML = `<p class="text-gray-500 text-center w-full md:col-span-2">No hay noticias rápidas disponibles.</p>`
      }
    } catch (error) {
      console.error("Error al cargar noticias:", error)
      newsGrid.innerHTML = `<p class="text-red-500 text-center col-span-full">Error al cargar las noticias. Por favor, intente de nuevo más tarde.</p>`
      if (category === "visa-news") {
        featuredNewsContainer.innerHTML = `<p class="text-red-500 text-center w-full">Error al cargar la noticia destacada.</p>`
        minorNewsContainer.innerHTML = `<p class="text-red-500 text-center w-full md:col-span-2">Error al cargar las noticias rápidas.</p>`
      }
    } finally {
      spinner.classList.add("hidden") // Oculta el spinner de la sección principal
      // Ocultar spinners de destacadas y rápidas si no hay contenido o si ya se cargó
      if (category === "visa-news") {
        featuredNewsContainer.querySelector(".animate-spin")?.parentElement.classList.add("hidden")
        minorNewsContainer.querySelector(".animate-spin")?.parentElement.classList.add("hidden")
      }
    }
  }

  // Funcionalidad de pestañas para la sección de noticias
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.getAttribute("data-tab")

      // Remueve la clase activa de todas las pestañas
      tabs.forEach((t) => {
        t.classList.remove("border-primary-600", "text-primary-600")
        t.classList.add("border-transparent", "text-gray-600", "hover:text-primary-600", "hover:border-primary-300")
        t.setAttribute("aria-selected", "false")
      })

      // Añade la clase activa a la pestaña clicada
      tab.classList.add("border-primary-600", "text-primary-600")
      tab.classList.remove("border-transparent", "text-gray-600", "hover:text-primary-600", "hover:border-primary-300")
      tab.setAttribute("aria-selected", "true")

      // Oculta todos los contenidos de las pestañas
      tabContents.forEach((content) => {
        content.classList.add("hidden")
        content.classList.remove("active")
      })

      // Muestra el contenido de la pestaña seleccionada
      const activeContent = document.getElementById(`${tabId}-content`)
      activeContent.classList.remove("hidden")
      activeContent.classList.add("active")

      // Carga las noticias para la pestaña activa
      loadNews(tabId)
    })
  })

  // Animaciones suaves mejoradas para el scroll (lógica existente, aseguramos que siga funcionando)
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Aplica clases de animación de Tailwind
        if (entry.target.classList.contains("animate-fade-in-smooth")) {
          entry.target.classList.remove("opacity-0", "translate-y-[30px]")
          entry.target.classList.add("opacity-100", "translate-y-0")
        } else if (entry.target.classList.contains("animate-fade-in-up")) {
          entry.target.classList.remove("opacity-0", "translate-y-[40px]")
          entry.target.classList.add("opacity-100", "translate-y-0")
        } else if (entry.target.classList.contains("animate-slide-in-left")) {
          entry.target.classList.remove("opacity-0", "-translate-x-[30px]")
          entry.target.classList.add("opacity-100", "translate-x-0")
        }

        // Añade animación escalonada para elementos de cuadrícula (como tarjetas de noticias)
        if (entry.target.classList.contains("grid")) {
          const children = entry.target.querySelectorAll(".news-card, .minor-news-item") // Apunta a las tarjetas de noticias específicas
          Array.from(children).forEach((child, index) => {
            setTimeout(() => {
              child.classList.remove("opacity-0", "translate-y-[30px]", "translate-y-[40px]", "-translate-x-[30px]")
              child.classList.add(
                "opacity-100",
                "translate-y-0",
                "translate-x-0",
                "transition-all",
                "duration-500",
                "ease-out",
              )
            }, index * 150)
          })
        }
        observer.unobserve(entry.target) // Deja de observar una vez animado
      }
    })
  }, observerOptions)

  // Observa todos los elementos animados en la sección de noticias
  const animatedElements = document.querySelectorAll(
    ".container.mx-auto.px-4.py-12, #featured-news-section, #minor-news-section, .tab-content.active .grid, .tab-content.hidden .grid",
  )
  animatedElements.forEach((element) => {
    observer.observe(element)
  })

  // Carga inicial para la pestaña activa (visa-news por defecto)
  const initialActiveTab = document.querySelector(".tab-content.active")
  if (initialActiveTab) {
    const initialTabId = initialActiveTab.id.replace("-content", "")
    loadNews(initialTabId)
  }
})
