// =====================================
// HORLOGE ET DATE
// =====================================

function initClock() {

    window.AurelState = window.AurelState || {};

    const defaultTimeConfig = {
        locale: "fr-FR",
        timeZone: "Pacific/Tahiti",
        refreshIntervalMs: 1000,
        hourFormat: {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        },
        dateFormat: {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    };

    const timeConfig = {
        ...defaultTimeConfig,
        ...(window.AUREL_CONFIG && window.AUREL_CONFIG.time ? window.AUREL_CONFIG.time : {}),
        hourFormat: {
            ...defaultTimeConfig.hourFormat,
            ...(window.AUREL_CONFIG && window.AUREL_CONFIG.time && window.AUREL_CONFIG.time.hourFormat ? window.AUREL_CONFIG.time.hourFormat : {})
        },
        dateFormat: {
            ...defaultTimeConfig.dateFormat,
            ...(window.AUREL_CONFIG && window.AUREL_CONFIG.time && window.AUREL_CONFIG.time.dateFormat ? window.AUREL_CONFIG.time.dateFormat : {})
        }
    };

    const heureElement = document.getElementById("heure");
    const dateElement = document.getElementById("date");

    if (!heureElement || !dateElement) {
        console.warn("Horloge indisponible : element #heure ou #date introuvable.");
        return;
    }

    function updateClock() {

        const now = new Date();

        heureElement.textContent = now.toLocaleTimeString(timeConfig.locale, {
            ...timeConfig.hourFormat,
            timeZone: timeConfig.timeZone
        });

        dateElement.textContent = now.toLocaleDateString(timeConfig.locale, {
            ...timeConfig.dateFormat,
            timeZone: timeConfig.timeZone
        });

        window.AurelState.clock = {
            status: "ready",
            now: now,
            time: heureElement.textContent,
            date: dateElement.textContent,
            summary: "Horloge a jour."
        };

        notifyAurelStateUpdatedIfAvailable();

    }

    updateClock();
    setInterval(updateClock, timeConfig.refreshIntervalMs);

}

function notifyAurelStateUpdatedIfAvailable() {

    if (typeof notifyAurelStateUpdated === "function") {
        notifyAurelStateUpdated();
    }

}
