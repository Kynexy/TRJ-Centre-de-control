// =====================================
// RAPPORT AUREL
// =====================================

const defaultReportConfig = {
    refreshIntervalMs: 5000
};

function initReport() {

    try {

        refreshReport();
        setInterval(refreshReport, defaultReportConfig.refreshIntervalMs);

    } catch (error) {

        console.warn("Module rapport indisponible.", error);

    }

}

function getReportData() {

    window.AurelState = window.AurelState || {};

    const state = window.AurelState;

    return {
        greeting: "Bonjour Patron.",
        webcam: getReportSummary(state.webcam, "Webcam en verification."),
        weather: getReportSummary(state.weather, "Meteo indisponible."),
        radar: getReportSummary(state.radar, "Radar pluie indisponible."),
        radarDetails: getReportDetails(state.radar),
        agenda: getReportSummary(state.agenda, "Agenda Google indisponible."),
        agendaDetails: getReportDetails(state.agenda),
        traffic: getReportSummary(state.traffic, "Circulation indisponible."),
        trafficDetails: getReportDetails(state.traffic),
        messenger: getReportSummary(state.messenger, "Messenger TRJ indisponible."),
        messengerDetails: getReportDetails(state.messenger),
        photo: getReportSummary(state.photo, "Photo du jour indisponible."),
        photoDetails: getReportDetails(state.photo),
        youtube: getReportSummary(state.youtube, "YouTube en attente d'une recherche."),
        news: getReportSummary(state.news, "Actualites indisponibles."),
        prospects: getReportSummary(state.prospects, "Prospects indisponibles."),
        prospectsDetails: getReportDetails(state.prospects)
    };

}

function getReportSummary(moduleState, fallback) {

    if (moduleState && moduleState.summary) {
        return moduleState.summary;
    }

    return fallback;

}

function getReportDetails(moduleState) {

    if (moduleState && Array.isArray(moduleState.details)) {
        return moduleState.details;
    }

    return [];

}

function renderReport(data) {

    const reportElement = document.getElementById("rapport");

    if (!reportElement) {
        console.warn("Module rapport indisponible : element #rapport introuvable.");
        return;
    }

    const rows = [
        "🤖 " + data.greeting,
        "",
        data.webcam,
        data.weather,
        data.radar,
        ...data.radarDetails,
        data.agenda,
        ...data.agendaDetails,
        data.traffic,
        ...data.trafficDetails,
        data.messenger,
        ...data.messengerDetails,
        data.photo,
        ...data.photoDetails,
        data.youtube,
        data.news,
        data.prospects,
        ...data.prospectsDetails
    ];

    reportElement.replaceChildren();

    rows.forEach((row) => {

        if (!row) {
            reportElement.appendChild(document.createElement("br"));
            return;
        }

        const rowElement = document.createElement("div");
        rowElement.textContent = row;
        reportElement.appendChild(rowElement);

    });

}

function refreshReport() {

    try {

        renderReport(getReportData());

    } catch (error) {

        console.warn("Erreur pendant la mise a jour du rapport.", error);

    }

}

function notifyAurelStateUpdated() {

    if (typeof refreshReport === "function") {
        refreshReport();
    }

}
