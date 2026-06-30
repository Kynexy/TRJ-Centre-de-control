// =====================================
// PHOTO DU JOUR
// =====================================

const defaultPhotoConfig = {
    refreshIntervalMs: 300000,
    imageUrl: "",
    linkUrl: ""
};

function initPhoto() {

    try {

        refreshPhoto();
        setInterval(refreshPhoto, getPhotoConfig().refreshIntervalMs);

    } catch (error) {

        console.warn("Module photo indisponible.", error);

    }

}

function getPhotoConfig() {

    return {
        ...defaultPhotoConfig,
        ...(window.AUREL_CONFIG && window.AUREL_CONFIG.photo ? window.AUREL_CONFIG.photo : {})
    };

}

function getPhotoData() {

    const config = getPhotoConfig();

    if (!config.imageUrl) {
        return {
            raw: null,
            status: "missing-config",
            src: "",
            alt: "",
            caption: "Source photo TRJ a configurer.",
            summary: "Photo TRJ non connectee.",
            isNew: false
        };
    }

    return {
        raw: {
            source: "TRJ",
            src: config.imageUrl,
            linkUrl: config.linkUrl
        },
        status: "ready",
        src: config.imageUrl,
        linkUrl: config.linkUrl,
        alt: "Photo du jour Tahiti Renov' Jardin",
        caption: "Photo TRJ officielle",
        summary: "Photo TRJ disponible.",
        isNew: true
    };

}

function renderPhoto(data) {

    const photoElement = document.getElementById("photoJour");

    if (!photoElement) {
        console.warn("Module photo indisponible : element #photoJour introuvable.");
        return;
    }

    photoElement.replaceChildren();

    if (data.status !== "ready") {
        photoElement.textContent = data.caption;
    } else {
        const imageElement = document.createElement("img");
        imageElement.src = data.src;
        imageElement.alt = data.alt;
        imageElement.style.width = "100%";
        imageElement.style.height = "100%";
        imageElement.style.objectFit = "cover";
        imageElement.style.borderRadius = "16px";

        if (data.linkUrl) {
            const linkElement = document.createElement("a");
            linkElement.href = data.linkUrl;
            linkElement.target = "_blank";
            linkElement.rel = "noopener";
            linkElement.style.display = "block";
            linkElement.style.width = "100%";
            linkElement.style.height = "100%";
            linkElement.appendChild(imageElement);
            photoElement.appendChild(linkElement);
        } else {
            photoElement.appendChild(imageElement);
        }
    }

    window.AurelState = window.AurelState || {};
    window.AurelState.photo = {
        raw: data.raw,
        status: data.status,
        summary: "📸 " + data.summary,
        details: [data.caption]
    };

    notifyAurelStateUpdatedIfAvailable();

}

function refreshPhoto() {

    try {

        renderPhoto(getPhotoData());

    } catch (error) {

        console.warn("Erreur pendant la mise a jour photo.", error);

        window.AurelState = window.AurelState || {};
        window.AurelState.photo = {
            raw: null,
            status: "unavailable",
            summary: "📸 Photo du jour indisponible.",
            details: ["La source photo n'a pas pu etre chargee."]
        };

        notifyAurelStateUpdatedIfAvailable();

    }

}

function notifyAurelStateUpdatedIfAvailable() {

    if (typeof notifyAurelStateUpdated === "function") {
        notifyAurelStateUpdated();
    }

}
