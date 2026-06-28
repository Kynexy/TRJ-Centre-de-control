const video = document.getElementById("faaaCam");

if (video) {

    if (Hls.isSupported()) {

        const hls = new Hls();

        hls.loadSource("https://mia.rtsp.me/B1xDMkCnBwZrXLajDeQMwQ/1782644100/hls/rAkeNeGF.m3u8?ip=103.129.120.42");

        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, function () {
            video.play();
        });

    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {

        video.src = "https://mia.rtsp.me/B1xDMkCnBwZrXLajDeQMwQ/1782644100/hls/rAkeNeGF.m3u8?ip=103.129.120.42";

        video.play();

    }

}