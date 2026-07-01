const AUREL_STATES = {
    REST: "rest",
    LISTENING: "listening",
    THINKING: "thinking",
    ANSWERING: "answering",
    HAPPY: "happy",
    ALERT: "alert"
};

const AUREL_STATE_LABELS = {
    rest: "Veille",
    listening: "Ecoute",
    thinking: "Reflexion",
    answering: "Reponse",
    happy: "Content",
    alert: "Alerte"
};

const AUREL_STATE = {
    mode: AUREL_STATES.REST,
    messages: [],
    context: null,
    voice: createVoicePipeline()
};

document.addEventListener("DOMContentLoaded", initAurel);

async function initAurel() {
    bindStateDock();
    bindComposer();
    bindAttachmentButtons();

    try {
        assertAurelDatabase();
        await window.AurelDB.open();
        AUREL_STATE.context = await window.AurelDB.getContext();
        AUREL_STATE.messages = await window.AurelDB.listConversation({ limit: 40 });
    } catch (error) {
        console.error("Aurel core unavailable", error);
        AUREL_STATE.messages = [];
    }

    renderConversation();
    publishAurelState();
}

function assertAurelDatabase() {
    if (!window.AurelDB) {
        throw new Error("AurelDB is not loaded. aurel-db.js must be loaded before aurel.js.");
    }
}

function bindStateDock() {
    document.querySelectorAll("[data-state]").forEach((button) => {
        button.addEventListener("click", () => {
            setAurelState(button.dataset.state);
        });
    });
}

function bindComposer() {
    const form = document.getElementById("aurelForm");
    const input = document.getElementById("messageInput");

    input.addEventListener("input", () => {
        autoResizeInput(input);
        setAurelState(input.value.trim() ? AUREL_STATES.LISTENING : AUREL_STATES.REST);
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const text = input.value.trim();
        input.value = "";
        autoResizeInput(input);
        await sendMessage(text);
    });
}

function bindAttachmentButtons() {
    document.querySelectorAll("[data-action]").forEach((button) => {
        button.addEventListener("click", async () => {
            const action = button.dataset.action;

            if (action === "micro") {
                await runVoiceTurn();
                return;
            }

            setAurelState(AUREL_STATES.ALERT);
            await addAurelMessage(getAttachmentMessage(action));
        });
    });
}

async function sendMessage(text) {
    if (!text) {
        setAurelState(AUREL_STATES.REST);
        return;
    }

    await addMessage("user", text);
    setAurelState(AUREL_STATES.THINKING);

    try {
        const result = await window.AurelDB.ask(text);
        setAurelState(AUREL_STATES.ANSWERING);
        await addMessage("aurel", result.answer, { alreadyPersisted: true });
        window.setTimeout(() => setAurelState(AUREL_STATES.REST), 1200);
    } catch (error) {
        setAurelState(AUREL_STATES.ALERT);
        await addAurelMessage("Je n'arrive pas encore a relier les modules. Le noyau est charge, mais un connecteur repond mal.");
        console.error(error);
    }
}

async function runVoiceTurn() {
    setAurelState(AUREL_STATES.LISTENING);
    const text = await AUREL_STATE.voice.speechToText.listen();
    if (!text) {
        await addAurelMessage("La conversation vocale est prete cote architecture. Il reste a brancher le moteur Speech To Text.");
        return;
    }
    await sendMessage(text);
}

async function addAurelMessage(text) {
    await addMessage("aurel", text);
}

async function addMessage(author, text, options = {}) {
    const message = {
        author,
        text,
        createdAt: new Date().toISOString()
    };

    AUREL_STATE.messages.push(message);
    if (window.AurelDB && !options.alreadyPersisted) {
        await window.AurelDB.addConversationMessage(message);
    }

    renderConversation();
    publishAurelState();
}

function renderConversation() {
    const log = document.getElementById("conversationLog");

    log.classList.toggle("empty", AUREL_STATE.messages.length === 0);

    if (!AUREL_STATE.messages.length) {
        log.innerHTML = `
            <div class="empty-conversation">
                <strong>Aurel est pret.</strong>
                <span>Demande le topo pour relier meteo, planning et equipe.</span>
            </div>
        `;
        return;
    }

    log.innerHTML = AUREL_STATE.messages.map(renderMessage).join("");
    log.scrollTop = log.scrollHeight;
}

function renderMessage(message) {
    const label = message.author === "user" ? "Patron" : "Aurel";
    const time = new Date(message.createdAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit"
    });

    return `
        <article class="message-bubble ${escapeAttribute(message.author)}">
            ${escapeHtml(message.text)}
            <small>${label} - ${time}</small>
        </article>
    `;
}

function setAurelState(mode) {
    AUREL_STATE.mode = Object.values(AUREL_STATES).includes(mode) ? mode : AUREL_STATES.REST;
    document.querySelector(".aurel-shell").dataset.aurelState = AUREL_STATE.mode;
    document.querySelectorAll("[data-aurel-presence]").forEach((node) => {
        node.dataset.aurelState = AUREL_STATE.mode;
    });
    document.getElementById("stateLabel").textContent = AUREL_STATE_LABELS[AUREL_STATE.mode];

    document.querySelectorAll("[data-state]").forEach((button) => {
        button.classList.toggle("active", button.dataset.state === AUREL_STATE.mode);
    });

    if (window.KynexyAurel && typeof window.KynexyAurel.setState === "function") {
        window.KynexyAurel.setState(AUREL_STATE.mode);
    }

    publishAurelState();
}

function createVoicePipeline() {
    return {
        speechToText: {
            listen: async () => ""
        },
        textToSpeech: {
            speak: async () => true
        }
    };
}

function getAttachmentMessage(action) {
    const messages = {
        document: "Le connecteur documents sera une source, pas une memoire metier.",
        photo: "La photo pourra enrichir le contexte quand le module terrain sera branche.",
        video: "La video restera un connecteur remplacable dans le pipeline Aurel."
    };

    return messages[action] || "Action preparee pour une connexion future.";
}

function autoResizeInput(input) {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 116) + "px";
}

function publishAurelState() {
    window.AurelPageState = {
        mode: AUREL_STATE.mode,
        messages: AUREL_STATE.messages.slice(),
        context: window.KynexyAurelContext || AUREL_STATE.context,
        integrations: {
            memory: window.AurelDB ? window.AurelDB.engineType : "unavailable",
            planning: Boolean(window.KynexyPlanningDB),
            team: Boolean(window.KynexyTeamDB),
            weather: "connector-ready",
            voice: "pipeline-ready",
            responseEngine: "provider-neutral"
        }
    };
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
}
