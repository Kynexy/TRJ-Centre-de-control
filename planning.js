const CATEGORY_META = {
    chantier: { label: "Chantier", className: "cat-chantier" },
    visite: { label: "Visite", className: "cat-visite" },
    urgence: { label: "Urgence", className: "cat-urgence" },
    devis: { label: "Devis", className: "cat-devis" },
    suivi: { label: "Suivi", className: "cat-suivi" }
};

const ACTIVE_CATEGORY_KEYS = ["chantier", "visite", "urgence", "devis", "suivi"];
const DB_NAME = "kynexy-planning";
const DB_VERSION = 1;
const STORE_APPOINTMENTS = "appointments";
const STORE_META = "meta";
const LEGACY_SEED_KEY = "legacy-demo-skipped-v1";

const PLANNING_STATE = {
    currentDate: startOfDay(new Date()),
    currentView: "month",
    appointments: [],
    appointmentsByDate: new Map(),
    db: null,
    storageMode: "indexeddb",
    focusBeforePanel: null,
    scrollY: 0
};

const DEMO_APPOINTMENTS = [
    {
        id: "rdv-demo-001",
        client: "Famille M.",
        address: "PK 21 cote mer, Paea",
        phone: "+689 87 00 00 01",
        date: "2026-07-02",
        timeRange: "07:30 - 10:30",
        category: "chantier",
        notes: "Exemple local. Modifie ou remplace ce rendez-vous pour commencer ton vrai planning."
    }
];

const STORAGE_FALLBACK = {
    key: "kynexy-planning-appointments-v1",
    async getAllAppointments() {
        const raw = localStorage.getItem(this.key);
        return raw ? JSON.parse(raw) : [];
    },
    async saveAppointment(appointment) {
        const appointments = await this.getAllAppointments();
        const next = appointments.filter((item) => item.id !== appointment.id);
        next.push(appointment);
        localStorage.setItem(this.key, JSON.stringify(next));
    },
    async deleteAppointment(id) {
        const appointments = await this.getAllAppointments();
        localStorage.setItem(this.key, JSON.stringify(appointments.filter((item) => item.id !== id)));
    },
    async getMeta(key) {
        return localStorage.getItem(`kynexy-planning-meta-${key}`);
    },
    async setMeta(key, value) {
        localStorage.setItem(`kynexy-planning-meta-${key}`, value);
    }
};

let PlanningStore = STORAGE_FALLBACK;

document.addEventListener("DOMContentLoaded", initPlanning);

async function initPlanning() {
    bindShellActions();
    renderPlanning();

    await initStorage();
    await loadAppointments();
    renderPlanning();
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

async function initStorage() {
    if (!window.indexedDB) {
        PLANNING_STATE.storageMode = "localStorage";
        PlanningStore = STORAGE_FALLBACK;
        return;
    }

    try {
        const db = await openPlanningDatabase();
        PLANNING_STATE.db = db;
        PlanningStore = createIndexedDbStore(db);
        PLANNING_STATE.storageMode = "indexeddb";
    } catch (error) {
        console.warn("IndexedDB indisponible, fallback localStorage", error);
        PLANNING_STATE.storageMode = "localStorage";
        PlanningStore = STORAGE_FALLBACK;
    }
}

function openPlanningDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        const timeout = setTimeout(() => reject(new Error("IndexedDB init timeout")), 1200);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_APPOINTMENTS)) {
                const store = db.createObjectStore(STORE_APPOINTMENTS, { keyPath: "id" });
                store.createIndex("date", "date", { unique: false });
                store.createIndex("dateTime", ["date", "timeStart"], { unique: false });
                store.createIndex("category", "category", { unique: false });
            }
            if (!db.objectStoreNames.contains(STORE_META)) {
                db.createObjectStore(STORE_META, { keyPath: "key" });
            }
        };

        request.onsuccess = () => {
            clearTimeout(timeout);
            resolve(request.result);
        };
        request.onerror = () => {
            clearTimeout(timeout);
            reject(request.error);
        };
    });
}

function createIndexedDbStore(db) {
    return {
        getAllAppointments() {
            return txRequest(db, STORE_APPOINTMENTS, "readonly", (store) => store.getAll());
        },
        saveAppointment(appointment) {
            return txRequest(db, STORE_APPOINTMENTS, "readwrite", (store) => store.put(appointment));
        },
        deleteAppointment(id) {
            return txRequest(db, STORE_APPOINTMENTS, "readwrite", (store) => store.delete(id));
        },
        async getMeta(key) {
            const record = await txRequest(db, STORE_META, "readonly", (store) => store.get(key));
            return record ? record.value : null;
        },
        setMeta(key, value) {
            return txRequest(db, STORE_META, "readwrite", (store) => store.put({ key, value }));
        }
    };
}

function txRequest(db, storeName, mode, action) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = action(store);
        request.onsuccess = () => {
            clearTimeout(timeout);
            resolve(request.result);
        };
        request.onerror = () => {
            clearTimeout(timeout);
            reject(request.error);
        };
        tx.onerror = () => reject(tx.error);
    });
}

async function loadAppointments() {
    let appointments = await PlanningStore.getAllAppointments();

    if (!appointments.length) {
        const alreadySkippedDemo = await PlanningStore.getMeta(LEGACY_SEED_KEY);
        if (!alreadySkippedDemo) {
            await PlanningStore.setMeta(LEGACY_SEED_KEY, "true");
            appointments = [];
        }
    }

    setAppointments(appointments.map(normalizeAppointment).filter(Boolean));
}

function setAppointments(appointments) {
    PLANNING_STATE.appointments = appointments.sort(compareAppointments);
    PLANNING_STATE.appointmentsByDate = appointments.reduce((map, appointment) => {
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
            <span class="appointment-time">${escapeHtml(getTimeStart(appointment))}</span>
        </button>
    `;
}

function renderAgendaAppointment(appointment) {
    const meta = CATEGORY_META[appointment.category] || CATEGORY_META.chantier;
    return `
        <article class="agenda-item ${meta.className}">
            <div class="agenda-time">${escapeHtml(getTimeStart(appointment))}</div>
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

function openAppointment(id) {
    const appointment = PLANNING_STATE.appointments.find((item) => item.id === id);
    if (!appointment) {
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

function openEditAppointment(id) {
    const appointment = PLANNING_STATE.appointments.find((item) => item.id === id);
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
                ${inputRow("Début", "start", appointment.start || getTimeStart(appointment) || "08:00", "time")}
                ${inputRow("Fin", "end", appointment.end || getTimeEnd(appointment) || "09:00", "time")}
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
    const appointment = normalizeAppointment({
        id: existingId || `rdv-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
        client: data.client || "Nouveau client",
        address: data.address || "",
        phone: data.phone || "",
        date: data.date,
        start: data.start || "08:00",
        end: data.end || "09:00",
        timeRange: `${data.start || "08:00"} - ${data.end || "09:00"}`,
        category: data.category || "chantier",
        notes: data.notes || "",
        updatedAt: new Date().toISOString(),
        createdAt: existingId ? undefined : new Date().toISOString()
    });

    await PlanningStore.saveAppointment(appointment);
    await loadAppointments();
    PLANNING_STATE.currentDate = new Date(appointment.date + "T00:00:00");
    closePanel();
    renderPlanning();
}

async function deleteAppointment(id) {
    await PlanningStore.deleteAppointment(id);
    await loadAppointments();
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

function normalizeAppointment(appointment) {
    if (!appointment || !appointment.date) {
        return null;
    }

    const start = appointment.start || getTimeStart(appointment) || "08:00";
    const end = appointment.end || getTimeEnd(appointment) || "09:00";
    return {
        id: appointment.id || `rdv-${Date.now()}`,
        client: appointment.client || "Nouveau client",
        address: appointment.address || "",
        phone: appointment.phone || "",
        date: appointment.date,
        start,
        end,
        timeStart: start,
        timeRange: `${start} - ${end}`,
        category: CATEGORY_META[appointment.category] ? appointment.category : "chantier",
        notes: appointment.notes || "",
        createdAt: appointment.createdAt || new Date().toISOString(),
        updatedAt: appointment.updatedAt || new Date().toISOString()
    };
}

function compareAppointments(a, b) {
    return (a.date + a.timeStart + a.client).localeCompare(b.date + b.timeStart + b.client);
}

function getTimeStart(appointment) {
    if (appointment.start) {
        return appointment.start;
    }
    return appointment.timeRange ? appointment.timeRange.split(" - ")[0] : "";
}

function getTimeEnd(appointment) {
    if (appointment.end) {
        return appointment.end;
    }
    return appointment.timeRange && appointment.timeRange.includes(" - ") ? appointment.timeRange.split(" - ")[1] : "";
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

function publishPlanningContext() {
    const today = toIsoDate(new Date());
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = toIsoDate(tomorrowDate);

    window.KynexyPlanningState = {
        storageMode: PLANNING_STATE.storageMode,
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
        await loadAppointments();
        renderPlanning();
    },
    getState: () => ({
        currentDate: PLANNING_STATE.currentDate.toISOString(),
        currentView: PLANNING_STATE.currentView,
        storageMode: PLANNING_STATE.storageMode,
        appointments: PLANNING_STATE.appointments.slice()
    }),
    seedDemo: async () => {
        for (const appointment of DEMO_APPOINTMENTS.map(normalizeAppointment)) {
            await PlanningStore.saveAppointment(appointment);
        }
        await loadAppointments();
        renderPlanning();
    }
};
