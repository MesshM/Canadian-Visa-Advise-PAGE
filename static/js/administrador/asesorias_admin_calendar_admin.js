document.addEventListener("DOMContentLoaded", function () {
  // CREAR
  const asesorInput = document.getElementById("asesor_asignado_admin");
  const calendarContainer = document.getElementById("calendar-container-admin");
  const timeContainer = document.getElementById("time-container-admin");
  const fechaInput = document.getElementById("fecha_asesoria_admin");

  // EDITAR
  const calendarContainerEdit = document.getElementById("calendar-container-admin-edit");
  const timeContainerEdit = document.getElementById("time-container-admin-edit");
  const fechaInputEdit = document.getElementById("fecha_asesoria_admin_edit");

  // ========== CREAR ==========
  if (asesorInput && calendarContainer && timeContainer && fechaInput) {
    asesorInput.addEventListener("blur", function () {
      const asesorNombre = asesorInput.value.trim();
      if (asesorNombre) {
        renderCalendar(calendarContainer, timeContainer, fechaInput, asesorNombre);
      } else {
        calendarContainer.innerHTML = "";
        timeContainer.innerHTML = "";
        fechaInput.value = "";
      }
    });
  }

  // ========== EDITAR ==========
  window.initEditarAsesoriaCalendar = function (asesorAsignado, fechaInicial) {
    if (!calendarContainerEdit || !timeContainerEdit || !fechaInputEdit) return;
    renderCalendar(calendarContainerEdit, timeContainerEdit, fechaInputEdit, asesorAsignado, fechaInicial, true);

    // Cuando el usuario selecciona una fecha y hora:
    function onHoraSeleccionada(fecha, hora) {
      // Actualiza el input oculto del formulario, pero NO guardes automáticamente
      if (fechaInputEdit) {
        // fecha: 'YYYY-MM-DD', hora: 'HH:mm'
        fechaInputEdit.value = `${fecha}T${hora}`;
        // Dispara un evento input/change para que el otro JS detecte el cambio y habilite el botón
        fechaInputEdit.dispatchEvent(new Event("input", { bubbles: true }));
        fechaInputEdit.dispatchEvent(new Event("change", { bubbles: true }));
      }
      // NO LLAMES a ningún fetch ni POST aquí.
    }

    // Modifica la lógica para que al seleccionar una hora, llame a onHoraSeleccionada(fecha, hora)
    // Ejemplo:
    // horaBtn.addEventListener('click', () => onHoraSeleccionada(fechaSeleccionada, horaSeleccionada));
  };

  // ========== FUNCION PRINCIPAL ==========
  function renderCalendar(calendarDiv, timeDiv, fechaHiddenInput, asesorNombre, fechaPreseleccionada = null, compacto = false) {
    calendarDiv.innerHTML = "";
    timeDiv.innerHTML = '<p class="text-gray-500 text-center">Seleccione una fecha para ver los horarios disponibles</p>';
    fechaHiddenInput.value = "";

    // Mes y año a mostrar
    const today = new Date();
    let displayMonth = today.getMonth();
    let displayYear = today.getFullYear();

    // Encabezado
    const calendarHeader = document.createElement("div");
    calendarHeader.className = compacto
      ? "flex justify-between items-center mb-1 bg-primary-50 p-2 rounded-lg"
      : "flex justify-between items-center mb-2 bg-primary-50 p-3 rounded-xl";
    calendarHeader.innerHTML = `
      <button id="prev-month-admin" class="p-1 rounded-full hover:bg-primary-100 text-primary-600">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
      </button>
      <h3 id="calendar-month-admin" class="text-sm font-medium text-primary-800"></h3>
      <button id="next-month-admin" class="p-1 rounded-full hover:bg-primary-100 text-primary-600">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </button>
    `;
    calendarDiv.appendChild(calendarHeader);

    // Grid
    const calendarGrid = document.createElement("div");
    calendarGrid.className = compacto ? "grid grid-cols-7 gap-1" : "grid grid-cols-7 gap-2";
    const daysOfWeek = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    daysOfWeek.forEach((day, idx) => {
      const dayEl = document.createElement("div");
      dayEl.className = idx < 5
        ? "text-center font-medium text-primary-700 py-1 border-b border-primary-200 mx-0.5"
        : "text-center font-medium text-gray-400 py-1 border-b border-gray-200 mx-0.5";
      dayEl.textContent = day;
      calendarGrid.appendChild(dayEl);
    });
    for (let i = 0; i < 42; i++) {
      const dayEl = document.createElement("div");
      dayEl.className = compacto
        ? "calendar-day text-center py-1 rounded-full"
        : "calendar-day text-center py-2 rounded-full";
      dayEl.setAttribute("data-day", "");
      calendarGrid.appendChild(dayEl);
    }
    calendarDiv.appendChild(calendarGrid);

    // Botones
    const prevBtn = calendarHeader.querySelector("#prev-month-admin");
    const nextBtn = calendarHeader.querySelector("#next-month-admin");
    const monthLabel = calendarHeader.querySelector("#calendar-month-admin");

    function updateCalendar() {
      const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
      ];
      monthLabel.textContent = `${monthNames[displayMonth]} ${displayYear}`;
      const firstDay = new Date(displayYear, displayMonth, 1);
      let firstDayIdx = firstDay.getDay() - 1;
      if (firstDayIdx < 0) firstDayIdx = 6;
      const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
      const dayEls = calendarGrid.querySelectorAll(".calendar-day");
      dayEls.forEach((el) => {
        el.textContent = "";
        el.className = compacto
          ? "calendar-day text-center py-1 rounded-full"
          : "calendar-day text-center py-2 rounded-full";
        el.removeAttribute("data-date");
        el.onclick = null;
      });
      for (let i = 1; i <= daysInMonth; i++) {
        const idx = firstDayIdx + i - 1;
        if (idx >= dayEls.length) break;
        const el = dayEls[idx];
        const date = new Date(displayYear, displayMonth, i);
        const dateStr = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
        el.textContent = i;
        el.setAttribute("data-date", dateStr);
        const isToday = date.toDateString() === (new Date()).toDateString();
        const isPast = date < new Date().setHours(0, 0, 0, 0);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (isToday) {
          el.className = compacto
            ? "calendar-day text-center py-1 rounded-full bg-primary-600 text-white font-bold transform scale-105 shadow-md text-sm relative z-10 hover:bg-primary-700 transition-all duration-300"
            : "calendar-day text-center py-2 rounded-full bg-primary-600 text-white font-bold transform scale-105 shadow-md text-base relative z-10 hover:bg-primary-700 transition-all duration-300";
          if (!isWeekend && !isPast) {
            el.className += " cursor-pointer";
            el.onclick = () => selectDate(dateStr, el, timeDiv, fechaHiddenInput, asesorNombre, fechaPreseleccionada);
          }
        } else if (isPast || isWeekend) {
          el.className = compacto
            ? "calendar-day text-center py-1 rounded-full text-gray-400 cursor-default text-sm bg-gray-50"
            : "calendar-day text-center py-2 rounded-full text-gray-400 cursor-default text-base bg-gray-50";
        } else {
          el.className = compacto
            ? "calendar-day text-center py-1 rounded-full cursor-pointer hover:bg-primary-50 transition-all duration-300 text-sm hover:shadow-sm"
            : "calendar-day text-center py-2 rounded-full cursor-pointer hover:bg-primary-50 transition-all duration-300 text-base hover:shadow-sm";
          el.onclick = () => selectDate(dateStr, el, timeDiv, fechaHiddenInput, asesorNombre, fechaPreseleccionada);
        }
        // Preseleccionar la fecha si corresponde
        if (fechaPreseleccionada && dateStr === fechaPreseleccionada.slice(0, 10)) {
          el.classList.add("selected", "bg-primary-100", "text-primary-800", "ring-2", "ring-primary-500", "ring-offset-1");
          setTimeout(() => selectDate(dateStr, el, timeDiv, fechaHiddenInput, asesorNombre, fechaPreseleccionada), 100);
        }
      }
    }

    prevBtn.onclick = () => {
      displayMonth--;
      if (displayMonth < 0) {
        displayMonth = 11;
        displayYear--;
      }
      updateCalendar();
    };
    nextBtn.onclick = () => {
      displayMonth++;
      if (displayMonth > 11) {
        displayMonth = 0;
        displayYear++;
      }
      updateCalendar();
    };

    updateCalendar();
  }

  function selectDate(dateStr, el, timeDiv, fechaHiddenInput, asesorNombre, fechaPreseleccionada) {
    document.querySelectorAll(".calendar-day.selected").forEach((d) => {
      d.classList.remove("selected", "bg-primary-100", "text-primary-800", "ring-2", "ring-primary-500", "ring-offset-1");
    });
    el.classList.add("selected", "bg-primary-100", "text-primary-800", "ring-2", "ring-primary-500", "ring-offset-1");
    loadAvailableTimes(dateStr, timeDiv, fechaHiddenInput, asesorNombre, fechaPreseleccionada);
  }

  function loadAvailableTimes(dateStr, timeDiv, fechaHiddenInput, asesorNombre, fechaPreseleccionada) {
    timeDiv.innerHTML = `
      <div class="flex flex-col justify-center items-center h-24 space-y-3">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-primary-600"></div>
        <p class="text-primary-600 text-sm animate-pulse">Cargando horarios disponibles...</p>
      </div>
    `;
    fetch(`/admin/asesores/buscar-id?nombre=${encodeURIComponent(asesorNombre)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.id_asesor) {
          timeDiv.innerHTML = `<div class="text-red-600 text-center">No se encontró el asesor</div>`;
          return;
        }
        const id_asesor = data.id_asesor;
        // Solo pedir horarios del día seleccionado
        fetch(`/admin/asesores/${id_asesor}/horarios-disponibles?fecha=${encodeURIComponent(dateStr)}`)
          .then((r) => r.json())
          .then((data) => {
            if (!data.success || !data.horarios) {
              timeDiv.innerHTML = `<div class="text-gray-500 text-center">No hay horarios disponibles para esta fecha</div>`;
              return;
            }
            const horarios = data.horarios;
            if (!horarios.length) {
              timeDiv.innerHTML = `<div class="text-gray-500 text-center">No hay horarios disponibles para esta fecha</div>`;
              return;
            }
            const timeList = document.createElement("div");
            timeList.className = "flex flex-col space-y-2 mt-2";
            // Previsualizador
            const previewDiv = document.createElement("div");
            previewDiv.id = "preview-fecha-hora";
            previewDiv.className = "my-4";
            timeDiv.innerHTML = "";
            timeDiv.appendChild(timeList);
            timeDiv.appendChild(previewDiv);

            horarios.forEach((hora, idx) => {
              // Asegúrate de que el botón NO es de tipo submit
              const btn = document.createElement("button");
              btn.type = "button";
              btn.className = idx % 2 === 0
                ? "time-slot py-3 px-4 rounded-xl border border-gray-200 hover:bg-primary-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base w-full text-left flex items-center"
                : "time-slot py-3 px-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-primary-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base w-full text-left flex items-center";
              btn.innerHTML = `
                <svg class="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>${hora}</span>
              `;
              btn.onclick = (e) => {
                // Solo marcar el botón y actualizar el input, NO cerrar modal ni hacer submit
                e.preventDefault();
                document.querySelectorAll(".time-slot.selected").forEach((b) => {
                  b.classList.remove("selected", "bg-primary-100", "text-primary-800", "border-primary-500", "shadow-md", "scale-105");
                });
                btn.classList.add("selected", "bg-primary-100", "text-primary-800", "border-primary-500", "shadow-md", "scale-105");
                fechaHiddenInput.value = `${dateStr}T${hora}`;
                // Dispara eventos para que el botón de guardar cambios se habilite
                fechaHiddenInput.dispatchEvent(new Event("input", { bubbles: true }));
                fechaHiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
                // Llama explícitamente a la función de detección de cambios si existe
                if (window.setupDetectarCambiosEditarAsesoria) {
                  window.setupDetectarCambiosEditarAsesoria();
                }
                // Mostrar previsualizador
                showPreviewFechaHora(dateStr, hora, previewDiv, asesorNombre);
              };
              // Preseleccionar la hora si corresponde
              if (fechaPreseleccionada && `${dateStr}T${hora}` === fechaPreseleccionada.slice(0, 16)) {
                setTimeout(() => {
                  btn.classList.add("selected", "bg-primary-100", "text-primary-800", "border-primary-500", "shadow-md", "scale-105");
                  fechaHiddenInput.value = `${dateStr}T${hora}`;
                  showPreviewFechaHora(dateStr, hora, previewDiv, asesorNombre);
                }, 100);
              }
              timeList.appendChild(btn);
            });
          });
      });
  }

  // Previsualizador de fecha y hora seleccionada
  function showPreviewFechaHora(dateStr, hora, previewDiv, asesorNombre) {
    if (!previewDiv) return;
    // Formatear fecha y hora
    const fechaObj = new Date(`${dateStr}T${hora}`);
    const fechaFormateada = fechaObj.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long"
    });
    const horaFormateada = fechaObj.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit"
    });
    previewDiv.innerHTML = `
      <div class="bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-center space-x-4 shadow-sm">
        <div class="flex-shrink-0">
          <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        </div>
        <div>
          <div class="text-primary-800 font-semibold text-base">${fechaFormateada}</div>
          <div class="text-primary-700 text-sm">${horaFormateada} hs</div>
          <div class="text-gray-600 text-xs mt-1">Asesor: <span class="font-medium">${asesorNombre || "Sin asignar"}</span></div>
        </div>
      </div>
    `;
  }
});
