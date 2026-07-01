const TEAM_STATE = {
    currentDate: startOfDay(new Date()),
    members: [],
    entries: [],
    advances: [],
    entriesByDate: new Map(),
    entriesByMember: new Map(),
    advancesByMember: new Map(),
    summaries: new Map(),
    databaseReady: false,
    databaseError: null,
    focusBeforePanel: null,
    scrollY: 0,
    accessMode: getAccessMode()
};

const DEFAULT_COLORS = ["#2ca9ff", "#5ee37d", "#ff9fb7", "#ffd166", "#b69cff", "#64d8cb"];

document.addEventListener("DOMContentLoaded", initTeam);

async function initTeam() {
    bindTeamShell();
    renderTeam();

    try {
        assertTeamDatabase();
        await window.KynexyTeamDB.open();
        TEAM_STATE.databaseReady = true;
        await reloadTeamData();
    } catch (error) {
        TEAM_STATE.databaseError = error;
        console.error("Team database unavailable", error);
    }

    renderTeam();
}

function assertTeamDatabase() {
    if (!window.KynexyTeamDB) {
        throw new Error("KynexyTeamDB is not loaded. equipe-db.js must be loaded before equipe.js.");
    }
}

function bindTeamShell() {
    document.getElementById("prevMonth").addEventListener("click", () => changeMonth(-1));
    document.getElementById("nextMonth").addEventListener("click", () => changeMonth(1));
    document.getElementById("addMember").addEventListener("click", () => openMemberForm());
    document.getElementById("closePanel").addEventListener("click", closePanel);
    document.getElementById("teamPanel").addEventListener("click", (event) => {
        if (event.target.id === "teamPanel") {
            closePanel();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closePanel();
        }
    });
}

async function reloadTeamData() {
    const range = getMonthRange(TEAM_STATE.currentDate);
    const [members, entries, advances] = await Promise.all([
        window.KynexyTeamDB.listMembers(),
        window.KynexyTeamDB.listWorkEntries({ from: range.from, to: range.to }),
        window.KynexyTeamDB.listAdvances({ from: range.from, to: range.to })
    ]);

    const activeMembers = members.filter((member) => member.active !== false);
    TEAM_STATE.members = TEAM_STATE.accessMode.role === "employee"
        ? activeMembers.filter((member) => member.id === TEAM_STATE.accessMode.memberId)
        : activeMembers;
    TEAM_STATE.entries = entries.filter((entry) => TEAM_STATE.members.some((member) => member.id === entry.memberId));
    TEAM_STATE.advances = advances.filter((advance) => TEAM_STATE.members.some((member) => member.id === advance.memberId));
    TEAM_STATE.entriesByDate = groupBy(TEAM_STATE.entries, "date");
    TEAM_STATE.entriesByMember = groupBy(TEAM_STATE.entries, "memberId");
    TEAM_STATE.advancesByMember = groupBy(TEAM_STATE.advances, "memberId");
    TEAM_STATE.summaries = new Map(
        window.KynexyTeamDB
            .calculateAllSummaries(TEAM_STATE.members, TEAM_STATE.entries, TEAM_STATE.advances, TEAM_STATE.currentDate)
            .map((summary) => [summary.memberId, summary])
    );
    publishTeamContext();
}

function renderTeam() {
    document.getElementById("monthLabel").textContent = formatMonth(TEAM_STATE.currentDate);
    document.getElementById("storageStatus").textContent = getStorageLabel();
    document.getElementById("addMember").hidden = TEAM_STATE.accessMode.role === "employee";

    if (TEAM_STATE.databaseError) {
        renderError();
        return;
    }

    renderPresenceCalendar();
    renderMemberCards();
}

function renderError() {
    document.getElementById("presenceGrid").innerHTML = `<div class="empty-state">Base Equipe indisponible : ${escapeHtml(TEAM_STATE.databaseError.message)}</div>`;
    document.getElementById("memberList").innerHTML = "";
}

function renderPresenceCalendar() {
    const grid = document.getElementById("presenceGrid");
    const cells = getCalendarCells(TEAM_STATE.currentDate);

    grid.innerHTML = cells.map((cell) => {
        const entries = getEntriesForDate(cell.isoDate);
        const presentMemberIds = new Set(entries.filter((entry) => Number(entry.hours) > 0).map((entry) => entry.memberId));
        const presentMembers = TEAM_STATE.members.filter((member) => presentMemberIds.has(member.id)).slice(0, 12);

        return `
            <button class="day-presence ${cell.isCurrentMonth ? "" : "outside"} ${cell.isToday ? "today" : ""}" type="button" data-day-date="${cell.isoDate}" aria-label="${escapeAttribute(formatDate(cell.isoDate))}">
                <span class="day-number">${cell.day}</span>
                <span class="presence-dots" aria-hidden="true">
                    ${presentMembers.map((member) => `<span class="presence-dot" style="--dot-color:${escapeAttribute(member.color)}"></span>`).join("")}
                </span>
            </button>
        `;
    }).join("");

    grid.querySelectorAll("[data-day-date]").forEach((button) => {
        button.addEventListener("click", () => openDayView(button.dataset.dayDate));
    });
}

function renderMemberCards() {
    const list = document.getElementById("memberList");
    if (!TEAM_STATE.members.length) {
        list.innerHTML = TEAM_STATE.accessMode.role === "employee"
            ? `<div class="empty-state">Acces salarie indisponible.</div>`
            : `<button class="empty-state" type="button" id="emptyAddMember">Ajoutez le premier salarie.</button>`;
        const empty = document.getElementById("emptyAddMember");
        if (empty) {
            empty.addEventListener("click", () => openMemberForm());
        }
        return;
    }

    list.innerHTML = TEAM_STATE.members.map((member) => {
        const summary = getSummary(member.id);
        return `
            <button class="member-card punch-card" style="--member-color:${escapeAttribute(member.color)}" type="button" data-member-id="${escapeAttribute(member.id)}">
                <div class="member-main">
                    <div>
                        <div class="member-title">
                            <span class="member-dot" style="--dot-color:${escapeAttribute(member.color)}"></span>
                            <h3>${escapeHtml(member.name)}</h3>
                        </div>
                        <p>${escapeHtml(member.role || "Poste a definir")}${TEAM_STATE.accessMode.role === "owner" && member.phone ? " - " + escapeHtml(member.phone) : ""}</p>
                    </div>
                    <div class="amount-main">${formatMoney(summary.remaining)}</div>
                </div>
                ${renderPunchSummary(summary)}
            </button>
        `;
    }).join("");

    list.querySelectorAll("[data-member-id]").forEach((button) => {
        button.addEventListener("click", () => openMemberProfile(button.dataset.memberId));
    });
}

function renderPunchSummary(summary) {
    return `
        <div class="summary-grid punch-summary">
            ${summaryTile("Semaine", `${formatHours(summary.weekHours)} · ${formatMoney(summary.weekSalary)}`)}
            ${summaryTile("Mois", `${formatHours(summary.monthHours)} · ${formatMoney(summary.monthSalary)}`)}
            ${summaryTile("Acomptes", formatMoney(summary.advances))}
            ${summaryTile("Reste", formatMoney(summary.remaining))}
        </div>
    `;
}

function summaryTile(label, value) {
    return `<div class="summary-tile"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function openMemberProfile(memberId) {
    const member = TEAM_STATE.members.find((item) => item.id === memberId);
    if (!member) {
        return;
    }

    const summary = getSummary(member.id);
    const workEntries = (TEAM_STATE.entriesByMember.get(member.id) || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    const advances = (TEAM_STATE.advancesByMember.get(member.id) || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    const isOwner = TEAM_STATE.accessMode.role === "owner";
    document.getElementById("panelTitle").textContent = member.name;
    document.getElementById("panelContent").innerHTML = `
        <div class="panel-scroll">
            <section class="profile-head punch-profile" style="--member-color:${escapeAttribute(member.color)}">
                <h3>${escapeHtml(member.name)}</h3>
                <p>${escapeHtml(member.role || "Poste a definir")}${member.phone && isOwner ? " - " + escapeHtml(member.phone) : ""}</p>
            </section>
            ${renderPunchSummary(summary)}
            <div class="quick-actions ${isOwner ? "" : "single"}">
                <button class="primary-btn big-action" type="button" id="punchToday">Pointer aujourd'hui</button>
                <button class="secondary-btn big-action" type="button" id="recordAdvance">Acompte recu</button>
                ${isOwner ? `<button class="secondary-btn big-action subtle-action" type="button" id="editMember">Modifier profil</button>` : ""}
            </div>
            <section class="history-block">
                <h4>Heures</h4>
                ${workEntries.map((entry) => renderWorkLine(entry, member)).join("") || `<div class="empty-state compact-empty">Aucune heure ce mois-ci.</div>`}
            </section>
            <section class="history-block">
                <h4>Acomptes</h4>
                ${advances.map(renderAdvanceLine).join("") || `<div class="empty-state compact-empty">Aucun acompte ce mois-ci.</div>`}
            </section>
        </div>
    `;

    openPanel();
    document.getElementById("punchToday").addEventListener("click", () => openPunchForm(member, toIsoDate(new Date())));
    document.getElementById("recordAdvance").addEventListener("click", () => openAdvanceForm(member));
    if (isOwner) {
        document.getElementById("editMember").addEventListener("click", () => openMemberForm(member));
    }
}

function openMemberForm(member = null) {
    if (TEAM_STATE.accessMode.role !== "owner") {
        return;
    }
    document.getElementById("panelTitle").textContent = member ? "Modifier profil" : "Nouveau salarie";
    document.getElementById("panelContent").innerHTML = `
        <form class="team-form" id="memberForm">
            <label class="form-row"><span>Nom</span><input name="name" required value="${escapeAttribute(member ? member.name : "")}" placeholder="Nom du salarie"></label>
            <div class="form-grid">
                <label class="form-row"><span>Couleur</span><input name="color" type="color" value="${escapeAttribute(member ? member.color : DEFAULT_COLORS[TEAM_STATE.members.length % DEFAULT_COLORS.length])}"></label>
                <label class="form-row"><span>Taux horaire</span><input name="hourlyRate" type="number" min="0" step="1" value="${escapeAttribute(member ? member.hourlyRate : "")}" placeholder="0"></label>
            </div>
            <label class="form-row"><span>Telephone</span><input name="phone" type="tel" value="${escapeAttribute(member ? member.phone : "")}" placeholder="+689 ..."></label>
            <label class="form-row"><span>Poste</span><input name="role" value="${escapeAttribute(member ? member.role : "")}" placeholder="Poste"></label>
            <div class="panel-actions ${member ? "" : "single"}">
                <button class="primary-btn" type="submit">Enregistrer</button>
                ${member ? `<button class="danger-btn" type="button" id="deleteMember">Supprimer</button>` : ""}
            </div>
        </form>
    `;

    openPanel();
    document.getElementById("memberForm").addEventListener("submit", (event) => saveMemberForm(event, member ? member.id : null));
    if (member) {
        document.getElementById("deleteMember").addEventListener("click", () => deleteMember(member.id));
    }
}

function openPunchForm(member, isoDate = toIsoDate(new Date())) {
    const existing = (TEAM_STATE.entriesByMember.get(member.id) || []).find((entry) => entry.date === isoDate);
    document.getElementById("panelTitle").textContent = "Pointer";
    document.getElementById("panelContent").innerHTML = `
        <form class="team-form quick-form" id="punchForm">
            <section class="profile-head punch-profile" style="--member-color:${escapeAttribute(member.color)}">
                <h3>${escapeHtml(member.name)}</h3>
                <p>Taux horaire ${formatMoney(member.hourlyRate)}</p>
            </section>
            <label class="form-row"><span>Date</span><input name="date" type="date" required value="${escapeAttribute(isoDate)}"></label>
            <label class="form-row"><span>Heures travaillees</span><input name="hours" type="number" min="0" step="0.25" required value="${escapeAttribute(existing ? existing.hours : "")}" placeholder="8"></label>
            <div class="computed-line" id="dailySalary">Salaire du jour : ${formatMoney((existing ? existing.hours : 0) * Number(member.hourlyRate || 0))}</div>
            <button class="primary-btn big-action" type="submit">Valider</button>
        </form>
    `;
    openPanel();
    const form = document.getElementById("punchForm");
    const hoursInput = form.elements.hours;
    hoursInput.addEventListener("input", () => {
        document.getElementById("dailySalary").textContent = `Salaire du jour : ${formatMoney(Number(hoursInput.value || 0) * Number(member.hourlyRate || 0))}`;
    });
    form.addEventListener("submit", (event) => savePunchForm(event, member));
    setTimeout(() => hoursInput.focus(), 60);
}

function openAdvanceForm(member) {
    document.getElementById("panelTitle").textContent = "Acompte";
    document.getElementById("panelContent").innerHTML = `
        <form class="team-form quick-form" id="advanceForm">
            <section class="profile-head punch-profile" style="--member-color:${escapeAttribute(member.color)}">
                <h3>${escapeHtml(member.name)}</h3>
                <p>Historique separe des heures.</p>
            </section>
            <label class="form-row"><span>Date</span><input name="date" type="date" required value="${escapeAttribute(toIsoDate(new Date()))}"></label>
            <label class="form-row"><span>Montant recu</span><input name="amount" type="number" min="0" step="1" required placeholder="10000"></label>
            <label class="form-row"><span>Note</span><input name="note" placeholder="Optionnel"></label>
            <button class="primary-btn big-action" type="submit">Enregistrer</button>
        </form>
    `;
    openPanel();
    const form = document.getElementById("advanceForm");
    form.addEventListener("submit", (event) => saveAdvanceForm(event, member));
    setTimeout(() => form.elements.amount.focus(), 60);
}

function openDayView(isoDate) {
    const entries = getEntriesForDate(isoDate);
    document.getElementById("panelTitle").textContent = shortDate(isoDate);
    document.getElementById("panelContent").innerHTML = `
        <div class="panel-scroll">
            <section class="history-block">
                <h4>Pointage du jour</h4>
                ${entries.map((entry) => {
                    const member = TEAM_STATE.members.find((item) => item.id === entry.memberId);
                    return member ? renderWorkLine(entry, member) : "";
                }).join("") || `<div class="empty-state compact-empty">Aucun pointage ce jour.</div>`}
            </section>
        </div>
    `;
    openPanel();
}

async function saveMemberForm(event, memberId = null) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const payload = {
        name: data.name,
        color: data.color,
        phone: data.phone,
        role: data.role,
        hourlyRate: data.hourlyRate
    };

    if (memberId) {
        await window.KynexyTeamDB.updateMember(memberId, payload);
    } else {
        await window.KynexyTeamDB.createMember(payload);
    }

    await reloadTeamData();
    closePanel();
    renderTeam();
}

async function savePunchForm(event, member) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    await window.KynexyTeamDB.upsertWorkEntry({
        memberId: member.id,
        date: data.date,
        hours: data.hours
    });
    TEAM_STATE.currentDate = new Date(data.date + "T00:00:00");
    await reloadTeamData();
    closePanel();
    renderTeam();
}

async function saveAdvanceForm(event, member) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    await window.KynexyTeamDB.createAdvance({
        memberId: member.id,
        date: data.date,
        amount: data.amount,
        note: data.note
    });
    TEAM_STATE.currentDate = new Date(data.date + "T00:00:00");
    await reloadTeamData();
    closePanel();
    renderTeam();
}

async function deleteMember(memberId) {
    if (!window.confirm("Supprimer ce salarie et son historique local ?")) {
        return;
    }
    await window.KynexyTeamDB.deleteMember(memberId);
    await reloadTeamData();
    closePanel();
    renderTeam();
}

function renderWorkLine(entry, member) {
    const salary = Number(entry.hours || 0) * Number(member.hourlyRate || 0);
    return `
        <article class="history-row punch-line">
            <strong>${escapeHtml(shortDate(entry.date))}</strong>
            <div>
                <strong>${escapeHtml(formatHours(entry.hours))}</strong>
                <p>${escapeHtml(formatMoney(salary))}</p>
            </div>
        </article>
    `;
}

function renderAdvanceLine(advance) {
    return `
        <article class="history-row advance-line">
            <strong>${escapeHtml(shortDate(advance.date))}</strong>
            <div>
                <strong>${escapeHtml(formatMoney(advance.amount))}</strong>
                ${advance.note ? `<p>${escapeHtml(advance.note)}</p>` : ""}
            </div>
        </article>
    `;
}

function changeMonth(delta) {
    TEAM_STATE.currentDate = new Date(
        TEAM_STATE.currentDate.getFullYear(),
        TEAM_STATE.currentDate.getMonth() + delta,
        1
    );
    reloadTeamData().then(renderTeam).catch((error) => {
        TEAM_STATE.databaseError = error;
        renderTeam();
    });
}

function getEntriesForDate(isoDate) {
    return TEAM_STATE.entriesByDate.get(isoDate) || [];
}

function getSummary(memberId) {
    return TEAM_STATE.summaries.get(memberId) || {
        weekHours: 0,
        monthHours: 0,
        weekSalary: 0,
        monthSalary: 0,
        calculatedSalary: 0,
        advances: 0,
        remaining: 0,
        workDays: 0
    };
}

function getStorageLabel() {
    if (TEAM_STATE.databaseError) {
        return "Hors ligne";
    }
    if (!TEAM_STATE.databaseReady) {
        return "Chargement";
    }
    return TEAM_STATE.accessMode.role === "employee" ? "Mode salarie" : "Mode patron";
}

function getAccessMode() {
    const params = new URLSearchParams(window.location.search);
    const memberId = params.get("member") || params.get("employee");
    return {
        role: params.get("role") === "employee" && memberId ? "employee" : "owner",
        memberId
    };
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
            isoDate,
            day: cellDate.getDate(),
            isCurrentMonth: cellDate.getMonth() === month,
            isToday: isoDate === toIsoDate(new Date())
        };
    });
}

function getMonthRange(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const from = new Date(year, month, 1 - startOffset);
    const to = new Date(from);
    to.setDate(from.getDate() + 41);
    return { from: toIsoDate(from), to: toIsoDate(to) };
}

function groupBy(items, key) {
    return items.reduce((map, item) => {
        const value = item[key];
        if (!map.has(value)) {
            map.set(value, []);
        }
        map.get(value).push(item);
        return map;
    }, new Map());
}

function openPanel() {
    const panel = document.getElementById("teamPanel");
    TEAM_STATE.focusBeforePanel = document.activeElement;
    TEAM_STATE.scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.top = `-${TEAM_STATE.scrollY}px`;
    document.body.classList.add("panel-open");
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    setTimeout(() => document.getElementById("closePanel").focus(), 30);
}

function closePanel() {
    const panel = document.getElementById("teamPanel");
    if (!panel.classList.contains("open")) {
        return;
    }

    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("panel-open");
    document.body.style.top = "";
    window.scrollTo(0, TEAM_STATE.scrollY);
    document.getElementById("panelTitle").textContent = "Equipe";
    document.getElementById("panelContent").innerHTML = "";

    if (TEAM_STATE.focusBeforePanel && typeof TEAM_STATE.focusBeforePanel.focus === "function") {
        TEAM_STATE.focusBeforePanel.focus();
    }
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

function shortDate(value) {
    return new Date(value + "T00:00:00").toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit"
    });
}

function formatHours(value) {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(value || 0))} h`;
}

function formatMoney(value) {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(value || 0))} F`;
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

function publishTeamContext() {
    window.KynexyTeamState = {
        database: window.KynexyTeamDB ? window.KynexyTeamDB.name : null,
        databaseReady: TEAM_STATE.databaseReady,
        accessMode: TEAM_STATE.accessMode.role,
        membersCount: TEAM_STATE.members.length,
        entriesCount: TEAM_STATE.entries.length,
        advancesCount: TEAM_STATE.advances.length,
        month: formatMonth(TEAM_STATE.currentDate),
        summaries: Array.from(TEAM_STATE.summaries.values())
    };

    window.AurelState = window.AurelState || {};
    window.AurelState.team = window.KynexyTeamState;
}

window.KynexyTeam = {
    refresh: renderTeam,
    reload: async () => {
        await reloadTeamData();
        renderTeam();
    },
    getState: () => ({
        currentDate: TEAM_STATE.currentDate.toISOString(),
        databaseReady: TEAM_STATE.databaseReady,
        accessMode: TEAM_STATE.accessMode,
        members: TEAM_STATE.members.slice(),
        entries: TEAM_STATE.entries.slice(),
        advances: TEAM_STATE.advances.slice(),
        summaries: Array.from(TEAM_STATE.summaries.values())
    })
};
