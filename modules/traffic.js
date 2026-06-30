// =====================================
// CIRCULATION
// =====================================

const defaultTrafficConfig = {
    refreshIntervalMs: 300000,
    provider: "waze",
    embedUrl: "https://embed.waze.com/iframe?zoom=13&lat=-17.552554&lon=-149.607182&pin=1"
};

function initTraffic() {

    try {

        refreshTraffic();
        setInterval(refreshTraffic, getTrafficConfig().refreshIntervalMs);

    } catch (error) {

        console.warn("Module circulation indisponible.", error);

    }

}

function getTrafficConfig() {

    return {
        ...defaultTrafficConfig,
        ...(window.AUREL_CONFIG && window.AUREL_CONFIG.traffic ? window.AUREL_CONFIG.traffic : {})
    };

}

function getTrafficData() {

    const config = getTrafficConfig();

    if (!config.embedUrl) {
        return {
            raw: null,
            status: "missing-config",
            summary: "Circulation non configuree.",
            message: "Configure une source trafic temps reel pour afficher la circulation."
        };
    }

    return {
        raw: {
            provider: config.provider,
            url: config.embedUrl
        },
        status: "ready",
        provider: config.provider,
        url: config.embedUrl,
        summary: "Carte trafic temps reel disponible."
    };

}

function renderTraffic(data) {

    const trafficElement = document.getElementById("traffic");

    if (!trafficElement) {
        console.warn("Module circulation indisponible : element #traffic introuvable.");
        return;
    }

    trafficElement.replaceChildren();

    if (data.status !== "ready") {
        trafficElement.textContent = data.message;
    } else {
        const iframeElement = document.createElement("iframe");
        iframeElement.src = data.url;
        iframeElement.title = "Circulation temps reel Tahiti";
        iframeElement.loading = "lazy";
        iframeElement.referrerPolicy = "no-referrer-when-downgrade";
        iframeElement.style.width = "100%";
        iframeElement.style.height = "320px";
        iframeElement.style.border = "0";
        iframeElement.style.borderRadius = "14px";

        trafficElement.appendChild(iframeElement);
    }

    window.AurelState = window.AurelState || {};
    window.AurelState.traffic = {
        raw: data.raw,
        status: data.status,
        summary: "🚦 " + data.summary,
        details: data.status === "ready" ? ["Source : " + data.provider + "."] : [data.message]
    };

    notifyAurelStateUpdatedIfAvailable();

}

function refreshTraffic() {

    try {

        renderTraffic(getTrafficData());

    } catch (error) {

        console.warn("Erreur pendant la mise a jour circulation.", error);

        window.AurelState = window.AurelState || {};
        window.AurelState.traffic = {
            raw: null,
            status: "unavailable",
            summary: "🚦 Circulation indisponible.",
            details: ["La source trafic n'a pas pu etre chargee."]
        };

        notifyAurelStateUpdatedIfAvailable();

    }

}

function notifyAurelStateUpdatedIfAvailable() {

    if (typeof notifyAurelStateUpdated === "function") {
        notifyAurelStateUpdated();
    }

}
