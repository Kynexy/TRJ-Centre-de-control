// Aujourd'hui
// Independent terrain-first experience. Glide can inject window.TRJ_TODAY_DATA.

const TODAY_STATUS = {
    READY: "ready",
    MISSING_DATA: "missing-data",
    ERROR: "error"
};

const TRJ_TODAY_STATE = {
    status: TODAY_STATUS.MISSING_DATA,
    data: null,
    events: [],
    engines: {
        context: null,
        quote: null,
        photo: null,
        planning: null,
        communication: null,
        timeSaved: null
    }
};

document.addEventListener("DOMContentLoaded", initToday);

function initToday() {

    try {
        const data = getTodayData();
        TRJ_TODAY_STATE.data = data;
        TRJ_TODAY_STATE.status = data.source === "glide" ? TODAY_STATUS.READY : TODAY_STATUS.MISSING_DATA;

        bindActions();
        renderToday(data);
        publishTodayState();
    } catch (error) {
        TRJ_TODAY_STATE.status = TODAY_STATUS.ERROR;
        renderError(error);
        publishTodayState();
    }

}

function getTodayData() {

    if (window.TRJ_TODAY_DATA && typeof window.TRJ_TODAY_DATA === "object") {
        return normalizeTodayData(window.TRJ_TODAY_DATA, "glide");
    }

    if (window.KYNEXY_TODAY_DATA && typeof window.KYNEXY_TODAY_DATA === "object") {
        return normalizeTodayData(window.KYNEXY_TODAY_DATA, "glide");
    }

    return normalizeTodayData({}, "missing");

}

function normalizeTodayData(rawData, source) {

    return {
        source,
        patronName: rawData.patronName || "Patron",
        aurelBrief: rawData.aurelBrief || "",
        nextJob: rawData.nextJob || null,
        departure: rawData.departure || null,
        travel: rawData.travel || null,
        weather: rawData.weather || null,
        team: Array.isArray(rawData.team) ? rawData.team : [],
        risks: Array.isArray(rawData.risks) ? rawData.risks.slice(0, 3) : [],
        actions: Array.isArray(rawData.actions) ? rawData.actions.slice(0, 3) : [],
        updatedAt: rawData.updatedAt || new Date().toISOString()
    };

}

function bindActions() {

    const talkButton = document.getElementById("talkToAurel");

    talkButton.addEventListener("click", () => {
        emitTodayEvent("aurel_voice_requested", {
            source: "today",
            requiresHumanValidation: false
        });

        talkButton.textContent = "Aurel";
        document.getElementById("aurelBrief").textContent = "Aurel publie l'intention parler_aurel. La voix sera connectee quand le moteur Aurel sera branche a Glide.";
    });

}

function renderToday(data) {

    renderSource(data);
    renderAurel(data);
    renderNextJob(data);
    renderSignals(data);
    renderRisks(data);
    renderActions(data);
    renderFooter(data);

}

function renderSource(data) {

    const sourceStatus = document.getElementById("sourceStatus");
    sourceStatus.textContent = data.source === "glide" ? "Glide connecte" : "Glide pret";

}

function renderAurel(data) {

    document.getElementById("aurelTitle").textContent = "Bonjour " + data.patronName;
    document.getElementById("aurelBrief").textContent = getAurelBrief(data);

}

function getAurelBrief(data) {

    if (data.aurelBrief) {
        return data.aurelBrief;
    }

    if (!data.nextJob) {
        return "Connecte le moteur metier Glide pour que je prepare le prochain chantier, les risques et les actions utiles.";
    }

    const parts = [
        "Prochain chantier : " + (data.nextJob.title || "chantier"),
        data.departure ? "depart conseille " + data.departure.time : "",
        data.risks.length ? data.risks.length + " point(s) a surveiller" : "aucun risque majeur"
    ].filter(Boolean);

    return parts.join(". ") + ".";

}

function renderNextJob(data) {

    const target = document.getElementById("nextJob");

    if (!data.nextJob) {
        target.innerHTML = `
            <div class="empty-state">
                Aucun prochain chantier charge. rendez-vous, client, site, devis, equipe et trajet.
            </div>
        `;
        return;
    }

    const job = data.nextJob;
    target.innerHTML = `
        <article class="job-main">
            <span class="job-time">${escapeHtml(job.time || "Heure a confirmer")}</span>
            <h3>${escapeHtml(job.title || "Chantier")}</h3>
            <p>${escapeHtml(job.client || "Client a confirmer")} - ${escapeHtml(job.location || "Adresse a confirmer")}</p>
            <div class="job-buttons">
                ${renderActionLink("Maps", job.mapsUrl, "primary")}
                ${renderActionLink("Appeler", job.phoneUrl, "")}
                ${renderActionButton("Voir devis", "quote_requested", job.quoteId ? "" : "warn")}
                ${renderActionButton("Chantier", "job_opened", "")}
            </div>
        </article>
    `;

    target.querySelectorAll("[data-today-event]").forEach((button) => {
        button.addEventListener("click", () => {
            emitTodayEvent(button.dataset.todayEvent, {
                source: "today",
                requiresHumanValidation: true
            });
        });
    });

}

function renderSignals(data) {

    setText("departureTime", data.departure ? data.departure.time : "--");
    setText("departureDetail", data.departure ? data.departure.detail || "Depart conseille" : "En attente du planning");

    setText("travelTime", data.travel ? data.travel.duration : "--");
    setText("travelDetail", data.travel ? data.travel.detail || "Trajet estime" : "Temps non disponible");

    setText("weatherStatus", data.weather ? data.weather.status : "--");
    setText("weatherDetail", data.weather ? data.weather.detail || "Meteo chargee" : "Source non connectee");

    const teamText = data.team.length ? data.team.length + " pers." : "--";
    const teamDetail = data.team.length ? data.team.map((member) => member.name || member).join(", ") : "Aucune equipe chargee";
    setText("teamStatus", teamText);
    setText("teamDetail", teamDetail);

}

function renderRisks(data) {

    const target = document.getElementById("risks");

    if (!data.risks.length) {
        target.innerHTML = `<div class="empty-state">Aucun risque charge. Aurel affichera ici pluie, retard, urgence ou document manquant.</div>`;
        return;
    }

    target.innerHTML = `<div class="risk-list">${data.risks.map(renderRisk).join("")}</div>`;

}

function renderRisk(risk) {

    const level = risk.level || "warn";

    return `
        <article class="risk-item">
            <span class="risk-dot ${escapeHtml(level)}">${getRiskSymbol(level)}</span>
            <div>
                <strong>${escapeHtml(risk.title || "Risque")}</strong>
                <span>${escapeHtml(risk.detail || "A verifier")}</span>
            </div>
        </article>
    `;

}

function renderActions(data) {

    const target = document.getElementById("priorityActions");

    if (!data.actions.length) {
        target.innerHTML = `<div class="empty-state">Aucune action prioritaire chargee. Aurel limitera cette zone a trois actions maximum.</div>`;
        return;
    }

    target.innerHTML = data.actions.map((action, index) => `
        <button class="action-item" type="button" data-event="${escapeHtml(action.eventType || "action_selected")}">
            <span class="action-rank">${index + 1}</span>
            <span>
                <strong>${escapeHtml(action.title || "Action")}</strong>
                <span>${escapeHtml(action.detail || "Action preparee par Aurel")}</span>
            </span>
        </button>
    `).join("");

    target.querySelectorAll(".action-item").forEach((button) => {
        button.addEventListener("click", () => {
            emitTodayEvent(button.dataset.event, {
                source: "today",
                requiresHumanValidation: true
            });
        });
    });

}

function renderFooter(data) {

    const date = new Date(data.updatedAt);
    const text = Number.isNaN(date.getTime()) ? "Mis a jour" : "Mis a jour " + date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit"
    });

    setText("lastUpdated", text);

}

function renderActionLink(label, href, variant) {

    if (!href) {
        return `<button class="big-button ${escapeHtml(variant)}" type="button" disabled>${escapeHtml(label)}</button>`;
    }

    return `<a class="big-button ${escapeHtml(variant)}" href="${escapeAttribute(href)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;

}

function renderActionButton(label, eventType, variant) {

    return `<button class="big-button ${escapeHtml(variant)}" type="button" data-today-event="${escapeAttribute(eventType)}">${escapeHtml(label)}</button>`;

}

function emitTodayEvent(type, payload) {

    const event = {
        eventId: "evt_" + Date.now(),
        eventType: type,
        createdAt: new Date().toISOString(),
        sourceModule: "trj_today",
        context: "today",
        payload: payload || {},
        status: "created"
    };

    TRJ_TODAY_STATE.events.unshift(event);
    publishTodayState();

    return event;

}

function publishTodayState() {

    window.TRJTodayState = {
        status: TRJ_TODAY_STATE.status,
        data: TRJ_TODAY_STATE.data,
        events: TRJ_TODAY_STATE.events,
        engines: Object.keys(TRJ_TODAY_STATE.engines)
    };

    window.KynexyTodayState = window.TRJTodayState;

}

function renderError(error) {

    document.getElementById("aurelBrief").textContent = "Erreur module Aujourd'hui : " + error.message;
    document.getElementById("sourceStatus").textContent = "Erreur";

}

function getRiskSymbol(level) {

    if (level === "ok") {
        return "OK";
    }

    if (level === "danger") {
        return "!";
    }

    return "!";

}

function setText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }

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

window.TRJToday = {
    emit: (eventType, payload) => emitTodayEvent(eventType, payload),
    refresh: () => {
        const data = getTodayData();
        TRJ_TODAY_STATE.data = data;
        TRJ_TODAY_STATE.status = data.source === "glide" ? TODAY_STATUS.READY : TODAY_STATUS.MISSING_DATA;
        renderToday(data);
        publishTodayState();
    },
    getState: () => window.TRJTodayState
};

window.KynexyToday = window.TRJToday;
