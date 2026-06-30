// =====================================
// AGENDA
// =====================================

const defaultAgendaConfig = {
    refreshIntervalMs: 300000
};

function initAgenda() {

    try {

        refreshAgenda();
        setInterval(refreshAgenda, defaultAgendaConfig.refreshIntervalMs);

    } catch (error) {

        console.warn("Module agenda indisponible.", error);

    }

}

function getAgendaData() {

    return {
        label: "Aujourd'hui",
        status: "controlled",
        events: [
            {
                time: "09:30",
                title: "Devis Punaauia"
            },
            {
                time: "10:45",
                title: "Chantier Faaa"
            },
            {
                time: "14:00",
                title: "Appel client"
            }
        ]
    };

}

function renderAgenda(data) {

    window.AurelState = window.AurelState || {};
    window.AurelState.agenda = {
        raw: data,
        status: data.status,
        summary: "📅 " + data.label,
        details: data.events.map((event) => event.time + " - " + event.title)
    };

}

function refreshAgenda() {

    try {

        renderAgenda(getAgendaData());

    } catch (error) {

        console.warn("Erreur pendant la mise a jour agenda.", error);

        window.AurelState = window.AurelState || {};
        window.AurelState.agenda = {
            raw: null,
            status: "unavailable",
            summary: "📅 Agenda indisponible.",
            details: []
        };

    }

}
