// =====================================
// AUREL - TABLEAU DE BORD TRJ
// SCRIPT.JS V2
// =====================================

console.log("☁️ Démarrage d'Aurel...");

// =====================================
// HORLOGE
// =====================================

function updateClock(){

    const now = new Date();

    document.getElementById("heure").textContent =
    now.toLocaleTimeString("fr-FR",{
        hour:"2-digit",
        minute:"2-digit"
    });

    document.getElementById("date").textContent =
    now.toLocaleDateString("fr-FR",{
        weekday:"long",
        day:"numeric",
        month:"long",
        year:"numeric"
    });

}

updateClock();

setInterval(updateClock,1000);

// =====================================
// WEBCAM FAAA
// =====================================

const webcam="https://s60.ipcamlive.com/streams/3c12q8dvxkowcem5j/stream.m3u8";

function chargerWebcam(){

    const video=document.getElementById("faaaCam");

    if(!video) return;

    if(Hls.isSupported()){

        const hls=new Hls();

        hls.loadSource(webcam);

        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED,function(){

            video.play().catch(()=>{});

        });

    }

    else if(video.canPlayType("application/vnd.apple.mpegurl")){

        video.src=webcam;

        video.play().catch(()=>{});

    }

}

chargerWebcam();

// =====================================
// METEO (Temporaire)
// =====================================

function chargerMeteo(){

    document.getElementById("weather").innerHTML=`

        🌡 Température : -- °C<br><br>

        ☀️ Conditions : Chargement...<br><br>

        💧 Pluie : -- %<br><br>

        🕒 Prévisions heure par heure...

    `;

}

chargerMeteo();

// =====================================
// CIRCULATION
// =====================================

function chargerCirculation(){

    document.getElementById("traffic").innerHTML=`

        🟢 Trafic fluide

    `;

}

chargerCirculation();

// =====================================
// PROSPECTS
// =====================================

function chargerProspects(){

    document.getElementById("prospectGauge").textContent="0";

}

chargerProspects();

// =====================================
// MESSENGER
// =====================================

function chargerMessenger(){

    document.getElementById("messengerCard").innerHTML=`

        💬 Groupe TRJ

        <br><br>

        Aucun nouveau message.

    `;

}

chargerMessenger();

// =====================================
// YOUTUBE
// =====================================

document.getElementById("searchYoutube").addEventListener("click",function(){

    const recherche=document.getElementById("youtubeSearch").value;

    document.getElementById("youtubeResults").innerHTML=`

        Recherche :

        <br><br>

        <b>${recherche}</b>

        <br><br>

        (Connexion YouTube à venir)

    `;

});

// =====================================
// ACTUALITES
// =====================================

function chargerNews(){

    document.getElementById("news").innerHTML=`

        Les actualités seront affichées ici.

    `;

}

chargerNews();

// =====================================
// PHOTO DU JOUR
// =====================================

function chargerPhoto(){

    document.getElementById("photoJour").innerHTML=`

        📸 Photo du jour TRJ

    `;

}

chargerPhoto();

// =====================================
// RAPPORT AUREL
// =====================================

function rapport(){

    document.getElementById("rapport").innerHTML=`

        Bonjour Patron.<br><br>

        ✔ Webcam opérationnelle.<br><br>

        ✔ Tableau de bord chargé.<br><br>

        ⏳ En attente de la météo, de la circulation,
        des prospects et des données en direct.

    `;

}

rapport();

// =====================================

console.log("✅ Tableau de bord prêt.");
