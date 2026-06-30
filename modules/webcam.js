// =====================================
// WEBCAM FAAA V4
// =====================================

const webcams = normalizeWebcamStreams(window.AUREL_CONFIG.webcams.streams);
const webcamRetryDelayMs = window.AUREL_CONFIG.webcams.retryDelayMs;
const webcamHlsOptions = window.AUREL_CONFIG.webcams.hlsOptions;
const webcamStatuses = {
    checking: {
        text: "⚪ Vérification du flux...",
        color: "#d8e0ea"
    },
    connecting: {
        text: "🟡 Connexion...",
        color: "#ffd166"
    },
    connected: {
        text: "🟢 Webcam connectée",
        color: "#5ee37d"
    },
    switching: {
        text: "🔄 Changement de caméra...",
        color: "#8fd3ff"
    },
    unavailable: {
        text: "🔴 Webcam indisponible",
        color: "#ff6b6b"
    }
};

let webcamIndex = 0;
let hls = null;

window.AurelState = window.AurelState || {};
window.AurelState.webcam = window.AurelState.webcam || {
    status: "loading",
    text: webcamStatuses.checking.text,
    operational: false,
    summary: "🟡 Webcam en vérification."
};

function updateWebcamStatus(status) {

    const statusElement = document.getElementById("webcamStatus");
    const statusConfig = webcamStatuses[status];

    if (!statusElement) {
        console.warn("Statut webcam indisponible : element #webcamStatus introuvable.");
        return;
    }

    if (!statusConfig) {
        console.warn("Statut webcam inconnu : " + status);
        return;
    }

    statusElement.textContent = statusConfig.text;
    statusElement.style.color = statusConfig.color;

    window.AurelState.webcam = {
        status: getAurelWebcamStatus(status),
        text: statusConfig.text,
        operational: status === "connected",
        summary: getWebcamSummary(status)
    };

    notifyAurelStateUpdatedIfAvailable();

}

function getAurelWebcamStatus(status) {

    const statuses = {
        checking: "loading",
        connecting: "loading",
        connected: "ready",
        switching: "loading",
        unavailable: "unavailable"
    };

    return statuses[status] || "error";

}

function getWebcamSummary(status) {

    const currentWebcam = webcams[webcamIndex] ? webcams[webcamIndex].name : "camera";

    if (status === "checking") {
        return "Cameras en verification.";
    }

    if (status === "connecting") {
        return "Connexion camera en cours.";
    }

    if (status === "connected") {
        return "Camera active : " + currentWebcam + ".";
    }

    if (status === "switching") {
        return "Changement de camera en cours.";
    }

    if (status === "unavailable") {
        return "Aucune camera disponible.";
    }

    const summaries = {
        checking: "🟡 Webcam en vérification.",
        connecting: "🟡 Connexion webcam en cours.",
        connected: "🟢 Webcam opérationnelle.",
        switching: "🔄 Changement de caméra en cours.",
        unavailable: "🔴 Webcam indisponible."
    };

    return summaries[status] || summaries.checking;

}

function chargerWebcam() {

    const video = document.getElementById("faaaCam");

    if (!video) {
        console.error("Vidéo introuvable.");
        return;
    }

    if (hls) {
        hls.destroy();
        hls = null;
    }

    updateWebcamStatus(webcamIndex === 0 ? "checking" : "connecting");

    console.clear();
    console.log("🎥 Tentative webcam " + (webcamIndex + 1));

    const source = webcams[webcamIndex] ? webcams[webcamIndex].url : "";

    if (!source) {
        updateWebcamStatus("unavailable");
        return;
    }

    if (typeof Hls !== "undefined" && Hls.isSupported()) {

        hls = new Hls(webcamHlsOptions);

        hls.loadSource(source);

        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {

            console.log("✅ Webcam connectée");

            updateWebcamStatus("connected");

            video.play().catch(console.error);

        });

        hls.on(Hls.Events.ERROR, (event, data) => {

            if (data.fatal) {

                console.warn("Erreur fatale webcam.", data);

                webcamIndex++;

                if (webcamIndex < webcams.length) {

                    console.log("🔄 Changement de webcam...");

                    updateWebcamStatus("switching");

                    setTimeout(chargerWebcam, webcamRetryDelayMs);

                } else {

                    console.error("❌ Aucune webcam disponible.");

                    updateWebcamStatus("unavailable");

                }

            }

        });

    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {

        video.src = source;

        updateWebcamStatus("connecting");

        video.onloadedmetadata = () => {
            updateWebcamStatus("connected");
            video.play().catch(console.error);
        };

        video.onerror = () => {
            webcamIndex++;

            if (webcamIndex < webcams.length) {
                updateWebcamStatus("switching");
                setTimeout(chargerWebcam, webcamRetryDelayMs);
            } else {
                updateWebcamStatus("unavailable");
            }
        };

    } else {

        console.error("HLS indisponible dans ce navigateur.");
        updateWebcamStatus("unavailable");

    }

}

function initWebcam() {

    renderWebcamSelector();
    chargerWebcam();

}

function normalizeWebcamStreams(streams) {

    return (streams || []).map((stream, index) => {
        if (typeof stream === "string") {
            return {
                name: "Camera " + (index + 1),
                location: "Tahiti",
                url: stream
            };
        }

        return {
            name: stream.name || "Camera " + (index + 1),
            location: stream.location || "Tahiti",
            url: stream.url
        };
    }).filter((stream) => stream.url);

}

function renderWebcamSelector() {

    const selectorElement = document.getElementById("webcamSelector");

    if (!selectorElement) {
        return;
    }

    selectorElement.replaceChildren();
    selectorElement.style.display = "flex";
    selectorElement.style.flexWrap = "wrap";
    selectorElement.style.gap = "8px";
    selectorElement.style.margin = "12px 0";

    webcams.forEach((webcam, index) => {
        const buttonElement = document.createElement("button");
        buttonElement.type = "button";
        buttonElement.textContent = webcam.name;
        buttonElement.style.padding = "8px 12px";
        buttonElement.style.border = "0";
        buttonElement.style.borderRadius = "10px";
        buttonElement.style.cursor = "pointer";
        buttonElement.style.background = index === webcamIndex ? "#2ca9ff" : "rgba(255,255,255,.18)";
        buttonElement.style.color = "white";

        buttonElement.addEventListener("click", () => {
            webcamIndex = index;
            renderWebcamSelector();
            chargerWebcam();
        });

        selectorElement.appendChild(buttonElement);
    });

}

function notifyAurelStateUpdatedIfAvailable() {

    if (typeof notifyAurelStateUpdated === "function") {
        notifyAurelStateUpdated();
    }

}
