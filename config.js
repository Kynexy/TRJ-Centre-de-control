// =====================================
// AUREL - CONFIGURATION CENTRALE
// =====================================

window.AUREL_CONFIG = {
    version: "1.0",
    app: {
        name: "Aurel",
        owner: "Tahiti Renov' Jardin"
    },
    api: {},
    webcams: {
        streams: [
            "https://s81.ipcamlive.com/streams/51k8ybmjdfgkpx9uz/stream.m3u8",
            "https://s60.ipcamlive.com/streams/3c0abpcqisnmkuxyn/stream.m3u8"
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
