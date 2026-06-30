// =====================================
// PHOTO DU JOUR
// =====================================

const defaultPhotoConfig = {
    refreshIntervalMs: 300000,
    demoImage: "assets/images/photo-demo-trj.svg"
};

function initPhoto() {

    try {

        refreshPhoto();
        setInterval(refreshPhoto, defaultPhotoConfig.refreshIntervalMs);

    } catch (error) {

        console.warn("Module photo indisponible.", error);

    }

}

function getPhotoData() {

    return {
        raw: {
            source: "demo",
            src: defaultPhotoConfig.demoImage
        },
        status: "demo",
        src: defaultPhotoConfig.demoImage,
        alt: "Photo de démonstration Tahiti Rénov' Jardin",
        caption: "Image locale de démonstration",
        isNew: false
    };

}

function renderPhoto(data) {

    const photoElement = document.getElementById("photoJour");

    if (!photoElement) {
        console.warn("Module photo indisponible : element #photoJour introuvable.");
        return;
    }

    const imageElement = document.createElement("img");
    imageElement.src = data.src;
    imageElement.alt = data.alt;
    imageElement.style.width = "100%";
    imageElement.style.height = "100%";
    imageElement.style.objectFit = "cover";
    imageElement.style.borderRadius = "16px";

    photoElement.replaceChildren(imageElement);

    window.AurelState = window.AurelState || {};
    window.AurelState.photo = {
        raw: data.raw,
        status: data.status,
        summary: data.isNew ? "📸 Nouvelle photo disponible." : "📸 Aucune nouvelle photo.",
        details: [data.caption]
    };

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
            details: []
        };

        renderPhoto({
            raw: {
                source: "fallback",
                src: defaultPhotoConfig.demoImage
            },
            status: "fallback",
            src: defaultPhotoConfig.demoImage,
            alt: "Photo de secours Tahiti Rénov' Jardin",
            caption: "Image locale de secours",
            isNew: false
        });

    }

}
