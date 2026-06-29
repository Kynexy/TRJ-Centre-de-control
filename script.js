const webcams = [
{
    id: "mooreaCam",
    url: "https://s81.ipcamlive.com/streams/51xt7nglz8hosntvvy/stream.m3u8"
},
{
    id: "faaaCam",
    url: "https://s60.ipcamlive.com/streams/3c12q8dvxkowcem5j/stream.m3u8"
}
];

webcams.forEach(cam => {

    const video = document.getElementById(cam.id);

    if (!video) return;

    if (Hls.isSupported()) {

        const hls = new Hls();

        hls.loadSource(cam.url);

        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, function () {
            video.play();
        });

    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {

        video.src = cam.url;

        video.play();

    }

});