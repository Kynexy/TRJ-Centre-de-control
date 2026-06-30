// =====================================
// WEBCAM FAAA V4
// =====================================

const webcams = window.AUREL_CONFIG.webcams.streams;
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
    status: "checking",
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
        status: status,
        text: statusConfig.text,
        operational: status === "connected",
        summary: getWebcamSummary(status)
    };

}

function getWebcamSummary(status) {

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

    const source = webcams[webcamIndex];

    if (Hls.isSupported()) {

        hls = new Hls(webcamHlsOptions);

        hls.loadSource(source);

        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {

            console.log("✅ Webcam connectée");

            updateWebcamStatus("connected");

            video.play().catch(console.error);

        });

        hls.on(Hls.Events.ERROR, (event, data) => {

            console.warn(data);

            if (data.fatal) {

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

    } else {

        video.src = source;

        updateWebcamStatus("connecting");

        video.play().catch(console.error);

    }

}

function initWebcam() {

    chargerWebcam();

}
