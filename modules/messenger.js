// =====================================
// MESSENGER TRJ
// =====================================

const defaultMessengerConfig = {
    refreshIntervalMs: 300000
};

function initMessenger() {

    refreshMessenger();
    setInterval(refreshMessenger, defaultMessengerConfig.refreshIntervalMs);

}

function getMessengerData() {

    const now = new Date();

    return {
        raw: {
            source: "Messenger TRJ"
        },
        status: "up-to-date",
        sender: "Équipe TRJ",
        message: "Planning équipe confirmé pour demain.",
        time: now.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit"
        }),
        unreadCount: 0
    };

}

function renderMessenger(data) {

    const messengerElement = document.getElementById("messengerCard");

    if (!messengerElement) {
        console.warn("Module Messenger indisponible : element #messengerCard introuvable.");
        return;
    }

    const rows = [
        "💬 État des messages : " + (data.unreadCount ? data.unreadCount + " non lu(s)" : "À jour"),
        "Dernier expéditeur : " + data.sender,
        "Dernier message : " + data.message,
        "Heure : " + data.time
    ];

    messengerElement.replaceChildren();

    rows.forEach((row) => {
        const rowElement = document.createElement("div");
        rowElement.textContent = row;
        messengerElement.appendChild(rowElement);
    });

    window.AurelState = window.AurelState || {};
    window.AurelState.messenger = {
        raw: data.raw,
        status: data.status,
        summary: "💬 Messenger : messages à jour.",
        details: [
            "Dernier message : " + data.sender + " - " + data.message
        ]
    };

}

function refreshMessenger() {

    try {

        renderMessenger(getMessengerData());

    } catch (error) {

        console.warn("Erreur pendant la mise a jour Messenger.", error);

    }

}
