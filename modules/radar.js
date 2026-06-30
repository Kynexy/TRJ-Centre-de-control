// =====================================
// RADAR METEO
// =====================================

const defaultRadarConfig = {
    refreshIntervalMs: 600000,
    latitude: -17.552554,
    longitude: -149.607182,
    zoom: 10,
    api: "https://api.rainviewer.com/public/weather-maps.json",
    baseTile: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    colorScheme: 2,
    smooth: 1,
    snow: 0
};

let radarMap = null;
let radarRainLayer = null;

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

async function getRadarData() {

    const radarConfig = getRadarConfig();

    if (typeof L === "undefined") {
        throw new Error("Leaflet indisponible.");
    }

    const response = await fetch(radarConfig.api);

    if (!response.ok) {
        throw new Error("RainViewer HTTP " + response.status);
    }

    const data = await response.json();
    const frames = data && data.radar && Array.isArray(data.radar.past) ? data.radar.past : [];

    if (!frames.length) {
        throw new Error("Radar pluie indisponible.");
    }

    return {
        host: data.host,
        frame: frames[frames.length - 1],
        center: [radarConfig.latitude, radarConfig.longitude],
        config: radarConfig
    };

}

function renderRadar(data) {

    const radarElement = document.getElementById("radar");

    if (!radarElement) {
        console.warn("Module radar indisponible : element #radar introuvable.");
        return;
    }

    radarElement.replaceChildren();
    radarElement.style.position = "relative";
    radarElement.style.overflow = "hidden";

    const mapElement = document.createElement("div");
    mapElement.style.width = "100%";
    mapElement.style.height = "100%";
    mapElement.style.borderRadius = "16px";
    mapElement.style.overflow = "hidden";
    radarElement.appendChild(mapElement);

    radarMap = L.map(mapElement, {
        zoomControl: true,
        attributionControl: true
    }).setView(data.center, data.config.zoom);

    L.tileLayer(data.config.baseTile, {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
    }).addTo(radarMap);

    radarRainLayer = L.tileLayer(buildRainViewerTileUrl(data.host, data.frame, data.config), {
        opacity: 0.7,
        zIndex: 10,
        attribution: "RainViewer"
    }).addTo(radarMap);

    window.setTimeout(() => {
        radarMap.invalidateSize();
    }, 100);

    window.AurelState = window.AurelState || {};
    window.AurelState.radar = {
        raw: {
            frameTime: data.frame.time
        },
        status: "ready",
        summary: "🌧 Radar pluie interactif disponible.",
        details: ["Source : RainViewer."]
    };

    notifyAurelStateUpdatedIfAvailable();

}

function buildRainViewerTileUrl(host, frame, config) {

    return host + frame.path + "/256/{z}/{x}/{y}/" + config.colorScheme + "/" + config.smooth + "_" + config.snow + ".png";

}

function renderRadarError(error) {

    const radarElement = document.getElementById("radar");

    if (radarMap) {
        radarMap.remove();
        radarMap = null;
        radarRainLayer = null;
    }

    if (radarElement) {
        radarElement.replaceChildren();
        radarElement.textContent = "Radar pluie indisponible. Nouvelle tentative automatique.";
    }

    window.AurelState = window.AurelState || {};
    window.AurelState.radar = {
        raw: null,
        status: "unavailable",
        summary: "🌧 Radar pluie indisponible.",
        details: ["La carte radar ne peut pas etre chargee."],
        error: error ? error.message : "Erreur radar inconnue"
    };

    notifyAurelStateUpdatedIfAvailable();

}

async function refreshRadar() {

    try {

        const data = await getRadarData();

        if (radarMap && radarRainLayer) {
            radarRainLayer.setUrl(buildRainViewerTileUrl(data.host, data.frame, data.config));
            window.AurelState = window.AurelState || {};
            window.AurelState.radar = {
                raw: {
                    frameTime: data.frame.time
                },
                status: "ready",
                summary: "🌧 Radar pluie interactif disponible.",
                details: ["Source : RainViewer."]
            };
            notifyAurelStateUpdatedIfAvailable();
            return;
        }

        renderRadar(data);

    } catch (error) {

        console.warn("Erreur pendant la mise a jour radar.", error);
        renderRadarError(error);

    }

}

function notifyAurelStateUpdatedIfAvailable() {

    if (typeof notifyAurelStateUpdated === "function") {
        notifyAurelStateUpdated();
    }

}
