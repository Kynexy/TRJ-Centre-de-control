const TEAM_STATE = {
    currentDate: startOfDay(new Date()),
    members: [],
    entries: [],
    entriesByDate: new Map(),
    entriesByMember: new Map(),
    summaries: new Map(),
    databaseReady: false,
    databaseError: null,
    focusBeforePanel: null,
    scrollY: 0
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
    const [members, entries] = await Promise.all([
        window.KynexyTeamDB.listMembers(),
        window.KynexyTeamDB.listWorkEntries({ from: range.from, to: range.to })
    ]);

    TEAM_STATE.members = members.filter((member) => member.active !== false);
    TEAM_STATE.entries = entries;
    TEAM_STATE.entriesByDate = groupBy(entries, "date");
    TEAM_STATE.entriesByMember = groupBy(entries, "memberId");
    TEAM_STATE.summaries = new Map(
        window.KynexyTeamDB
            .calculateAllSummaries(TEAM_STATE.members, TEAM_STATE.entries, TEAM_STATE.currentDate)
            .map((summary) => [summary.memberId, summary])
    );
    publishTeamContext();
}

function renderTeam() {
    document.getElementById("monthLabel").textContent = formatMonth(TEAM_STATE.currentDate);
    document.getElementById("storageStatus").textContent = getStorageLabel();

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
        const presentMemberIds = new Set(entries.filter((entry) => !entry.absent && Number(entry.hours) > 0).map((entry) => entry.memberId));
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
        button.addEventListener("click", () => openDayEditor(button.dataset.dayDate));
    });
}

function renderMemberCards() {
    const list = document.getElementById("memberList");
    if (!TEAM_STATE.members.length) {
        list.innerHTML = `<button class="empty-state" type="button" id="emptyAddMember">Ajoutez le premier salarie pour commencer a suivre les presences.</button>`;
        document.getElementById("emptyAddMember").addEventListener("click", () => openMemberForm());
        return;
    }

    list.innerHTML = TEAM_STATE.members.map((member) => {
        const summary = getSummary(member.id);
        return `
            <button class="member-card" style="--member-color:${escapeAttribute(member.color)}" type="button" data-member-id="${escapeAttribute(member.id)}">
                <div class="member-main">
                    <div>
                        <div class="member-title">
                            <span class="member-dot" style="--dot-color:${escapeAttribute(member.color)}"></span>
                            <h3>${escapeHtml(member.name)}</h3>
                        </div>
                        <p>${escapeHtml(member.role || "Poste a definir")} ${member.phone ? " - " + escapeHtml(member.phone) : ""}</p>
                    </div>
                    <div class="amount-main">${formatMoney(summary.remaining)}</div>
                </div>
                ${renderSummaryGrid(summary)}
            </button>
        `;
    }).join("");

    list.querySelectorAll("[data-member-id]").forEach((button) => {
        button.addEventListener("click", () => openMemberProfile(button.dataset.memberId));
    });
}

function renderSummaryGrid(summary) {
    return `
        <div class="summary-grid">
            ${summaryTile("Heures semaine", formatHours(summary.weekHours))}
            ${summaryTile("Heures mois", formatHours(summary.monthHours))}
            ${summaryTile("Salaire calcule", formatMoney(summary.calculatedSalary))}
            ${summaryTile("Acomptes", formatMoney(summary.advances))}
            ${summaryTile("Salaire verse", formatMoney(summary.salaryPaid))}
            ${summaryTile("Reste a payer", formatMoney(summary.remaining))}
        </div>
    `;
}

function summaryTile(label, value) {
    return `<div class="summary-tile"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function openMemberForm(member = null) {
    document.getElementById("panelTitle").textContent = member ? "Modifier salarie" : "Nouveau salarie";
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

async function deleteMember(memberId) {
    if (!window.confirm("Supprimer ce salarie et son historique local ?")) {
        return;
    }
    await window.KynexyTeamDB.deleteMember(memberId);
    await reloadTeamData();
    closePanel();
    renderTeam();
}

function openMemberProfile(memberId) {
    const member = TEAM_STATE.members.find((item) => item.id === memberId);
    if (!member) {
        return;
    }

    const summary = getSummary(member.id);
    const entries = (TEAM_STATE.entriesByMember.get(member.id) || []).slice().reverse();
    document.getElementById("panelTitle").textContent = member.name;
    document.getElementById("panelContent").innerHTML = `
        <div class="panel-scroll">
            <section class="profile-head" style="--member-color:${escapeAttribute(member.color)}">
                <h3>${escapeHtml(member.name)}</h3>
                <p>${escapeHtml(member.role || "Poste a definir")} ${member.phone ? " - " + escapeHtml(member.phone) : ""}</p>
            </section>
            ${renderSummaryGrid(summary)}
            <div class="panel-actions">
                <button class="primary-btn" type="button" id="addEntryToday">Saisir aujourd'hui</button>
                <button class="secondary-btn" type="button" id="editMember">Modifier fiche</button>
            </div>
            ${entries.map((entry) => renderHistoryRow(entry)).join("") || `<div class="empty-state">Aucun historique ce mois-ci.</div>`}
        </div>
    `;

    openPanel();
    document.getElementById("editMember").addEventListener("click", () => openMemberForm(member));
    document.getElementById("addEntryToday").addEventListener("click", () => openDayEditor(toIsoDate(new Date()), member.id));
}

function renderHistoryRow(entry) {
    const bits = [];
    if (entry.absent) {
        bits.push("Absent");
    } else {
        bits.push(formatHours(entry.hours));
    }
    if (entry.advance) {
        bits.push(`Acompte ${formatMoney(entry.advance)}`);
    }
    if (entry.salaryPaid) {
        bits.push(`Verse ${formatMoney(entry.salaryPaid)}`);
    }
    return `
        <article class="history-row">
            <strong>${escapeHtml(shortDate(entry.date))}</strong>
            <div>
                <strong>${escapeHtml(bits.join(" - "))}</strong>
                ${entry.note ? `<p>${escapeHtml(entry.note)}</p>` : ""}
            </div>
        </article>
    `;
}

function openDayEditor(isoDate, focusMemberId = null) {
    const entriesByMember = new Map(getEntriesForDate(isoDate).map((entry) => [entry.memberId, entry]));
    document.getElementById("panelTitle").textContent = shortDate(isoDate);
    document.getElementById("panelContent").innerHTML = `
        <form class="team-form" id="dayForm">
            ${TEAM_STATE.members.map((member) => renderDayMemberForm(member, entriesByMember.get(member.id), focusMemberId === member.id)).join("") || `<div class="empty-state">Ajoutez un salarie avant de saisir une presence.</div>`}
            ${TEAM_STATE.members.length ? `<button class="primary-btn" type="submit">Enregistrer la journee</button>` : ""}
        </form>
    `;

    openPanel();
    const form = document.getElementById("dayForm");
    form.addEventListener("submit", (event) => saveDayForm(event, isoDate, entriesByMember));
    form.querySelectorAll("[data-absent-toggle]").forEach((checkbox) => {
        checkbox.addEventListener("change", () => toggleAbsentInputs(checkbox.closest(".day-member"), checkbox.checked));
        toggleAbsentInputs(checkbox.closest(".day-member"), checkbox.checked);
    });
    const focused = focusMemberId ? form.querySelector(`[data-member-block="${cssEscape(focusMemberId)}"] input[name$="-hours"]`) : null;
    if (focused) {
        setTimeout(() => focused.focus(), 60);
    }
}

function renderDayMemberForm(member, entry = null, autofocus = false) {
    const prefix = member.id;
    return `
        <section class="day-row day-member" style="--member-color:${escapeAttribute(member.color)}" data-member-block="${escapeAttribute(member.id)}">
            <div class="day-member-title">
                <strong>${escapeHtml(member.name)}</strong>
                <label class="toggle-row"><span>Absent</span><input name="${escapeAttribute(prefix)}-absent" type="checkbox" data-absent-toggle ${entry && entry.absent ? "checked" : ""}></label>
            </div>
            <div class="form-grid">
                <label><span>Heures</span><input name="${escapeAttribute(prefix)}-hours" type="number" min="0" step="0.25" value="${escapeAttribute(entry ? entry.hours : "")}" ${autofocus ? "autofocus" : ""}></label>
                <label><span>Acompte</span><input name="${escapeAttribute(prefix)}-advance" type="number" min="0" step="1" value="${escapeAttribute(entry ? entry.advance : "")}"></label>
            </div>
            <div class="money-grid">
                <label><span>Salaire verse</span><input name="${escapeAttribute(prefix)}-salaryPaid" type="number" min="0" step="1" value="${escapeAttribute(entry ? entry.salaryPaid : "")}"></label>
                <label><span>Note</span><input name="${escapeAttribute(prefix)}-note" value="${escapeAttribute(entry ? entry.note : "")}" placeholder="Note courte"></label>
            </div>
        </section>
    `;
}

function toggleAbsentInputs(block, absent) {
    if (!block) {
        return;
    }
    const hours = block.querySelector('input[name$="-hours"]');
    if (hours && absent) {
        hours.value = "0";
    }
    if (hours) {
        hours.disabled = absent;
    }
}

async function saveDayForm(event, isoDate, previousEntries) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const saves = TEAM_STATE.members.map((member) => {
        const previous = previousEntries.get(member.id);
        const absent = data[`${member.id}-absent`] === "on";
        const payload = {
            id: previous ? previous.id : undefined,
            memberId: member.id,
            date: isoDate,
            hours: absent ? 0 : data[`${member.id}-hours`],
            advance: data[`${member.id}-advance`],
            salaryPaid: data[`${member.id}-salaryPaid`],
            absent,
            note: data[`${member.id}-note`]
        };
        const hasData = absent || Number(payload.hours) > 0 || Number(payload.advance) > 0 || Number(payload.salaryPaid) > 0 || String(payload.note || "").trim();
        if (!hasData && previous) {
            return window.KynexyTeamDB.deleteWorkEntry(previous.id);
        }
        if (!hasData) {
            return Promise.resolve();
        }
        return window.KynexyTeamDB.upsertWorkEntry(payload);
    });

    await Promise.all(saves);
    await reloadTeamData();
    closePanel();
    renderTeam();
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
        calculatedSalary: 0,
        advances: 0,
        salaryPaid: 0,
        remaining: 0,
        absences: 0
    };
}

function getStorageLabel() {
    if (TEAM_STATE.databaseError) {
        return "Hors ligne";
    }
    if (!TEAM_STATE.databaseReady) {
        return "Chargement";
    }
    return window.KynexyTeamDB.engineType === "indexeddb" ? "Memoire locale" : "Fallback local";
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
        month: "short"
    });
}

function formatHours(value) {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(value || 0))}h`;
}

function formatMoney(value) {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(value || 0))} F`;
}

function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
        return window.CSS.escape(value);
    }
    return String(value).replace(/["\\]/g, "\\$&");
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
        membersCount: TEAM_STATE.members.length,
        entriesCount: TEAM_STATE.entries.length,
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
        members: TEAM_STATE.members.slice(),
        entries: TEAM_STATE.entries.slice(),
        summaries: Array.from(TEAM_STATE.summaries.values())
    })
};
