// Archivo principal que carga todos los módulos y contiene funcionalidades compartidas
document.addEventListener("DOMContentLoaded", () => {
  // Navegación de pestañas
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");
  const currentSectionIndicator = document.getElementById("current-section-indicator");
  const progressBar = document.getElementById("progress-bar");

  // Mapeo de nombres de secciones y progreso
  const sectionData = {
    "personal-info": { name: "Información Personal", progress: "20%" },
    "security": { name: "Seguridad", progress: "40%" },
    "visa-history": { name: "Historial de Asesorías", progress: "60%" },
    "preferences": { name: "Preferencias", progress: "80%" },
    "account": { name: "Gestión de Cuenta", progress: "100%" }
  };

  // Función para resetear todas las pestañas
  function resetAllTabs() {
    tabButtons.forEach((button) => {
      // Remover clases activas
      button.classList.remove(
        "bg-primary-50",
        "text-primary-700",
        "border-primary-200",
        "shadow-sm",
        "active-tab",
        "scale-105"
      );

      // Añadir clases inactivas
      button.classList.add(
        "text-gray-600",
        "hover:text-gray-900",
        "hover:bg-gray-50",
        "border-transparent",
        "hover:border-gray-200"
      );

      // Resetear icono y indicador
      const iconContainer = button.querySelector("div");
      const icon = button.querySelector("svg");
      const indicator = button.querySelector("div:last-child");

      if (iconContainer) {
        iconContainer.classList.remove("bg-primary-100", "group-hover:bg-primary-200");
        iconContainer.classList.add("bg-gray-100", "group-hover:bg-gray-200");
      }

      if (icon) {
        icon.classList.remove("text-primary-600");
        icon.classList.add("text-gray-500", "group-hover:text-gray-600");
      }

      if (indicator) {
        indicator.classList.remove("bg-primary-500", "opacity-100");
        indicator.classList.add("bg-gray-400", "opacity-0", "group-hover:opacity-100");
      }
    });
  }

  // Función para activar una pestaña específica
  function activateTab(button) {
    resetAllTabs();

    // Remover clases inactivas
    button.classList.remove(
      "text-gray-600",
      "hover:text-gray-900",
      "hover:bg-gray-50",
      "border-transparent",
      "hover:border-gray-200"
    );

    // Añadir clases activas
    button.classList.add(
      "bg-primary-50",
      "text-primary-700",
      "border-primary-200",
      "shadow-sm",
      "active-tab",
      "scale-105"
    );

    // Activar icono y indicador
    const iconContainer = button.querySelector("div");
    const icon = button.querySelector("svg");
    const indicator = button.querySelector("div:last-child");

    if (iconContainer) {
      iconContainer.classList.remove("bg-gray-100", "group-hover:bg-gray-200");
      iconContainer.classList.add("bg-primary-100", "group-hover:bg-primary-200");
    }

    if (icon) {
      icon.classList.remove("text-gray-500", "group-hover:text-gray-600");
      icon.classList.add("text-primary-600");
    }

    if (indicator) {
      indicator.classList.remove("bg-gray-400", "opacity-0", "group-hover:opacity-100");
      indicator.classList.add("bg-primary-500", "opacity-100");
    }
  }

  // Manejar eventos de las pestañas
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("data-tab");

      // Activar la pestaña seleccionada
      activateTab(button);

      // Actualizar indicador de sección y barra de progreso
      if (currentSectionIndicator && sectionData[tabId]) {
        currentSectionIndicator.textContent = sectionData[tabId].name;
      }

      if (progressBar && sectionData[tabId]) {
        progressBar.style.width = sectionData[tabId].progress;
      }

      // Actualizar contenidos con animación de fade
      tabContents.forEach((content) => {
        content.classList.add("hidden");
        content.classList.remove("animate-fade-in");
      });

      const activeContent = document.getElementById(`${tabId}-content`);
      if (activeContent) {
        setTimeout(() => {
          activeContent.classList.remove("hidden");
          // Forzar un reflow para que la animación se ejecute
          void activeContent.offsetWidth;
          activeContent.classList.add("animate-fade-in");
        }, 150);
      }

      // Guardar la pestaña activa en localStorage
      localStorage.setItem("activeTab", tabId);
    });
  });

  // Añadir efectos de hover mejorados a las pestañas
  tabButtons.forEach((button) => {
    button.addEventListener("mouseenter", () => {
      if (!button.classList.contains("active-tab")) {
        button.style.transform = "translateY(-1px)";
        button.classList.add("shadow-sm");
      }
    });

    button.addEventListener("mouseleave", () => {
      if (!button.classList.contains("active-tab")) {
        button.style.transform = "";
        button.classList.remove("shadow-sm");
      }
    });
  });

  // Restaurar la pestaña activa desde localStorage o activar la primera
  const activeTab = localStorage.getItem("activeTab") || "personal-info";
  const activeButton = document.querySelector(`.tab-button[data-tab="${activeTab}"]`);

  if (activeButton) {
    setTimeout(() => {
      activeButton.click();
    }, 300);
  }

  // Función para mostrar alertas (compartida por todos los módulos)
  window.showAlert = (message, type = "success") => {
    // Crear el elemento de notificación
    const notification = document.createElement("div");
    notification.className = `fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 transform transition-all duration-500 translate-x-full`;

    // Aplicar estilos según el tipo
    if (type === "success") {
      notification.classList.add("bg-green-100", "text-green-800", "border-l-4", "border-green-500");
    } else if (type === "error") {
      notification.classList.add("bg-red-100", "text-red-800", "border-l-4", "border-red-500");
    } else if (type === "warning") {
      notification.classList.add("bg-yellow-100", "text-yellow-800", "border-l-4", "border-yellow-500");
    } else {
      notification.classList.add("bg-blue-100", "text-blue-800", "border-l-4", "border-blue-500");
    }

    // Agregar el mensaje
    notification.innerHTML = `
      <div class="flex items-center">
          <div class="flex-shrink-0">
              ${
                type === "success"
                  ? '<svg class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
                  : type === "error"
                    ? '<svg class="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
                    : type === "warning"
                      ? '<svg class="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>'
                      : '<svg class="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
              }
          </div>
          <div class="ml-3">
              <p class="text-sm">${message}</p>
          </div>
          <div class="ml-auto pl-3">
              <button class="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none cursor-pointer">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
          </div>
      </div>
  `;

    // Agregar al DOM
    document.body.appendChild(notification);

    // Animar la entrada
    setTimeout(() => {
      notification.classList.remove("translate-x-full");
      notification.classList.add("translate-x-0");
    }, 100);

    // Configurar la eliminación automática
    setTimeout(() => {
      notification.classList.remove("translate-x-0");
      notification.classList.add("translate-x-full");

      // Eliminar del DOM después de la animación
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 5000);

    // Agregar evento para cerrar manualmente
    notification.querySelector("button").addEventListener("click", () => {
      notification.classList.remove("translate-x-0");
      notification.classList.add("translate-x-full");

      // Eliminar del DOM después de la animación
      setTimeout(() => {
        notification.remove();
      }, 500);
    });
  };

  // Cargar los módulos específicos
  // Estos scripts se cargarán automáticamente si están incluidos en el HTML
});