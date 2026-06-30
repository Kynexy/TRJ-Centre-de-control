// =====================================
// CAMERAS DE TAHITI
// =====================================

const webcams = normalizeWebcamStreams(window.AUREL_CONFIG.webcams.streams);
const webcamRetryDelayMs = window.AUREL_CONFIG.webcams.retryDelayMs;
const webcamHlsOptions = window.AUREL_CONFIG.webcams.hlsOptions;
const webcamStatuses = {
    checking: {
        text: "⚪ Verification du flux...",
        color: "#d8e0ea"
    },
    connecting: {
        text: "🟡 Connexion...",
        color: "#ffd166"
    },
    connected: {
        text: "🟢 Camera connectee",
        color: "#5ee37d"
    },
    switching: {
        text: "🔄 Changement de camera...",
        color: "#8fd3ff"
    },
    unavailable: {
        text: "🔴 Camera indisponible",
        color: "#ff6b6b"
    }
};

let webcamIndex = 0;
let webcamMode = "single";
let hls = null;
let mosaicHlsInstances = [];
let webcamHealth = webcams.map(() => "loading");

window.AurelState = window.AurelState || {};
window.AurelState.webcam = window.AurelState.webcam || {
    status: "loading",
    text: webcamStatuses.checking.text,
    operational: false,
    summary: "Cameras en verification.",
    cameras: []
};

function initWebcam() {

    ensureWebcamMosaicElement();
    renderWebcamSelector();
    probeWebcams();
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
        summary: getWebcamSummary(status),
        cameras: webcams.map((webcam, index) => ({
            name: webcam.name,
            location: webcam.location,
            status: webcamHealth[index] || "loading"
        }))
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

    if (status === "connected") {
        return webcamMode === "mosaic" ? "Mosaique cameras active." : "Camera active : " + currentWebcam + ".";
    }

    if (status === "checking") {
        return "Cameras en verification.";
    }

    if (status === "connecting") {
        return "Connexion camera en cours.";
    }

    if (status === "switching") {
        return "Changement de camera en cours.";
    }

    return "Aucune camera disponible.";

}

function chargerWebcam() {

    const video = document.getElementById("faaaCam");
    const mosaicElement = document.getElementById("webcamMosaic");

    if (!video) {
        console.error("Video introuvable.");
        return;
    }

    webcamMode = "single";
    video.style.display = "block";

    if (mosaicElement) {
        mosaicElement.style.display = "none";
    }

    destroyMosaicStreams();

    if (hls) {
        hls.destroy();
        hls = null;
    }

    updateWebcamStatus(webcamIndex === 0 ? "checking" : "connecting");

    const source = webcams[webcamIndex] ? webcams[webcamIndex].url : "";

    if (!source) {
        updateWebcamStatus("unavailable");
        return;
    }

    attachHlsToVideo(source, video, webcamIndex, {
        onReady: () => {
            updateWebcamStatus("connected");
        },
        onFatal: () => {
            webcamIndex++;
            renderWebcamSelector();

            if (webcamIndex < webcams.length) {
                updateWebcamStatus("switching");
                setTimeout(chargerWebcam, webcamRetryDelayMs);
            } else {
                updateWebcamStatus("unavailable");
            }
        },
        keepInstance: true
    });

}

function attachHlsToVideo(source, videoElement, index, options) {

    const safeOptions = options || {};

    if (typeof Hls !== "undefined" && Hls.isSupported()) {
        const hlsInstance = new Hls(webcamHlsOptions);
        hlsInstance.loadSource(source);
        hlsInstance.attachMedia(videoElement);

        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            webcamHealth[index] = "online";
            renderWebcamSelector();

            if (safeOptions.onReady) {
                safeOptions.onReady();
            }

            videoElement.play().catch(() => {});

            if (safeOptions.probe) {
                hlsInstance.destroy();
            }
        });

        hlsInstance.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                webcamHealth[index] = "offline";
                renderWebcamSelector();

                if (safeOptions.onFatal) {
                    safeOptions.onFatal();
                }

                if (safeOptions.probe) {
                    hlsInstance.destroy();
                }
            }
        });

        if (safeOptions.keepInstance) {
            hls = hlsInstance;
        } else if (!safeOptions.probe) {
            mosaicHlsInstances.push(hlsInstance);
        }

        return;
    }

    if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
        videoElement.src = source;
        videoElement.onloadedmetadata = () => {
            webcamHealth[index] = "online";
            renderWebcamSelector();

            if (safeOptions.onReady) {
                safeOptions.onReady();
            }

            videoElement.play().catch(() => {});
        };
        videoElement.onerror = () => {
            webcamHealth[index] = "offline";
            renderWebcamSelector();

            if (safeOptions.onFatal) {
                safeOptions.onFatal();
            }
        };
        return;
    }

    webcamHealth[index] = "offline";
    renderWebcamSelector();

    if (safeOptions.onFatal) {
        safeOptions.onFatal();
    }

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
        buttonElement.textContent = getWebcamStatusIcon(index) + " " + webcam.name;
        buttonElement.title = webcam.location + " - " + getWebcamStatusText(index);
        buttonElement.style.padding = "8px 12px";
        buttonElement.style.border = "0";
        buttonElement.style.borderRadius = "10px";
        buttonElement.style.cursor = "pointer";
        buttonElement.style.background = webcamMode === "single" && index === webcamIndex ? "#2ca9ff" : "rgba(255,255,255,.18)";
        buttonElement.style.color = "white";

        buttonElement.addEventListener("click", () => {
            webcamIndex = index;
            renderWebcamSelector();
            chargerWebcam();
        });

        selectorElement.appendChild(buttonElement);
    });

    if (webcams.length > 1) {
        const mosaicButton = document.createElement("button");
        mosaicButton.type = "button";
        mosaicButton.textContent = "Mosaique";
        mosaicButton.style.padding = "8px 12px";
        mosaicButton.style.border = "0";
        mosaicButton.style.borderRadius = "10px";
        mosaicButton.style.cursor = "pointer";
        mosaicButton.style.background = webcamMode === "mosaic" ? "#2ca9ff" : "rgba(255,255,255,.18)";
        mosaicButton.style.color = "white";
        mosaicButton.addEventListener("click", renderWebcamMosaic);
        selectorElement.appendChild(mosaicButton);
    }

}

function getWebcamStatusIcon(index) {

    const status = webcamHealth[index];

    if (status === "online") {
        return "🟢";
    }

    if (status === "offline") {
        return "🔴";
    }

    return "🟡";

}

function getWebcamStatusText(index) {

    const status = webcamHealth[index];

    if (status === "online") {
        return "En ligne";
    }

    if (status === "offline") {
        return "Hors ligne";
    }

    return "Verification";

}

function ensureWebcamMosaicElement() {

    if (document.getElementById("webcamMosaic")) {
        return;
    }

    const videoElement = document.getElementById("faaaCam");

    if (!videoElement || !videoElement.parentElement) {
        return;
    }

    const mosaicElement = document.createElement("div");
    mosaicElement.id = "webcamMosaic";
    mosaicElement.style.display = "none";
    mosaicElement.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
    mosaicElement.style.gap = "12px";
    mosaicElement.style.marginTop = "12px";

    videoElement.parentElement.insertBefore(mosaicElement, videoElement.nextSibling);

}

function renderWebcamMosaic() {

    const videoElement = document.getElementById("faaaCam");
    const mosaicElement = document.getElementById("webcamMosaic");

    if (!videoElement || !mosaicElement) {
        return;
    }

    webcamMode = "mosaic";
    renderWebcamSelector();

    if (hls) {
        hls.destroy();
        hls = null;
    }

    destroyMosaicStreams();

    videoElement.style.display = "none";
    mosaicElement.style.display = "grid";
    mosaicElement.replaceChildren();

    webcams.forEach((webcam, index) => {
        const tileElement = document.createElement("div");
        tileElement.style.position = "relative";
        tileElement.style.background = "black";
        tileElement.style.borderRadius = "14px";
        tileElement.style.overflow = "hidden";

        const mosaicVideo = document.createElement("video");
        mosaicVideo.autoplay = true;
        mosaicVideo.muted = true;
        mosaicVideo.playsInline = true;
        mosaicVideo.controls = true;
        mosaicVideo.style.width = "100%";
        mosaicVideo.style.aspectRatio = "16 / 9";
        mosaicVideo.style.objectFit = "cover";

        const labelElement = document.createElement("div");
        labelElement.textContent = getWebcamStatusIcon(index) + " " + webcam.name;
        labelElement.style.position = "absolute";
        labelElement.style.left = "10px";
        labelElement.style.bottom = "8px";
        labelElement.style.background = "rgba(0,0,0,.55)";
        labelElement.style.padding = "5px 8px";
        labelElement.style.borderRadius = "8px";
        labelElement.style.fontSize = "13px";

        tileElement.appendChild(mosaicVideo);
        tileElement.appendChild(labelElement);
        mosaicElement.appendChild(tileElement);

        attachHlsToVideo(webcam.url, mosaicVideo, index, {});
    });

    updateWebcamStatus("connected");

}

function destroyMosaicStreams() {

    mosaicHlsInstances.forEach((hlsInstance) => {
        hlsInstance.destroy();
    });
    mosaicHlsInstances = [];

}

function probeWebcams() {

    webcams.forEach((webcam, index) => {
        const probeVideo = document.createElement("video");
        attachHlsToVideo(webcam.url, probeVideo, index, {
            probe: true
        });

        window.setTimeout(() => {
            probeVideo.removeAttribute("src");
            probeVideo.load();

            if (webcamHealth[index] === "loading") {
                webcamHealth[index] = "offline";
                renderWebcamSelector();
            }
        }, 8000);
    });

}

function notifyAurelStateUpdatedIfAvailable() {

    if (typeof notifyAurelStateUpdated === "function") {
        notifyAurelStateUpdated();
    }

}
