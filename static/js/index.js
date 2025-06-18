document.addEventListener("DOMContentLoaded", () => {
  // Tab functionality
  const tabs = document.querySelectorAll("[data-tab]")
  const tabContents = document.querySelectorAll(".tab-content")

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs
      tabs.forEach((t) => {
        t.classList.remove("border-primary-600", "text-primary-600")
        t.classList.add("border-transparent", "hover:text-primary-600", "hover:border-primary-300")
        t.setAttribute("aria-selected", "false")
      })

      // Add active class to clicked tab
      tab.classList.add("border-primary-600", "text-primary-600")
      tab.classList.remove("border-transparent", "hover:text-primary-600", "hover:border-primary-300")
      tab.setAttribute("aria-selected", "true")

      // Hide all tab contents
      tabContents.forEach((content) => {
        content.classList.add("hidden")
        content.classList.remove("active")
      })

      // Show the selected tab content with animation
      const tabId = tab.getAttribute("data-tab")
      const activeContent = document.getElementById(`${tabId}-content`)
      activeContent.classList.remove("hidden")
      activeContent.classList.add("active")

      // Add animation to news cards
      const newsCards = activeContent.querySelectorAll(".news-card, .bg-white.rounded-xl")
      newsCards.forEach((card, index) => {
        card.style.opacity = "0"
        card.style.transform = "translateY(20px)"
        setTimeout(() => {
          card.style.transition = "all 0.5s ease-out"
          card.style.opacity = "1"
          card.style.transform = "translateY(0)"
        }, 100 * index)
      })
    })
  })

  // Enhanced smooth animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Aplica las clases de animación de Tailwind
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

        // Add staggered animation for grid items
        if (entry.target.classList.contains("grid")) {
          const children = entry.target.children
          Array.from(children).forEach((child, index) => {
            setTimeout(() => {
              child.classList.remove("opacity-0", "translate-y-[30px]", "translate-y-[40px]", "-translate-x-[30px]")
              child.classList.add("opacity-100", "translate-y-0", "translate-x-0")
            }, index * 150)
          })
        }
      }
    })
  }, observerOptions)

  // Observe all animated elements
  const animatedElements = document.querySelectorAll(
    ".animate-fade-in-smooth, .animate-fade-in-up, .animate-slide-in-left",
  )
  animatedElements.forEach((element) => {
    observer.observe(element)
  })

  // Enhanced hover effects for service cards (without scale)
  const serviceCards = document.querySelectorAll(".group")
  serviceCards.forEach((card) => {
    card.addEventListener("mouseenter", function () {
      // Add subtle glow effect to icon
      const icon = this.querySelector(".w-16.h-16, .w-14.h-14")
      if (icon) {
        icon.style.boxShadow = "0 8px 25px rgba(255, 62, 62, 0.15)"
      }
    })

    card.addEventListener("mouseleave", function () {
      // Remove glow effect
      const icon = this.querySelector(".w-16.h-16, .w-14.h-14")
      if (icon) {
        icon.style.boxShadow = "none"
      }
    })
  })

  // Smooth scroll for anchor links
  const anchorLinks = document.querySelectorAll('a[href^="#"]')
  anchorLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()
      const targetId = this.getAttribute("href").substring(1)
      const targetElement = document.getElementById(targetId)

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }
    })
  })

  // Counter animation for stats
  const animateCounter = (counter) => {
    const target = Number.parseInt(counter.textContent.replace(/\D/g, ""))
    const increment = target / 60
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= target) {
        counter.textContent = counter.textContent.replace(/\d+/, target)
        clearInterval(timer)
      } else {
        counter.textContent = counter.textContent.replace(/\d+/, Math.floor(current))
      }
    }, 30)
  }

  // Trigger counter animation when stats section is visible
  const statsObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const counters = entry.target.querySelectorAll(".text-2xl.font-bold")
          counters.forEach((counter, index) => {
            setTimeout(() => {
              animateCounter(counter)
            }, index * 200)
          })
          statsObserver.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.5 },
  )

  const statsSection = document.querySelector(".grid.grid-cols-1.md\\:grid-cols-4")
  if (statsSection) {
    statsObserver.observe(statsSection)
  }

  // Parallax effect for floating elements
  window.addEventListener("scroll", () => {
    const scrolled = window.pageYOffset
    const parallaxElements = document.querySelectorAll(".animate-float")

    parallaxElements.forEach((element, index) => {
      const speed = 0.3 + index * 0.1
      const yPos = -(scrolled * speed)
      element.style.transform = `translateY(${yPos}px)`
    })
  })

  // Enhanced button interactions (without scale)
  const buttons = document.querySelectorAll('a[href="/asesorias"], a[href="/formularios"]')
  buttons.forEach((button) => {
    button.addEventListener("click", function (e) {
      // Create ripple effect
      const ripple = document.createElement("span")
      const rect = this.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      ripple.style.width = ripple.style.height = size + "px"
      ripple.style.left = x + "px"
      ripple.style.top = y + "px"
      // Apply Tailwind classes for ripple effect
      ripple.classList.add(
        "absolute",
        "rounded-full",
        "bg-white/30",
        "transform",
        "scale-0",
        "animate-ripple-animation",
        "pointer-events-none",
      )

      this.appendChild(ripple)

      setTimeout(() => {
        ripple.remove()
      }, 600)
    })
  })

  // Add loading states for buttons
  const actionButtons = document.querySelectorAll('a[href="/asesorias"], a[href="/formularios"]')
  actionButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const originalContent = this.innerHTML
      this.innerHTML = `
                  <div class="flex items-center justify-center">
                      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cargando...
                  </div>
              `

      // Restore original content after a delay
      setTimeout(() => {
        this.innerHTML = originalContent
      }, 3000)
    })
  })

  // Notification functionality (if notification element exists)
  const notificationIcon = document.querySelector("[data-notification]")
  if (notificationIcon) {
    notificationIcon.addEventListener("click", () => {
      console.log("Notification clicked")
    })
  }

  // Form validation enhancement
  const forms = document.querySelectorAll("form")
  forms.forEach((form) => {
    form.addEventListener("submit", (e) => {
      const requiredFields = form.querySelectorAll("[required]")
      let isValid = true

      requiredFields.forEach((field) => {
        if (!field.value.trim()) {
          isValid = false
          field.classList.add("border-red-500")
          field.classList.remove("border-gray-200")
        } else {
          field.classList.remove("border-red-500")
          field.classList.add("border-gray-200")
        }
      })

      if (!isValid) {
        e.preventDefault()
        console.log("Form validation failed")
      }
    })
  })

  // Testimonials Carousel
  const carousel = document.querySelector("[data-carousel]")
  if (carousel) {
    const track = carousel.querySelector("[data-carousel-track]")
    const items = Array.from(carousel.querySelectorAll("[data-carousel-item]"))
    const totalOriginalItems = items.length / 2 // Asume que los elementos están duplicados en HTML para un bucle continuo
    let currentIndex = 0
    let intervalId

    const updateCarousel = (smoothTransition = true) => {
      // Calcula el ancho de un solo elemento, incluyendo su padding/margin dentro del contenedor flex
      // Esto es crucial para el cálculo correcto del desplazamiento
      const itemWidth =
        items[0].offsetWidth +
        (Number.parseFloat(getComputedStyle(items[0]).marginLeft) || 0) +
        (Number.parseFloat(getComputedStyle(items[0]).marginRight) || 0)
      const transformValue = -currentIndex * itemWidth

      track.style.transition = smoothTransition ? "transform 0.8s ease-in-out" : "none"
      track.style.transform = `translateX(${transformValue}px)`
    }

    const startCarousel = () => {
      intervalId = setInterval(() => {
        currentIndex++
        // Si hemos pasado el conjunto original de elementos (es decir, estamos mostrando un elemento duplicado)
        if (currentIndex >= totalOriginalItems) {
          // Salta instantáneamente al principio del conjunto original
          currentIndex = 0
          updateCarousel(false) // Salta sin transición
          // Después del salto instantáneo, inicia inmediatamente la transición suave al siguiente elemento
          // Esto crea el efecto de bucle continuo
          setTimeout(() => {
            currentIndex = 1 // Mueve al segundo elemento (el primero del conjunto original)
            updateCarousel(true)
          }, 50) // Pequeño retraso para permitir que se aplique la transición 'none'
        } else {
          updateCarousel(true) // Transición suave para el movimiento normal
        }
      }, 4000) // Cambia de slide cada 4 segundos
    }

    const stopCarousel = () => {
      clearInterval(intervalId)
    }

    // Configuración inicial
    updateCarousel()
    startCarousel()

    // Recalcular al redimensionar
    window.addEventListener("resize", () => {
      stopCarousel()
      updateCarousel() // Actualiza la posición según el nuevo tamaño
      startCarousel()
    })

    // Pausar al pasar el ratón (opcional, pero bueno para la UX)
    // Eliminar las líneas que pausan y reanudan el carrusel al pasar el ratón
    // Remove the lines that pause and resume the carousel on mouse hover
  }
})
