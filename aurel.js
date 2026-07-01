const AUREL_STATES = {
    REST: "rest",
    LISTENING: "listening",
    THINKING: "thinking",
    ANSWERING: "answering",
    HAPPY: "happy",
    NOTIFICATION: "notification"
};

const AUREL_STATE_LABELS = {
    rest: "Repos",
    listening: "Écoute",
    thinking: "Réflexion",
    answering: "Réponse",
    happy: "Content",
    notification: "Notification"
};

const AUREL_STATE = {
    mode: AUREL_STATES.REST,
    messages: []
};

document.addEventListener("DOMContentLoaded", initAurel);

function initAurel() {

    bindStateDock();
    bindComposer();
    bindAttachmentButtons();
    publishAurelState();

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

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        sendMessage(input.value.trim());
        input.value = "";
        autoResizeInput(input);
    });

}

function bindAttachmentButtons() {

    document.querySelectorAll("[data-action]").forEach((button) => {
        button.addEventListener("click", () => {
            const action = button.dataset.action;

            if (action === "micro") {
                setAurelState(AUREL_STATES.LISTENING);
                addAurelMessage("Je t'écoute. Les commandes vocales seront branchées ici.");
                return;
            }

            setAurelState(AUREL_STATES.NOTIFICATION);
            addAurelMessage(getAttachmentMessage(action));
        });
    });

}

function sendMessage(text) {

    if (!text) {
        setAurelState(AUREL_STATES.REST);
        return;
    }

    addMessage("user", text);
    setAurelState(AUREL_STATES.THINKING);

    window.setTimeout(() => {
        setAurelState(AUREL_STATES.ANSWERING);
        addAurelMessage("J'ai bien reçu. Cette interface est prête à recevoir la mémoire Aurel, Glide, OpenAI et les fichiers terrain.");
        window.setTimeout(() => setAurelState(AUREL_STATES.REST), 1200);
    }, 520);

}

function addAurelMessage(text) {

    addMessage("aurel", text);

}

function addMessage(author, text) {

    AUREL_STATE.messages.push({
        author,
        text,
        createdAt: new Date().toISOString()
    });

    renderConversation();
    publishAurelState();

}

function renderConversation() {

    const log = document.getElementById("conversationLog");

    log.classList.toggle("empty", AUREL_STATE.messages.length === 0);

    if (!AUREL_STATE.messages.length) {
        log.innerHTML = `
            <div class="empty-conversation">
                <strong>Aurel est prêt.</strong>
                <span>La conversation apparaîtra ici.</span>
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
    document.getElementById("stateLabel").textContent = AUREL_STATE_LABELS[AUREL_STATE.mode];

    document.querySelectorAll("[data-state]").forEach((button) => {
        button.classList.toggle("active", button.dataset.state === AUREL_STATE.mode);
    });

    publishAurelState();

}

function getAttachmentMessage(action) {

    const messages = {
        document: "Document reçu en attente. Le connecteur fichiers sera ajouté ici.",
        photo: "Photo prête. Elle pourra rejoindre les chantiers et la mémoire Aurel.",
        video: "Vidéo prête. Le module vidéo attend la connexion Glide."
    };

    return messages[action] || "Action préparée pour une connexion future.";

}

function autoResizeInput(input) {

    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 116) + "px";

}

function publishAurelState() {

    window.AurelPageState = {
        mode: AUREL_STATE.mode,
        messages: AUREL_STATE.messages.slice(),
        integrations: {
            openai: "ready-later",
            glide: "ready-later",
            memory: "ready-later",
            voice: "ready-later",
            documents: "ready-later",
            photos: "ready-later",
            videos: "ready-later"
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
