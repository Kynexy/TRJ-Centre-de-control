// =====================================
// ACTUALITES
// =====================================

const defaultNewsConfig = {
    refreshIntervalMs: 900000,
    endpoint: "https://api.gdeltproject.org/api/v2/doc/doc",
    query: "Tahiti OR Polynesie",
    maxRecords: 3,
    timeoutMs: 4000,
    fallbackUrl: "https://news.google.com/search?q=Tahiti%20Polynesie&hl=fr&gl=FR&ceid=FR%3Afr"
};

function initNews() {

    renderNewsLoading();
    refreshNews();
    setInterval(refreshNews, getNewsConfig().refreshIntervalMs);

}

function getNewsConfig() {

    return {
        ...defaultNewsConfig,
        ...(window.AUREL_CONFIG && window.AUREL_CONFIG.news ? window.AUREL_CONFIG.news : {})
    };

}

async function getNewsData() {

    const newsConfig = getNewsConfig();
    const params = new URLSearchParams({
        query: newsConfig.query,
        mode: "ArtList",
        format: "json",
        maxrecords: newsConfig.maxRecords,
        sort: "HybridRel"
    });

    const response = await fetchNewsWithTimeout(newsConfig.endpoint + "?" + params.toString(), newsConfig.timeoutMs);

    if (!response.ok) {
        throw new Error("Actualites HTTP " + response.status);
    }

    const data = await response.json();
    const articles = Array.isArray(data.articles) ? data.articles : [];

    if (!articles.length) {
        throw new Error("Aucune actualite disponible.");
    }

    return {
        raw: articles,
        status: "ready",
        articles: articles.map((article) => ({
            title: article.title,
            source: article.sourceCountry || "Actualite",
            url: article.url
        }))
    };

}

function fetchNewsWithTimeout(url, timeoutMs) {

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, {
        signal: controller.signal
    }).finally(() => {
        clearTimeout(timeoutId);
    });

}

function renderNewsLoading() {

    const newsElement = document.getElementById("news");

    if (newsElement) {
        newsElement.textContent = "Verification des actualites...";
    }

    window.AurelState = window.AurelState || {};
    window.AurelState.news = {
        raw: null,
        status: "loading",
        summary: "📰 Actualites en verification.",
        details: []
    };

    refreshReportIfAvailable();

}

function renderNews(data) {

    const newsElement = document.getElementById("news");

    if (!newsElement) {
        console.warn("Module actualites indisponible : element #news introuvable.");
        return;
    }

    newsElement.replaceChildren();

    data.articles.forEach((article) => {
        const linkElement = document.createElement("a");
        linkElement.href = article.url;
        linkElement.target = "_blank";
        linkElement.rel = "noopener";
        linkElement.textContent = "📰 " + article.title;
        linkElement.style.display = "block";
        linkElement.style.color = "white";
        linkElement.style.marginBottom = "10px";
        newsElement.appendChild(linkElement);
    });

    window.AurelState = window.AurelState || {};
    window.AurelState.news = {
        raw: data.raw,
        status: data.status,
        summary: "📰 Actualites disponibles.",
        details: data.articles.map((article) => article.title)
    };

    refreshReportIfAvailable();

}

function renderNewsError(error) {

    const newsElement = document.getElementById("news");

    if (newsElement) {
        newsElement.replaceChildren();

        const messageElement = document.createElement("div");
        messageElement.textContent = "Actualites automatiques indisponibles.";
        messageElement.style.marginBottom = "10px";
        newsElement.appendChild(messageElement);

        const linkElement = document.createElement("a");
        linkElement.href = getNewsConfig().fallbackUrl;
        linkElement.target = "_blank";
        linkElement.rel = "noopener";
        linkElement.textContent = "Ouvrir les actualites Tahiti";
        linkElement.style.color = "white";
        newsElement.appendChild(linkElement);
    }

    window.AurelState = window.AurelState || {};
    window.AurelState.news = {
        raw: null,
        status: "unavailable",
        summary: "📰 Actualites automatiques indisponibles.",
        details: ["Lien direct disponible vers les actualites Tahiti."],
        error: error ? error.message : "Erreur actualites inconnue"
    };

    refreshReportIfAvailable();

}

async function refreshNews() {

    try {

        renderNews(await getNewsData());

    } catch (error) {

        console.info("Actualites automatiques indisponibles.", error);
        renderNewsError(error);

    }

}

function refreshReportIfAvailable() {

    if (typeof refreshReport === "function") {
        refreshReport();
    }

}
