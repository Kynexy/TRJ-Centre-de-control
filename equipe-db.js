(function () {
    "use strict";

    const DB_NAME = "kynexy-team-core";
    const DB_VERSION = 1;
    const STORE_MEMBERS = "members";
    const STORE_ENTRIES = "work_entries";
    const STORE_EVENTS = "context_events";
    const FALLBACK_MEMBERS_KEY = "kynexy-team-core:members";
    const FALLBACK_ENTRIES_KEY = "kynexy-team-core:work_entries";
    const FALLBACK_EVENTS_KEY = "kynexy-team-core:context_events";

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
                console.warn("IndexedDB unavailable, using team fallback storage.", error);
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
            const timeout = window.setTimeout(() => reject(new Error("Team database opening timed out.")), 3500);
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(STORE_MEMBERS)) {
                    const members = database.createObjectStore(STORE_MEMBERS, { keyPath: "id" });
                    members.createIndex("name", "name", { unique: false });
                    members.createIndex("updatedAt", "updatedAt", { unique: false });
                }
                if (!database.objectStoreNames.contains(STORE_ENTRIES)) {
                    const entries = database.createObjectStore(STORE_ENTRIES, { keyPath: "id" });
                    entries.createIndex("date", "date", { unique: false });
                    entries.createIndex("memberId", "memberId", { unique: false });
                    entries.createIndex("memberDate", ["memberId", "date"], { unique: true });
                    entries.createIndex("updatedAt", "updatedAt", { unique: false });
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
                reject(request.error || new Error("Unable to open team database."));
            };
            request.onblocked = () => {
                window.clearTimeout(timeout);
                reject(new Error("Team database upgrade is blocked by another open tab."));
            };
        });

        return createIndexedDbEngine(db);
    }

    function createIndexedDbEngine(db) {
        return {
            type: "indexeddb",
            createMember(input) {
                const member = normalizeMember(input);
                return transaction(db, [STORE_MEMBERS, STORE_EVENTS], "readwrite", async (stores) => {
                    await requestToPromise(stores[STORE_MEMBERS].add(member));
                    await writeContextEvent(stores[STORE_EVENTS], "team.member.created", "member", member.id, member);
                    return member;
                });
            },
            getMember(id) {
                return transaction(db, STORE_MEMBERS, "readonly", (store) => requestToPromise(store.get(id)));
            },
            listMembers() {
                return transaction(db, STORE_MEMBERS, "readonly", async (store) => {
                    const members = await requestToPromise(store.getAll());
                    return members.sort(compareMembers);
                });
            },
            updateMember(id, patch) {
                return transaction(db, [STORE_MEMBERS, STORE_EVENTS], "readwrite", async (stores) => {
                    const existing = await requestToPromise(stores[STORE_MEMBERS].get(id));
                    if (!existing) {
                        throw new Error(`Member ${id} does not exist.`);
                    }
                    const updated = normalizeMember({ ...existing, ...patch, id, createdAt: existing.createdAt });
                    await requestToPromise(stores[STORE_MEMBERS].put(updated));
                    await writeContextEvent(stores[STORE_EVENTS], "team.member.updated", "member", id, { before: existing, after: updated });
                    return updated;
                });
            },
            deleteMember(id) {
                return transaction(db, [STORE_MEMBERS, STORE_ENTRIES, STORE_EVENTS], "readwrite", async (stores) => {
                    const existing = await requestToPromise(stores[STORE_MEMBERS].get(id));
                    if (existing) {
                        const entries = await requestToPromise(stores[STORE_ENTRIES].index("memberId").getAll(id));
                        await Promise.all(entries.map((entry) => requestToPromise(stores[STORE_ENTRIES].delete(entry.id))));
                        await requestToPromise(stores[STORE_MEMBERS].delete(id));
                        await writeContextEvent(stores[STORE_EVENTS], "team.member.deleted", "member", id, { member: existing, entries });
                    }
                    return true;
                });
            },
            upsertWorkEntry(input) {
                const entry = normalizeWorkEntry(input);
                return transaction(db, [STORE_ENTRIES, STORE_EVENTS], "readwrite", async (stores) => {
                    const index = stores[STORE_ENTRIES].index("memberDate");
                    const existing = await requestToPromise(index.get([entry.memberId, entry.date]));
                    const saved = normalizeWorkEntry({ ...existing, ...entry, id: existing ? existing.id : entry.id, createdAt: existing ? existing.createdAt : entry.createdAt });
                    await requestToPromise(stores[STORE_ENTRIES].put(saved));
                    await writeContextEvent(stores[STORE_EVENTS], existing ? "team.entry.updated" : "team.entry.created", "work_entry", saved.id, { before: existing || null, after: saved });
                    return saved;
                });
            },
            deleteWorkEntry(id) {
                return transaction(db, [STORE_ENTRIES, STORE_EVENTS], "readwrite", async (stores) => {
                    const existing = await requestToPromise(stores[STORE_ENTRIES].get(id));
                    if (existing) {
                        await requestToPromise(stores[STORE_ENTRIES].delete(id));
                        await writeContextEvent(stores[STORE_EVENTS], "team.entry.deleted", "work_entry", id, existing);
                    }
                    return true;
                });
            },
            listWorkEntries(options = {}) {
                return transaction(db, STORE_ENTRIES, "readonly", async (store) => {
                    let entries;
                    if (options.from || options.to) {
                        const lower = options.from || "0000-01-01";
                        const upper = options.to || "9999-12-31";
                        entries = await requestToPromise(store.index("date").getAll(IDBKeyRange.bound(lower, upper)));
                    } else if (options.memberId) {
                        entries = await requestToPromise(store.index("memberId").getAll(options.memberId));
                    } else {
                        entries = await requestToPromise(store.getAll());
                    }
                    return entries
                        .filter((entry) => !options.memberId || entry.memberId === options.memberId)
                        .sort(compareEntries);
                });
            },
            listContextEvents() {
                return transaction(db, STORE_EVENTS, "readonly", async (store) => {
                    const events = await requestToPromise(store.getAll());
                    return events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
                });
            },
            clearForTests() {
                return transaction(db, [STORE_MEMBERS, STORE_ENTRIES, STORE_EVENTS], "readwrite", async (stores) => {
                    await requestToPromise(stores[STORE_MEMBERS].clear());
                    await requestToPromise(stores[STORE_ENTRIES].clear());
                    await requestToPromise(stores[STORE_EVENTS].clear());
                });
            }
        };
    }

    function createLocalStorageEngine() {
        return {
            type: "localstorage-fallback",
            async createMember(input) {
                const member = normalizeMember(input);
                const members = readJson(FALLBACK_MEMBERS_KEY, []);
                members.push(member);
                writeJson(FALLBACK_MEMBERS_KEY, members.sort(compareMembers));
                appendFallbackEvent("team.member.created", "member", member.id, member);
                return member;
            },
            async getMember(id) {
                return readJson(FALLBACK_MEMBERS_KEY, []).find((member) => member.id === id) || null;
            },
            async listMembers() {
                return readJson(FALLBACK_MEMBERS_KEY, []).sort(compareMembers);
            },
            async updateMember(id, patch) {
                const members = readJson(FALLBACK_MEMBERS_KEY, []);
                const index = members.findIndex((member) => member.id === id);
                if (index === -1) {
                    throw new Error(`Member ${id} does not exist.`);
                }
                const existing = members[index];
                const updated = normalizeMember({ ...existing, ...patch, id, createdAt: existing.createdAt });
                members[index] = updated;
                writeJson(FALLBACK_MEMBERS_KEY, members.sort(compareMembers));
                appendFallbackEvent("team.member.updated", "member", id, { before: existing, after: updated });
                return updated;
            },
            async deleteMember(id) {
                const members = readJson(FALLBACK_MEMBERS_KEY, []);
                const entries = readJson(FALLBACK_ENTRIES_KEY, []);
                const existing = members.find((member) => member.id === id);
                writeJson(FALLBACK_MEMBERS_KEY, members.filter((member) => member.id !== id));
                writeJson(FALLBACK_ENTRIES_KEY, entries.filter((entry) => entry.memberId !== id));
                if (existing) {
                    appendFallbackEvent("team.member.deleted", "member", id, existing);
                }
                return true;
            },
            async upsertWorkEntry(input) {
                const entry = normalizeWorkEntry(input);
                const entries = readJson(FALLBACK_ENTRIES_KEY, []);
                const index = entries.findIndex((item) => item.memberId === entry.memberId && item.date === entry.date);
                const existing = index >= 0 ? entries[index] : null;
                const saved = normalizeWorkEntry({ ...existing, ...entry, id: existing ? existing.id : entry.id, createdAt: existing ? existing.createdAt : entry.createdAt });
                if (index >= 0) {
                    entries[index] = saved;
                } else {
                    entries.push(saved);
                }
                writeJson(FALLBACK_ENTRIES_KEY, entries.sort(compareEntries));
                appendFallbackEvent(existing ? "team.entry.updated" : "team.entry.created", "work_entry", saved.id, { before: existing, after: saved });
                return saved;
            },
            async deleteWorkEntry(id) {
                const entries = readJson(FALLBACK_ENTRIES_KEY, []);
                const existing = entries.find((entry) => entry.id === id);
                writeJson(FALLBACK_ENTRIES_KEY, entries.filter((entry) => entry.id !== id));
                if (existing) {
                    appendFallbackEvent("team.entry.deleted", "work_entry", id, existing);
                }
                return true;
            },
            async listWorkEntries(options = {}) {
                return readJson(FALLBACK_ENTRIES_KEY, [])
                    .filter((entry) => (!options.memberId || entry.memberId === options.memberId) && (!options.from || entry.date >= options.from) && (!options.to || entry.date <= options.to))
                    .sort(compareEntries);
            },
            async listContextEvents() {
                return readJson(FALLBACK_EVENTS_KEY, []).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
            },
            async clearForTests() {
                window.localStorage.removeItem(FALLBACK_MEMBERS_KEY);
                window.localStorage.removeItem(FALLBACK_ENTRIES_KEY);
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
            tx.onerror = () => reject(tx.error || new Error("Team database transaction failed."));
            tx.onabort = () => reject(tx.error || new Error("Team database transaction aborted."));
        });
    }

    function requestToPromise(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Team database request failed."));
        });
    }

    async function writeContextEvent(store, eventType, subjectType, subjectId, payload) {
        const event = createContextEvent(eventType, subjectType, subjectId, payload);
        await requestToPromise(store.put(event));
        return event;
    }

    function appendFallbackEvent(eventType, subjectType, subjectId, payload) {
        const events = readJson(FALLBACK_EVENTS_KEY, []);
        events.push(createContextEvent(eventType, subjectType, subjectId, payload));
        writeJson(FALLBACK_EVENTS_KEY, events);
    }

    function createContextEvent(eventType, subjectType, subjectId, payload) {
        return {
            id: `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            domain: "team",
            eventType,
            subjectType,
            subjectId,
            occurredAt: new Date().toISOString(),
            payload: payload || {}
        };
    }

    function normalizeMember(input) {
        const now = new Date().toISOString();
        const color = String(input.color || "#2ca9ff").trim();
        return {
            id: input.id || createId("member"),
            name: String(input.name || "Nouveau salarie").trim() || "Nouveau salarie",
            color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#2ca9ff",
            phone: String(input.phone || "").trim(),
            role: String(input.role || "").trim(),
            hourlyRate: roundMoney(input.hourlyRate || 0),
            active: input.active !== false,
            createdAt: input.createdAt || now,
            updatedAt: now
        };
    }

    function normalizeWorkEntry(input) {
        const now = new Date().toISOString();
        const date = String(input.date || "").slice(0, 10);
        if (!input.memberId) {
            throw new Error("Work entry memberId is required.");
        }
        if (!date) {
            throw new Error("Work entry date is required.");
        }
        return {
            id: input.id || createId("entry"),
            memberId: input.memberId,
            date,
            hours: roundHours(input.hours || 0),
            advance: roundMoney(input.advance || 0),
            salaryPaid: roundMoney(input.salaryPaid || 0),
            absent: Boolean(input.absent),
            note: String(input.note || "").trim(),
            createdAt: input.createdAt || now,
            updatedAt: now
        };
    }

    function calculateSummary(member, entries, referenceDate = new Date()) {
        const date = asDate(referenceDate);
        const monthStart = toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1));
        const monthEnd = toIsoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
        const weekStartDate = new Date(date);
        weekStartDate.setDate(date.getDate() - ((date.getDay() + 6) % 7));
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekStartDate.getDate() + 6);
        const weekStart = toIsoDate(weekStartDate);
        const weekEnd = toIsoDate(weekEndDate);

        const monthEntries = entries.filter((entry) => entry.memberId === member.id && entry.date >= monthStart && entry.date <= monthEnd);
        const weekEntries = entries.filter((entry) => entry.memberId === member.id && entry.date >= weekStart && entry.date <= weekEnd);
        const monthHours = sum(monthEntries, "hours");
        const weekHours = sum(weekEntries, "hours");
        const calculatedSalary = roundMoney(monthHours * Number(member.hourlyRate || 0));
        const advances = sum(monthEntries, "advance");
        const salaryPaid = sum(monthEntries, "salaryPaid");

        return {
            memberId: member.id,
            weekHours,
            monthHours,
            calculatedSalary,
            advances,
            salaryPaid,
            remaining: roundMoney(calculatedSalary - advances - salaryPaid),
            absences: monthEntries.filter((entry) => entry.absent).length
        };
    }

    function calculateAllSummaries(members, entries, referenceDate) {
        return members.map((member) => calculateSummary(member, entries, referenceDate));
    }

    function roundHours(value) {
        return Math.max(0, Math.round((Number(value) || 0) * 100) / 100);
    }

    function roundMoney(value) {
        return Math.round((Number(value) || 0) * 100) / 100;
    }

    function sum(items, key) {
        return roundMoney(items.reduce((total, item) => total + Number(item[key] || 0), 0));
    }

    function asDate(value) {
        if (value instanceof Date) {
            return new Date(value.getFullYear(), value.getMonth(), value.getDate());
        }
        return new Date(String(value).slice(0, 10) + "T00:00:00");
    }

    function toIsoDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function createId(prefix) {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return `${prefix}-${window.crypto.randomUUID()}`;
        }
        return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function compareMembers(a, b) {
        return String(a.name || "").localeCompare(String(b.name || ""), "fr");
    }

    function compareEntries(a, b) {
        return `${a.date}${a.memberId}`.localeCompare(`${b.date}${b.memberId}`);
    }

    function readJson(key, fallback) {
        try {
            const value = window.localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            console.warn("Unable to read team fallback storage.", error);
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

    window.KynexyTeamDB = {
        name: DB_NAME,
        version: DB_VERSION,
        open,
        get engineType() {
            return activeEngineType;
        },
        createMember(input) {
            return withEngine("createMember", input);
        },
        getMember(id) {
            return withEngine("getMember", id);
        },
        listMembers() {
            return withEngine("listMembers");
        },
        updateMember(id, patch) {
            return withEngine("updateMember", id, patch);
        },
        deleteMember(id) {
            return withEngine("deleteMember", id);
        },
        upsertWorkEntry(input) {
            return withEngine("upsertWorkEntry", input);
        },
        deleteWorkEntry(id) {
            return withEngine("deleteWorkEntry", id);
        },
        listWorkEntries(options) {
            return withEngine("listWorkEntries", options);
        },
        listContextEvents() {
            return withEngine("listContextEvents");
        },
        calculateSummary,
        calculateAllSummaries,
        clearForTests() {
            return withEngine("clearForTests");
        }
    };
}());
