// =====================================
// WEBCAM FAAA V4
// =====================================

const webcams = [
    "https://s81.ipcamlive.com/streams/51k8ybmjdfgkpx9uz/stream.m3u8",
    "https://s60.ipcamlive.com/streams/3c0abpcqisnmkuxyn/stream.m3u8"
];

let webcamIndex = 0;
let hls = null;

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

    console.clear();
    console.log("🎥 Tentative webcam " + (webcamIndex + 1));

    const source = webcams[webcamIndex];

    if (Hls.isSupported()) {

        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true
        });

        hls.loadSource(source);

        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {

            console.log("✅ Webcam connectée");

            video.play().catch(console.error);

        });

        hls.on(Hls.Events.ERROR, (event, data) => {

            console.warn(data);

            if (data.fatal) {

                webcamIndex++;

                if (webcamIndex < webcams.length) {

                    console.log("🔄 Changement de webcam...");

                    setTimeout(chargerWebcam, 1500);

                } else {

                    console.error("❌ Aucune webcam disponible.");

                }

            }

        });

    } else {

        video.src = source;

        video.play().catch(console.error);

    }

}

chargerWebcam();