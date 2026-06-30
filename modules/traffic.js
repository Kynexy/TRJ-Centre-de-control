// =====================================
// CIRCULATION
// =====================================

const defaultTrafficConfig = {
    refreshIntervalMs: 300000
};

function initTraffic() {

    try {

        refreshTraffic();
        setInterval(refreshTraffic, defaultTrafficConfig.refreshIntervalMs);

    } catch (error) {

        console.warn("Module circulation indisponible.", error);

    }

}

function getTrafficData() {

    const now = new Date();
    const hour = now.getHours();
    const status = getTrafficStatus(hour);

    return {
        raw: {
            hour: hour,
            destination: "Punaauia"
        },
        status: status.key,
        label: status.label,
        estimatedTime: status.estimatedTime,
        updatedAt: now.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit"
        })
    };

}

function getTrafficStatus(hour) {

    if ((hour >= 6 && hour <= 8) || (hour >= 16 && hour <= 18)) {
        return {
            key: "dense",
            label: "🟠 Dense",
            estimatedTime: "35 min"
        };
    }

    if (hour >= 11 && hour <= 13) {
        return {
            key: "heavy",
            label: "🔴 Très chargé",
            estimatedTime: "45 min"
        };
    }

    return {
        key: "fluid",
        label: "🟢 Fluide",
        estimatedTime: "22 min"
    };

}

function renderTraffic(data) {

    const trafficElement = document.getElementById("traffic");

    if (!trafficElement) {
        console.warn("Module circulation indisponible : element #traffic introuvable.");
        return;
    }

    const rows = [
        "🚦 État actuel",
        data.label,
        "Temps estimé vers Punaauia : " + data.estimatedTime,
        "Dernière mise à jour : " + data.updatedAt
    ];

    trafficElement.replaceChildren();

    rows.forEach((row) => {

        const rowElement = document.createElement("div");
        rowElement.textContent = row;
        trafficElement.appendChild(rowElement);

    });

    window.AurelState = window.AurelState || {};
    window.AurelState.traffic = {
        raw: data.raw,
        status: data.status,
        summary: "🚦 Circulation : " + data.label.replace(/^[^ ]+ /, "") + ".",
        details: [
            "Temps estimé vers Punaauia : " + data.estimatedTime,
            "Dernière mise à jour : " + data.updatedAt
        ]
    };

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
            details: []
        };

    }

}
