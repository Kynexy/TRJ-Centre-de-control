// ===============================
// AUREL - TABLEAU DE BORD TRJ
// SCRIPT.JS
// ===============================

// ===============================
// WEBCAM FAAA
// ===============================

const webcam = {
    id: "faaaCam",
    stream: "https://s60.ipcamlive.com/streams/3c12q8dvxkowcem5j/stream.m3u8"
};

// ===============================
// HORLOGE
// ===============================

function updateClock() {

    const now = new Date();

    const heure = now.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit"
    });

    const date = now.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    document.getElementById("heure").textContent = heure;
    document.getElementById("date").textContent = date;

}

updateClock();
setInterval(updateClock, 1000);

// ===============================
// WEBCAM
// ===============================

function chargerCamera() {

    const video = document.getElementById(webcam.id);

    if (!video) return;

    if (Hls.isSupported()) {

        const hls = new Hls({
            autoStartLoad: true,
            startLevel: -1
        });

        hls.loadSource(webcam.stream);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            console.log("Erreur Webcam :", data);
        });

    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {

        video.src = webcam.stream;
        video.play().catch(() => {});

    }

}

chargerCamera();

// ===============================
// METEO (temporaire)
// ===============================

document.getElementById("temperature").textContent = "--°C";
document.getElementById("conditions").textContent = "Connexion...";
document.getElementById("vent").textContent = "-- km/h";
document.getElementById("pluie").textContent = "-- %";
document.getElementById("houle").textContent = "-- m";

// ===============================
// TRAFIC (temporaire)
// ===============================

document.querySelector(".traffic-status").textContent = "🟢 Fluide";
document.querySelector(".traffic-detail").textContent = "En attente des données de circulation.";

// ===============================
// PLANNING (temporaire)
// ===============================

document.getElementById("planning").innerHTML = `
Aucun rendez-vous aujourd'hui.
`;

// ===============================
// RAPPORT AUREL
// ===============================

document.getElementById("rapport").innerHTML = `
Bonjour Patron.<br><br>
✔ Webcam opérationnelle.<br>
✔ Tableau de bord chargé.<br>
⏳ En attente de la météo, du trafic et du planning.
`;

console.log("☁️ Aurel opérationnel.");