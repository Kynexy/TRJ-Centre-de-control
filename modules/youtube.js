// =====================================
// YOUTUBE
// =====================================

const defaultYoutubeConfig = {
    endpoint: "https://www.googleapis.com/youtube/v3/search",
    maxResults: 5,
    regionCode: "PF",
    relevanceLanguage: "fr",
    defaultQuery: "Tahiti rénovation jardin"
};

function initYoutube() {

    try {

        const searchInput = document.getElementById("youtubeSearch");
        const searchButton = document.getElementById("searchYoutube");

        if (searchButton) {
            searchButton.addEventListener("click", () => {
                refreshYoutube(searchInput ? searchInput.value : "");
            });
        }

        if (searchInput) {
            searchInput.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    refreshYoutube(searchInput.value);
                }
            });
        }

        refreshYoutube("");

    } catch (error) {

        console.warn("Module YouTube indisponible.", error);

    }

}

async function getYoutubeData(query) {

    const youtubeConfig = getYoutubeConfig();
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
        return {
            status: "ready",
            query: "",
            results: [],
            message: "Saisis une recherche YouTube."
        };
    }

    if (!youtubeConfig.apiKey) {
        return {
            status: "missing-config",
            query: normalizedQuery,
            results: [],
            message: "Recherche YouTube prête. Clé API YouTube Data requise pour afficher les résultats."
        };
    }

    const response = await fetch(buildYoutubeSearchUrl(youtubeConfig, normalizedQuery));

    if (!response.ok) {
        throw new Error("YouTube HTTP " + response.status);
    }

    const data = await response.json();

    return {
        status: "ready",
        query: normalizedQuery,
        results: data.items.map(mapYoutubeResult),
        message: ""
    };

}

function getYoutubeConfig() {

    const config = {
        ...defaultYoutubeConfig,
        ...(window.AUREL_CONFIG && window.AUREL_CONFIG.youtube ? window.AUREL_CONFIG.youtube : {})
    };

    return {
        ...config,
        apiKey: window.AUREL_CONFIG && window.AUREL_CONFIG.api ? window.AUREL_CONFIG.api.youtubeApiKey : ""
    };

}

function buildYoutubeSearchUrl(config, query) {

    const params = new URLSearchParams({
        key: config.apiKey,
        part: "snippet",
        type: "video",
        maxResults: config.maxResults,
        regionCode: config.regionCode,
        relevanceLanguage: config.relevanceLanguage,
        q: query
    });

    return config.endpoint + "?" + params.toString();

}

function mapYoutubeResult(item) {

    return {
        videoId: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        url: "https://www.youtube.com/watch?v=" + item.id.videoId
    };

}

function renderYoutube(data) {

    const resultsElement = document.getElementById("youtubeResults");
    const playerElement = document.getElementById("youtubePlayer");

    if (!resultsElement || !playerElement) {
        console.warn("Module YouTube indisponible : element #youtubeResults ou #youtubePlayer introuvable.");
        return;
    }

    resultsElement.replaceChildren();

    if ((data.status === "ready" && !data.results.length) || data.status === "missing-config" || data.status === "error") {
        const messageElement = document.createElement("div");
        messageElement.textContent = data.message || "Recherche YouTube indisponible.";
        messageElement.style.marginBottom = "10px";
        resultsElement.appendChild(messageElement);
    }

    if (data.status === "missing-config" && data.query) {
        const linkElement = document.createElement("a");
        linkElement.href = "https://www.youtube.com/results?search_query=" + encodeURIComponent(data.query);
        linkElement.target = "_blank";
        linkElement.rel = "noopener";
        linkElement.textContent = "Ouvrir cette recherche sur YouTube";
        linkElement.style.display = "block";
        linkElement.style.color = "white";
        resultsElement.appendChild(linkElement);
    }

    if (data.status === "ready") {
        data.results.forEach((result) => {

            const linkElement = document.createElement("a");
            linkElement.href = result.url;
            linkElement.target = "_blank";
            linkElement.rel = "noopener";
            linkElement.textContent = result.title + " - " + result.channelTitle;
            linkElement.style.display = "block";
            linkElement.style.color = "white";
            linkElement.style.marginBottom = "10px";

            resultsElement.appendChild(linkElement);

        });
    }

    if (data.status === "missing-config") {
        playerElement.textContent = "Clé API YouTube non configurée";
    } else if (data.status === "ready" && !data.results.length) {
        playerElement.textContent = "En attente d'une recherche";
    } else if (data.status === "ready" && data.results.length) {
        const iframeElement = document.createElement("iframe");
        iframeElement.src = "https://www.youtube.com/embed/" + encodeURIComponent(data.results[0].videoId);
        iframeElement.title = data.results[0].title;
        iframeElement.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframeElement.allowFullscreen = true;
        iframeElement.style.width = "100%";
        iframeElement.style.height = "100%";
        iframeElement.style.border = "0";
        iframeElement.style.borderRadius = "16px";
        playerElement.replaceChildren(iframeElement);
    } else {
        playerElement.textContent = data.status === "ready" && data.results.length
            ? "Clique sur une vidéo pour l'ouvrir dans YouTube"
            : "Recherche YouTube indisponible";
    }

    window.AurelState = window.AurelState || {};
    window.AurelState.youtube = {
        raw: data,
        status: data.status,
        summary: data.status === "ready" && data.results.length
            ? "▶ Nouvelle vidéo disponible."
            : "▶ Aucune recherche récente."
    };

    notifyAurelStateUpdatedIfAvailable();

}

async function refreshYoutube(query) {

    try {

        renderYoutube(await getYoutubeData(query));

    } catch (error) {

        console.warn("Erreur pendant la recherche YouTube.", error);

        renderYoutube({
            status: "error",
            query: query,
            results: [],
            message: "Recherche YouTube indisponible."
        });

    }

}

function notifyAurelStateUpdatedIfAvailable() {

    if (typeof notifyAurelStateUpdated === "function") {
        notifyAurelStateUpdated();
    }

}
