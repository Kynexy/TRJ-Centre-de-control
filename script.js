// =====================================
// WEBCAM FAAA
// =====================================

const webcam = "https://s60.ipcamlive.com/streams/3c12q8dvxkowcem5j/stream.m3u8";

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