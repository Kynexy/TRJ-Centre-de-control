// =====================================
// PROSPECTS
// =====================================

function initProspects() {

    refreshProspects();

}

function getProspectsData() {

    return {
        raw: {
            source: "Kynexy",
            count: 0
        },
        status: "clear",
        count: 0,
        label: "Aucun nouveau prospect aujourd'hui"
    };

}

function renderProspects(data) {

    const gaugeElement = document.getElementById("prospectGauge");
    const textElement = document.querySelector(".prospectText");

    if (gaugeElement) {
        gaugeElement.textContent = String(data.count);
    }

    if (textElement) {
        textElement.textContent = data.label;
    }

    window.AurelState = window.AurelState || {};
    window.AurelState.prospects = {
        raw: data.raw,
        status: data.status,
        summary: "📈 " + data.label + "."
    };

}

function refreshProspects() {

    renderProspects(getProspectsData());

}
