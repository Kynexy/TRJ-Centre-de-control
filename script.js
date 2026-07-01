// =====================================
// METEO
// =====================================

const defaultWeatherConfig = {
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
};

let lastValidWeatherData = null;

function initWeather() {

    try {

        refreshWeather();

        const weatherConfig = getWeatherConfig();

        setInterval(refreshWeather, weatherConfig.refreshIntervalMs);

    } catch (error) {

        console.warn("Module meteo indisponible.", error);

    }

}

function getWeatherConfig() {

    return {
        ...defaultWeatherConfig,
        ...(window.AUREL_CONFIG && window.AUREL_CONFIG.weather ? window.AUREL_CONFIG.weather : {})
    };

}

async function getWeatherData() {

    const weatherConfig = getWeatherConfig();

    if (weatherConfig.provider !== "open-meteo") {
        throw new Error("Provider météo non autorisé : " + weatherConfig.provider);
    }

    return getOpenMeteoWeatherData(weatherConfig);

}

async function getOpenMeteoWeatherData(weatherConfig) {

    const response = await fetchWithTimeout(buildOpenMeteoUrl(weatherConfig), weatherConfig.timeoutMs);

    if (!response.ok) {
        throw new Error("Open-Meteo HTTP " + response.status);
    }

    const apiData = await response.json();

    return mapOpenMeteoData(apiData, weatherConfig);

}

function buildOpenMeteoUrl(weatherConfig) {

    const params = new URLSearchParams({
        latitude: weatherConfig.latitude,
        longitude: weatherConfig.longitude,
        current: weatherConfig.current.join(","),
        hourly: weatherConfig.hourly.join(","),
        daily: weatherConfig.daily.join(","),
        timezone: weatherConfig.timezone,
        forecast_days: weatherConfig.forecastDays,
        temperature_unit: weatherConfig.units.temperature,
        wind_speed_unit: weatherConfig.units.windSpeed,
        precipitation_unit: weatherConfig.units.precipitation
    });

    return weatherConfig.endpoint + "?" + params.toString();

}

function fetchWithTimeout(url, timeoutMs) {

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, {
        signal: controller.signal
    }).finally(() => {
        clearTimeout(timeoutId);
    });

}

function mapOpenMeteoData(apiData, weatherConfig) {

    if (!apiData || !apiData.current || !apiData.daily) {
        throw new Error("Donnees Open-Meteo incompletes.");
    }

    const current = apiData.current;
    const daily = apiData.daily;
    const rainRisk = getDailyValue(daily.precipitation_probability_max, 0);
    const windSpeed = current.wind_speed_10m;
    const windGusts = current.wind_gusts_10m;
    const rain = current.rain || current.precipitation || 0;

    return {
        temperature: formatWeatherValue(current.temperature_2m, "°C"),
        conditions: formatWeatherCode(current.weather_code),
        humidity: formatWeatherValue(current.relative_humidity_2m, "%"),
        wind: formatWind(windSpeed, windGusts),
        rainRisk: formatWeatherValue(rainRisk, "%"),
        sunrise: formatWeatherTime(getDailyValue(daily.sunrise, 0)),
        sunset: formatWeatherTime(getDailyValue(daily.sunset, 0)),
        chantier: calculateChantierStatus({
            rainRisk: rainRisk,
            windSpeed: windSpeed,
            windGusts: windGusts,
            rain: rain
        }, weatherConfig.chantierThresholds),
        tomorrow: mapTomorrowForecast(apiData)
    };

}

function mapTomorrowForecast(apiData) {

    const daily = apiData.daily || {};
    const hourly = apiData.hourly || {};
    const tomorrowDate = getDailyValue(daily.time, 1);
    const hourlyRows = [];

    if (tomorrowDate && Array.isArray(hourly.time)) {
        [6, 9, 12, 15, 18].forEach((hour) => {
            const marker = tomorrowDate + "T" + String(hour).padStart(2, "0") + ":00";
            const index = hourly.time.indexOf(marker);
            if (index >= 0) {
                hourlyRows.push({
                    hour: String(hour).padStart(2, "0") + "h",
                    temperature: formatWeatherValue(getHourlyValue(hourly.temperature_2m, index), "°C"),
                    rain: formatWeatherValue(getHourlyValue(hourly.precipitation_probability, index), "%"),
                    wind: formatWeatherValue(getHourlyValue(hourly.wind_speed_10m, index), " km/h")
                });
            }
        });
    }

    return {
        date: tomorrowDate,
        min: formatWeatherValue(getDailyValue(daily.temperature_2m_min, 1), "°C"),
        max: formatWeatherValue(getDailyValue(daily.temperature_2m_max, 1), "°C"),
        rain: formatWeatherValue(getDailyValue(daily.precipitation_probability_max, 1), "%"),
        wind: formatWeatherValue(getDailyValue(daily.wind_speed_10m_max, 1), " km/h"),
        humidity: getTomorrowAverageHumidity(hourly, tomorrowDate),
        hours: hourlyRows
    };

}

function getHourlyValue(values, index) {

    return Array.isArray(values) ? values[index] : null;

}

function getTomorrowAverageHumidity(hourly, tomorrowDate) {

    if (!tomorrowDate || !Array.isArray(hourly.time) || !Array.isArray(hourly.relative_humidity_2m)) {
        return "Indisponible";
    }

    const values = hourly.time
        .map((time, index) => time.startsWith(tomorrowDate) ? hourly.relative_humidity_2m[index] : null)
        .filter((value) => value !== null && value !== undefined && !Number.isNaN(value));

    if (!values.length) {
        return "Indisponible";
    }

    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return formatWeatherValue(average, "%");

}

function getDailyValue(values, index) {

    return Array.isArray(values) ? values[index] : null;

}

function formatWeatherValue(value, unit) {

    if (value === null || value === undefined || Number.isNaN(value)) {
        return "Indisponible";
    }

    return Math.round(value) + unit;

}

function formatWind(speed, gusts) {

    if (speed === null || speed === undefined || Number.isNaN(speed)) {
        return "Indisponible";
    }

    const roundedSpeed = Math.round(speed) + " km/h";

    if (gusts === null || gusts === undefined || Number.isNaN(gusts)) {
        return roundedSpeed;
    }

    return roundedSpeed + " (rafales " + Math.round(gusts) + " km/h)";

}

function formatWeatherTime(value) {

    if (!value) {
        return "Indisponible";
    }

    return value.slice(11, 16);

}

function formatWeatherCode(code) {

    const weatherCodes = {
        0: "Ciel dégagé",
        1: "Principalement clair",
        2: "Partiellement nuageux",
        3: "Couvert",
        45: "Brouillard",
        48: "Brouillard givrant",
        51: "Bruine légère",
        53: "Bruine modérée",
        55: "Bruine dense",
        61: "Pluie faible",
        63: "Pluie modérée",
        65: "Forte pluie",
        80: "Averses faibles",
        81: "Averses modérées",
        82: "Fortes averses",
        95: "Orage",
        96: "Orage avec grêle",
        99: "Orage violent avec grêle"
    };

    return weatherCodes[code] || "Conditions inconnues";

}

function calculateChantierStatus(weatherData, thresholds) {

    const safeThresholds = {
        ...defaultWeatherConfig.chantierThresholds,
        ...(thresholds || {})
    };

    if (
        weatherData.rainRisk > safeThresholds.warningRainRiskMax ||
        weatherData.windSpeed > safeThresholds.warningWindMaxKmh ||
        weatherData.windGusts >= safeThresholds.unsafeGustMinKmh ||
        weatherData.rain >= safeThresholds.activeRainUnsafeMm
    ) {
        return "unsafe";
    }

    if (
        weatherData.rainRisk > safeThresholds.idealRainRiskMax ||
        weatherData.windSpeed > safeThresholds.idealWindMaxKmh
    ) {
        return "warning";
    }

    return "ideal";

}

function renderWeather(data) {

    const weatherElement = document.getElementById("weather");

    if (!weatherElement) {
        console.warn("Module meteo indisponible : element #weather introuvable.");
        return;
    }

    const essentialRows = [
        {
            label: "Conditions chantier",
            value: formatChantierStatus(data.chantier)
        },
        {
            label: "Pluie",
            value: data.rainRisk
        },
        {
            label: "Vent",
            value: data.wind
        },
        {
            label: "Ciel",
            value: data.conditions
        }
    ];

    weatherElement.replaceChildren();

    essentialRows.forEach((row) => {

        const rowElement = document.createElement("div");
        rowElement.textContent = row.label + " : " + row.value;
        rowElement.style.marginBottom = "8px";
        weatherElement.appendChild(rowElement);

    });

    window.AurelState = window.AurelState || {};
    window.AurelState.weather = {
        raw: data,
        status: "ready",
        summary: "Conditions chantier : " + formatChantierStatus(data.chantier).replace(/^[^ ]+ /, "") + ".",
        chantier: data.chantier,
        chantierLabel: formatChantierStatus(data.chantier).replace(/^[^ ]+ /, "")
    };

    renderTomorrowForecast(data.tomorrow);
    notifyAurelStateUpdatedIfAvailable();
    return;

    const rows = [
        {
            label: "🌡 Température actuelle",
            value: data.temperature
        },
        {
            label: "☁️ Météo actuelle",
            value: data.conditions
        },
        {
            label: "💧 Humidité",
            value: data.humidity
        },
        {
            label: "💨 Vent",
            value: data.wind
        },
        {
            label: "🌧 Risque de pluie",
            value: data.rainRisk
        },
        {
            label: "🌅 Lever / coucher du soleil",
            value: data.sunrise + " / " + data.sunset
        },
        {
            label: "🌿 Conditions de chantier",
            value: formatChantierStatus(data.chantier)
        }
    ];

    weatherElement.replaceChildren();

    rows.forEach((row) => {

        const rowElement = document.createElement("div");
        rowElement.textContent = row.label + " : " + row.value;
        rowElement.style.marginBottom = "8px";
        weatherElement.appendChild(rowElement);

    });

    window.AurelState = window.AurelState || {};
    window.AurelState.weather = {
        raw: data,
        status: "ready",
        summary: "🌦️ Conditions de chantier : " + formatChantierStatus(data.chantier).replace(/^[^ ]+ /, "") + ".",
        chantier: data.chantier,
        chantierLabel: formatChantierStatus(data.chantier).replace(/^[^ ]+ /, "")
    };

    notifyAurelStateUpdatedIfAvailable();

}

function renderTomorrowForecast(tomorrow) {

    const forecastElement = document.getElementById("tomorrowForecast");

    if (!forecastElement) {
        return;
    }

    if (!tomorrow) {
        forecastElement.textContent = "Prévisions indisponibles.";
        return;
    }

    forecastElement.innerHTML = `
        <div class="forecast-summary">
            ${renderForecastMetric("Minimum", tomorrow.min)}
            ${renderForecastMetric("Maximum", tomorrow.max)}
            ${renderForecastMetric("Pluie", tomorrow.rain)}
            ${renderForecastMetric("Vent", tomorrow.wind)}
            ${renderForecastMetric("Humidité", tomorrow.humidity)}
        </div>
        <div class="forecast-hours">
            ${(tomorrow.hours || []).map((hour) => `
                <article class="forecast-hour">
                    <span>${escapeWeatherHtml(hour.hour)}</span>
                    <strong>${escapeWeatherHtml(hour.temperature)}</strong>
                    <small>Pluie ${escapeWeatherHtml(hour.rain)} · Vent ${escapeWeatherHtml(hour.wind)}</small>
                </article>
            `).join("") || "<div class='forecast-metric'>Evolution horaire indisponible.</div>"}
        </div>
    `;

}

function renderForecastMetric(label, value) {

    return `
        <article class="forecast-metric">
            <span>${escapeWeatherHtml(label)}</span>
            <strong>${escapeWeatherHtml(value)}</strong>
        </article>
    `;

}

function escapeWeatherHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}

function renderWeatherError(error) {

    const weatherElement = document.getElementById("weather");

    if (!weatherElement) {
        console.warn("Module meteo indisponible : element #weather introuvable.");
        return;
    }

    const rows = [
        "⚠️ Météo indisponible",
        "Impossible de récupérer les données Open-Meteo.",
        "La carte météo se remettra à jour automatiquement."
    ];

    weatherElement.replaceChildren();

    rows.forEach((row) => {

        const rowElement = document.createElement("div");
        rowElement.textContent = row;
        rowElement.style.marginBottom = "8px";
        weatherElement.appendChild(rowElement);

    });

    window.AurelState = window.AurelState || {};
    window.AurelState.weather = {
        raw: null,
        status: "unavailable",
        summary: "🌦️ Météo indisponible.",
        error: error ? error.message : "Erreur météo inconnue"
    };

    renderTomorrowForecast(null);
    notifyAurelStateUpdatedIfAvailable();

}

function formatChantierStatus(status) {

    const statuses = {
        ideal: "🟢 Idéales",
        warning: "🟠 Vigilance",
        unsafe: "🔴 Déconseillées"
    };

    return statuses[status] || statuses.warning;

}

async function refreshWeather() {

    try {

        const weatherData = await getWeatherData();
        lastValidWeatherData = weatherData;
        renderWeather(weatherData);

    } catch (error) {

        console.warn("Erreur pendant la mise a jour meteo.", error);

        renderWeatherError(error);

    }

}

// =====================================
// AUREL
// =====================================

const aurelModules = [
    "initWebcam",
    "initClock",
    "initRadar",
    "initWeather",
    "initPause",
    "initYoutube"
];

function initAurel(modules) {

    modules.forEach((moduleName) => {

        const initModule = window[moduleName];

        if (typeof initModule !== "function") {
            console.warn("Module Aurel indisponible : " + moduleName);
            return;
        }

        try {
            initModule();
        } catch (error) {
            console.warn("Erreur pendant l'initialisation du module Aurel : " + moduleName, error);
        }

    });


}

initAurel(aurelModules);

function notifyAurelStateUpdatedIfAvailable() {

    if (typeof notifyAurelStateUpdated === "function") {
        notifyAurelStateUpdated();
    }

}
