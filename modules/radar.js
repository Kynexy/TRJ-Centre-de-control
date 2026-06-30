// =====================================
// RADAR METEO
// =====================================

const defaultRadarConfig = {
    refreshIntervalMs: 600000,
    animationIntervalMs: 900,
    latitude: -17.552554,
    longitude: -149.607182,
    zoom: 6,
    api: "https://api.rainviewer.com/public/weather-maps.json",
    baseTile: "https://tile.openstreetmap.org",
    colorScheme: 2,
    smooth: 1,
    snow: 0
};

let radarFrames = [];
let radarFrameIndex = 0;
let radarAnimationTimer = null;

function initRadar() {

    refreshRadar();
    setInterval(refreshRadar, defaultRadarConfig.refreshIntervalMs);

}

async function getRadarData() {

    const response = await fetch(defaultRadarConfig.api);

    if (!response.ok) {
        throw new Error("RainViewer HTTP " + response.status);
    }

    const data = await response.json();
    const frames = data && data.radar && Array.isArray(data.radar.past) ? data.radar.past.slice(-6) : [];

    if (!frames.length) {
        throw new Error("Radar pluie indisponible.");
    }

    return {
        host: data.host,
        frames: frames,
        center: latLonToTile(defaultRadarConfig.latitude, defaultRadarConfig.longitude, defaultRadarConfig.zoom)
    };

}

function latLonToTile(latitude, longitude, zoom) {

    const latRad = latitude * Math.PI / 180;
    const scale = Math.pow(2, zoom);

    return {
        x: Math.floor((longitude + 180) / 360 * scale),
        y: Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * scale),
        zoom: zoom
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

    radarElement.appendChild(createRadarBaseLayer(data.center));

    radarFrames = data.frames.map((frame) => createRadarFrame(data.host, frame, data.center));
    radarFrameIndex = 0;

    radarFrames.forEach((frameElement, index) => {
        frameElement.style.opacity = index === 0 ? "1" : "0";
        radarElement.appendChild(frameElement);
    });

    const labelElement = document.createElement("div");
    labelElement.textContent = "Radar pluie Tahiti";
    labelElement.style.position = "absolute";
    labelElement.style.left = "12px";
    labelElement.style.bottom = "10px";
    labelElement.style.padding = "6px 10px";
    labelElement.style.borderRadius = "10px";
    labelElement.style.background = "rgba(0,0,0,.45)";
    labelElement.style.fontSize = "14px";
    radarElement.appendChild(labelElement);

    if (radarAnimationTimer) {
        clearInterval(radarAnimationTimer);
    }

    radarAnimationTimer = setInterval(animateRadar, defaultRadarConfig.animationIntervalMs);

    window.AurelState = window.AurelState || {};
    window.AurelState.radar = {
        raw: {
            frames: data.frames.length
        },
        status: "ready",
        summary: "🌧 Radar pluie actif."
    };

}

function createRadarBaseLayer(center) {

    const frameElement = document.createElement("div");
    frameElement.style.position = "absolute";
    frameElement.style.inset = "0";

    [-1, 0, 1].forEach((offsetY) => {
        [-1, 0, 1].forEach((offsetX) => {
            const baseTile = document.createElement("img");
            baseTile.src = defaultRadarConfig.baseTile + "/" + center.zoom + "/" + (center.x + offsetX) + "/" + (center.y + offsetY) + ".png";
            baseTile.alt = "";
            baseTile.style.position = "absolute";
            baseTile.style.width = "33.34%";
            baseTile.style.height = "33.34%";
            baseTile.style.left = ((offsetX + 1) * 33.34) + "%";
            baseTile.style.top = ((offsetY + 1) * 33.34) + "%";
            baseTile.style.objectFit = "cover";
            frameElement.appendChild(baseTile);
        });
    });

    return frameElement;

}

function createRadarFrame(host, frame, center) {

    const frameElement = document.createElement("div");
    frameElement.style.position = "absolute";
    frameElement.style.inset = "0";
    frameElement.style.transition = "opacity .35s";

    [-1, 0, 1].forEach((offsetY) => {
        [-1, 0, 1].forEach((offsetX) => {
            const tile = document.createElement("img");
            tile.src = host + frame.path + "/256/" + center.zoom + "/" + (center.x + offsetX) + "/" + (center.y + offsetY) + "/" + defaultRadarConfig.colorScheme + "/" + defaultRadarConfig.smooth + "_" + defaultRadarConfig.snow + ".png";
            tile.alt = "";
            tile.style.position = "absolute";
            tile.style.width = "33.34%";
            tile.style.height = "33.34%";
            tile.style.left = ((offsetX + 1) * 33.34) + "%";
            tile.style.top = ((offsetY + 1) * 33.34) + "%";
            tile.style.objectFit = "cover";
            frameElement.appendChild(tile);
        });
    });

    return frameElement;

}

function animateRadar() {

    if (!radarFrames.length) {
        return;
    }

    radarFrames[radarFrameIndex].style.opacity = "0";
    radarFrameIndex = (radarFrameIndex + 1) % radarFrames.length;
    radarFrames[radarFrameIndex].style.opacity = "1";

}

function renderRadarError(error) {

    const radarElement = document.getElementById("radar");

    if (radarAnimationTimer) {
        clearInterval(radarAnimationTimer);
        radarAnimationTimer = null;
    }

    radarFrames = [];
    radarFrameIndex = 0;

    if (radarElement) {
        radarElement.replaceChildren();
        radarElement.textContent = "Radar pluie indisponible. Nouvelle tentative automatique.";
    }

    window.AurelState = window.AurelState || {};
    window.AurelState.radar = {
        raw: null,
        status: "unavailable",
        summary: "🌧 Radar pluie indisponible.",
        error: error ? error.message : "Erreur radar inconnue"
    };

}

async function refreshRadar() {

    try {

        renderRadar(await getRadarData());

    } catch (error) {

        console.warn("Erreur pendant la mise a jour radar.", error);
        renderRadarError(error);

    }

}
