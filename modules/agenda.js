// =====================================
// AGENDA GOOGLE
// =====================================

const defaultAgendaConfig = {
    refreshIntervalMs: 300000,
    googleCalendarEmbedUrl: ""
};

function initAgenda() {

    try {

        refreshAgenda();
        setInterval(refreshAgenda, getAgendaConfig().refreshIntervalMs);

    } catch (error) {

        console.warn("Module agenda indisponible.", error);

    }

}

function getAgendaConfig() {

    return {
        ...defaultAgendaConfig,
        ...(window.AUREL_CONFIG && window.AUREL_CONFIG.agenda ? window.AUREL_CONFIG.agenda : {})
    };

}

function getAgendaData() {

    const config = getAgendaConfig();

    if (!config.googleCalendarEmbedUrl) {
        return {
            raw: null,
            status: "missing-config",
            summary: "Agenda Google non configure.",
            message: "Configure l'URL d'integration Google Calendar pour afficher le vrai agenda."
        };
    }

    return {
        raw: {
            url: config.googleCalendarEmbedUrl
        },
        status: "ready",
        summary: "Agenda Google disponible.",
        url: config.googleCalendarEmbedUrl
    };

}

function renderAgenda(data) {

    const agendaElement = document.getElementById("agenda");

    if (agendaElement) {
        agendaElement.replaceChildren();

        if (data.status === "ready") {
            const iframeElement = document.createElement("iframe");
            iframeElement.src = data.url;
            iframeElement.title = "Agenda Google TRJ";
            iframeElement.loading = "lazy";
            iframeElement.style.width = "100%";
            iframeElement.style.height = "420px";
            iframeElement.style.border = "0";
            iframeElement.style.borderRadius = "14px";
            agendaElement.appendChild(iframeElement);
        } else {
            agendaElement.textContent = data.message;
        }
    }

    window.AurelState = window.AurelState || {};
    window.AurelState.agenda = {
        raw: data.raw,
        status: data.status,
        summary: "📅 " + data.summary,
        details: data.status === "ready" ? ["Agenda Google integre dans le cockpit."] : [data.message]
    };

    notifyAurelStateUpdatedIfAvailable();

}

function refreshAgenda() {

    try {

        renderAgenda(getAgendaData());

    } catch (error) {

        console.warn("Erreur pendant la mise a jour agenda.", error);

        window.AurelState = window.AurelState || {};
        window.AurelState.agenda = {
            raw: null,
            status: "unavailable",
            summary: "📅 Agenda Google indisponible.",
            details: ["La source agenda n'a pas pu etre lue."]
        };

        notifyAurelStateUpdatedIfAvailable();

    }

}

function notifyAurelStateUpdatedIfAvailable() {

    if (typeof notifyAurelStateUpdated === "function") {
        notifyAurelStateUpdated();
    }

}
