(function () {
    "use strict";

    const DB_NAME = "kynexy-client-core";
    const DB_VERSION = 1;
    const STORE_CLIENTS = "clients";
    const STORE_DOCUMENTS = "documents";
    const FALLBACK_CLIENTS_KEY = "kynexy-client-core:clients";
    const FALLBACK_DOCUMENTS_KEY = "kynexy-client-core:documents";

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
                console.warn("IndexedDB unavailable, using client fallback storage.", error);
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
            const timeout = window.setTimeout(() => reject(new Error("Client database opening timed out.")), 3500);
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(STORE_CLIENTS)) {
                    const clients = database.createObjectStore(STORE_CLIENTS, { keyPath: "id" });
                    clients.createIndex("name", "name", { unique: false });
                    clients.createIndex("updatedAt", "updatedAt", { unique: false });
                }
                if (!database.objectStoreNames.contains(STORE_DOCUMENTS)) {
                    const documents = database.createObjectStore(STORE_DOCUMENTS, { keyPath: "id" });
                    documents.createIndex("clientId", "clientId", { unique: false });
                    documents.createIndex("type", "type", { unique: false });
                    documents.createIndex("createdAt", "createdAt", { unique: false });
                    documents.createIndex("number", "number", { unique: true });
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
                reject(request.error || new Error("Unable to open client database."));
            };
            request.onblocked = () => {
                window.clearTimeout(timeout);
                reject(new Error("Client database upgrade is blocked by another open tab."));
            };
        });

        return createIndexedDbEngine(db);
    }

    function createIndexedDbEngine(db) {
        return {
            type: "indexeddb",
            createClient(input) {
                const client = normalizeClient(input);
                return transaction(db, STORE_CLIENTS, "readwrite", async (store) => {
                    await requestToPromise(store.add(client));
                    return client;
                });
            },
            getClient(id) {
                return transaction(db, STORE_CLIENTS, "readonly", (store) => requestToPromise(store.get(id)));
            },
            listClients() {
                return transaction(db, STORE_CLIENTS, "readonly", async (store) => {
                    const clients = await requestToPromise(store.getAll());
                    return clients.sort(compareClients);
                });
            },
            updateClient(id, patch) {
                return transaction(db, STORE_CLIENTS, "readwrite", async (store) => {
                    const existing = await requestToPromise(store.get(id));
                    if (!existing) {
                        throw new Error(`Client ${id} does not exist.`);
                    }
                    const updated = normalizeClient({ ...existing, ...patch, id, createdAt: existing.createdAt });
                    await requestToPromise(store.put(updated));
                    return updated;
                });
            },
            deleteClient(id) {
                return transaction(db, [STORE_CLIENTS, STORE_DOCUMENTS], "readwrite", async (stores) => {
                    await requestToPromise(stores[STORE_CLIENTS].delete(id));
                    const docs = await requestToPromise(stores[STORE_DOCUMENTS].index("clientId").getAll(id));
                    await Promise.all(docs.map((doc) => requestToPromise(stores[STORE_DOCUMENTS].delete(doc.id))));
                    return true;
                });
            },
            createDocument(input) {
                const document = normalizeDocument(input);
                return transaction(db, STORE_DOCUMENTS, "readwrite", async (store) => {
                    await requestToPromise(store.add(document));
                    return document;
                });
            },
            getDocument(id) {
                return transaction(db, STORE_DOCUMENTS, "readonly", (store) => requestToPromise(store.get(id)));
            },
            listDocuments(options = {}) {
                return transaction(db, STORE_DOCUMENTS, "readonly", async (store) => {
                    let docs;
                    if (options.clientId) {
                        docs = await requestToPromise(store.index("clientId").getAll(options.clientId));
                    } else if (options.type) {
                        docs = await requestToPromise(store.index("type").getAll(options.type));
                    } else {
                        docs = await requestToPromise(store.getAll());
                    }
                    return docs
                        .filter((doc) => !options.type || doc.type === options.type)
                        .sort(compareDocuments);
                });
            },
            updateDocument(id, patch) {
                return transaction(db, STORE_DOCUMENTS, "readwrite", async (store) => {
                    const existing = await requestToPromise(store.get(id));
                    if (!existing) {
                        throw new Error(`Document ${id} does not exist.`);
                    }
                    const updated = normalizeDocument({ ...existing, ...patch, id, number: existing.number, createdAt: existing.createdAt });
                    await requestToPromise(store.put(updated));
                    return updated;
                });
            },
            deleteDocument(id) {
                return transaction(db, STORE_DOCUMENTS, "readwrite", async (store) => {
                    await requestToPromise(store.delete(id));
                    return true;
                });
            },
            clearForTests() {
                return transaction(db, [STORE_CLIENTS, STORE_DOCUMENTS], "readwrite", async (stores) => {
                    await requestToPromise(stores[STORE_CLIENTS].clear());
                    await requestToPromise(stores[STORE_DOCUMENTS].clear());
                });
            }
        };
    }

    function createLocalStorageEngine() {
        return {
            type: "localstorage-fallback",
            async createClient(input) {
                const client = normalizeClient(input);
                const clients = readJson(FALLBACK_CLIENTS_KEY, []);
                clients.push(client);
                writeJson(FALLBACK_CLIENTS_KEY, clients.sort(compareClients));
                return client;
            },
            async getClient(id) {
                return readJson(FALLBACK_CLIENTS_KEY, []).find((client) => client.id === id) || null;
            },
            async listClients() {
                return readJson(FALLBACK_CLIENTS_KEY, []).sort(compareClients);
            },
            async updateClient(id, patch) {
                const clients = readJson(FALLBACK_CLIENTS_KEY, []);
                const index = clients.findIndex((client) => client.id === id);
                if (index === -1) {
                    throw new Error(`Client ${id} does not exist.`);
                }
                clients[index] = normalizeClient({ ...clients[index], ...patch, id, createdAt: clients[index].createdAt });
                writeJson(FALLBACK_CLIENTS_KEY, clients.sort(compareClients));
                return clients[index];
            },
            async deleteClient(id) {
                writeJson(FALLBACK_CLIENTS_KEY, readJson(FALLBACK_CLIENTS_KEY, []).filter((client) => client.id !== id));
                writeJson(FALLBACK_DOCUMENTS_KEY, readJson(FALLBACK_DOCUMENTS_KEY, []).filter((doc) => doc.clientId !== id));
                return true;
            },
            async createDocument(input) {
                const document = normalizeDocument(input);
                const documents = readJson(FALLBACK_DOCUMENTS_KEY, []);
                documents.push(document);
                writeJson(FALLBACK_DOCUMENTS_KEY, documents.sort(compareDocuments));
                return document;
            },
            async getDocument(id) {
                return readJson(FALLBACK_DOCUMENTS_KEY, []).find((doc) => doc.id === id) || null;
            },
            async listDocuments(options = {}) {
                return readJson(FALLBACK_DOCUMENTS_KEY, [])
                    .filter((doc) => (!options.clientId || doc.clientId === options.clientId) && (!options.type || doc.type === options.type))
                    .sort(compareDocuments);
            },
            async updateDocument(id, patch) {
                const documents = readJson(FALLBACK_DOCUMENTS_KEY, []);
                const index = documents.findIndex((doc) => doc.id === id);
                if (index === -1) {
                    throw new Error(`Document ${id} does not exist.`);
                }
                documents[index] = normalizeDocument({ ...documents[index], ...patch, id, number: documents[index].number, createdAt: documents[index].createdAt });
                writeJson(FALLBACK_DOCUMENTS_KEY, documents.sort(compareDocuments));
                return documents[index];
            },
            async deleteDocument(id) {
                writeJson(FALLBACK_DOCUMENTS_KEY, readJson(FALLBACK_DOCUMENTS_KEY, []).filter((doc) => doc.id !== id));
                return true;
            },
            async clearForTests() {
                window.localStorage.removeItem(FALLBACK_CLIENTS_KEY);
                window.localStorage.removeItem(FALLBACK_DOCUMENTS_KEY);
            }
        };
    }

    function normalizeClient(input) {
        const now = new Date().toISOString();
        return {
            id: input.id || createId("client"),
            name: String(input.name || "Nouveau client").trim() || "Nouveau client",
            phone: String(input.phone || "").trim(),
            email: String(input.email || "").trim(),
            address: String(input.address || "").trim(),
            notes: String(input.notes || "").trim(),
            createdAt: input.createdAt || now,
            updatedAt: now
        };
    }

    function normalizeDocument(input) {
        const now = new Date().toISOString();
        const type = input.type === "invoice" ? "invoice" : "quote";
        const totals = calculateTotals(input.totalTtc || input.ttc || 0, input.taxRate);
        return {
            id: input.id || createId("doc"),
            type,
            number: input.number || createDocumentNumber(type),
            clientId: input.clientId || "",
            clientName: String(input.clientName || "Client").trim() || "Client",
            clientPhone: String(input.clientPhone || "").trim(),
            clientEmail: String(input.clientEmail || "").trim(),
            clientAddress: String(input.clientAddress || "").trim(),
            description: String(input.description || "").trim(),
            taxRate: totals.taxRate,
            totalHt: totals.totalHt,
            taxAmount: totals.taxAmount,
            totalTtc: totals.totalTtc,
            status: input.status || (type === "invoice" ? "a_regler" : "brouillon"),
            createdAt: input.createdAt || now,
            updatedAt: now
        };
    }

    function calculateTotals(totalTtc, taxRate = 13) {
        const rate = Number(taxRate || 0);
        const ttc = roundMoney(totalTtc);
        const ht = rate > 0 ? roundMoney(ttc / (1 + rate / 100)) : ttc;
        return {
            taxRate: rate,
            totalHt: ht,
            taxAmount: roundMoney(ttc - ht),
            totalTtc: ttc
        };
    }

    function transaction(db, storeNames, mode, callback) {
        const tx = db.transaction(storeNames, mode);
        const stores = Array.isArray(storeNames)
            ? storeNames.reduce((acc, name) => ({ ...acc, [name]: tx.objectStore(name) }), {})
            : tx.objectStore(storeNames);
        return Promise.resolve(callback(stores)).then((result) => completeTransaction(tx).then(() => result));
    }

    function completeTransaction(tx) {
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error("Client database transaction failed."));
            tx.onabort = () => reject(tx.error || new Error("Client database transaction aborted."));
        });
    }

    function requestToPromise(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Client database request failed."));
        });
    }

    function withEngine(method, ...args) {
        return open().then((engine) => engine[method](...args));
    }

    function compareClients(a, b) {
        return String(a.name || "").localeCompare(String(b.name || ""), "fr");
    }

    function compareDocuments(a, b) {
        return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    }

    function createDocumentNumber(type) {
        const prefix = type === "invoice" ? "FAC" : "DEV";
        const stamp = new Date();
        const datePart = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, "0")}${String(stamp.getDate()).padStart(2, "0")}`;
        const random = Math.random().toString(36).slice(2, 5).toUpperCase();
        return `${prefix}-${datePart}-${random}`;
    }

    function createId(prefix) {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return `${prefix}-${window.crypto.randomUUID()}`;
        }
        return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function roundMoney(value) {
        const number = Number(String(value || 0).replace(/\s/g, "").replace(",", "."));
        return Math.round((Number.isFinite(number) ? number : 0) * 100) / 100;
    }

    function readJson(key, fallback) {
        try {
            const value = window.localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            console.warn("Unable to read client fallback storage.", error);
            return fallback;
        }
    }

    function writeJson(key, value) {
        window.localStorage.setItem(key, JSON.stringify(value));
    }

    window.ClientDB = {
        name: DB_NAME,
        version: DB_VERSION,
        open,
        get engineType() {
            return activeEngineType;
        },
        createClient(input) {
            return withEngine("createClient", input);
        },
        getClient(id) {
            return withEngine("getClient", id);
        },
        listClients() {
            return withEngine("listClients");
        },
        updateClient(id, patch) {
            return withEngine("updateClient", id, patch);
        },
        deleteClient(id) {
            return withEngine("deleteClient", id);
        },
        createDocument(input) {
            return withEngine("createDocument", input);
        },
        getDocument(id) {
            return withEngine("getDocument", id);
        },
        listDocuments(options) {
            return withEngine("listDocuments", options);
        },
        updateDocument(id, patch) {
            return withEngine("updateDocument", id, patch);
        },
        deleteDocument(id) {
            return withEngine("deleteDocument", id);
        },
        calculateTotals,
        clearForTests() {
            return withEngine("clearForTests");
        }
    };
}());
