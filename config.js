// =====================================
// AUREL - CONFIGURATION CENTRALE
// =====================================

window.AUREL_CONFIG = {
    version: "1.0",
    app: {
        name: "Aurel",
        owner: "Tahiti Renov' Jardin"
    },
    api: {
        youtubeApiKey: ""
    },
    agenda: {
        googleCalendarEmbedUrl: ""
    },
    traffic: {
        provider: "waze",
        latitude: -17.552554,
        longitude: -149.607182,
        zoom: 13,
        embedUrl: "https://embed.waze.com/iframe?zoom=13&lat=-17.552554&lon=-149.607182&pin=1"
    },
    radar: {
        refreshIntervalMs: 600000,
        provider: "Windy",
        embedUrl: "https://embed.windy.com/embed2.html?lat=-17.58&lon=-149.61&detailLat=-17.58&detailLon=-149.61&width=650&height=450&zoom=8&level=surface&overlay=rain&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1"
    },
    prospects: {
        provider: "Kynexy",
        url: ""
    },
    messenger: {
        provider: "Messenger TRJ",
        url: ""
    },
    photo: {
        imageUrl: "",
        linkUrl: ""
    },
    news: {
        endpoint: "https://api.gdeltproject.org/api/v2/doc/doc",
        query: "Tahiti OR Polynesie",
        maxRecords: 3,
        timeoutMs: 4000,
        fallbackUrl: "https://news.google.com/search?q=Tahiti%20Polynesie&hl=fr&gl=FR&ceid=FR%3Afr"
    },
    youtube: {
        endpoint: "https://www.googleapis.com/youtube/v3/search",
        maxResults: 5,
        regionCode: "PF",
        relevanceLanguage: "fr",
        defaultQuery: "Tahiti rénovation jardin"
    },
    webcams: {
        streams: [
            {
                name: "Faa'a - vue 1",
                location: "Faa'a",
                url: "https://s81.ipcamlive.com/streams/51k8ybmjdfgkpx9uz/stream.m3u8"
            },
            {
                name: "Faa'a - vue 2",
                location: "Faa'a",
                url: "https://s60.ipcamlive.com/streams/3c0abpcqisnmkuxyn/stream.m3u8"
            }
        ],
        retryDelayMs: 1500,
        hlsOptions: {
            enableWorker: true,
            lowLatencyMode: true
        }
    },
    weather: {
        defaultZone: "Tahiti",
        locations: ["Punaauia", "Faaa"],
        provider: "open-meteo",
        endpoint: "https://api.open-meteo.com/v1/forecast",
        latitude: -17.552554,
        longitude: -149.607182,
        timezone: "Pacific/Tahiti",
        forecastDays: 3,
        timeoutMs: 8000,
        refreshIntervalMs: 900000,
        current: [
            "temperature_2m",
            "relative_humidity_2m",
            "precipitation",
            "rain",
            "weather_code",
            "cloud_cover",
            "wind_speed_10m",
            "wind_direction_10m",
            "wind_gusts_10m"
        ],
        hourly: [
            "temperature_2m",
            "relative_humidity_2m",
            "precipitation_probability",
            "precipitation",
            "rain",
            "weather_code",
            "cloud_cover",
            "wind_speed_10m",
            "wind_direction_10m",
            "wind_gusts_10m"
        ],
        daily: [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "sunrise",
            "sunset",
            "precipitation_sum",
            "precipitation_probability_max",
            "wind_speed_10m_max",
            "wind_gusts_10m_max"
        ],
        units: {
            temperature: "celsius",
            windSpeed: "kmh",
            precipitation: "mm"
        },
        chantierThresholds: {
            idealRainRiskMax: 30,
            warningRainRiskMax: 60,
            idealWindMaxKmh: 25,
            warningWindMaxKmh: 40,
            unsafeGustMinKmh: 55,
            activeRainUnsafeMm: 5
        }
    },
    time: {
        locale: "fr-FR",
        timeZone: "Pacific/Tahiti",
        refreshIntervalMs: 1000,
        hourFormat: {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        },
        dateFormat: {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    }
};
