(function () {
    "use strict";

    const DB_NAME = "kynexy-planning-core";
    const DB_VERSION = 1;
    const STORE_APPOINTMENTS = "appointments";
    const STORE_EVENTS = "context_events";
    const FALLBACK_APPOINTMENTS_KEY = "kynexy-planning-core:appointments";
    const FALLBACK_EVENTS_KEY = "kynexy-planning-core:context_events";

    let enginePromise = null;
    let activeEngineType = "not-opened";

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
                console.warn("IndexedDB unavailable, using durable fallback storage.", error);
                activeEngineType = "localstorage-fallback";
                return createLocalStorageEngine();
            });

        return enginePromise;
    }

    async function openIndexedDbEngine() {
        if (!window.indexedDB) {
            throw new Error("IndexedDB is not available in this browser.");
        }

        const db = await new Promise((resolve, reject) => {
            const timeout = window.setTimeout(() => reject(new Error("Planning database opening timed out.")), 3500);
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(STORE_APPOINTMENTS)) {
                    const appointments = database.createObjectStore(STORE_APPOINTMENTS, { keyPath: "id" });
                    appointments.createIndex("date", "date", { unique: false });
                    appointments.createIndex("dateTime", ["date", "start"], { unique: false });
                    appointments.createIndex("updatedAt", "updatedAt", { unique: false });
                    appointments.createIndex("category", "category", { unique: false });
                }
                if (!database.objectStoreNames.contains(STORE_EVENTS)) {
                    const events = database.createObjectStore(STORE_EVENTS, { keyPath: "id" });
                    events.createIndex("occurredAt", "occurredAt", { unique: false });
                    events.createIndex("subject", ["subjectType", "subjectId"], { unique: false });
                    events.createIndex("eventType", "eventType", { unique: false });
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
                reject(request.error || new Error("Unable to open planning database."));
            };
            request.onblocked = () => {
                window.clearTimeout(timeout);
                reject(new Error("Planning database upgrade is blocked by another open tab."));
            };
        });

        return createIndexedDbEngine(db);
    }

    function createIndexedDbEngine(db) {
        return {
            type: "indexeddb",
            createAppointment(input) {
                const appointment = normalizeAppointment(input);
                return transaction(db, [STORE_APPOINTMENTS, STORE_EVENTS], "readwrite", async (stores) => {
                    await requestToPromise(stores[STORE_APPOINTMENTS].add(appointment));
                    await writeContextEvent(stores[STORE_EVENTS], "appointment.created", appointment.id, appointment);
                    return appointment;
                });
            },
            getAppointment(id) {
                return transaction(db, STORE_APPOINTMENTS, "readonly", (store) => requestToPromise(store.get(id)));
            },
            listAppointments(options = {}) {
                return transaction(db, STORE_APPOINTMENTS, "readonly", async (store) => {
                    let appointments;
                    if (options.from || options.to) {
                        const lower = options.from || "0000-01-01";
                        const upper = options.to || "9999-12-31";
                        appointments = await requestToPromise(store.index("date").getAll(IDBKeyRange.bound(lower, upper)));
                    } else {
                        appointments = await requestToPromise(store.getAll());
                    }
                    return appointments.sort(compareAppointments);
                });
            },
            updateAppointment(id, patch) {
                return transaction(db, [STORE_APPOINTMENTS, STORE_EVENTS], "readwrite", async (stores) => {
                    const existing = await requestToPromise(stores[STORE_APPOINTMENTS].get(id));
                    if (!existing) {
                        throw new Error(`Appointment ${id} does not exist.`);
                    }
                    const updated = normalizeAppointment({ ...existing, ...patch, id, createdAt: existing.createdAt });
                    await requestToPromise(stores[STORE_APPOINTMENTS].put(updated));
                    await writeContextEvent(stores[STORE_EVENTS], "appointment.updated", id, { before: existing, after: updated });
                    return updated;
                });
            },
            deleteAppointment(id) {
                return transaction(db, [STORE_APPOINTMENTS, STORE_EVENTS], "readwrite", async (stores) => {
                    const existing = await requestToPromise(stores[STORE_APPOINTMENTS].get(id));
                    if (existing) {
                        await requestToPromise(stores[STORE_APPOINTMENTS].delete(id));
                        await writeContextEvent(stores[STORE_EVENTS], "appointment.deleted", id, existing);
                    }
                    return true;
                });
            },
            listContextEvents() {
                return transaction(db, STORE_EVENTS, "readonly", async (store) => {
                    const events = await requestToPromise(store.getAll());
                    return events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
                });
            },
            clearForTests() {
                return transaction(db, [STORE_APPOINTMENTS, STORE_EVENTS], "readwrite", async (stores) => {
                    await requestToPromise(stores[STORE_APPOINTMENTS].clear());
                    await requestToPromise(stores[STORE_EVENTS].clear());
                });
            }
        };
    }

    function createLocalStorageEngine() {
        return {
            type: "localstorage-fallback",
            async createAppointment(input) {
                const appointment = normalizeAppointment(input);
                const appointments = readJson(FALLBACK_APPOINTMENTS_KEY, []);
                if (appointments.some((item) => item.id === appointment.id)) {
                    throw new Error(`Appointment ${appointment.id} already exists.`);
                }
                appointments.push(appointment);
                writeJson(FALLBACK_APPOINTMENTS_KEY, appointments.sort(compareAppointments));
                appendFallbackEvent("appointment.created", appointment.id, appointment);
                return appointment;
            },
            async getAppointment(id) {
                return readJson(FALLBACK_APPOINTMENTS_KEY, []).find((item) => item.id === id) || null;
            },
            async listAppointments(options = {}) {
                return readJson(FALLBACK_APPOINTMENTS_KEY, [])
                    .filter((item) => (!options.from || item.date >= options.from) && (!options.to || item.date <= options.to))
                    .sort(compareAppointments);
            },
            async updateAppointment(id, patch) {
                const appointments = readJson(FALLBACK_APPOINTMENTS_KEY, []);
                const index = appointments.findIndex((item) => item.id === id);
                if (index === -1) {
                    throw new Error(`Appointment ${id} does not exist.`);
                }
                const existing = appointments[index];
                const updated = normalizeAppointment({ ...existing, ...patch, id, createdAt: existing.createdAt });
                appointments[index] = updated;
                writeJson(FALLBACK_APPOINTMENTS_KEY, appointments.sort(compareAppointments));
                appendFallbackEvent("appointment.updated", id, { before: existing, after: updated });
                return updated;
            },
            async deleteAppointment(id) {
                const appointments = readJson(FALLBACK_APPOINTMENTS_KEY, []);
                const existing = appointments.find((item) => item.id === id);
                writeJson(FALLBACK_APPOINTMENTS_KEY, appointments.filter((item) => item.id !== id));
                if (existing) {
                    appendFallbackEvent("appointment.deleted", id, existing);
                }
                return true;
            },
            async listContextEvents() {
                return readJson(FALLBACK_EVENTS_KEY, []).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
            },
            async clearForTests() {
                window.localStorage.removeItem(FALLBACK_APPOINTMENTS_KEY);
                window.localStorage.removeItem(FALLBACK_EVENTS_KEY);
            }
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
            tx.onerror = () => reject(tx.error || new Error("Planning database transaction failed."));
            tx.onabort = () => reject(tx.error || new Error("Planning database transaction aborted."));
        });
    }

    function requestToPromise(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Planning database request failed."));
        });
    }

    async function writeContextEvent(store, eventType, subjectId, payload) {
        const event = createContextEvent(eventType, subjectId, payload);
        await requestToPromise(store.put(event));
        return event;
    }

    function appendFallbackEvent(eventType, subjectId, payload) {
        const events = readJson(FALLBACK_EVENTS_KEY, []);
        events.push(createContextEvent(eventType, subjectId, payload));
        writeJson(FALLBACK_EVENTS_KEY, events);
    }

    function createContextEvent(eventType, subjectId, payload) {
        return {
            id: `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            domain: "planning",
            eventType,
            subjectType: "appointment",
            subjectId,
            occurredAt: new Date().toISOString(),
            payload: payload || {}
        };
    }

    function normalizeAppointment(input) {
        const now = new Date().toISOString();
        const date = String(input.date || "").slice(0, 10);
        const start = normalizeTime(input.start || getTimePart(input.timeRange, 0) || "08:00");
        const end = normalizeTime(input.end || getTimePart(input.timeRange, 1) || "09:00");

        if (!date) {
            throw new Error("Appointment date is required.");
        }

        return {
            id: input.id || createId(),
            client: String(input.client || "Nouveau client").trim() || "Nouveau client",
            address: String(input.address || "").trim(),
            phone: String(input.phone || "").trim(),
            date,
            start,
            end,
            timeRange: `${start} - ${end}`,
            category: input.category || "chantier",
            notes: String(input.notes || "").trim(),
            createdAt: input.createdAt || now,
            updatedAt: now
        };
    }

    function normalizeTime(value) {
        const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
        if (!match) {
            return "08:00";
        }
        return `${match[1].padStart(2, "0")}:${match[2]}`;
    }

    function getTimePart(timeRange, index) {
        if (!timeRange || !String(timeRange).includes(" - ")) {
            return "";
        }
        return String(timeRange).split(" - ")[index] || "";
    }

    function createId() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return `rdv-${window.crypto.randomUUID()}`;
        }
        return `rdv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function compareAppointments(a, b) {
        return `${a.date}${a.start}${a.client}`.localeCompare(`${b.date}${b.start}${b.client}`);
    }

    function readJson(key, fallback) {
        try {
            const value = window.localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            console.warn("Unable to read planning fallback storage.", error);
            return fallback;
        }
    }

    function writeJson(key, value) {
        window.localStorage.setItem(key, JSON.stringify(value));
    }

    async function withEngine(method, ...args) {
        const engine = await open();
        return engine[method](...args);
    }

    window.KynexyPlanningDB = {
        name: DB_NAME,
        version: DB_VERSION,
        open,
        get engineType() {
            return activeEngineType;
        },
        createAppointment(input) {
            return withEngine("createAppointment", input);
        },
        getAppointment(id) {
            return withEngine("getAppointment", id);
        },
        listAppointments(options) {
            return withEngine("listAppointments", options);
        },
        updateAppointment(id, patch) {
            return withEngine("updateAppointment", id, patch);
        },
        deleteAppointment(id) {
            return withEngine("deleteAppointment", id);
        },
        listContextEvents() {
            return withEngine("listContextEvents");
        },
        clearForTests() {
            return withEngine("clearForTests");
        }
    };
}());