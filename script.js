// ===============================
// AUREL - CENTRE DE CONTRÔLE TRJ
// SCRIPT.JS
// ===============================

const webcams = [
{
    id: "faaaCam",
    stream: "https://s60.ipcamlive.com/streams/3c12q8dvxkowcem5j/stream.m3u8"
},
{
    id: "mooreaCam",
    stream: "https://s81.ipcamlive.com/streams/51xt7nglz8hosntvvy/stream.m3u8"
}
];

// ===============================
// HORLOGE
// ===============================

function updateClock(){

    const now = new Date();

    const heure = now.toLocaleTimeString("fr-FR",{
        hour:"2-digit",
        minute:"2-digit"
    });

    const date = now.toLocaleDateString("fr-FR",{
        weekday:"long",
        day:"numeric",
        month:"long"
    });

    const heureElt = document.getElementById("heure");
    const dateElt = document.getElementById("date");

    if(heureElt) heureElt.textContent = heure;
    if(dateElt) dateElt.textContent = date;

}

updateClock();
setInterval(updateClock,1000);

// ===============================
// WEBCAMS
// ===============================

function chargerCamera(id, stream){

    const video = document.getElementById(id);

    if(!video) return;

    if(Hls.isSupported()){

        const hls = new Hls({

            autoStartLoad:true,
            startLevel:-1,

            maxBufferLength:30

        });

        hls.loadSource(stream);

        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED,function(){

            video.play().catch(()=>{});

        });

        hls.on(Hls.Events.ERROR,function(event,data){

            console.log("Erreur caméra :",id,data);

        });

    }

    else if(video.canPlayType("application/vnd.apple.mpegurl")){

        video.src = stream;

        video.play().catch(()=>{});

    }

}

webcams.forEach(cam=>{

    chargerCamera(cam.id,cam.stream);

});

console.log("☁️ Aurel prêt.");