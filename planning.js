const CATEGORY_META = {
    chantier: { label: "Chantier", className: "cat-chantier" },
    visite: { label: "Visite", className: "cat-visite" },
    urgence: { label: "Urgence", className: "cat-urgence" },
    devis: { label: "Devis", className: "cat-devis" },
    suivi: { label: "Suivi", className: "cat-suivi" }
};

const PLANNING_STATE = {
    currentDate: new Date(2026, 5, 30),
    appointments: getDemoAppointments()
};

document.addEventListener("DOMContentLoaded", initPlanning);

function initPlanning() {

    document.getElementById("prevMonth").addEventListener("click", () => changeMonth(-1));
    document.getElementById("nextMonth").addEventListener("click", () => changeMonth(1));
    document.getElementById("todayButton").addEventListener("click", goToToday);
    document.getElementById("closePanel").addEventListener("click", closePanel);
    document.getElementById("appointmentPanel").addEventListener("click", (event) => {
        if (event.target.id === "appointmentPanel") {
            closePanel();
        }
    });

    renderPlanning();

}

function getDemoAppointments() {

    return [
        {
            id: "rdv-001",
            client: "Famille M.",
            address: "PK 21 côté mer, Paea",
            phone: "+689 87 00 00 01",
            date: "2026-06-02",
            timeRange: "07:30 - 10:30",
            category: "chantier",
            notes: "Nettoyage toiture. Accès par portail blanc, photos avant/après."
        },
        {
            id: "rdv-002",
            client: "SCI Vai",
            address: "Servitude Aute, Punaauia",
            phone: "+689 87 00 00 02",
            date: "2026-06-02",
            timeRange: "11:00 - 12:30",
            category: "visite",
            notes: "Contrôle fuite avant devis final."
        },
        {
            id: "rdv-003",
            client: "Mairie annexe",
            address: "Rue du marché, Papeete",
            phone: "+689 87 00 00 03",
            date: "2026-06-02",
            timeRange: "14:15 - 16:00",
            category: "suivi",
            notes: "Photos de fin d’intervention et validation du responsable."
        },
        {
            id: "rdv-004",
            client: "Hôtel T.",
            address: "Route de ceinture, Mahina",
            phone: "+689 87 00 00 04",
            date: "2026-06-05",
            timeRange: "08:00 - 12:00",
            category: "devis",
            notes: "Relevé terrasse et estimation matériaux."
        },
        {
            id: "rdv-005",
            client: "Résidence Vai",
            address: "Lotissement hauteur, Faaa",
            phone: "+689 87 00 00 05",
            date: "2026-06-09",
            timeRange: "09:30 - 11:00",
            category: "chantier",
            notes: "Contrôle final et retouches jardin."
        },
        {
            id: "rdv-006",
            client: "Famille Teva",
            address: "Quartier Matatia, Punaauia",
            phone: "+689 87 00 00 06",
            date: "2026-06-09",
            timeRange: "13:00 - 15:30",
            category: "urgence",
            notes: "Intervention rapide après infiltration signalée."
        },
        {
            id: "rdv-007",
            client: "Cabinet Aro",
            address: "Centre-ville, Papeete",
            phone: "+689 87 00 00 07",
            date: "2026-06-12",
            timeRange: "10:00 - 11:30",
            category: "visite",
            notes: "Visite technique pour rénovation entrée."
        },
        {
            id: "rdv-008",
            client: "Villa Moana",
            address: "PK 18, Paea",
            phone: "+689 87 00 00 08",
            date: "2026-06-17",
            timeRange: "07:45 - 10:45",
            category: "chantier",
            notes: "Entretien complet, prévoir coupe-bordure."
        },
        {
            id: "rdv-009",
            client: "Commerce Tiare",
            address: "Avenue Prince Hinoi, Papeete",
            phone: "+689 87 00 00 09",
            date: "2026-06-17",
            timeRange: "12:00 - 13:00",
            category: "devis",
            notes: "Chiffrage reprise façade."
        },
        {
            id: "rdv-010",
            client: "SCI Vai",
            address: "Servitude Aute, Punaauia",
            phone: "+689 87 00 00 02",
            date: "2026-06-21",
            timeRange: "08:30 - 09:30",
            category: "suivi",
            notes: "Retour client et contrôle de la réparation."
        },
        {
            id: "rdv-011",
            client: "Famille M.",
            address: "PK 21 côté mer, Paea",
            phone: "+689 87 00 00 01",
            date: "2026-06-30",
            timeRange: "07:15 - 10:45",
            category: "chantier",
            notes: "Rendez-vous principal du matin. Confirmer l’accès la veille."
        },
        {
            id: "rdv-012",
            client: "Mairie annexe",
            address: "Rue du marché, Papeete",
            phone: "+689 87 00 00 03",
            date: "2026-06-30",
            timeRange: "14:20 - 16:20",
            category: "urgence",
            notes: "Prévoir marge à cause de la circulation."
        },
        {
            id: "rdv-013",
            client: "Hôtel T.",
            address: "Route de ceinture, Mahina",
            phone: "+689 87 00 00 04",
            date: "2026-07-01",
            timeRange: "08:00 - 14:00",
            category: "chantier",
            notes: "Première journée terrasse."
        }
    ];

}

function renderPlanning() {

    renderMonthLabel();
    renderLegend();
    renderSummary();
    renderMonthGrid();

}

function renderMonthLabel() {

    document.getElementById("monthLabel").textContent = formatMonth(PLANNING_STATE.currentDate);

}

function renderLegend() {

    document.getElementById("categoryLegend").innerHTML = Object.entries(CATEGORY_META).map(([key, meta]) => `
        <span class="legend-item ${meta.className}">
            <span class="legend-dot"></span>
            ${escapeHtml(meta.label)}
        </span>
    `).join("");

}

function renderSummary() {

    const monthAppointments = getVisibleMonthAppointments();
    const busyDays = new Set(monthAppointments.map((appointment) => appointment.date)).size;
    const urgent = monthAppointments.filter((appointment) => appointment.category === "urgence").length;

    document.getElementById("monthSummary").innerHTML = [
        { label: "Rendez-vous", value: monthAppointments.length },
        { label: "Jours occupés", value: busyDays },
        { label: "Urgences", value: urgent }
    ].map((item) => `
        <article class="summary-item">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `).join("");

}

function renderMonthGrid() {

    const grid = document.getElementById("monthGrid");
    const cells = getCalendarCells(PLANNING_STATE.currentDate);

    grid.innerHTML = cells.map((cell) => {
        const appointments = getAppointmentsForDate(cell.isoDate);
        const visible = appointments.slice(0, 4);
        const extra = appointments.length - visible.length;

        return `
            <article class="day-cell ${cell.isCurrentMonth ? "" : "outside"} ${cell.isToday ? "today" : ""}">
                <div class="day-head">
                    <span class="day-number">${cell.day}</span>
                    ${appointments.length ? `<span class="day-count">${appointments.length} rdv</span>` : ""}
                </div>
                <div class="appointments">
                    ${visible.map(renderAppointmentStrip).join("")}
                    ${extra > 0 ? `<button class="more-pill" type="button">+ ${extra} autre${extra > 1 ? "s" : ""}</button>` : ""}
                </div>
            </article>
        `;
    }).join("");

    grid.querySelectorAll("[data-appointment-id]").forEach((button) => {
        button.addEventListener("click", () => openAppointment(button.dataset.appointmentId));
    });

}

function renderAppointmentStrip(appointment) {

    const meta = CATEGORY_META[appointment.category];
    return `
        <button class="appointment-strip ${meta.className}" data-appointment-id="${escapeAttribute(appointment.id)}" type="button">
            <span class="appointment-client">${escapeHtml(appointment.client)}</span>
            <span class="appointment-time">${escapeHtml(appointment.timeRange.split(" - ")[0])}</span>
        </button>
    `;

}

function openAppointment(id) {

    const appointment = PLANNING_STATE.appointments.find((item) => item.id === id);
    if (!appointment) {
        return;
    }

    const meta = CATEGORY_META[appointment.category];
    document.getElementById("appointmentDetails").innerHTML = `
        <div class="detail-list">
            ${detailRow("Client", appointment.client)}
            ${detailRow("Adresse", appointment.address)}
            <div class="detail-row call-row">
                <div>
                    <span>Téléphone</span>
                    <strong>${escapeHtml(appointment.phone)}</strong>
                </div>
                <a class="call-btn" href="tel:${escapeAttribute(appointment.phone.replaceAll(" ", ""))}">Appeler</a>
            </div>
            ${detailRow("Date", formatDate(appointment.date))}
            ${detailRow("Tranche horaire", appointment.timeRange)}
            <div class="detail-row">
                <span>Catégorie</span>
                <strong class="category-badge ${meta.className}">${escapeHtml(meta.label)}</strong>
            </div>
            <div class="detail-row">
                <span>Notes</span>
                <p>${escapeHtml(appointment.notes)}</p>
            </div>
        </div>
    `;

    const panel = document.getElementById("appointmentPanel");
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");

}

function closePanel() {

    const panel = document.getElementById("appointmentPanel");
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");

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

function goToToday() {

    PLANNING_STATE.currentDate = new Date(2026, 5, 30);
    renderPlanning();

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
            isToday: isoDate === "2026-06-30"
        };
    });

}

function getAppointmentsForDate(isoDate) {

    return PLANNING_STATE.appointments
        .filter((appointment) => appointment.date === isoDate)
        .sort((a, b) => a.timeRange.localeCompare(b.timeRange));

}

function getVisibleMonthAppointments() {

    const year = PLANNING_STATE.currentDate.getFullYear();
    const month = PLANNING_STATE.currentDate.getMonth();
    return PLANNING_STATE.appointments.filter((appointment) => {
        const date = new Date(appointment.date + "T00:00:00");
        return date.getFullYear() === year && date.getMonth() === month;
    });

}

function toIsoDate(date) {

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;

}

function formatMonth(date) {

    return date.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric"
    });

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

window.KynexyPlanning = {
    refresh: renderPlanning,
    getState: () => ({
        currentDate: PLANNING_STATE.currentDate.toISOString(),
        appointments: PLANNING_STATE.appointments.slice()
    })
};
