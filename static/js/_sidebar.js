document.addEventListener("DOMContentLoaded", () => {
    // Obtener la URL actual
    const currentPath = window.location.pathname
  
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
  
    // Función para actualizar las iniciales en el sidebar cuando cambia el nombre del usuario
    function actualizarInicialesSidebar() {
      const sidebarProfileImg = document.querySelector("aside a[href*='perfil'] img")
      const sidebarProfileDiv = document.querySelector("aside a[href*='perfil'] .flex.items-center.justify-center")
  
      if (!sidebarProfileImg || sidebarProfileImg.classList.contains("hidden")) {
        // No hay imagen de perfil, actualizar las iniciales
        const nombreUsuario = document
          .querySelector(".font-medium.text-gray-900.group-hover\\:text-red-500")
          ?.textContent.trim()
  
        if (nombreUsuario) {
          const nombres = nombreUsuario.split(" ")
          let iniciales = nombres[0][0] // Primera letra del primer nombre
  
          if (nombres.length > 1) {
            iniciales += nombres[nombres.length - 1][0] // Primera letra del último nombre/apellido
          }
  
          // Buscar o crear el div de iniciales
          let inicialesDiv = sidebarProfileDiv.querySelector("div.text-xl.font-bold")
          if (!inicialesDiv) {
            // Si no existe el div de iniciales, eliminar el SVG y crear el div
            const svg = sidebarProfileDiv.querySelector("svg")
            if (svg) svg.remove()
  
            inicialesDiv = document.createElement("div")
            inicialesDiv.className = "text-xl font-bold text-white select-none"
            sidebarProfileDiv.appendChild(inicialesDiv)
          }
  
          // Actualizar el contenido de las iniciales
          inicialesDiv.textContent = iniciales
        }
      }
    }
  
    // Actualizar iniciales en el sidebar
    actualizarInicialesSidebar()
  })
  