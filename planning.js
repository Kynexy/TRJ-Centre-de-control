const CATEGORY_META = {
    chantier: { label: "Chantier", className: "cat-chantier" },
    visite: { label: "Visite", className: "cat-visite" },
    urgence: { label: "Urgence", className: "cat-urgence" },
    devis: { label: "Devis", className: "cat-devis" },
    suivi: { label: "Suivi", className: "cat-suivi" }
};

const ACTIVE_CATEGORY_KEYS = ["chantier", "visite", "urgence", "devis", "suivi"];

const PLANNING_STATE = {
    currentDate: startOfDay(new Date()),
    currentView: "month",
    appointments: [],
    appointmentsByDate: new Map(),
    databaseReady: false,
    databaseError: null,
    focusBeforePanel: null,
    scrollY: 0
};

document.addEventListener("DOMContentLoaded", initPlanning);

async function initPlanning() {
    bindShellActions();
    renderPlanning();

    try {
        assertPlanningDatabase();
        await window.KynexyPlanningDB.open();
        PLANNING_STATE.databaseReady = true;
        await reloadAppointmentsFromDatabase();
    } catch (error) {
        PLANNING_STATE.databaseError = error;
        console.error("Planning database unavailable", error);
    }

    renderPlanning();
}

function assertPlanningDatabase() {
    if (!window.KynexyPlanningDB) {
        throw new Error("KynexyPlanningDB is not loaded. planning-db.js must be loaded before planning.js.");
    }
}

function bindShellActions() {
    document.getElementById("prevMonth").addEventListener("click", () => changeMonth(-1));
    document.getElementById("nextMonth").addEventListener("click", () => changeMonth(1));
    document.getElementById("closePanel").addEventListener("click", closePanel);
    document.getElementById("viewCycle").addEventListener("click", cycleView);
    document.getElementById("appointmentPanel").addEventListener("click", (event) => {
        if (event.target.id === "appointmentPanel") {
            closePanel();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closePanel();
        }
    });
}

async function reloadAppointmentsFromDatabase() {
    const appointments = await window.KynexyPlanningDB.listAppointments();
    setAppointments(appointments);
}

function setAppointments(appointments) {
    PLANNING_STATE.appointments = appointments.slice().sort(compareAppointments);
    PLANNING_STATE.appointmentsByDate = PLANNING_STATE.appointments.reduce((map, appointment) => {
        if (!map.has(appointment.date)) {
            map.set(appointment.date, []);
        }
        map.get(appointment.date).push(appointment);
        return map;
    }, new Map());

    PLANNING_STATE.appointmentsByDate.forEach((items) => items.sort(compareAppointments));
    publishPlanningContext();
}

function renderPlanning() {
    renderMonthLabel();
    renderViewSwitch();
    renderCalendarView();
}

function renderViewSwitch() {
    document.getElementById("viewCycle").textContent = getViewLabel(PLANNING_STATE.currentView);
}

function renderMonthLabel() {
    document.getElementById("monthLabel").textContent = formatMonth(PLANNING_STATE.currentDate);
}

function renderCalendarView() {
    if (PLANNING_STATE.databaseError) {
        renderDatabaseError();
        return;
    }

    if (PLANNING_STATE.currentView === "week") {
        renderWeekView();
        return;
    }
    if (PLANNING_STATE.currentView === "day") {
        renderDayView();
        return;
    }
    if (PLANNING_STATE.currentView === "agenda") {
        renderAgendaView();
        return;
    }
    renderMonthGrid();
}

function renderDatabaseError() {
    const grid = document.getElementById("monthGrid");
    document.getElementById("weekdayRow").hidden = true;
    grid.className = "month-grid day-view";
    grid.innerHTML = `
        <article class="day-focus">
            <div class="detail-row">
                <span>Base Planning indisponible</span>
                <p>${escapeHtml(PLANNING_STATE.databaseError.message)}</p>
            </div>
        </article>
    `;
}

function renderMonthGrid() {
    const grid = document.getElementById("monthGrid");
    const cells = getCalendarCells(PLANNING_STATE.currentDate);
    grid.className = "month-grid";
    document.getElementById("weekdayRow").hidden = false;

    grid.innerHTML = cells.map((cell) => {
        const appointments = getAppointmentsForDate(cell.isoDate);
        const visible = appointments.slice(0, 3);
        const extra = appointments.length - visible.length;

        return `
            <article class="day-cell ${cell.isCurrentMonth ? "" : "outside"} ${cell.isToday ? "today" : ""} ${cell.isSunday ? "sunday" : ""} ${appointments.length ? "" : "empty-day"}" data-day-date="${cell.isoDate}">
                <button class="day-create" type="button" data-empty-date="${cell.isoDate}" aria-label="Créer un rendez-vous le ${formatDate(cell.isoDate)}"></button>
                <div class="day-head">
                    <span class="day-number">${cell.day}</span>
                    ${appointments.length ? `<span class="day-count">${appointments.length}</span>` : ""}
                </div>
                <div class="appointments">
                    ${visible.map(renderAppointmentStrip).join("")}
                    ${extra > 0 ? `<button class="more-pill" data-day-agenda="${cell.isoDate}" type="button">+${extra}</button>` : ""}
                </div>
            </article>
        `;
    }).join("");

    bindCalendarActions(grid);
}

function renderWeekView() {
    const grid = document.getElementById("monthGrid");
    const cells = getWeekCells(PLANNING_STATE.currentDate);
    grid.className = "month-grid week-view";
    document.getElementById("weekdayRow").hidden = false;

    grid.innerHTML = cells.map((cell) => {
        const appointments = getAppointmentsForDate(cell.isoDate);
        return `
            <article class="day-cell ${cell.isToday ? "today" : ""} ${cell.isSunday ? "sunday" : ""} ${appointments.length ? "" : "empty-day"}" data-day-date="${cell.isoDate}">
                <button class="day-create" type="button" data-empty-date="${cell.isoDate}" aria-label="Créer un rendez-vous le ${formatDate(cell.isoDate)}"></button>
                <div class="day-head">
                    <span class="day-number">${cell.day}</span>
                    ${appointments.length ? `<span class="day-count">${appointments.length}</span>` : ""}
                </div>
                <div class="appointments">
                    ${appointments.map(renderAppointmentStrip).join("") || `<p class="muted small-muted">Touchez pour créer.</p>`}
                </div>
            </article>
        `;
    }).join("");

    bindCalendarActions(grid);
}

function renderDayView() {
    const grid = document.getElementById("monthGrid");
    const isoDate = toIsoDate(PLANNING_STATE.currentDate);
    const appointments = getAppointmentsForDate(isoDate);
    grid.className = "month-grid day-view";
    document.getElementById("weekdayRow").hidden = true;

    grid.innerHTML = `
        <article class="day-focus">
            <div class="day-focus-head">
                <strong>${formatDate(isoDate)}</strong>
                <button class="save-btn compact" data-empty-date="${isoDate}" type="button">Nouveau</button>
            </div>
            <div class="day-list">
                ${appointments.map(renderAgendaAppointment).join("") || `<button class="empty-action" data-empty-date="${isoDate}" type="button">Créer le premier rendez-vous</button>`}
            </div>
        </article>
    `;

    bindCalendarActions(grid);
}

function renderAgendaView() {
    const grid = document.getElementById("monthGrid");
    const appointments = getVisibleMonthAppointments();
    grid.className = "month-grid agenda-view";
    document.getElementById("weekdayRow").hidden = true;

    grid.innerHTML = appointments.map(renderAgendaAppointment).join("") || `<article class="agenda-item"><p class="muted">Aucun rendez-vous ce mois-ci.</p></article>`;
    bindCalendarActions(grid);
}

function renderAppointmentStrip(appointment) {
    const meta = CATEGORY_META[appointment.category] || CATEGORY_META.chantier;
    return `
        <button class="appointment-strip ${meta.className}" data-appointment-id="${escapeAttribute(appointment.id)}" type="button">
            <span class="appointment-client">${escapeHtml(appointment.client)}</span>
            <span class="appointment-time">${escapeHtml(appointment.start)}</span>
        </button>
    `;
}

function renderAgendaAppointment(appointment) {
    const meta = CATEGORY_META[appointment.category] || CATEGORY_META.chantier;
    return `
        <article class="agenda-item ${meta.className}">
            <div class="agenda-time">${escapeHtml(appointment.start)}</div>
            <button data-appointment-id="${escapeAttribute(appointment.id)}" type="button">
                <strong>${escapeHtml(appointment.client)}</strong>
                <p class="muted">${escapeHtml(formatDate(appointment.date))} · ${escapeHtml(appointment.address || "Adresse à préciser")}</p>
            </button>
        </article>
    `;
}

function bindCalendarActions(root) {
    root.querySelectorAll("[data-appointment-id]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            openAppointment(button.dataset.appointmentId);
        });
    });
    root.querySelectorAll("[data-empty-date]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            openCreateAppointment(button.dataset.emptyDate);
        });
    });
    root.querySelectorAll("[data-day-agenda]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            PLANNING_STATE.currentDate = new Date(button.dataset.dayAgenda + "T00:00:00");
            PLANNING_STATE.currentView = "day";
            renderPlanning();
        });
    });
}

async function openAppointment(id) {
    const appointment = await window.KynexyPlanningDB.getAppointment(id);
    if (!appointment) {
        await reloadAppointmentsFromDatabase();
        renderPlanning();
        return;
    }

    const meta = CATEGORY_META[appointment.category] || CATEGORY_META.chantier;
    document.getElementById("panelTitle").textContent = "Rendez-vous";
    document.getElementById("appointmentDetails").innerHTML = `
        <div class="detail-list">
            ${detailRow("Client", appointment.client)}
            ${detailRow("Adresse", appointment.address || "Adresse à préciser")}
            <div class="detail-row call-row">
                <div>
                    <span>Téléphone</span>
                    <strong>${escapeHtml(appointment.phone || "Non renseigné")}</strong>
                </div>
                ${appointment.phone ? `<a class="call-btn" href="tel:${escapeAttribute(appointment.phone.replaceAll(" ", ""))}">Appeler</a>` : ""}
            </div>
            ${detailRow("Date", formatDate(appointment.date))}
            ${detailRow("Horaire", appointment.timeRange)}
            <div class="detail-row">
                <span>Catégorie</span>
                <strong class="category-badge ${meta.className}">${escapeHtml(meta.label)}</strong>
            </div>
            <div class="detail-row">
                <span>Notes</span>
                <p>${escapeHtml(appointment.notes || "Aucune note.")}</p>
            </div>
            <div class="panel-actions">
                <button class="ghost-btn" type="button" data-edit-appointment="${escapeAttribute(appointment.id)}">Modifier</button>
                <button class="danger-btn" type="button" data-delete-appointment="${escapeAttribute(appointment.id)}">Supprimer</button>
            </div>
        </div>
    `;

    openPanel();
    document.querySelector("[data-edit-appointment]").addEventListener("click", () => openEditAppointment(appointment.id));
    document.querySelector("[data-delete-appointment]").addEventListener("click", () => deleteAppointment(appointment.id));
}

function openCreateAppointment(isoDate) {
    document.getElementById("panelTitle").textContent = "Nouveau rendez-vous";
    document.getElementById("appointmentDetails").innerHTML = renderAppointmentForm({ date: isoDate });
    openPanel();
    document.getElementById("appointmentForm").addEventListener("submit", (event) => {
        event.preventDefault();
        saveAppointmentForm(event.currentTarget);
    });
}

async function openEditAppointment(id) {
    const appointment = await window.KynexyPlanningDB.getAppointment(id);
    if (!appointment) {
        return;
    }

    document.getElementById("panelTitle").textContent = "Modifier";
    document.getElementById("appointmentDetails").innerHTML = renderAppointmentForm(appointment);
    document.getElementById("appointmentForm").addEventListener("submit", (event) => {
        event.preventDefault();
        saveAppointmentForm(event.currentTarget, id);
    });
}

function renderAppointmentForm(appointment = {}) {
    return `
        <form class="detail-list" id="appointmentForm">
            ${inputRow("Date", "date", appointment.date || toIsoDate(PLANNING_STATE.currentDate), "date")}
            <div class="time-grid">
                ${inputRow("Début", "start", appointment.start || "08:00", "time")}
                ${inputRow("Fin", "end", appointment.end || "09:00", "time")}
            </div>
            <div class="detail-row">
                <span>Catégorie</span>
                <select name="category">
                    ${ACTIVE_CATEGORY_KEYS.map((key) => {
                        const meta = CATEGORY_META[key];
                        const selected = (appointment.category || "chantier") === key ? "selected" : "";
                        return `<option value="${escapeAttribute(key)}" ${selected}>${escapeHtml(meta.label)}</option>`;
                    }).join("")}
                </select>
            </div>
            ${inputRow("Client", "client", appointment.client || "", "text", "Nom client")}
            ${inputRow("Adresse", "address", appointment.address || "", "text", "Adresse")}
            ${inputRow("Téléphone", "phone", appointment.phone || "", "tel", "+689 ...")}
            <div class="detail-row">
                <span>Notes</span>
                <textarea name="notes" placeholder="Notes utiles sur place">${escapeHtml(appointment.notes || "")}</textarea>
            </div>
            <button class="save-btn" type="submit">Enregistrer</button>
        </form>
    `;
}

async function saveAppointmentForm(form, existingId = null) {
    const data = Object.fromEntries(new FormData(form).entries());
    const payload = {
        client: data.client,
        address: data.address,
        phone: data.phone,
        date: data.date,
        start: data.start,
        end: data.end,
        category: data.category,
        notes: data.notes
    };

    const appointment = existingId
        ? await window.KynexyPlanningDB.updateAppointment(existingId, payload)
        : await window.KynexyPlanningDB.createAppointment(payload);

    await reloadAppointmentsFromDatabase();
    PLANNING_STATE.currentDate = new Date(appointment.date + "T00:00:00");
    closePanel();
    renderPlanning();
}

async function deleteAppointment(id) {
    await window.KynexyPlanningDB.deleteAppointment(id);
    await reloadAppointmentsFromDatabase();
    closePanel();
    renderPlanning();
}

function openPanel() {
    const panel = document.getElementById("appointmentPanel");
    PLANNING_STATE.focusBeforePanel = document.activeElement;
    PLANNING_STATE.scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.top = `-${PLANNING_STATE.scrollY}px`;
    document.body.classList.add("panel-open");
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    setTimeout(() => document.getElementById("closePanel").focus(), 30);
}

function closePanel() {
    const panel = document.getElementById("appointmentPanel");
    if (!panel.classList.contains("open")) {
        return;
    }

    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("panel-open");
    document.body.style.top = "";
    window.scrollTo(0, PLANNING_STATE.scrollY);
    document.getElementById("panelTitle").textContent = "Rendez-vous";
    document.getElementById("appointmentDetails").innerHTML = "";

    if (PLANNING_STATE.focusBeforePanel && typeof PLANNING_STATE.focusBeforePanel.focus === "function") {
        PLANNING_STATE.focusBeforePanel.focus();
    }
}

function inputRow(label, name, value, type = "text", placeholder = "") {
    return `
        <label class="detail-row">
            <span>${escapeHtml(label)}</span>
            <input name="${escapeAttribute(name)}" type="${escapeAttribute(type)}" value="${escapeAttribute(value || "")}" placeholder="${escapeAttribute(placeholder)}">
        </label>
    `;
}

function detailRow(label, value) {
    return `
        <div class="detail-row">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
        </div>
    `;
}

function changeMonth(delta) {
    PLANNING_STATE.currentDate = new Date(
        PLANNING_STATE.currentDate.getFullYear(),
        PLANNING_STATE.currentDate.getMonth() + delta,
        1
    );
    renderPlanning();
}

function changeView(view) {
    PLANNING_STATE.currentView = ["month", "week", "day", "agenda"].includes(view) ? view : "month";
    renderPlanning();
}

function cycleView() {
    const views = ["month", "week", "day", "agenda"];
    const currentIndex = views.indexOf(PLANNING_STATE.currentView);
    changeView(views[(currentIndex + 1) % views.length]);
}

function getViewLabel(view) {
    return { month: "Mois", week: "Semaine", day: "Jour", agenda: "Agenda" }[view] || "Mois";
}

function getCalendarCells(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - startOffset);

    return Array.from({ length: 42 }, (_, index) => {
        const cellDate = new Date(start);
        cellDate.setDate(start.getDate() + index);
        const isoDate = toIsoDate(cellDate);
        return {
            date: cellDate,
            isoDate,
            day: cellDate.getDate(),
            isCurrentMonth: cellDate.getMonth() === month,
            isToday: isoDate === toIsoDate(new Date()),
            isSunday: cellDate.getDay() === 0
        };
    });
}

function getWeekCells(date) {
    const startOffset = (date.getDay() + 6) % 7;
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - startOffset);

    return Array.from({ length: 7 }, (_, index) => {
        const cellDate = new Date(start);
        cellDate.setDate(start.getDate() + index);
        const isoDate = toIsoDate(cellDate);
        return {
            date: cellDate,
            isoDate,
            day: cellDate.getDate(),
            isToday: isoDate === toIsoDate(new Date()),
            isSunday: cellDate.getDay() === 0
        };
    });
}

function getAppointmentsForDate(isoDate) {
    return PLANNING_STATE.appointmentsByDate.get(isoDate) || [];
}

function getVisibleMonthAppointments() {
    const year = PLANNING_STATE.currentDate.getFullYear();
    const month = PLANNING_STATE.currentDate.getMonth();
    return PLANNING_STATE.appointments.filter((appointment) => {
        const date = new Date(appointment.date + "T00:00:00");
        return date.getFullYear() === year && date.getMonth() === month;
    }).sort(compareAppointments);
}

function compareAppointments(a, b) {
    return `${a.date}${a.start}${a.client}`.localeCompare(`${b.date}${b.start}${b.client}`);
}

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatMonth(date) {
    return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function formatDate(value) {
    return new Date(value + "T00:00:00").toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
}

function publishPlanningContext() {
    const today = toIsoDate(new Date());
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = toIsoDate(tomorrowDate);

    window.KynexyPlanningState = {
        database: window.KynexyPlanningDB ? window.KynexyPlanningDB.name : null,
        databaseReady: PLANNING_STATE.databaseReady,
        appointmentsCount: PLANNING_STATE.appointments.length,
        today: getAppointmentsForDate(today),
        tomorrow: getAppointmentsForDate(tomorrow),
        nextAppointments: PLANNING_STATE.appointments.filter((appointment) => appointment.date >= today).slice(0, 8)
    };

    window.AurelState = window.AurelState || {};
    window.AurelState.planning = window.KynexyPlanningState;
}

window.KynexyPlanning = {
    refresh: renderPlanning,
    reload: async () => {
        await reloadAppointmentsFromDatabase();
        renderPlanning();
    },
    getState: () => ({
        currentDate: PLANNING_STATE.currentDate.toISOString(),
        currentView: PLANNING_STATE.currentView,
        databaseReady: PLANNING_STATE.databaseReady,
        appointments: PLANNING_STATE.appointments.slice()
    })
};