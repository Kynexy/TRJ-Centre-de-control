const PLANNING_STATE = {
    view: "today",
    calendarMode: "week",
    selectedMissionId: "mis-001",
    data: getPlanningDemoData()
};

const PLANNING_VIEWS = {
    today: {
        title: "Aujourd'hui",
        subtitle: "Toutes les missions de la journée, triées par heure, priorité et état terrain.",
        render: renderToday
    },
    calendar: {
        title: "Agenda",
        subtitle: "Vue jour, semaine et mois pensée pour les missions terrain.",
        render: renderCalendar
    },
    mission: {
        title: "Mission",
        subtitle: "Chaque rendez-vous devient une fiche mission complète et exploitable.",
        render: renderMission
    },
    team: {
        title: "Affectation équipe",
        subtitle: "Disponibilités, multi-affectation et conflits de planning visibles immédiatement.",
        render: renderTeam
    },
    vehicles: {
        title: "Véhicules",
        subtitle: "Camions, remorques et matériel affectés aux missions.",
        render: renderVehicles
    },
    conditions: {
        title: "Conditions",
        subtitle: "Zone prête pour météo, circulation et conditions chantier.",
        render: renderConditions
    },
    dashboard: {
        title: "Tableau de bord",
        subtitle: "Missions, heures prévues, heures réalisées, retards et avancement.",
        render: renderDashboard
    }
};

document.addEventListener("DOMContentLoaded", initPlanning);

function initPlanning() {

    updateClock();
    window.setInterval(updateClock, 30000);
    bindNavigation();
    bindAurel();
    renderApp();

}

function getPlanningDemoData() {

    return {
        missions: [
            {
                id: "mis-001",
                date: "2026-06-30",
                time: "07:15",
                client: "Famille M.",
                phone: "+689 87 00 00 01",
                address: "PK 21 côté mer",
                city: "Paea",
                gps: "https://maps.google.com/?q=Paea",
                team: ["Maui", "Tane"],
                priority: "Haute",
                state: "progress",
                label: "En préparation",
                material: "Echelle, nettoyeur, sécurité toiture",
                vehicle: "Camion 1",
                trailer: "Remorque plate",
                duration: 3.5,
                realStart: "07:28",
                realEnd: "",
                notes: "Accès par portail blanc. Client veut photos avant/après.",
                photos: ["Façade", "Toiture", "Accès"],
                documents: ["Devis DEV-1048", "Plan accès"],
                history: ["Créée depuis CRM", "Equipe affectée", "Matériel confirmé"]
            },
            {
                id: "mis-002",
                date: "2026-06-30",
                time: "10:45",
                client: "SCI Vai",
                phone: "+689 87 00 00 02",
                address: "Servitude Aute",
                city: "Punaauia",
                gps: "https://maps.google.com/?q=Punaauia",
                team: ["Hina"],
                priority: "Moyenne",
                state: "planned",
                label: "Planifiée",
                material: "Caméra inspection, joints, outillage plomberie",
                vehicle: "Camion 2",
                trailer: "Aucune",
                duration: 1.75,
                realStart: "",
                realEnd: "",
                notes: "Vérifier fuite avant devis final.",
                photos: ["Compteur", "Zone fuite"],
                documents: ["Note client"],
                history: ["Appel reçu", "Rendez-vous confirmé"]
            },
            {
                id: "mis-003",
                date: "2026-06-30",
                time: "14:20",
                client: "Mairie annexe",
                phone: "+689 87 00 00 03",
                address: "Rue du marché",
                city: "Papeete",
                gps: "https://maps.google.com/?q=Papeete",
                team: ["Maui", "Hina"],
                priority: "Basse",
                state: "late",
                label: "Risque retard",
                material: "Souffleur, sacs verts, coupe bordure",
                vehicle: "Camion 1",
                trailer: "Remorque déchets",
                duration: 2,
                realStart: "",
                realEnd: "",
                notes: "Circulation forte prévue. Prévenir client si départ tardif.",
                photos: ["Zone verte"],
                documents: ["Bon intervention"],
                history: ["Ajoutée au planning", "Conflit camion détecté"]
            },
            {
                id: "mis-004",
                date: "2026-07-01",
                time: "08:00",
                client: "Hôtel T.",
                phone: "+689 87 00 00 04",
                address: "Route de ceinture",
                city: "Mahina",
                gps: "https://maps.google.com/?q=Mahina",
                team: ["Tane", "Arii"],
                priority: "Haute",
                state: "planned",
                label: "Planifiée",
                material: "Bois terrasse, visserie inox, scie",
                vehicle: "Camion 3",
                trailer: "Remorque plate",
                duration: 6,
                realStart: "",
                realEnd: "",
                notes: "Prévoir départ très tôt.",
                photos: ["Terrasse"],
                documents: ["Devis DEV-1052"],
                history: ["Devis accepté", "Matériel à charger"]
            },
            {
                id: "mis-005",
                date: "2026-07-03",
                time: "09:30",
                client: "Résidence Vai",
                phone: "+689 87 00 00 05",
                address: "Lotissement hauteur",
                city: "Faaa",
                gps: "https://maps.google.com/?q=Faaa",
                team: ["Moana"],
                priority: "Moyenne",
                state: "done",
                label: "Terminée",
                material: "Contrôle final, photos, rapport",
                vehicle: "Camion 2",
                trailer: "Aucune",
                duration: 1.5,
                realStart: "09:35",
                realEnd: "10:52",
                notes: "Rapport à envoyer.",
                photos: ["Après travaux"],
                documents: ["Rapport photo"],
                history: ["Terminée", "Photos ajoutées"]
            }
        ],
        employees: [
            { name: "Maui", role: "Chef terrain", available: true },
            { name: "Hina", role: "Technique", available: true },
            { name: "Tane", role: "Matériel", available: true },
            { name: "Arii", role: "Renfort", available: false },
            { name: "Moana", role: "Finition", available: true }
        ],
        vehicles: [
            { name: "Camion 1", status: "Affecté", material: "Echelle, souffleur", trailer: "Remorque déchets", mission: "Famille M. + Mairie" },
            { name: "Camion 2", status: "Disponible", material: "Plomberie, inspection", trailer: "Aucune", mission: "SCI Vai" },
            { name: "Camion 3", status: "Préparation", material: "Bois terrasse", trailer: "Remorque plate", mission: "Hôtel T." }
        ]
    };

}

function bindNavigation() {

    document.querySelectorAll("[data-view], [data-shortcut]").forEach((button) => {
        button.addEventListener("click", () => {
            const view = button.dataset.view || button.dataset.shortcut;
            if (PLANNING_VIEWS[view]) {
                PLANNING_STATE.view = view;
                renderApp();
                closeAurelMenu();
            }
        });
    });

}

function bindAurel() {

    document.getElementById("aurelButton").addEventListener("click", () => {
        const menu = document.getElementById("aurelMenu");
        menu.classList.toggle("open");
        menu.setAttribute("aria-hidden", String(!menu.classList.contains("open")));
    });

}

function closeAurelMenu() {

    const menu = document.getElementById("aurelMenu");
    menu.classList.remove("open");
    menu.setAttribute("aria-hidden", "true");

}

function renderApp() {

    renderNav();
    renderHeader();
    renderMetrics();
    const target = document.getElementById("planningView");
    target.innerHTML = "";
    PLANNING_VIEWS[PLANNING_STATE.view].render(target);

}

function renderNav() {

    document.querySelectorAll("#planningNav button").forEach((button) => {
        button.classList.toggle("active", button.dataset.view === PLANNING_STATE.view);
    });

}

function renderHeader() {

    const view = PLANNING_VIEWS[PLANNING_STATE.view];
    document.getElementById("viewTitle").textContent = view.title;
    document.getElementById("viewSubtitle").textContent = view.subtitle;

}

function renderMetrics() {

    const stats = getStats();
    const metrics = [
        { label: "Missions", value: stats.total, detail: "Planning chargé" },
        { label: "Temps prévu", value: stats.plannedHours + "h", detail: "Durée estimée" },
        { label: "Retards", value: stats.late, detail: "A surveiller" },
        { label: "Terminées", value: stats.done, detail: "Missions clôturées" }
    ];

    document.getElementById("planningMetrics").innerHTML = metrics.map((metric) => `
        <article class="metric">
            <span>${escapeHtml(metric.label)}</span>
            <strong>${escapeHtml(metric.value)}</strong>
            <small>${escapeHtml(metric.detail)}</small>
        </article>
    `).join("");

}

function renderToday(target) {

    const missions = getTodayMissions();
    target.innerHTML = `
        <section class="card">
            <h2>Aujourd'hui</h2>
            <div class="toolbar">
                <input type="search" id="missionSearch" placeholder="Client, ville, équipe">
                <select id="priorityFilter">
                    <option value="all">Toutes priorités</option>
                    <option value="Haute">Haute</option>
                    <option value="Moyenne">Moyenne</option>
                    <option value="Basse">Basse</option>
                </select>
            </div>
            <div class="list" id="todayList"></div>
        </section>
    `;

    const draw = () => {
        const search = document.getElementById("missionSearch").value.toLowerCase();
        const priority = document.getElementById("priorityFilter").value;
        const filtered = missions.filter((mission) => {
            const haystack = [mission.client, mission.city, mission.team.join(" "), mission.label].join(" ").toLowerCase();
            return haystack.includes(search) && (priority === "all" || mission.priority === priority);
        });
        document.getElementById("todayList").innerHTML = filtered.map(renderMissionCard).join("") || renderEmpty("Aucune mission aujourd'hui.");
        bindMissionButtons();
    };

    document.getElementById("missionSearch").addEventListener("input", draw);
    document.getElementById("priorityFilter").addEventListener("change", draw);
    draw();

}

function renderMissionCard(mission) {

    return `
        <article class="mission-card">
            <div class="mission-time">
                <span>${escapeHtml(mission.date.slice(5).replace("-", "/"))}</span>
                <strong>${escapeHtml(mission.time)}</strong>
            </div>
            <div>
                <h3>${escapeHtml(mission.client)} <span class="state-${escapeAttribute(mission.state)}">• ${escapeHtml(mission.label)}</span></h3>
                <p class="mission-meta">${escapeHtml(mission.city)} · ${escapeHtml(mission.address)} · Equipe ${escapeHtml(mission.team.join(", "))}</p>
                <div class="signals">
                    <span class="tag ${getPriorityClass(mission.priority)}">${escapeHtml(mission.priority)}</span>
                    <span class="tag info">${escapeHtml(mission.duration)}h prévues</span>
                    <span class="tag">${escapeHtml(mission.vehicle)}</span>
                </div>
            </div>
            <div class="row-actions">
                <button class="primary-btn" data-open-mission="${escapeAttribute(mission.id)}" type="button">Ouvrir</button>
                <a class="icon-btn" href="tel:${escapeAttribute(mission.phone.replaceAll(" ", ""))}">Appeler</a>
            </div>
        </article>
    `;

}

function bindMissionButtons() {

    document.querySelectorAll("[data-open-mission]").forEach((button) => {
        button.addEventListener("click", () => {
            PLANNING_STATE.selectedMissionId = button.dataset.openMission;
            PLANNING_STATE.view = "mission";
            renderApp();
        });
    });

}

function renderCalendar(target) {

    target.innerHTML = `
        <section class="card calendar-shell">
            <div class="toolbar">
                <div class="view-switch">
                    ${["day", "week", "month"].map((mode) => `<button class="${PLANNING_STATE.calendarMode === mode ? "active" : ""}" data-calendar-mode="${mode}" type="button">${getModeLabel(mode)}</button>`).join("")}
                </div>
                <button class="ghost-btn" type="button">Glisser-déposer futur</button>
            </div>
            <div class="agenda-board" id="agendaBoard"></div>
        </section>
    `;

    document.querySelectorAll("[data-calendar-mode]").forEach((button) => {
        button.addEventListener("click", () => {
            PLANNING_STATE.calendarMode = button.dataset.calendarMode;
            renderCalendar(target);
        });
    });

    renderAgendaBoard();

}

function renderAgendaBoard() {

    const board = document.getElementById("agendaBoard");
    const mode = PLANNING_STATE.calendarMode;
    const columns = getCalendarColumns(mode);
    board.style.setProperty("--columns", columns.length);
    board.innerHTML = columns.map((column) => `
        <article class="agenda-column">
            <h3>${escapeHtml(column.label)}</h3>
            ${column.missions.map((mission) => `
                <div class="agenda-slot">
                    <button data-open-mission="${escapeAttribute(mission.id)}" type="button">
                        <strong>${escapeHtml(mission.time)} · ${escapeHtml(mission.client)}</strong>
                        <p class="muted">${escapeHtml(mission.city)} · ${escapeHtml(mission.team.join(", "))}</p>
                        <span class="tag ${getPriorityClass(mission.priority)}">${escapeHtml(mission.priority)}</span>
                    </button>
                </div>
            `).join("") || `<p class="muted">Aucune mission.</p>`}
        </article>
    `).join("");
    bindMissionButtons();

}

function getCalendarColumns(mode) {

    const missions = PLANNING_STATE.data.missions;
    if (mode === "day") {
        return [{ label: "Aujourd'hui", missions: getTodayMissions() }];
    }
    if (mode === "month") {
        const groups = ["Semaine 1", "Semaine 2", "Semaine 3", "Semaine 4"];
        return groups.map((label, index) => ({
            label,
            missions: missions.filter((mission, missionIndex) => missionIndex % 4 === index)
        }));
    }
    const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    return days.map((label, index) => ({
        label,
        missions: missions.filter((mission, missionIndex) => missionIndex % 7 === index)
    }));

}

function renderMission(target) {

    const mission = getSelectedMission();
    target.innerHTML = `
        <div class="mission-layout">
            <section class="card">
                <h2>Fiche mission</h2>
                <div class="field-grid" id="missionFields">
                    ${field("Client", "client", mission.client)}
                    ${field("Téléphone", "phone", mission.phone)}
                    ${field("Adresse", "address", mission.address)}
                    ${field("Ville", "city", mission.city)}
                    ${field("GPS", "gps", mission.gps)}
                    ${field("Equipe", "team", mission.team.join(", "))}
                    ${field("Matériel", "material", mission.material, true)}
                    ${field("Durée estimée", "duration", mission.duration)}
                    ${field("Début réel", "realStart", mission.realStart)}
                    ${field("Fin réelle", "realEnd", mission.realEnd)}
                    ${field("Notes", "notes", mission.notes, true, "full")}
                </div>
                <div class="row-actions" style="margin-top:16px">
                    <button class="ghost-btn" type="button">Devis</button>
                    <button class="ghost-btn" type="button">Facture</button>
                    <button class="primary-btn" id="finishMission" type="button">Terminer</button>
                </div>
            </section>
            <section class="card">
                <h2>Centre mission</h2>
                <div class="asset-grid">
                    ${mission.photos.map((item) => `<div class="asset-tile">Photo · ${escapeHtml(item)}</div>`).join("")}
                    ${mission.documents.map((item) => `<div class="asset-tile">Document · ${escapeHtml(item)}</div>`).join("")}
                </div>
                <h2 style="margin-top:18px">Historique</h2>
                <div class="list">
                    ${mission.history.map((item) => `
                        <article class="row">
                            <div>
                                <h3>${escapeHtml(item)}</h3>
                                <p>Evénement mission prêt pour Glide.</p>
                            </div>
                        </article>
                    `).join("")}
                </div>
            </section>
        </div>
    `;

    document.querySelectorAll("#missionFields input, #missionFields textarea").forEach((input) => {
        input.addEventListener("input", () => updateMissionField(mission, input));
    });

    document.getElementById("finishMission").addEventListener("click", () => {
        mission.state = "done";
        mission.label = "Terminée";
        mission.realEnd = mission.realEnd || getShortTime();
        mission.history.unshift("Mission terminée par le patron");
        renderApp();
    });

}

function field(label, key, value, textarea = false, className = "") {

    const control = textarea
        ? `<textarea data-field="${key}">${escapeHtml(value)}</textarea>`
        : `<input data-field="${key}" value="${escapeAttribute(value)}">`;
    return `<label class="field ${className}">${label}${control}</label>`;

}

function updateMissionField(mission, input) {

    if (input.dataset.field === "team") {
        mission.team = input.value.split(",").map((item) => item.trim()).filter(Boolean);
        return;
    }
    mission[input.dataset.field] = input.value;

}

function renderTeam(target) {

    const selected = getSelectedMission();
    target.innerHTML = `
        <section class="card">
            <h2>Affectation équipe</h2>
            <p class="card-copy">Mission sélectionnée : ${escapeHtml(selected.client)} · ${escapeHtml(selected.time)} · ${escapeHtml(selected.city)}</p>
            <div class="assign-grid" style="margin-top:16px">
                ${PLANNING_STATE.data.employees.map((employee) => renderEmployeeAssign(employee, selected)).join("")}
            </div>
        </section>
    `;

    document.querySelectorAll("[data-employee]").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            const name = checkbox.dataset.employee;
            if (checkbox.checked && !selected.team.includes(name)) {
                selected.team.push(name);
            }
            if (!checkbox.checked) {
                selected.team = selected.team.filter((item) => item !== name);
            }
            renderTeam(target);
            renderMetrics();
        });
    });

}

function renderEmployeeAssign(employee, selected) {

    const conflict = hasConflict(employee.name, selected);
    const assigned = selected.team.includes(employee.name);
    return `
        <article class="assign-card ${conflict ? "conflict" : ""}">
            <h3>${escapeHtml(employee.name)}</h3>
            <p class="muted">${escapeHtml(employee.role)}</p>
            <label class="check-row">
                <span>${assigned ? "Affecté" : "Disponible"}</span>
                <input data-employee="${escapeAttribute(employee.name)}" type="checkbox" ${assigned ? "checked" : ""} ${!employee.available ? "disabled" : ""}>
            </label>
            <span class="tag ${conflict ? "blocked" : employee.available ? "ready" : "warn"}">${conflict ? "Conflit planning" : employee.available ? "Disponible" : "Indisponible"}</span>
        </article>
    `;

}

function renderVehicles(target) {

    target.innerHTML = `
        <section class="card">
            <h2>Véhicules</h2>
            <div class="vehicle-grid">
                ${PLANNING_STATE.data.vehicles.map((vehicle) => `
                    <article class="vehicle-card">
                        <h3>${escapeHtml(vehicle.name)}</h3>
                        <span class="tag ${vehicle.status === "Disponible" ? "ready" : "info"}">${escapeHtml(vehicle.status)}</span>
                        <p class="muted">Matériel : ${escapeHtml(vehicle.material)}</p>
                        <p class="muted">Remorque : ${escapeHtml(vehicle.trailer)}</p>
                        <p class="muted">Mission : ${escapeHtml(vehicle.mission)}</p>
                    </article>
                `).join("")}
            </div>
        </section>
    `;

}

function renderConditions(target) {

    const conditions = [
        { title: "Météo", value: "Zone prête", detail: "Connexion météo future pour pluie, vent et chaleur chantier.", progress: 58 },
        { title: "Circulation", value: "Surveillance", detail: "Connexion trafic future pour départs et retards.", progress: 42 },
        { title: "Conditions chantier", value: "A vérifier", detail: "Accès, matériel, sécurité et contraintes client.", progress: 76 }
    ];

    target.innerHTML = `
        <section class="card">
            <h2>Conditions</h2>
            <div class="condition-grid">
                ${conditions.map((item) => `
                    <article class="condition-card">
                        <div>
                            <h3>${escapeHtml(item.title)}</h3>
                            <strong>${escapeHtml(item.value)}</strong>
                            <p class="muted">${escapeHtml(item.detail)}</p>
                        </div>
                        <div class="progress"><span style="width:${item.progress}%"></span></div>
                    </article>
                `).join("")}
            </div>
        </section>
    `;

}

function renderDashboard(target) {

    const stats = getStats();
    const cards = [
        ["Nombre de missions", stats.total, "Toutes missions chargées", 100],
        ["Temps total", stats.plannedHours + "h", "Durée estimée", 78],
        ["Heures prévues", stats.plannedHours + "h", "Planning théorique", 72],
        ["Heures réalisées", stats.realizedHours + "h", "Démarrées ou terminées", 48],
        ["Retards", stats.late, "Missions à risque", 26],
        ["Missions terminées", stats.done, "Clôturées", Math.round((stats.done / stats.total) * 100)]
    ];

    target.innerHTML = `
        <section class="card">
            <h2>Tableau de bord</h2>
            <div class="dashboard-grid">
                ${cards.map(([title, value, detail, progress]) => `
                    <article class="stat-card">
                        <strong>${escapeHtml(value)}</strong>
                        <p class="muted">${escapeHtml(title)}<br>${escapeHtml(detail)}</p>
                        <div class="progress"><span style="width:${Math.max(0, Math.min(100, progress))}%"></span></div>
                    </article>
                `).join("")}
            </div>
        </section>
    `;

}

function getTodayMissions() {

    return PLANNING_STATE.data.missions
        .filter((mission) => mission.date === "2026-06-30")
        .sort((a, b) => a.time.localeCompare(b.time) || getPriorityWeight(a.priority) - getPriorityWeight(b.priority));

}

function getSelectedMission() {

    return PLANNING_STATE.data.missions.find((mission) => mission.id === PLANNING_STATE.selectedMissionId) || PLANNING_STATE.data.missions[0];

}

function getStats() {

    const missions = PLANNING_STATE.data.missions;
    const total = missions.length;
    const plannedHours = sum(missions.map((mission) => Number(mission.duration || 0))).toFixed(1);
    const realizedHours = sum(missions.filter((mission) => mission.realStart).map((mission) => Number(mission.duration || 0))).toFixed(1);
    const late = missions.filter((mission) => mission.state === "late").length;
    const done = missions.filter((mission) => mission.state === "done").length;
    return { total, plannedHours, realizedHours, late, done };

}

function hasConflict(employeeName, selected) {

    return PLANNING_STATE.data.missions.some((mission) => {
        if (mission.id === selected.id) return false;
        return mission.date === selected.date && mission.team.includes(employeeName) && Math.abs(timeToMinutes(mission.time) - timeToMinutes(selected.time)) < 180;
    });

}

function getPriorityWeight(priority) {

    return { Haute: 1, Moyenne: 2, Basse: 3 }[priority] || 4;

}

function getPriorityClass(priority) {

    if (priority === "Haute") return "blocked";
    if (priority === "Moyenne") return "warn";
    return "ready";

}

function getModeLabel(mode) {

    return { day: "Jour", week: "Semaine", month: "Mois" }[mode] || mode;

}

function renderEmpty(text) {

    return `<div class="row"><p>${escapeHtml(text)}</p></div>`;

}

function timeToMinutes(value) {

    const [hours, minutes] = String(value || "00:00").split(":").map(Number);
    return hours * 60 + minutes;

}

function sum(values) {

    return values.reduce((total, value) => total + Number(value || 0), 0);

}

function getShortTime() {

    return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

}

function updateClock() {

    document.getElementById("planningClock").textContent = new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "2-digit",
        month: "long"
    }) + " - " + getShortTime();

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
    refresh: renderApp,
    getState: () => ({
        view: PLANNING_STATE.view,
        calendarMode: PLANNING_STATE.calendarMode,
        selectedMissionId: PLANNING_STATE.selectedMissionId,
        data: PLANNING_STATE.data
    })
};
