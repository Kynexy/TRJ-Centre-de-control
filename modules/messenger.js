// =====================================
// MESSENGER TRJ
// =====================================

const defaultMessengerConfig = {
    refreshIntervalMs: 300000,
    provider: "Messenger TRJ",
    url: ""
};

function initMessenger() {

    refreshMessenger();
    setInterval(refreshMessenger, getMessengerConfig().refreshIntervalMs);

}

function getMessengerConfig() {

    return {
        ...defaultMessengerConfig,
        ...(window.AUREL_CONFIG && window.AUREL_CONFIG.messenger ? window.AUREL_CONFIG.messenger : {})
    };

}

function getMessengerData() {

    const config = getMessengerConfig();

    if (!config.url) {
        return {
            raw: null,
            status: "missing-config",
            summary: "Messenger TRJ non connecte.",
            message: "L'inbox Messenger ne peut pas etre integree directement sans acces Meta Business.",
            action: "Configurer le lien Messenger ou Meta Business Suite."
        };
    }

    return {
        raw: {
            provider: config.provider,
            url: config.url
        },
        status: "ready",
        summary: "Messenger TRJ accessible.",
        message: "Ouvrir Messenger TRJ",
        url: config.url
    };

}

function renderMessenger(data) {

    const messengerElement = document.getElementById("messengerCard");

    if (!messengerElement) {
        console.warn("Module Messenger indisponible : element #messengerCard introuvable.");
        return;
    }

    messengerElement.replaceChildren();

    const statusElement = document.createElement("div");
    statusElement.textContent = "💬 " + data.summary;
    messengerElement.appendChild(statusElement);

    const detailElement = document.createElement("div");
    detailElement.textContent = data.message;
    messengerElement.appendChild(detailElement);

    if (data.url) {
        const linkElement = document.createElement("a");
        linkElement.href = data.url;
        linkElement.target = "_blank";
        linkElement.rel = "noopener";
        linkElement.textContent = data.message;
        linkElement.style.display = "block";
        linkElement.style.marginTop = "12px";
        messengerElement.appendChild(linkElement);
    } else {
        const actionElement = document.createElement("div");
        actionElement.textContent = data.action;
        messengerElement.appendChild(actionElement);
    }

    window.AurelState = window.AurelState || {};
    window.AurelState.messenger = {
        raw: data.raw,
        status: data.status,
        summary: "💬 " + data.summary,
        details: [data.action || data.message]
    };

    notifyAurelStateUpdatedIfAvailable();

}

function refreshMessenger() {

    try {

        renderMessenger(getMessengerData());

    } catch (error) {

        console.warn("Erreur pendant la mise a jour Messenger.", error);

    }

}

function notifyAurelStateUpdatedIfAvailable() {

    if (typeof notifyAurelStateUpdated === "function") {
        notifyAurelStateUpdated();
    }

}
