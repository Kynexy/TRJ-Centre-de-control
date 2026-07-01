(function () {
    "use strict";

    const DB_NAME = "kynexy-aurel-core";
    const DB_VERSION = 1;
    const STORE_MEMORY = "memory";
    const STORE_CONVERSATIONS = "conversations";
    const STORE_CONTEXT = "context";
    const FALLBACK_MEMORY_KEY = "kynexy-aurel-core:memory";
    const FALLBACK_CONVERSATIONS_KEY = "kynexy-aurel-core:conversations";
    const FALLBACK_CONTEXT_KEY = "kynexy-aurel-core:context";

    let enginePromise = null;
    let activeEngineType = "not-opened";
    let currentContext = createDefaultContext();

    async function open() {
        if (enginePromise) {
            return enginePromise;
        }

        enginePromise = openIndexedDbEngine()
            .then((engine) => {
                activeEngineType = "indexeddb";
                return engine;
            })
            .catch((error) => {
                console.warn("IndexedDB unavailable, using Aurel fallback storage.", error);
                activeEngineType = "localstorage-fallback";
                return createLocalStorageEngine();
            });

        const engine = await enginePromise;
        currentContext = await engine.getContext();
        startContextManager();
        return engine;
    }

    async function openIndexedDbEngine() {
        if (!window.indexedDB) {
            throw new Error("IndexedDB is not available in this browser.");
        }

        const db = await new Promise((resolve, reject) => {
            const timeout = window.setTimeout(() => reject(new Error("Aurel database opening timed out.")), 3500);
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(STORE_MEMORY)) {
                    const memory = database.createObjectStore(STORE_MEMORY, { keyPath: "id" });
                    memory.createIndex("type", "type", { unique: false });
                    memory.createIndex("updatedAt", "updatedAt", { unique: false });
                    memory.createIndex("pinned", "pinned", { unique: false });
                }
                if (!database.objectStoreNames.contains(STORE_CONVERSATIONS)) {
                    const conversations = database.createObjectStore(STORE_CONVERSATIONS, { keyPath: "id" });
                    conversations.createIndex("createdAt", "createdAt", { unique: false });
                    conversations.createIndex("author", "author", { unique: false });
                }
                if (!database.objectStoreNames.contains(STORE_CONTEXT)) {
                    database.createObjectStore(STORE_CONTEXT, { keyPath: "id" });
                }
            };

            request.onsuccess = () => {
                window.clearTimeout(timeout);
                const database = request.result;
                database.onversionchange = () => database.close();
                resolve(database);
            };
            request.onerror = () => {
                window.clearTimeout(timeout);
                reject(request.error || new Error("Unable to open Aurel database."));
            };
            request.onblocked = () => {
                window.clearTimeout(timeout);
                reject(new Error("Aurel database upgrade is blocked by another open tab."));
            };
        });

        return createIndexedDbEngine(db);
    }

    function createIndexedDbEngine(db) {
        return {
            type: "indexeddb",
            remember(input) {
                const item = normalizeMemory(input);
                return transaction(db, STORE_MEMORY, "readwrite", async (store) => {
                    await requestToPromise(store.put(item));
                    return item;
                });
            },
            listMemory(options = {}) {
                return transaction(db, STORE_MEMORY, "readonly", async (store) => {
                    const items = options.type
                        ? await requestToPromise(store.index("type").getAll(options.type))
                        : await requestToPromise(store.getAll());
                    return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
                });
            },
            deleteMemory(id) {
                return transaction(db, STORE_MEMORY, "readwrite", async (store) => {
                    await requestToPromise(store.delete(id));
                    return true;
                });
            },
            addConversationMessage(input) {
                const message = normalizeConversationMessage(input);
                return transaction(db, STORE_CONVERSATIONS, "readwrite", async (store) => {
                    await requestToPromise(store.add(message));
                    return message;
                });
            },
            listConversation(options = {}) {
                return transaction(db, STORE_CONVERSATIONS, "readonly", async (store) => {
                    const messages = await requestToPromise(store.getAll());
                    return messages
                        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                        .slice(options.limit ? -Number(options.limit) : 0);
                });
            },
            setContext(patch) {
                return transaction(db, STORE_CONTEXT, "readwrite", async (store) => {
                    currentContext = normalizeContext({ ...currentContext, ...patch });
                    await requestToPromise(store.put({ id: "current", value: currentContext, updatedAt: new Date().toISOString() }));
                    publishContext();
                    return currentContext;
                });
            },
            getContext() {
                return transaction(db, STORE_CONTEXT, "readonly", async (store) => {
                    const stored = await requestToPromise(store.get("current"));
                    return normalizeContext(stored ? stored.value : createDefaultContext());
                });
            },
            clearForTests() {
                return transaction(db, [STORE_MEMORY, STORE_CONVERSATIONS, STORE_CONTEXT], "readwrite", async (stores) => {
                    await requestToPromise(stores[STORE_MEMORY].clear());
                    await requestToPromise(stores[STORE_CONVERSATIONS].clear());
                    await requestToPromise(stores[STORE_CONTEXT].clear());
                    currentContext = createDefaultContext();
                });
            }
        };
    }

    function createLocalStorageEngine() {
        return {
            type: "localstorage-fallback",
            async remember(input) {
                const item = normalizeMemory(input);
                const items = readJson(FALLBACK_MEMORY_KEY, []);
                const index = items.findIndex((existing) => existing.id === item.id);
                if (index >= 0) {
                    items[index] = item;
                } else {
                    items.push(item);
                }
                writeJson(FALLBACK_MEMORY_KEY, items);
                return item;
            },
            async listMemory(options = {}) {
                return readJson(FALLBACK_MEMORY_KEY, [])
                    .filter((item) => !options.type || item.type === options.type)
                    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
            },
            async deleteMemory(id) {
                writeJson(FALLBACK_MEMORY_KEY, readJson(FALLBACK_MEMORY_KEY, []).filter((item) => item.id !== id));
                return true;
            },
            async addConversationMessage(input) {
                const message = normalizeConversationMessage(input);
                const messages = readJson(FALLBACK_CONVERSATIONS_KEY, []);
                messages.push(message);
                writeJson(FALLBACK_CONVERSATIONS_KEY, messages);
                return message;
            },
            async listConversation(options = {}) {
                const messages = readJson(FALLBACK_CONVERSATIONS_KEY, []).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
                return messages.slice(options.limit ? -Number(options.limit) : 0);
            },
            async setContext(patch) {
                currentContext = normalizeContext({ ...currentContext, ...patch });
                writeJson(FALLBACK_CONTEXT_KEY, currentContext);
                publishContext();
                return currentContext;
            },
            async getContext() {
                return normalizeContext(readJson(FALLBACK_CONTEXT_KEY, createDefaultContext()));
            },
            async clearForTests() {
                window.localStorage.removeItem(FALLBACK_MEMORY_KEY);
                window.localStorage.removeItem(FALLBACK_CONVERSATIONS_KEY);
                window.localStorage.removeItem(FALLBACK_CONTEXT_KEY);
                currentContext = createDefaultContext();
            }
        };
    }

    async function getPlanningSnapshot() {
        if (!window.KynexyPlanningDB) {
            return { status: "unavailable", today: [], upcoming: [], notes: [] };
        }
        await window.KynexyPlanningDB.open();
        const today = toIsoDate(new Date());
        const next = new Date();
        next.setDate(next.getDate() + 14);
        const appointments = await window.KynexyPlanningDB.listAppointments({ from: today, to: toIsoDate(next) });
        return {
            status: "ready",
            today: appointments.filter((appointment) => appointment.date === today),
            upcoming: appointments.filter((appointment) => appointment.date >= today).slice(0, 8),
            notes: appointments.filter((appointment) => appointment.notes).map((appointment) => ({
                appointmentId: appointment.id,
                date: appointment.date,
                client: appointment.client,
                notes: appointment.notes
            }))
        };
    }

    async function getTeamSnapshot() {
        if (!window.KynexyTeamDB) {
            return { status: "unavailable", members: [], entries: [], advances: [], summaries: [] };
        }
        await window.KynexyTeamDB.open();
        const range = getMonthRange(new Date());
        const [members, entries, advances] = await Promise.all([
            window.KynexyTeamDB.listMembers(),
            window.KynexyTeamDB.listWorkEntries(range),
            window.KynexyTeamDB.listAdvances(range)
        ]);
        const activeMembers = members.filter((member) => member.active !== false);
        return {
            status: "ready",
            members: activeMembers,
            entries,
            advances,
            summaries: window.KynexyTeamDB.calculateAllSummaries(activeMembers, entries, advances, new Date())
        };
    }

    async function getWeatherSnapshot() {
        const existing = window.AurelState && window.AurelState.weather;
        if (existing) {
            return { status: existing.status || "ready", source: "AurelState.weather", data: existing.raw || existing, summary: existing.summary || "" };
        }

        const config = getWeatherConfig();
        if (!config || !window.fetch) {
            return { status: "unavailable", source: "none", data: null, summary: "Meteo indisponible." };
        }

        try {
            const url = buildWeatherUrl(config);
            const response = await fetchWithTimeout(url, config.timeoutMs || 6000);
            const data = await response.json();
            const current = data.current || {};
            return {
                status: "ready",
                source: "open-meteo",
                data,
                summary: `Meteo: ${formatMaybe(current.temperature_2m, "deg")} pluie ${formatMaybe(current.rain || current.precipitation, "mm")} vent ${formatMaybe(current.wind_speed_10m, "km/h")}.`
            };
        } catch (error) {
            return { status: "error", source: "open-meteo", data: null, summary: "Meteo indisponible.", error: error.message };
        }
    }

    async function buildOperationalBrief(question = "") {
        const [planning, team, weather, memory] = await Promise.all([
            getPlanningSnapshot(),
            getTeamSnapshot(),
            getWeatherSnapshot(),
            listMemory({ type: "pinned" })
        ]);

        const lines = [];
        lines.push("Topo Kynexy :");
        lines.push(formatWeatherBrief(weather));
        lines.push(formatPlanningBrief(planning));
        lines.push(formatTeamBrief(team));
        if (memory.length) {
            lines.push(`Memoire: ${memory.slice(0, 3).map((item) => item.title || item.content).join(" ; ")}.`);
        }

        return {
            question,
            answer: lines.filter(Boolean).join("\n"),
            sources: { planning, team, weather, memory },
            createdAt: new Date().toISOString()
        };
    }

    async function ask(question) {
        await addConversationMessage({ author: "user", text: question });
        const brief = await buildOperationalBrief(question);
        await addConversationMessage({ author: "aurel", text: brief.answer });
        return brief;
    }

    function startContextManager() {
        updateContextFromPage();
        window.addEventListener("popstate", updateContextFromPage);
        window.addEventListener("hashchange", updateContextFromPage);
        window.addEventListener("kynexy:context:update", (event) => {
            setContext(event.detail || {});
        });
        window.setInterval(updateContextFromPage, 4000);
    }

    function updateContextFromPage() {
        const page = document.body.dataset.aurelPage ? "aurel" : getPageName();
        const planningState = window.KynexyPlanning && window.KynexyPlanning.getState ? window.KynexyPlanning.getState() : null;
        const teamState = window.KynexyTeam && window.KynexyTeam.getState ? window.KynexyTeam.getState() : null;
        setContext({
            page,
            url: window.location.pathname,
            selectedAppointmentId: getDatasetValue("selectedAppointmentId"),
            selectedMemberId: getDatasetValue("selectedMemberId"),
            displayedDay: getDatasetValue("displayedDay") || (planningState && planningState.currentDate ? String(planningState.currentDate).slice(0, 10) : null),
            displayedMonth: getDatasetValue("displayedMonth") || getDisplayedMonth(planningState || teamState)
        }).catch(() => {});
    }

    function createDefaultContext() {
        return {
            page: "unknown",
            url: "",
            selectedAppointmentId: null,
            selectedMemberId: null,
            displayedDay: null,
            displayedMonth: null,
            updatedAt: new Date().toISOString()
        };
    }

    function normalizeContext(input) {
        return {
            page: input.page || "unknown",
            url: input.url || window.location.pathname,
            selectedAppointmentId: input.selectedAppointmentId || null,
            selectedMemberId: input.selectedMemberId || null,
            displayedDay: input.displayedDay || null,
            displayedMonth: input.displayedMonth || null,
            updatedAt: new Date().toISOString()
        };
    }

    function normalizeMemory(input) {
        const now = new Date().toISOString();
        return {
            id: input.id || createId("mem"),
            type: input.type || "note",
            title: String(input.title || "").trim(),
            content: String(input.content || input.text || "").trim(),
            pinned: Boolean(input.pinned || input.type === "pinned"),
            metadata: input.metadata || {},
            createdAt: input.createdAt || now,
            updatedAt: now
        };
    }

    function normalizeConversationMessage(input) {
        return {
            id: input.id || createId("msg"),
            author: input.author === "user" ? "user" : "aurel",
            text: String(input.text || "").trim(),
            createdAt: input.createdAt || new Date().toISOString(),
            metadata: input.metadata || {}
        };
    }

    async function transaction(db, storeNames, mode, callback) {
        const tx = db.transaction(storeNames, mode);
        const stores = Array.isArray(storeNames)
            ? storeNames.reduce((acc, name) => ({ ...acc, [name]: tx.objectStore(name) }), {})
            : tx.objectStore(storeNames);
        const result = await callback(stores);
        await completeTransaction(tx);
        return result;
    }

    function completeTransaction(tx) {
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error("Aurel database transaction failed."));
            tx.onabort = () => reject(tx.error || new Error("Aurel database transaction aborted."));
        });
    }

    function requestToPromise(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Aurel database request failed."));
        });
    }

    function withEngine(method, ...args) {
        return open().then((engine) => engine[method](...args));
    }

    function remember(input) {
        return withEngine("remember", input);
    }

    function listMemory(options) {
        return withEngine("listMemory", options);
    }

    function deleteMemory(id) {
        return withEngine("deleteMemory", id);
    }

    function addConversationMessage(input) {
        return withEngine("addConversationMessage", input);
    }

    function listConversation(options) {
        return withEngine("listConversation", options);
    }

    function setContext(patch) {
        return withEngine("setContext", patch);
    }

    function getContext() {
        return withEngine("getContext");
    }

    function clearForTests() {
        return withEngine("clearForTests");
    }

    function publishContext() {
        window.KynexyAurelContext = currentContext;
        window.AurelState = window.AurelState || {};
        window.AurelState.context = currentContext;
    }

    function getPageName() {
        const file = window.location.pathname.split("/").pop() || "index.html";
        return file.replace(".html", "") || "home";
    }

    function getDatasetValue(key) {
        const node = document.querySelector(`[data-aurel-${toKebab(key)}]`);
        return node ? node.dataset[`aurel${capitalize(key)}`] || null : null;
    }

    function getDisplayedMonth(state) {
        if (!state || !state.currentDate) {
            return toIsoDate(new Date()).slice(0, 7);
        }
        return String(state.currentDate).slice(0, 7);
    }

    function getMonthRange(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        return {
            from: toIsoDate(new Date(year, month, 1)),
            to: toIsoDate(new Date(year, month + 1, 0))
        };
    }

    function getWeatherConfig() {
        const base = window.AUREL_CONFIG && window.AUREL_CONFIG.weather ? window.AUREL_CONFIG.weather : null;
        if (!base) {
            return null;
        }
        return {
            endpoint: base.endpoint,
            latitude: base.latitude,
            longitude: base.longitude,
            timezone: base.timezone || "Pacific/Tahiti",
            current: base.current || ["temperature_2m", "rain", "wind_speed_10m"],
            daily: base.daily || ["precipitation_probability_max", "wind_speed_10m_max"],
            forecastDays: base.forecastDays || 3,
            timeoutMs: base.timeoutMs || 6000
        };
    }

    function buildWeatherUrl(config) {
        const params = new URLSearchParams({
            latitude: config.latitude,
            longitude: config.longitude,
            timezone: config.timezone,
            forecast_days: config.forecastDays,
            current: config.current.join(","),
            daily: config.daily.join(",")
        });
        return `${config.endpoint}?${params.toString()}`;
    }

    function fetchWithTimeout(url, timeoutMs) {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), timeoutMs);
        return fetch(url, { signal: controller.signal }).finally(() => window.clearTimeout(timer));
    }

    function formatWeatherBrief(weather) {
        if (weather.status !== "ready") {
            return "Meteo: indisponible pour le moment.";
        }
        return weather.summary || "Meteo: disponible.";
    }

    function formatPlanningBrief(planning) {
        if (planning.status !== "ready") {
            return "Planning: connecteur indisponible.";
        }
        if (!planning.today.length) {
            return `Planning: aucun rendez-vous aujourd'hui, ${planning.upcoming.length} a venir.`;
        }
        return `Planning: ${planning.today.length} rendez-vous aujourd'hui. Prochain: ${planning.today[0].client || "client"} a ${planning.today[0].start || "heure a preciser"}.`;
    }

    function formatTeamBrief(team) {
        if (team.status !== "ready") {
            return "Equipe: connecteur indisponible.";
        }
        const remaining = team.summaries.reduce((total, summary) => total + Number(summary.remaining || 0), 0);
        return `Equipe: ${team.members.length} salarie(s), ${formatMoney(remaining)} restent a payer.`;
    }

    function formatMaybe(value, unit) {
        return value === undefined || value === null ? `? ${unit}` : `${value} ${unit}`;
    }

    function formatMoney(value) {
        return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(value || 0))} F`;
    }

    function toIsoDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function toKebab(value) {
        return String(value).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    }

    function capitalize(value) {
        const text = String(value);
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    function createId(prefix) {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return `${prefix}-${window.crypto.randomUUID()}`;
        }
        return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function readJson(key, fallback) {
        try {
            const value = window.localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            console.warn("Unable to read Aurel fallback storage.", error);
            return fallback;
        }
    }

    function writeJson(key, value) {
        window.localStorage.setItem(key, JSON.stringify(value));
    }

    window.AurelDB = {
        name: DB_NAME,
        version: DB_VERSION,
        open,
        get engineType() {
            return activeEngineType;
        },
        remember,
        listMemory,
        deleteMemory,
        addConversationMessage,
        listConversation,
        setContext,
        getContext,
        connectors: {
            planning: { read: getPlanningSnapshot },
            team: { read: getTeamSnapshot },
            weather: { read: getWeatherSnapshot }
        },
        buildOperationalBrief,
        ask,
        clearForTests
    };
}());
