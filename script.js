const video = document.getElementById("faaaCam");

if (video) {

    const stream = "https://s60.ipcamlive.com/streams/3c12q8dvxkowcem5j/stream.m3u8";

    if (Hls.isSupported()) {

        const hls = new Hls({
            autoStartLoad: true,
            startLevel: -1
        });

        hls.loadSource(stream);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, function () {
            video.play().catch(() => {});
        });

    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {

        video.src = stream;
        video.play().catch(() => {});

    }
}