// =====================================
// ACTUALITES
// =====================================

const defaultNewsConfig = {
    refreshIntervalMs: 900000,
    endpoint: "https://api.gdeltproject.org/api/v2/doc/doc",
    query: "Tahiti OR Polynésie",
    maxRecords: 3
};

function initNews() {

    refreshNews();
    setInterval(refreshNews, defaultNewsConfig.refreshIntervalMs);

}

async function getNewsData() {

    const params = new URLSearchParams({
        query: defaultNewsConfig.query,
        mode: "ArtList",
        format: "json",
        maxrecords: defaultNewsConfig.maxRecords,
        sort: "HybridRel"
    });

    const response = await fetch(defaultNewsConfig.endpoint + "?" + params.toString());

    if (!response.ok) {
        throw new Error("Actualités HTTP " + response.status);
    }

    const data = await response.json();
    const articles = Array.isArray(data.articles) ? data.articles : [];

    if (!articles.length) {
        throw new Error("Aucune actualité disponible.");
    }

    return {
        raw: articles,
        status: "ready",
        articles: articles.map((article) => ({
            title: article.title,
            source: article.sourceCountry || "Actualité",
            url: article.url
        }))
    };

}

function renderNews(data) {

    const newsElement = document.getElementById("news");

    if (!newsElement) {
        console.warn("Module actualités indisponible : element #news introuvable.");
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
        summary: "📰 Actualités disponibles.",
        details: data.articles.map((article) => article.title)
    };

}

function renderNewsError(error) {

    const newsElement = document.getElementById("news");

    if (newsElement) {
        newsElement.replaceChildren();
        newsElement.textContent = "Actualités indisponibles. Nouvelle tentative automatique.";
    }

    window.AurelState = window.AurelState || {};
    window.AurelState.news = {
        raw: null,
        status: "unavailable",
        summary: "📰 Actualités indisponibles.",
        error: error ? error.message : "Erreur actualités inconnue"
    };

}

async function refreshNews() {

    try {

        renderNews(await getNewsData());

    } catch (error) {

        console.warn("Erreur pendant la mise a jour actualités.", error);
        renderNewsError(error);

    }

}
