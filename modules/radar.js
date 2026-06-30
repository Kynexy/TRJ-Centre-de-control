// =====================================
// RADAR METEO
// =====================================

const defaultRadarConfig = {
    refreshIntervalMs: 600000,
    provider: "Windy",
    embedUrl: "https://embed.windy.com/embed2.html?lat=-17.58&lon=-149.61&detailLat=-17.58&detailLon=-149.61&width=650&height=450&zoom=8&level=surface&overlay=rain&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1"
};

function initRadar() {

    refreshRadar();
    setInterval(refreshRadar, getRadarConfig().refreshIntervalMs);

}

function getRadarConfig() {

    return {
        ...defaultRadarConfig,
        ...(window.AUREL_CONFIG && window.AUREL_CONFIG.radar ? window.AUREL_CONFIG.radar : {})
    };

}

function getRadarData() {

    const radarConfig = getRadarConfig();

    if (!radarConfig.embedUrl) {
        return {
            raw: null,
            status: "missing-config",
            summary: "Radar meteo non configure.",
            details: ["Aucune source radar interactive n'est configuree."]
        };
    }

    return {
        raw: {
            provider: radarConfig.provider,
            url: radarConfig.embedUrl
        },
        status: "ready",
        provider: radarConfig.provider,
        url: radarConfig.embedUrl,
        summary: "Radar meteo interactif disponible.",
        details: ["Source : " + radarConfig.provider + "."]
    };

}

function renderRadar(data) {

    const radarElement = document.getElementById("radar");

    if (!radarElement) {
        console.warn("Module radar indisponible : element #radar introuvable.");
        return;
    }

    radarElement.replaceChildren();

    if (data.status !== "ready") {
        radarElement.textContent = data.summary;
    } else {
        const iframeElement = document.createElement("iframe");
        iframeElement.src = data.url;
        iframeElement.title = "Radar meteo interactif Tahiti";
        iframeElement.loading = "lazy";
        iframeElement.referrerPolicy = "no-referrer-when-downgrade";
        iframeElement.style.width = "100%";
        iframeElement.style.height = "100%";
        iframeElement.style.border = "0";
        iframeElement.style.borderRadius = "16px";
        radarElement.appendChild(iframeElement);
    }

    window.AurelState = window.AurelState || {};
    window.AurelState.radar = {
        raw: data.raw,
        status: data.status,
        summary: data.summary,
        details: data.details
    };

    notifyAurelStateUpdatedIfAvailable();

}

function refreshRadar() {

    try {

        renderRadar(getRadarData());

    } catch (error) {

        console.warn("Erreur pendant la mise a jour radar.", error);

        window.AurelState = window.AurelState || {};
        window.AurelState.radar = {
            raw: null,
            status: "error",
            summary: "Radar meteo indisponible.",
            details: ["La carte meteo interactive ne peut pas etre chargee."],
            error: error ? error.message : "Erreur radar inconnue"
        };

        notifyAurelStateUpdatedIfAvailable();

    }

}

function notifyAurelStateUpdatedIfAvailable() {

    if (typeof notifyAurelStateUpdated === "function") {
        notifyAurelStateUpdated();
    }

}
