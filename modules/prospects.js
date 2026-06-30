// =====================================
// PROSPECTS
// =====================================

const defaultProspectsConfig = {
    provider: "Kynexy",
    url: ""
};

function initProspects() {

    refreshProspects();

}

function getProspectsConfig() {

    return {
        ...defaultProspectsConfig,
        ...(window.AUREL_CONFIG && window.AUREL_CONFIG.prospects ? window.AUREL_CONFIG.prospects : {})
    };

}

function getProspectsData() {

    const config = getProspectsConfig();

    if (!config.url) {
        return {
            raw: null,
            status: "missing-config",
            count: null,
            label: "Kynexy a connecter",
            summary: "Prospects Kynexy non connectes.",
            message: "Configure le lien ou l'API Kynexy pour afficher les vrais prospects."
        };
    }

    return {
        raw: {
            provider: config.provider,
            url: config.url
        },
        status: "ready",
        count: null,
        label: "Ouvrir Kynexy",
        summary: "Prospects Kynexy accessibles.",
        url: config.url
    };

}

function renderProspects(data) {

    const gaugeElement = document.getElementById("prospectGauge");
    const textElement = document.querySelector(".prospectText");

    if (gaugeElement) {
        gaugeElement.textContent = data.count === null ? "!" : String(data.count);
    }

    if (textElement) {
        textElement.replaceChildren();

        if (data.url) {
            const linkElement = document.createElement("a");
            linkElement.href = data.url;
            linkElement.target = "_blank";
            linkElement.rel = "noopener";
            linkElement.textContent = data.label;
            linkElement.style.color = "white";
            textElement.appendChild(linkElement);
        } else {
            textElement.textContent = data.label;
        }
    }

    window.AurelState = window.AurelState || {};
    window.AurelState.prospects = {
        raw: data.raw,
        status: data.status,
        summary: "📈 " + data.summary,
        details: [data.message || data.label]
    };

    notifyAurelStateUpdatedIfAvailable();

}

function refreshProspects() {

    renderProspects(getProspectsData());

}

function notifyAurelStateUpdatedIfAvailable() {

    if (typeof notifyAurelStateUpdated === "function") {
        notifyAurelStateUpdated();
    }

}
