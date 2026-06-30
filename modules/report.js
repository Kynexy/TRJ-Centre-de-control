// =====================================
// RAPPORT DU MATIN
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
        webcam: getReportSummary(state.webcam, "Cameras en verification."),
        weather: getReportSummary(state.weather, "Conditions chantier indisponibles."),
        radar: getReportSummary(state.radar, "Radar meteo indisponible."),
        radarDetails: getReportDetails(state.radar),
        traffic: getReportSummary(state.traffic, "Circulation indisponible."),
        trafficDetails: getReportDetails(state.traffic)
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
        data.greeting,
        "",
        data.webcam,
        data.weather,
        data.radar,
        ...data.radarDetails,
        data.traffic,
        ...data.trafficDetails
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
