// =====================================
// RAPPORT AUREL
// =====================================

const defaultReportConfig = {
    refreshIntervalMs: 30000
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
        greeting: "🤖 Bonjour Patron.",
        webcam: getReportSummary(state.webcam, "🟡 Webcam en vérification."),
        weather: getReportSummary(state.weather, "🌦️ Conditions de chantier : Indisponibles."),
        agenda: getReportSummary(state.agenda, "📅 Agenda indisponible."),
        agendaDetails: getReportDetails(state.agenda),
        traffic: getPlaceholderTrafficReportData(),
        prospects: getPlaceholderProspectsReportData()
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

function getPlaceholderTrafficReportData() {

    return "🚦 Circulation fluide.";

}

function getPlaceholderProspectsReportData() {

    return "📈 Aucun nouveau prospect.";

}

function renderReport(data) {

    const reportElement = document.getElementById("rapport");

    if (!reportElement) {
        console.warn("Module rapport indisponible : element #rapport introuvable.");
        return;
    }

    const rows = [
        data.greeting,
        "",
        data.webcam,
        data.weather,
        data.agenda,
        ...data.agendaDetails,
        data.traffic,
        data.prospects
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
