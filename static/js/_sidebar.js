document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname

  // Elementos del modal sidebar
  const mobileMenuButton = document.getElementById('mobile-menu-button')
  const closeSidebarButton = document.getElementById('close-sidebar-button')
  const sidebar = document.getElementById('sidebar')
  const modalOverlay = document.getElementById('modal-overlay')
  const hamburgerIcon = document.querySelector('.hamburger-icon')
  const hamburgerLines = document.querySelectorAll('.hamburger-line')

  // Estado del modal
  let isModalOpen = false

  // Función para abrir el modal sidebar con animación Material Design
  function openSidebarModal() {
    if (isModalOpen) return

    isModalOpen = true
    
    // Mostrar overlay con backdrop blur
    modalOverlay.classList.remove('opacity-0', 'invisible')
    modalOverlay.classList.add('opacity-100', 'visible')
    
    // Animar botón hamburguesa usando Tailwind
    hamburgerLines[0].style.transform = 'translateY(7px) rotate(45deg)'
    hamburgerLines[1].style.opacity = '0'
    hamburgerLines[1].style.transform = 'scaleX(0)'
    hamburgerLines[2].style.transform = 'translateY(-7px) rotate(-45deg)'
    
    // Mostrar sidebar con animación slide-in
    setTimeout(() => {
      sidebar.classList.remove('-translate-x-full', 'opacity-0')
      sidebar.classList.add('translate-x-0', 'opacity-100')
    }, 50)
    
    // Prevenir scroll del body
    document.body.style.overflow = 'hidden'
  }

  // Función para cerrar el modal sidebar con animación
  function closeSidebarModal() {
    if (!isModalOpen) return

    isModalOpen = false
    
    // Animar botón hamburguesa de vuelta usando Tailwind
    hamburgerLines[0].style.transform = 'translateY(0) rotate(0deg)'
    hamburgerLines[1].style.opacity = '1'
    hamburgerLines[1].style.transform = 'scaleX(1)'
    hamburgerLines[2].style.transform = 'translateY(0) rotate(0deg)'
    
    // Ocultar sidebar con animación slide-out
    sidebar.classList.remove('translate-x-0', 'opacity-100')
    sidebar.classList.add('-translate-x-full', 'opacity-0')
    
    // Ocultar overlay después de la animación del sidebar
    setTimeout(() => {
      modalOverlay.classList.remove('opacity-100', 'visible')
      modalOverlay.classList.add('opacity-0', 'invisible')
    }, 150)
    
    // Restaurar scroll del body
    document.body.style.overflow = ''
  }

  // Event listeners para el modal
  if (mobileMenuButton) {
    mobileMenuButton.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      openSidebarModal()
    })
  }

  if (closeSidebarButton) {
    closeSidebarButton.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      closeSidebarModal()
    })
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay || e.target.classList.contains('bg-black/50')) {
        closeSidebarModal()
      }
    })
  }

  // Cerrar modal al hacer clic en un enlace de navegación (solo en móviles)
  document.querySelectorAll("nav a").forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 768 && isModalOpen) {
        setTimeout(() => {
          closeSidebarModal()
        }, 200) // Pequeño delay para mejor UX
      }
    })
  })

  // Cerrar modal al cambiar el tamaño de ventana a desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768 && isModalOpen) {
      closeSidebarModal()
    }
  })

  // Manejar tecla Escape para cerrar el modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isModalOpen) {
      closeSidebarModal()
    }
  })

  // Prevenir cierre accidental al hacer clic dentro del sidebar
  sidebar.addEventListener('click', (e) => {
    e.stopPropagation()
  })

  // Marcar el enlace activo basado en la URL actual
  document.querySelectorAll("nav a").forEach((link) => {
    const href = link.getAttribute("href")
    if (href === currentPath || (currentPath === "/" && href === "/")) {
      link.classList.remove("text-gray-500", "border-transparent", "hover:text-primary-600", "hover:translate-x-1")
      link.classList.add("text-primary-600", "border-l-3", "border-primary-600", "font-medium", "bg-primary-50")
    }

    // Agregar event listener para cambiar clases al hacer clic
    link.addEventListener("click", () => {
      document.querySelectorAll("nav a").forEach((l) => {
        l.classList.remove("text-primary-600", "border-l-3", "border-primary-600", "font-medium", "bg-primary-50")
        l.classList.add("text-gray-500", "border-transparent", "hover:text-primary-600", "hover:translate-x-1")
      })
      link.classList.remove("text-gray-500", "border-transparent", "hover:text-primary-600", "hover:translate-x-1")
      link.classList.add("text-primary-600", "border-l-3", "border-primary-600", "font-medium", "bg-primary-50")
    })
  })

  // Función para actualizar el nombre de usuario en el sidebar
  function actualizarNombreUsuarioEnSidebar(nombreCompleto) {
    const nombreUsuarioElement = document.querySelector(".font-medium.text-gray-900.group-hover\\:text-red-500")

    if (nombreUsuarioElement) {
      nombreUsuarioElement.textContent = nombreCompleto
      actualizarInicialesSidebar()
    }
  }
  window.actualizarNombreUsuarioEnSidebar = actualizarNombreUsuarioEnSidebar

  // Función para actualizar la imagen de perfil en el sidebar
  function actualizarImagenPerfilEnSidebar(imageUrl = null) {
    const sidebarProfileContainer = document.querySelector("aside a[href*='perfil'] .flex.items-center.justify-center")
    const sidebarProfileImage = sidebarProfileContainer?.querySelector("img")
    const sidebarProfileInitials = sidebarProfileContainer?.querySelector("div.text-xl.font-bold")

    if (imageUrl && sidebarProfileContainer) {
      if (!sidebarProfileImage) {
        const newImg = document.createElement("img")
        newImg.alt = "Foto de perfil"
        newImg.className = "w-full h-full object-cover rounded-full"
        sidebarProfileContainer.insertBefore(newImg, sidebarProfileInitials)
      }

      const img = sidebarProfileContainer.querySelector("img")
      img.src = imageUrl + "?t=" + new Date().getTime()
      img.classList.remove("hidden")

      if (sidebarProfileInitials) {
        sidebarProfileInitials.classList.add("hidden")
      }
    } else if (sidebarProfileContainer) {
      if (sidebarProfileImage) {
        sidebarProfileImage.classList.add("hidden")
      }

      if (sidebarProfileInitials) {
        sidebarProfileInitials.classList.remove("hidden")
      } else {
        const nombreUsuario = document
          .querySelector(".font-medium.text-gray-900.group-hover\\:text-red-500")
          ?.textContent.trim()

        if (nombreUsuario) {
          const nombres = nombreUsuario.split(" ")
          let iniciales = nombres[0][0]

          if (nombres.length > 1) {
            iniciales += nombres[nombres.length - 1][0]
          }

          const inicialesDiv = document.createElement("div")
          inicialesDiv.className = "text-xl font-bold text-white select-none"
          inicialesDiv.textContent = iniciales
          sidebarProfileContainer.appendChild(inicialesDiv)
        }
      }
    }
  }

  // Función para actualizar las iniciales en el sidebar cuando cambia el nombre del usuario
  function actualizarInicialesSidebar() {
    const sidebarProfileImg = document.querySelector("aside a[href*='perfil'] img")
    const sidebarProfileDiv = document.querySelector("aside a[href*='perfil'] .flex.items-center.justify-center")

    if (sidebarProfileDiv) {
      if (!sidebarProfileImg || sidebarProfileImg.classList.contains("hidden")) {
        const nombreUsuario = document
          .querySelector(".font-medium.text-gray-900.group-hover\\:text-red-500")
          ?.textContent.trim()

        if (nombreUsuario) {
          const nombres = nombreUsuario.split(" ")
          let iniciales = nombres[0][0]

          if (nombres.length > 1) {
            iniciales += nombres[nombres.length - 1][0]
          }

          let inicialesDiv = sidebarProfileDiv.querySelector("div.text-xl.font-bold")
          if (!inicialesDiv) {
            const svg = sidebarProfileDiv.querySelector("svg")
            if (svg) svg.remove()

            inicialesDiv = document.createElement("div")
            inicialesDiv.className = "text-xl font-bold text-white select-none"
            sidebarProfileDiv.appendChild(inicialesDiv)
          }

          inicialesDiv.textContent = iniciales
        }
      }
    }
  }

  // Actualizar iniciales en el sidebar
  actualizarInicialesSidebar()

  // Exponer las funciones globalmente para que puedan ser llamadas desde otros scripts
  window.actualizarInicialesSidebar = actualizarInicialesSidebar
  window.actualizarImagenPerfilEnSidebar = actualizarImagenPerfilEnSidebar
})