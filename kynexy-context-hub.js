(function () {
    "use strict";

    const HUB_VERSION = "1.0.0";
    const registeredCollectors = new Map();
    let lastContext = createEmptyContext();

    function register(domain, collector) {
        const normalizedDomain = normalizeDomainName(domain);
        if (!normalizedDomain) {
            throw new Error("KynexyContextHub.register requires a domain name.");
        }
        if (typeof collector !== "function" && (!collector || typeof collector !== "object")) {
            throw new Error("KynexyContextHub.register requires a function or an object collector.");
        }
        registeredCollectors.set(normalizedDomain, collector);
        return refresh();
    }

    function unregister(domain) {
        registeredCollectors.delete(normalizeDomainName(domain));
        return refresh();
    }

    function refresh() {
        const context = createEmptyContext();
        const collectorEntries = [
            ...getBuiltinCollectors(),
            ...Array.from(registeredCollectors.entries()).map(([domain, collector]) => ({ domain, collector, source: "registered" }))
        ];

        collectorEntries.forEach(({ domain, collector, source }) => {
            const snapshot = readCollector(domain, collector, source);
            context.domains[domain] = snapshot;
            context.summaries.push({ domain, status: snapshot.status, summary: snapshot.summary });
            context.facts.push(...snapshot.facts.map((fact) => ({ domain, ...fact })));
            context.risks.push(...snapshot.risks.map((risk) => ({ domain, ...risk })));
            context.actions.push(...snapshot.actions.map((action) => ({ domain, ...action })));
        });

        context.status = getGlobalStatus(Object.values(context.domains));
        context.connectedDomains = Object.values(context.domains).filter((domain) => domain.status === "ready" || domain.status === "partial").length;
        context.generatedAt = new Date().toISOString();
        lastContext = context;
        window.KynexySharedContext = context;
        notifyUpdated(context);
        return context;
    }

    function getContext() {
        return lastContext;
    }

    function getDomain(domain) {
        return lastContext.domains[normalizeDomainName(domain)] || null;
    }

    function getBuiltinCollectors() {
        return [
            { domain: "planning", collector: collectPlanning, source: "builtin" },
            { domain: "team", collector: collectTeam, source: "builtin" },
            { domain: "crm", collector: collectCrm, source: "builtin" },
            { domain: "kynexy", collector: collectKynexy, source: "builtin" },
            { domain: "today", collector: collectToday, source: "builtin" },
            { domain: "crypto", collector: collectCrypto, source: "builtin" },
            { domain: "weather", collector: collectWeather, source: "builtin" }
        ];
    }

    function collectPlanning() {
        const state = window.KynexyPlanningState || (window.AurelState && window.AurelState.planning) || null;
        if (!state) {
            return unavailable("Planning non charge.");
        }
        const today = Array.isArray(state.today) ? state.today : [];
        const next = Array.isArray(state.nextAppointments) ? state.nextAppointments : [];
        return {
            status: state.databaseReady === false ? "partial" : "ready",
            summary: today.length
                ? `${today.length} rendez-vous aujourd'hui.`
                : "Aucun rendez-vous publie pour aujourd'hui.",
            facts: [
                fact("appointments_count", state.appointmentsCount || 0),
                fact("today_appointments", today.length),
                fact("next_appointments", next.length)
            ],
            actions: next.slice(0, 3).map((appointment) => ({
                type: "appointment",
                label: appointment.client || appointment.title || "Rendez-vous",
                date: appointment.date || "",
                time: appointment.start || ""
            })),
            raw: state
        };
    }

    function collectTeam() {
        const state = window.KynexyTeamState || (window.AurelState && window.AurelState.team) || null;
        if (!state) {
            return unavailable("Equipe non chargee.");
        }
        const summaries = Array.isArray(state.summaries) ? state.summaries : [];
        const remaining = summaries.reduce((total, item) => total + Number(item.remaining || 0), 0);
        const monthHours = summaries.reduce((total, item) => total + Number(item.monthHours || 0), 0);
        return {
            status: state.databaseReady === false ? "partial" : "ready",
            summary: `${state.membersCount || 0} salarie(s), ${formatNumber(monthHours)} h ce mois-ci.`,
            facts: [
                fact("members_count", state.membersCount || 0),
                fact("entries_count", state.entriesCount || 0),
                fact("advances_count", state.advancesCount || 0),
                fact("month_hours", monthHours),
                fact("remaining_to_pay", remaining)
            ],
            risks: remaining > 0 ? [{ type: "payment", label: "Reste a payer", value: remaining }] : [],
            raw: state
        };
    }

    function collectCrm() {
        if (!window.KynexyClientModule || typeof window.KynexyClientModule.getState !== "function") {
            return unavailable("CRM non charge.");
        }
        const state = safeCall(() => window.KynexyClientModule.getState(), null);
        if (!state) {
            return unavailable("CRM indisponible.");
        }
        const clients = Array.isArray(state.clients) ? state.clients : [];
        const documents = Array.isArray(state.documents) ? state.documents : [];
        const quotes = documents.filter((doc) => doc.type === "quote");
        const invoices = documents.filter((doc) => doc.type === "invoice");
        return {
            status: state.databaseReady === false ? "partial" : "ready",
            summary: `${clients.length} client(s), ${quotes.length} devis, ${invoices.length} facture(s).`,
            facts: [
                fact("clients_count", clients.length),
                fact("documents_count", documents.length),
                fact("quotes_count", quotes.length),
                fact("invoices_count", invoices.length)
            ],
            actions: documents.slice(0, 3).map((doc) => ({
                type: doc.type || "document",
                label: doc.number || "Document",
                client: doc.clientName || "",
                amount: Number(doc.totalTtc || 0)
            })),
            raw: state
        };
    }

    function collectKynexy() {
        const state = window.AurelPageState || null;
        if (!state) {
            return unavailable("KYNEXY non charge.");
        }
        const messages = Array.isArray(state.messages) ? state.messages : [];
        return {
            status: "ready",
            summary: `${messages.length} message(s) en memoire de conversation.`,
            facts: [
                fact("messages_count", messages.length),
                fact("mode", state.mode || "unknown")
            ],
            raw: state
        };
    }

    function collectToday() {
        const state = window.KynexyContextState || null;
        if (!state) {
            return unavailable("Today non charge.");
        }
        const active = state.analysis && Array.isArray(state.analysis.active) ? state.analysis.active : [];
        const confidence = state.analysis ? Number(state.analysis.confidence || 0) : 0;
        return {
            status: active.length ? "ready" : "partial",
            summary: `${active.length} domaine(s) actif(s), confiance ${confidence}%.`,
            facts: [
                fact("active_domains", active.length),
                fact("confidence", confidence)
            ],
            raw: state
        };
    }

    function collectCrypto() {
        const state = window.KynexyCryptoState || (window.AurelState && window.AurelState.crypto) || null;
        if (!state) {
            return unavailable("Crypto non charge.");
        }
        const pools = Array.isArray(state.pools) ? state.pools : [];
        const walletConnected = Boolean(state.wallet || state.walletConnected);
        return {
            status: pools.length || state.status === "ready" ? "ready" : "partial",
            summary: `${pools.length} rendement(s) filtre(s), wallet ${walletConnected ? "connecte" : "non connecte"}.`,
            facts: [
                fact("filtered_pools", pools.length),
                fact("wallet_connected", walletConnected),
                fact("risk_profile", state.risk || "")
            ],
            risks: pools.length ? [] : [{ type: "source", label: "Aucune opportunite crypto filtree disponible." }],
            raw: state
        };
    }

    function collectWeather() {
        const state = window.AurelState && window.AurelState.weather ? window.AurelState.weather : null;
        if (!state) {
            return unavailable("Meteo non chargee.");
        }
        const data = state.raw || state.data || {};
        return {
            status: state.status || "ready",
            summary: state.summary || "Meteo disponible.",
            facts: [
                fact("temperature", data.temperature || ""),
                fact("rain_risk", data.rainRisk || ""),
                fact("wind", data.wind || ""),
                fact("conditions", data.conditions || "")
            ],
            risks: data.chantier === "unsafe" ? [{ type: "weather", label: "Conditions chantier deconseillees." }] : [],
            raw: state
        };
    }

    function readCollector(domain, collector, source) {
        try {
            const value = typeof collector === "function" ? collector() : collector;
            return normalizeSnapshot(domain, value, source);
        } catch (error) {
            return normalizeSnapshot(domain, {
                status: "error",
                summary: `Erreur de lecture du contexte ${domain}.`,
                risks: [{ type: "collector_error", label: error && error.message ? error.message : String(error) }]
            }, source);
        }
    }

    function normalizeSnapshot(domain, input, source) {
        const value = input && typeof input === "object" ? input : unavailable(`${domain} indisponible.`);
        return {
            domain,
            source: source || "unknown",
            status: normalizeStatus(value.status),
            summary: String(value.summary || ""),
            updatedAt: value.updatedAt || new Date().toISOString(),
            facts: normalizeList(value.facts),
            risks: normalizeList(value.risks),
            actions: normalizeList(value.actions),
            raw: value.raw === undefined ? null : value.raw
        };
    }

    function unavailable(summary) {
        return {
            status: "unavailable",
            summary,
            facts: [],
            risks: [],
            actions: [],
            raw: null
        };
    }

    function createEmptyContext() {
        return {
            version: HUB_VERSION,
            status: "unavailable",
            generatedAt: null,
            connectedDomains: 0,
            domains: {},
            summaries: [],
            facts: [],
            risks: [],
            actions: []
        };
    }

    function fact(type, value) {
        return { type, value };
    }

    function normalizeList(value) {
        return Array.isArray(value) ? value.filter(Boolean) : [];
    }

    function normalizeStatus(status) {
        return ["ready", "partial", "unavailable", "error"].includes(status) ? status : "unavailable";
    }

    function normalizeDomainName(domain) {
        return String(domain || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    }

    function getGlobalStatus(domains) {
        if (!domains.length) {
            return "unavailable";
        }
        if (domains.some((domain) => domain.status === "ready")) {
            return "ready";
        }
        if (domains.some((domain) => domain.status === "partial")) {
            return "partial";
        }
        if (domains.some((domain) => domain.status === "error")) {
            return "error";
        }
        return "unavailable";
    }

    function notifyUpdated(context) {
        window.dispatchEvent(new CustomEvent("kynexy:shared-context:updated", {
            detail: { context }
        }));
    }

    function safeCall(callback, fallback) {
        try {
            return callback();
        } catch (error) {
            return fallback;
        }
    }

    function formatNumber(value) {
        return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(value || 0));
    }

    window.KynexyContextHub = {
        version: HUB_VERSION,
        register,
        unregister,
        refresh,
        getContext,
        getDomain
    };

    refresh();
}());
