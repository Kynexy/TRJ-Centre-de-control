const TEAM_STATE = {
    view: "today",
    selectedGame: "2048",
    data: getDemoData(),
    chat: [
        {
            author: "boss",
            name: "Patron",
            text: "Bonjour l'équipe. On confirme les départs chantier avant 7h15.",
            quote: "",
            status: "lu",
            time: "06:42"
        },
        {
            author: "team",
            name: "Maui",
            text: "Bien reçu. Camion chargé pour Paea.",
            quote: "On confirme les départs chantier",
            status: "reçu",
            time: "06:45"
        }
    ],
    games: {}
};

const TEAM_VIEWS = {
    today: {
        title: "Equipe aujourd'hui",
        subtitle: "Présences, statuts, horaires et actions rapides pour piloter l'équipe dès le matin.",
        render: renderToday
    },
    agenda: {
        title: "Agenda Equipe",
        subtitle: "Planning terrain complet : horaires, pauses, chantiers, notes et validation patron.",
        render: renderAgenda
    },
    payroll: {
        title: "Gestion des salaires",
        subtitle: "Calcul mensuel automatique, modifiable salarié par salarié.",
        render: renderPayroll
    },
    advances: {
        title: "Gestion des acomptes",
        subtitle: "Historique des avances, motifs et soldes restants calculés automatiquement.",
        render: renderAdvances
    },
    dashboard: {
        title: "Tableau de bord équipe",
        subtitle: "Vue synthétique des heures, coûts, retards, absences et productivité.",
        render: renderDashboard
    },
    chat: {
        title: "Chat Equipe",
        subtitle: "Messagerie interne rapide, lisible et prête pour les médias terrain.",
        render: renderChat
    },
    breakroom: {
        title: "Salle de pause",
        subtitle: "Jeux HTML5 natifs, extensibles et prêts à recevoir d'autres modules.",
        render: renderBreakroom
    }
};

const GAME_LIBRARY = [
    { id: "2048", title: "2048", desc: "Fusionne les nombres." },
    { id: "snake", title: "Snake", desc: "Mange les points." },
    { id: "chess", title: "Echecs", desc: "Déplace les pièces." },
    { id: "sudoku", title: "Sudoku", desc: "Complète la grille." },
    { id: "mines", title: "Démineur", desc: "Evite les mines." },
    { id: "tetris", title: "Tetris", desc: "Empile les blocs." },
    { id: "pacman", title: "Pac-Man", desc: "Ramasse les points." },
    { id: "breakout", title: "Breakout", desc: "Casse les briques." },
    { id: "solitaire", title: "Solitaire", desc: "Monte les cartes." },
    { id: "memory", title: "Memory", desc: "Trouve les paires." },
    { id: "morpion", title: "Morpion", desc: "Aligne trois signes." },
    { id: "connect4", title: "Puissance 4", desc: "Aligne quatre jetons." },
    { id: "cards", title: "Jeu de cartes", desc: "Plus haut ou plus bas." },
    { id: "logic", title: "Jeu de réflexion", desc: "Répète la séquence." }
];

document.addEventListener("DOMContentLoaded", initTeamPage);

function initTeamPage() {

    updateClock();
    window.setInterval(updateClock, 30000);
    bindNavigation();
    bindAurel();
    renderApp();

}

function getDemoData() {

    return {
        members: [
            { id: "maui", name: "Maui", initials: "MA", status: "present", label: "Présent", arrival: "06:45", departure: "15:30", location: "Paea - toiture", dayState: "Camion chargé", phone: "+68987000001" },
            { id: "hina", name: "Hina", initials: "HI", status: "site", label: "En chantier", arrival: "07:00", departure: "16:00", location: "Punaauia - contrôle fuite", dayState: "Photos à prendre", phone: "+68987000002" },
            { id: "tane", name: "Tane", initials: "TA", status: "break", label: "Pause", arrival: "06:50", departure: "15:15", location: "Dépôt puis Papeete", dayState: "Matériel ok", phone: "+68987000003" },
            { id: "moana", name: "Moana", initials: "MO", status: "leave", label: "Congé", arrival: "-", departure: "-", location: "Repos", dayState: "Retour demain", phone: "+68987000004" },
            { id: "arii", name: "Arii", initials: "AR", status: "sick", label: "Malade", arrival: "-", departure: "-", location: "Absent", dayState: "Certificat attendu", phone: "+68987000005" }
        ],
        agenda: [
            { day: "Lundi", arrival: "06:45", departure: "15:30", pause: "00:45", site: "Toiture Paea", notes: "Départ dépôt 06:55.", validated: true },
            { day: "Mardi", arrival: "07:00", departure: "16:15", pause: "01:00", site: "Punaauia fuite", notes: "Prévoir photos avant/après.", validated: false },
            { day: "Mercredi", arrival: "06:30", departure: "15:00", pause: "00:30", site: "Mahina terrasse", notes: "Contrôle matériel.", validated: true },
            { day: "Jeudi", arrival: "07:15", departure: "16:00", pause: "00:45", site: "Papeete entretien", notes: "Client à appeler.", validated: false },
            { day: "Vendredi", arrival: "06:45", departure: "14:45", pause: "00:45", site: "Dépôt + finition", notes: "Ranger outillage.", validated: true }
        ],
        payroll: [
            { name: "Maui", rate: 1850, hours: 164, overtime: 8, bonus: 15000, advance: 25000, deductions: 5000 },
            { name: "Hina", rate: 1750, hours: 158, overtime: 5, bonus: 10000, advance: 15000, deductions: 0 },
            { name: "Tane", rate: 1650, hours: 150, overtime: 2, bonus: 8000, advance: 10000, deductions: 3500 },
            { name: "Moana", rate: 1550, hours: 136, overtime: 0, bonus: 5000, advance: 0, deductions: 0 }
        ],
        advances: [
            { name: "Maui", date: "2026-06-05", amount: 15000, reason: "Carburant familial", base: 420000 },
            { name: "Maui", date: "2026-06-21", amount: 10000, reason: "Acompte fin de mois", base: 420000 },
            { name: "Hina", date: "2026-06-18", amount: 15000, reason: "Urgence maison", base: 370000 },
            { name: "Tane", date: "2026-06-12", amount: 10000, reason: "Transport", base: 320000 }
        ]
    };

}

function bindNavigation() {

    document.querySelectorAll("[data-view], [data-shortcut]").forEach((button) => {
        button.addEventListener("click", () => {
            const view = button.dataset.view || button.dataset.shortcut;
            if (TEAM_VIEWS[view]) {
                TEAM_STATE.view = view;
                renderApp();
                closeAurelMenu();
            }
        });
    });

}

function bindAurel() {

    const button = document.getElementById("aurelButton");
    const menu = document.getElementById("aurelMenu");

    if (!button || !menu) {
        return;
    }

    button.addEventListener("click", () => {
        menu.classList.toggle("open");
        menu.setAttribute("aria-hidden", String(!menu.classList.contains("open")));
    });

}

function closeAurelMenu() {

    const menu = document.getElementById("aurelMenu");
    if (!menu) {
        return;
    }
    menu.classList.remove("open");
    menu.setAttribute("aria-hidden", "true");

}

function renderApp() {

    renderNav();
    renderHeader();
    renderMetrics();
    const target = document.getElementById("teamView");
    target.innerHTML = "";
    TEAM_VIEWS[TEAM_STATE.view].render(target);

}

function renderNav() {

    document.querySelectorAll("#teamNav button").forEach((button) => {
        button.classList.toggle("active", button.dataset.view === TEAM_STATE.view);
    });

}

function renderHeader() {

    const view = TEAM_VIEWS[TEAM_STATE.view];
    document.getElementById("viewTitle").textContent = view.title;
    document.getElementById("viewSubtitle").textContent = view.subtitle;

}

function renderMetrics() {

    const dashboard = getDashboardStats();
    const metrics = [
        { label: "Présents", value: dashboard.present, detail: "Equipe active aujourd'hui" },
        { label: "Heures semaine", value: dashboard.weekHours + "h", detail: "Agenda planifié" },
        { label: "Coût estimé", value: formatMoney(dashboard.payrollCost), detail: "Net estimé du mois" },
        { label: "Messages", value: TEAM_STATE.chat.length, detail: "Chat équipe local" }
    ];

    document.getElementById("teamMetrics").innerHTML = metrics.map((metric) => `
        <article class="metric">
            <span>${escapeHtml(metric.label)}</span>
            <strong>${escapeHtml(metric.value)}</strong>
            <small>${escapeHtml(metric.detail)}</small>
        </article>
    `).join("");

}

function renderToday(target) {

    target.innerHTML = `
        <section class="card">
            <h2>Equipe aujourd'hui</h2>
            <div class="toolbar">
                <input type="search" id="memberSearch" placeholder="Rechercher un équipier">
                <select id="statusFilter">
                    <option value="all">Tous les statuts</option>
                    <option value="present">Présent</option>
                    <option value="site">En chantier</option>
                    <option value="break">Pause</option>
                    <option value="leave">Congé</option>
                    <option value="sick">Malade</option>
                    <option value="absent">Absent</option>
                </select>
            </div>
            <div class="team-list" id="memberList"></div>
        </section>
    `;

    const render = () => {
        const search = document.getElementById("memberSearch").value.toLowerCase();
        const status = document.getElementById("statusFilter").value;
        const members = TEAM_STATE.data.members.filter((member) => {
            const matchesSearch = member.name.toLowerCase().includes(search) || member.location.toLowerCase().includes(search);
            const matchesStatus = status === "all" || member.status === status;
            return matchesSearch && matchesStatus;
        });
        document.getElementById("memberList").innerHTML = members.map(renderMemberCard).join("");
    };

    document.getElementById("memberSearch").addEventListener("input", render);
    document.getElementById("statusFilter").addEventListener("change", render);
    render();

}

function renderMemberCard(member) {

    return `
        <article class="member-card">
            <div class="avatar">${escapeHtml(member.initials)}</div>
            <div>
                <h3>${escapeHtml(member.name)} <span class="state-${escapeAttribute(member.status)}">• ${escapeHtml(member.label)}</span></h3>
                <p class="member-meta">Arrivée ${escapeHtml(member.arrival)} · Départ ${escapeHtml(member.departure)} · ${escapeHtml(member.location)}</p>
                <div class="status-tags">
                    <span class="tag info">${escapeHtml(member.dayState)}</span>
                    <span class="tag ${getStatusClass(member.status)}">${escapeHtml(member.label)}</span>
                </div>
            </div>
            <div class="row-actions">
                <a class="icon-btn" href="tel:${escapeAttribute(member.phone)}">Appeler</a>
                <a class="icon-btn" href="sms:${escapeAttribute(member.phone)}">SMS</a>
                <button class="icon-btn" type="button" data-message-member="${escapeAttribute(member.name)}">Messenger</button>
            </div>
        </article>
    `;

}

function renderAgenda(target) {

    target.innerHTML = `
        <section class="card">
            <h2>Agenda Equipe</h2>
            <p class="card-copy">Chaque carte calcule le temps travaillé et les heures supplémentaires à partir des horaires saisis.</p>
            <div class="agenda-board" id="agendaBoard"></div>
        </section>
    `;

    const board = document.getElementById("agendaBoard");
    board.innerHTML = TEAM_STATE.data.agenda.map((day, index) => renderAgendaDay(day, index)).join("");
    board.querySelectorAll("input, textarea").forEach((input) => input.addEventListener("input", updateAgendaFromDom));
    board.querySelectorAll("[data-validate-day]").forEach((button) => {
        button.addEventListener("click", () => {
            const index = Number(button.dataset.validateDay);
            TEAM_STATE.data.agenda[index].validated = !TEAM_STATE.data.agenda[index].validated;
            renderAgenda(target);
            renderMetrics();
        });
    });

}

function renderAgendaDay(day, index) {

    const worked = calculateWorkedHours(day.arrival, day.departure, day.pause);
    const overtime = Math.max(0, worked - 8);

    return `
        <article class="agenda-day" data-agenda-index="${index}">
            <h3>${escapeHtml(day.day)}</h3>
            ${agendaField("Arrivée", "arrival", day.arrival)}
            ${agendaField("Départ", "departure", day.departure)}
            ${agendaField("Pause", "pause", day.pause)}
            ${agendaField("Chantier associé", "site", day.site)}
            <label class="agenda-field">Notes<textarea data-field="notes">${escapeHtml(day.notes)}</textarea></label>
            <div class="job-signals">
                <span class="tag info">${worked.toFixed(2)}h travaillées</span>
                <span class="tag ${overtime > 0 ? "warn" : "ready"}">${overtime.toFixed(2)}h sup.</span>
            </div>
            <button class="${day.validated ? "primary-btn" : "ghost-btn"}" type="button" data-validate-day="${index}">
                ${day.validated ? "Validé patron" : "A valider"}
            </button>
        </article>
    `;

}

function agendaField(label, field, value) {

    return `<label class="agenda-field">${label}<input data-field="${field}" value="${escapeAttribute(value)}"></label>`;

}

function updateAgendaFromDom(event) {

    const card = event.target.closest("[data-agenda-index]");
    const index = Number(card.dataset.agendaIndex);
    TEAM_STATE.data.agenda[index][event.target.dataset.field] = event.target.value;
    const target = document.getElementById("teamView");
    renderAgenda(target);
    renderMetrics();

}

function renderPayroll(target) {

    target.innerHTML = `
        <section class="card">
            <h2>Gestion des salaires</h2>
            <div class="salary-table">
                <div class="salary-head">
                    <span>Nom</span><span>Taux</span><span>Heures</span><span>Sup.</span><span>Prime</span><span>Acompte</span><span>Retenues</span><span>Brut</span><span>Reste</span>
                </div>
                <div id="salaryRows"></div>
                <div class="salary-total" id="salaryTotal"></div>
            </div>
        </section>
    `;

    renderSalaryRows();

}

function renderSalaryRows() {

    document.getElementById("salaryRows").innerHTML = TEAM_STATE.data.payroll.map((row, index) => {
        const calc = calculateSalary(row);
        return `
            <article class="salary-row" data-payroll-index="${index}">
                <strong>${escapeHtml(row.name)}</strong>
                ${salaryInput("rate", row.rate)}
                ${salaryInput("hours", row.hours)}
                ${salaryInput("overtime", row.overtime)}
                ${salaryInput("bonus", row.bonus)}
                ${salaryInput("advance", row.advance)}
                ${salaryInput("deductions", row.deductions)}
                <span>${formatMoney(calc.gross)}</span>
                <span>${formatMoney(calc.remaining)}</span>
            </article>
        `;
    }).join("");

    const total = TEAM_STATE.data.payroll.reduce((sum, row) => sum + calculateSalary(row).remaining, 0);
    document.getElementById("salaryTotal").innerHTML = `
        <strong>Total reste à payer</strong>
        <span>${formatMoney(total)}</span>
        <button class="ghost-btn" type="button">Export futur</button>
    `;

    document.querySelectorAll(".salary-row input").forEach((input) => {
        input.addEventListener("input", (event) => {
            const row = event.target.closest(".salary-row");
            const index = Number(row.dataset.payrollIndex);
            TEAM_STATE.data.payroll[index][event.target.dataset.field] = Number(event.target.value) || 0;
            renderSalaryRows();
            renderMetrics();
        });
    });

}

function salaryInput(field, value) {

    return `<input data-field="${field}" type="number" value="${escapeAttribute(value)}">`;

}

function renderAdvances(target) {

    const grouped = groupAdvances();

    target.innerHTML = `
        <div class="advance-grid">
            <section class="card">
                <h2>Historique acomptes</h2>
                <div class="list" id="advanceRows">
                    ${TEAM_STATE.data.advances.map(renderAdvanceRow).join("")}
                </div>
            </section>
            <section class="card">
                <h2>Soldes restants</h2>
                <div class="list">
                    ${Object.keys(grouped).map((name) => `
                        <article class="row">
                            <div>
                                <h3>${escapeHtml(name)}</h3>
                                <p>Total acomptes : ${formatMoney(grouped[name].advanced)}</p>
                            </div>
                            <span class="tag info">${formatMoney(grouped[name].remaining)}</span>
                        </article>
                    `).join("")}
                </div>
            </section>
        </div>
    `;

    document.querySelectorAll(".advance-row input").forEach((input) => {
        input.addEventListener("input", (event) => {
            const row = event.target.closest(".advance-row");
            const index = Number(row.dataset.advanceIndex);
            const field = event.target.dataset.field;
            TEAM_STATE.data.advances[index][field] = field === "amount" || field === "base" ? Number(event.target.value) || 0 : event.target.value;
            renderAdvances(document.getElementById("teamView"));
            renderMetrics();
        });
    });

}

function renderAdvanceRow(row, index) {

    const samePerson = TEAM_STATE.data.advances.filter((advance) => advance.name === row.name);
    const totalAdvanced = samePerson.reduce((sum, advance) => sum + Number(advance.amount || 0), 0);
    const remaining = Number(row.base || 0) - totalAdvanced;

    return `
        <article class="advance-row" data-advance-index="${index}">
            <strong>${escapeHtml(row.name)}</strong>
            <input data-field="date" type="date" value="${escapeAttribute(row.date)}">
            <input data-field="amount" type="number" value="${escapeAttribute(row.amount)}">
            <input data-field="reason" value="${escapeAttribute(row.reason)}">
            <span class="tag info">${formatMoney(remaining)}</span>
        </article>
    `;

}

function renderDashboard(target) {

    const stats = getDashboardStats();
    target.innerHTML = `
        <section class="card">
            <h2>Tableau de bord équipe</h2>
            <div class="dashboard-grid">
                ${statCard("Heures totales", stats.monthHours + "h", "Mois en cours", 78)}
                ${statCard("Coût salarial", formatMoney(stats.payrollCost), "Net estimé", 68)}
                ${statCard("Chantiers", stats.sites, "Sites actifs", 62)}
                ${statCard("Retards", stats.late, "A surveiller", 22)}
                ${statCard("Absences", stats.absences, "Congés et maladie", 30)}
                ${statCard("Productivité", stats.productivity + "%", "Objectif terrain", stats.productivity)}
            </div>
        </section>
    `;

}

function statCard(title, value, detail, progress) {

    return `
        <article class="stat-card">
            <strong>${escapeHtml(value)}</strong>
            <p class="muted">${escapeHtml(title)}<br>${escapeHtml(detail)}</p>
            <div class="progress"><span style="width:${Math.max(0, Math.min(100, progress))}%"></span></div>
        </article>
    `;

}

function renderChat(target) {

    target.innerHTML = `
        <section class="card">
            <h2>Chat Equipe</h2>
            <div class="chat-shell">
                <aside class="chat-members">
                    ${TEAM_STATE.data.members.map((member) => `
                        <article class="row">
                            <div>
                                <h3>${escapeHtml(member.name)}</h3>
                                <p>${escapeHtml(member.label)} · ${escapeHtml(member.location)}</p>
                            </div>
                        </article>
                    `).join("")}
                </aside>
                <div class="chat-room">
                    <div class="chat-top">
                        <strong>Canal équipe TRJ</strong>
                        <span class="tag ready">Notifications actives</span>
                    </div>
                    <div class="chat-log" id="chatLog"></div>
                    <form class="chat-composer" id="chatForm">
                        <button type="button" data-chat-tool="photo">📷</button>
                        <button type="button" data-chat-tool="video">🎥</button>
                        <button type="button" data-chat-tool="document">📎</button>
                        <button type="button" data-chat-tool="voice">🎤</button>
                        <input id="chatInput" placeholder="Message à l'équipe...">
                        <button class="send" type="submit">➤</button>
                    </form>
                </div>
            </div>
        </section>
    `;

    renderChatLog();
    document.getElementById("chatForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const input = document.getElementById("chatInput");
        if (!input.value.trim()) {
            return;
        }
        TEAM_STATE.chat.push({
            author: "boss",
            name: "Patron",
            text: input.value.trim(),
            quote: TEAM_STATE.chat.at(-1)?.text || "",
            status: "envoyé",
            time: getShortTime()
        });
        input.value = "";
        renderChatLog();
        renderMetrics();
    });

    document.querySelectorAll("[data-chat-tool]").forEach((button) => {
        button.addEventListener("click", () => {
            TEAM_STATE.chat.push({
                author: "boss",
                name: "Patron",
                text: getChatToolText(button.dataset.chatTool),
                quote: "",
                status: "préparé",
                time: getShortTime()
            });
            renderChatLog();
            renderMetrics();
        });
    });

}

function renderChatLog() {

    const log = document.getElementById("chatLog");
    log.innerHTML = TEAM_STATE.chat.map((message) => `
        <article class="chat-message ${escapeAttribute(message.author)}">
            ${message.quote ? `<div class="quote">${escapeHtml(message.quote)}</div>` : ""}
            ${escapeHtml(message.text)}
            <small>${escapeHtml(message.name)} · ${escapeHtml(message.time)} · ${escapeHtml(message.status)}</small>
        </article>
    `).join("");
    log.scrollTop = log.scrollHeight;

}

function renderBreakroom(target) {

    target.innerHTML = `
        <section class="card">
            <h2>Salle de pause</h2>
            <div class="games-layout">
                <div class="game-library">
                    ${GAME_LIBRARY.map((game) => `
                        <button class="game-card ${game.id === TEAM_STATE.selectedGame ? "active" : ""}" data-game="${escapeAttribute(game.id)}" type="button">
                            <h3>${escapeHtml(game.title)}</h3>
                            <p class="muted">${escapeHtml(game.desc)}</p>
                        </button>
                    `).join("")}
                </div>
                <div class="game-stage" id="gameStage"></div>
            </div>
        </section>
    `;

    document.querySelectorAll("[data-game]").forEach((button) => {
        button.addEventListener("click", () => {
            TEAM_STATE.selectedGame = button.dataset.game;
            renderBreakroom(target);
        });
    });

    renderSelectedGame();

}

function renderSelectedGame() {

    const game = TEAM_STATE.selectedGame;
    const stage = document.getElementById("gameStage");
    const renderer = {
        "2048": render2048,
        snake: renderSnake,
        chess: renderChess,
        sudoku: renderSudoku,
        mines: renderMines,
        tetris: renderTetris,
        pacman: renderPacman,
        breakout: renderBreakout,
        solitaire: renderSolitaire,
        memory: renderMemory,
        morpion: renderMorpion,
        connect4: renderConnect4,
        cards: renderCards,
        logic: renderLogic
    }[game];

    renderer(stage);

}

function gameHeader(title, detail) {

    return `
        <div class="game-toolbar">
            <div>
                <h2>${escapeHtml(title)}</h2>
                <p class="muted">${escapeHtml(detail)}</p>
            </div>
            <button class="ghost-btn" id="resetGame" type="button">Recommencer</button>
        </div>
    `;

}

function render2048(stage) {

    const state = TEAM_STATE.games.g2048 || { cells: [2,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0], score: 0 };
    TEAM_STATE.games.g2048 = state;
    stage.innerHTML = gameHeader("2048", "Clique deux cases identiques voisines pour les fusionner.") + `<div class="game-board" style="grid-template-columns:repeat(4,1fr)"></div><p class="tag info">Score ${state.score}</p>`;
    const board = stage.querySelector(".game-board");
    board.innerHTML = state.cells.map((value, index) => `<button class="tile" data-cell="${index}">${value || ""}</button>`).join("");
    let selected = null;
    board.querySelectorAll("[data-cell]").forEach((tile) => {
        tile.addEventListener("click", () => {
            const index = Number(tile.dataset.cell);
            if (selected === null) {
                selected = index;
                tile.classList.add("active");
                return;
            }
            const neighbors = [selected - 1, selected + 1, selected - 4, selected + 4];
            if (neighbors.includes(index) && state.cells[index] === state.cells[selected] && state.cells[index]) {
                state.cells[index] *= 2;
                state.cells[selected] = 0;
                state.score += state.cells[index];
                addRandom2048(state);
            }
            render2048(stage);
        });
    });
    stage.querySelector("#resetGame").addEventListener("click", () => {
        TEAM_STATE.games.g2048 = null;
        render2048(stage);
    });

}

function addRandom2048(state) {

    const empty = state.cells.map((value, index) => value ? null : index).filter((value) => value !== null);
    if (empty.length) {
        state.cells[empty[Math.floor(Math.random() * empty.length)]] = Math.random() > .85 ? 4 : 2;
    }

}

function renderSnake(stage) {

    const state = TEAM_STATE.games.snake || { snake: [12, 11, 10], food: 30, dir: 1, score: 0 };
    TEAM_STATE.games.snake = state;
    stage.innerHTML = gameHeader("Snake", "Flèches ou boutons : mange le point bleu.") + `
        <div class="game-board" style="grid-template-columns:repeat(8,1fr)"></div>
        <div class="row-actions">
            <button class="ghost-btn" data-dir="-8">Haut</button><button class="ghost-btn" data-dir="-1">Gauche</button>
            <button class="ghost-btn" data-dir="1">Droite</button><button class="ghost-btn" data-dir="8">Bas</button>
        </div>
        <p class="tag info">Score ${state.score}</p>
    `;
    const board = stage.querySelector(".game-board");
    board.innerHTML = Array.from({ length: 64 }, (_, index) => {
        const cls = state.snake.includes(index) ? "good" : index === state.food ? "active" : "";
        return `<button class="tile small ${cls}" data-snake-cell="${index}">${index === state.food ? "●" : state.snake.includes(index) ? "■" : ""}</button>`;
    }).join("");
    stage.querySelectorAll("[data-dir]").forEach((button) => button.addEventListener("click", () => moveSnake(Number(button.dataset.dir), stage)));
    stage.querySelector("#resetGame").addEventListener("click", () => {
        TEAM_STATE.games.snake = null;
        renderSnake(stage);
    });

}

function moveSnake(dir, stage) {

    const state = TEAM_STATE.games.snake;
    const head = state.snake[0];
    const next = head + dir;
    const blocked = next < 0 || next >= 64 || (dir === 1 && head % 8 === 7) || (dir === -1 && head % 8 === 0) || state.snake.includes(next);
    if (blocked) {
        state.score = 0;
        state.snake = [12, 11, 10];
        state.food = 30;
        renderSnake(stage);
        return;
    }
    state.snake.unshift(next);
    if (next === state.food) {
        state.score += 1;
        do {
            state.food = Math.floor(Math.random() * 64);
        } while (state.snake.includes(state.food));
    } else {
        state.snake.pop();
    }
    renderSnake(stage);

}

function renderChess(stage) {

    const pieces = ["♜","♞","♝","♛","♚","♝","♞","♜","♟","♟","♟","♟","♟","♟","♟","♟","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","♙","♙","♙","♙","♙","♙","♙","♙","♖","♘","♗","♕","♔","♗","♘","♖"];
    const state = TEAM_STATE.games.chess || { board: pieces, selected: null, moves: 0 };
    TEAM_STATE.games.chess = state;
    stage.innerHTML = gameHeader("Echecs", "Clique une pièce puis une case pour la déplacer.") + `<div class="game-board" style="grid-template-columns:repeat(8,1fr)"></div><p class="tag info">${state.moves} déplacement(s)</p>`;
    const board = stage.querySelector(".game-board");
    board.innerHTML = state.board.map((piece, index) => `<button class="tile small ${state.selected === index ? "active" : ""}" data-chess="${index}">${piece}</button>`).join("");
    board.querySelectorAll("[data-chess]").forEach((cell) => {
        cell.addEventListener("click", () => {
            const index = Number(cell.dataset.chess);
            if (state.selected === null && state.board[index]) {
                state.selected = index;
            } else if (state.selected !== null) {
                state.board[index] = state.board[state.selected];
                state.board[state.selected] = "";
                state.selected = null;
                state.moves += 1;
            }
            renderChess(stage);
        });
    });
    stage.querySelector("#resetGame").addEventListener("click", () => {
        TEAM_STATE.games.chess = null;
        renderChess(stage);
    });

}

function renderSudoku(stage) {

    const puzzle = [5,3,"","",7,"","","","",6,"","",1,9,5,"","","","","",9,8,"","","","",6,"",8,"","","",6,"","","",3,4,"","",8,"",3,"","",1,7,"","","",2,"","","",6,"",6,"","","","",2,8,"","","","",4,1,9,"","",5,"","","","",8,"","",7,9];
    const state = TEAM_STATE.games.sudoku || { cells: puzzle.slice() };
    TEAM_STATE.games.sudoku = state;
    stage.innerHTML = gameHeader("Sudoku", "Clique une case vide pour faire défiler 1 à 9.") + `<div class="game-board" style="grid-template-columns:repeat(9,1fr)"></div><p class="tag info">Grille jouable locale</p>`;
    const board = stage.querySelector(".game-board");
    board.innerHTML = state.cells.map((value, index) => `<button class="tile small ${puzzle[index] ? "active" : ""}" data-sudoku="${index}">${value || ""}</button>`).join("");
    board.querySelectorAll("[data-sudoku]").forEach((cell) => {
        cell.addEventListener("click", () => {
            const index = Number(cell.dataset.sudoku);
            if (puzzle[index]) return;
            state.cells[index] = state.cells[index] ? (Number(state.cells[index]) % 9) + 1 : 1;
            renderSudoku(stage);
        });
    });
    stage.querySelector("#resetGame").addEventListener("click", () => {
        TEAM_STATE.games.sudoku = null;
        renderSudoku(stage);
    });

}

function renderMines(stage) {

    const state = TEAM_STATE.games.mines || { mines: [5, 11, 18, 26, 33, 42], open: [], over: false };
    TEAM_STATE.games.mines = state;
    stage.innerHTML = gameHeader("Démineur", "Ouvre les cases sans tomber sur une mine.") + `<div class="game-board" style="grid-template-columns:repeat(7,1fr)"></div><p class="tag ${state.over ? "blocked" : "info"}">${state.over ? "Mine touchée" : "En cours"}</p>`;
    const board = stage.querySelector(".game-board");
    board.innerHTML = Array.from({ length: 49 }, (_, index) => {
        const open = state.open.includes(index) || state.over;
        const mine = state.mines.includes(index);
        return `<button class="tile small ${mine && open ? "bad" : open ? "good" : ""}" data-mine="${index}">${open ? mine ? "✹" : countMines(index, state.mines) : ""}</button>`;
    }).join("");
    board.querySelectorAll("[data-mine]").forEach((cell) => cell.addEventListener("click", () => {
        const index = Number(cell.dataset.mine);
        if (state.mines.includes(index)) state.over = true;
        if (!state.open.includes(index)) state.open.push(index);
        renderMines(stage);
    }));
    stage.querySelector("#resetGame").addEventListener("click", () => {
        TEAM_STATE.games.mines = null;
        renderMines(stage);
    });

}

function countMines(index, mines) {

    const offsets = [-8,-7,-6,-1,1,6,7,8];
    return offsets.filter((offset) => mines.includes(index + offset)).length || "";

}

function renderTetris(stage) {

    const state = TEAM_STATE.games.tetris || { blocks: [4,14,24,25], score: 0 };
    TEAM_STATE.games.tetris = state;
    stage.innerHTML = gameHeader("Tetris", "Déplace la pièce et descends-la.") + `<div class="game-board" style="grid-template-columns:repeat(10,1fr)"></div><div class="row-actions"><button class="ghost-btn" data-tetris="-1">Gauche</button><button class="ghost-btn" data-tetris="1">Droite</button><button class="primary-btn" data-tetris="10">Descendre</button></div><p class="tag info">Score ${state.score}</p>`;
    const board = stage.querySelector(".game-board");
    board.innerHTML = Array.from({ length: 100 }, (_, index) => `<button class="tile small ${state.blocks.includes(index) ? "active" : ""}">${state.blocks.includes(index) ? "■" : ""}</button>`).join("");
    stage.querySelectorAll("[data-tetris]").forEach((button) => button.addEventListener("click", () => {
        const move = Number(button.dataset.tetris);
        const next = state.blocks.map((cell) => cell + move);
        if (next.some((cell) => cell < 0 || cell >= 100 || (move === 1 && cell % 10 === 0) || (move === -1 && cell % 10 === 9))) return;
        state.blocks = next;
        if (move === 10) state.score += 1;
        renderTetris(stage);
    }));
    stage.querySelector("#resetGame").addEventListener("click", () => {
        TEAM_STATE.games.tetris = null;
        renderTetris(stage);
    });

}

function renderPacman(stage) {

    const state = TEAM_STATE.games.pacman || { pos: 22, dots: Array.from({ length: 64 }, (_, i) => i).filter((i) => ![22,0,7,56,63].includes(i)), score: 0 };
    TEAM_STATE.games.pacman = state;
    stage.innerHTML = gameHeader("Pac-Man", "Déplace Aurel et ramasse les points.") + `<div class="game-board" style="grid-template-columns:repeat(8,1fr)"></div><div class="row-actions"><button class="ghost-btn" data-pac="-8">Haut</button><button class="ghost-btn" data-pac="-1">Gauche</button><button class="ghost-btn" data-pac="1">Droite</button><button class="ghost-btn" data-pac="8">Bas</button></div><p class="tag info">Score ${state.score}</p>`;
    stage.querySelector(".game-board").innerHTML = Array.from({ length: 64 }, (_, index) => `<button class="tile small ${index === state.pos ? "active" : ""}">${index === state.pos ? "☁" : state.dots.includes(index) ? "·" : ""}</button>`).join("");
    stage.querySelectorAll("[data-pac]").forEach((button) => button.addEventListener("click", () => {
        const next = state.pos + Number(button.dataset.pac);
        if (next < 0 || next >= 64) return;
        state.pos = next;
        if (state.dots.includes(next)) {
            state.dots = state.dots.filter((dot) => dot !== next);
            state.score += 1;
        }
        renderPacman(stage);
    }));
    stage.querySelector("#resetGame").addEventListener("click", () => {
        TEAM_STATE.games.pacman = null;
        renderPacman(stage);
    });

}

function renderBreakout(stage) {

    stage.innerHTML = gameHeader("Breakout", "Clique les briques pour les casser. Le moteur canvas pourra remplacer cette V1.") + `<div class="game-board" style="grid-template-columns:repeat(8,1fr)"></div><p class="tag info" id="breakoutScore"></p>`;
    const state = TEAM_STATE.games.breakout || { bricks: Array.from({ length: 32 }, (_, i) => i), score: 0 };
    TEAM_STATE.games.breakout = state;
    stage.querySelector(".game-board").innerHTML = Array.from({ length: 32 }, (_, index) => `<button class="tile small ${state.bricks.includes(index) ? "active" : ""}" data-brick="${index}">${state.bricks.includes(index) ? "■" : ""}</button>`).join("");
    stage.querySelector("#breakoutScore").textContent = "Score " + state.score;
    stage.querySelectorAll("[data-brick]").forEach((brick) => brick.addEventListener("click", () => {
        const index = Number(brick.dataset.brick);
        if (state.bricks.includes(index)) {
            state.bricks = state.bricks.filter((item) => item !== index);
            state.score += 10;
        }
        renderBreakout(stage);
    }));
    stage.querySelector("#resetGame").addEventListener("click", () => {
        TEAM_STATE.games.breakout = null;
        renderBreakout(stage);
    });

}

function renderSolitaire(stage) {

    const state = TEAM_STATE.games.solitaire || { deck: shuffle(["A","2","3","4","5","6","7","8","9","10","J","Q","K"]), pile: [], score: 0 };
    TEAM_STATE.games.solitaire = state;
    stage.innerHTML = gameHeader("Solitaire", "Pioche les cartes et monte la pile.") + `<div class="game-board" style="grid-template-columns:repeat(4,1fr)"><button class="tile active" id="drawCard">Pioche</button><div class="tile">${state.deck[0] || ""}</div><div class="tile good">${state.pile.at(-1) || "Pile"}</div><div class="tile">${state.score}</div></div>`;
    stage.querySelector("#drawCard").addEventListener("click", () => {
        const card = state.deck.shift();
        if (card) {
            state.pile.push(card);
            state.score += 1;
        }
        renderSolitaire(stage);
    });
    stage.querySelector("#resetGame").addEventListener("click", () => {
        TEAM_STATE.games.solitaire = null;
        renderSolitaire(stage);
    });

}

function renderMemory(stage) {

    const state = TEAM_STATE.games.memory || { cards: shuffle(["A","A","B","B","C","C","D","D","E","E","F","F"]), open: [], found: [] };
    TEAM_STATE.games.memory = state;
    stage.innerHTML = gameHeader("Memory", "Trouve toutes les paires.") + `<div class="game-board" style="grid-template-columns:repeat(4,1fr)"></div>`;
    stage.querySelector(".game-board").innerHTML = state.cards.map((card, index) => {
        const visible = state.open.includes(index) || state.found.includes(index);
        return `<button class="tile ${state.found.includes(index) ? "good" : ""}" data-memory="${index}">${visible ? card : "?"}</button>`;
    }).join("");
    stage.querySelectorAll("[data-memory]").forEach((cell) => cell.addEventListener("click", () => {
        const index = Number(cell.dataset.memory);
        if (state.found.includes(index) || state.open.includes(index)) return;
        state.open.push(index);
        if (state.open.length === 2) {
            const [a, b] = state.open;
            if (state.cards[a] === state.cards[b]) state.found.push(a, b);
            window.setTimeout(() => {
                state.open = [];
                renderMemory(stage);
            }, 450);
        }
        renderMemory(stage);
    }));
    stage.querySelector("#resetGame").addEventListener("click", () => {
        TEAM_STATE.games.memory = null;
        renderMemory(stage);
    });

}

function renderMorpion(stage) {

    const state = TEAM_STATE.games.morpion || { cells: Array(9).fill(""), turn: "X" };
    TEAM_STATE.games.morpion = state;
    const winner = getWinner(state.cells, [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]);
    stage.innerHTML = gameHeader("Morpion", winner ? `${winner} gagne.` : `Tour ${state.turn}`) + `<div class="game-board" style="grid-template-columns:repeat(3,1fr)"></div>`;
    stage.querySelector(".game-board").innerHTML = state.cells.map((value, index) => `<button class="tile" data-morpion="${index}">${value}</button>`).join("");
    stage.querySelectorAll("[data-morpion]").forEach((cell) => cell.addEventListener("click", () => {
        const index = Number(cell.dataset.morpion);
        if (state.cells[index] || winner) return;
        state.cells[index] = state.turn;
        state.turn = state.turn === "X" ? "O" : "X";
        renderMorpion(stage);
    }));
    stage.querySelector("#resetGame").addEventListener("click", () => {
        TEAM_STATE.games.morpion = null;
        renderMorpion(stage);
    });

}

function renderConnect4(stage) {

    const state = TEAM_STATE.games.connect4 || { cells: Array(42).fill(""), turn: "●" };
    TEAM_STATE.games.connect4 = state;
    stage.innerHTML = gameHeader("Puissance 4", `Tour ${state.turn}`) + `<div class="game-board" style="grid-template-columns:repeat(7,1fr)"></div>`;
    stage.querySelector(".game-board").innerHTML = state.cells.map((value, index) => `<button class="tile small" data-connect="${index % 7}">${value}</button>`).join("");
    stage.querySelectorAll("[data-connect]").forEach((cell) => cell.addEventListener("click", () => {
        const col = Number(cell.dataset.connect);
        for (let row = 5; row >= 0; row -= 1) {
            const index = row * 7 + col;
            if (!state.cells[index]) {
                state.cells[index] = state.turn;
                state.turn = state.turn === "●" ? "○" : "●";
                break;
            }
        }
        renderConnect4(stage);
    }));
    stage.querySelector("#resetGame").addEventListener("click", () => {
        TEAM_STATE.games.connect4 = null;
        renderConnect4(stage);
    });

}

function renderCards(stage) {

    const state = TEAM_STATE.games.cards || { current: randomCard(), score: 0 };
    TEAM_STATE.games.cards = state;
    stage.innerHTML = gameHeader("Jeu de cartes", "Devine si la prochaine carte sera plus haute ou plus basse.") + `<div class="game-board" style="grid-template-columns:repeat(3,1fr)"><button class="tile active" data-guess="high">+</button><div class="tile">${state.current}</div><button class="tile active" data-guess="low">-</button></div><p class="tag info">Score ${state.score}</p>`;
    stage.querySelectorAll("[data-guess]").forEach((button) => button.addEventListener("click", () => {
        const next = randomCard();
        const good = button.dataset.guess === "high" ? next >= state.current : next <= state.current;
        state.score = good ? state.score + 1 : 0;
        state.current = next;
        renderCards(stage);
    }));
    stage.querySelector("#resetGame").addEventListener("click", () => {
        TEAM_STATE.games.cards = null;
        renderCards(stage);
    });

}

function renderLogic(stage) {

    const state = TEAM_STATE.games.logic || { sequence: [1,3,2], input: [], level: 1 };
    TEAM_STATE.games.logic = state;
    stage.innerHTML = gameHeader("Jeu de réflexion", "Répète la séquence bleue.") + `<div class="game-board" style="grid-template-columns:repeat(4,1fr)">${[1,2,3,4].map((n) => `<button class="tile ${state.sequence.includes(n) ? "active" : ""}" data-logic="${n}">${n}</button>`).join("")}</div><p class="tag info">Niveau ${state.level} · ${state.input.join("-")}</p>`;
    stage.querySelectorAll("[data-logic]").forEach((button) => button.addEventListener("click", () => {
        state.input.push(Number(button.dataset.logic));
        const ok = state.input.every((value, index) => value === state.sequence[index]);
        if (!ok) {
            state.input = [];
            state.level = 1;
            state.sequence = [1,3,2];
        } else if (state.input.length === state.sequence.length) {
            state.level += 1;
            state.input = [];
            state.sequence.push(1 + Math.floor(Math.random() * 4));
        }
        renderLogic(stage);
    }));
    stage.querySelector("#resetGame").addEventListener("click", () => {
        TEAM_STATE.games.logic = null;
        renderLogic(stage);
    });

}

function getDashboardStats() {

    const present = TEAM_STATE.data.members.filter((member) => ["present", "site", "break"].includes(member.status)).length;
    const absences = TEAM_STATE.data.members.filter((member) => ["leave", "sick", "absent"].includes(member.status)).length;
    const weekHours = TEAM_STATE.data.agenda.reduce((sum, day) => sum + calculateWorkedHours(day.arrival, day.departure, day.pause), 0).toFixed(1);
    const monthHours = TEAM_STATE.data.payroll.reduce((sum, row) => sum + Number(row.hours || 0) + Number(row.overtime || 0), 0);
    const payrollCost = TEAM_STATE.data.payroll.reduce((sum, row) => sum + calculateSalary(row).remaining, 0);
    const sites = new Set(TEAM_STATE.data.agenda.map((day) => day.site)).size;
    const late = TEAM_STATE.data.members.filter((member) => member.arrival > "07:00").length;
    const productivity = Math.round((present / TEAM_STATE.data.members.length) * 100);
    return { present, absences, weekHours, monthHours, payrollCost, sites, late, productivity };

}

function calculateWorkedHours(arrival, departure, pause) {

    const start = timeToMinutes(arrival);
    const end = timeToMinutes(departure);
    const pauseMinutes = timeToMinutes(pause);
    if (start === null || end === null) return 0;
    return Math.max(0, (end - start - (pauseMinutes || 0)) / 60);

}

function calculateSalary(row) {

    const base = Number(row.rate || 0) * Number(row.hours || 0);
    const overtime = Number(row.rate || 0) * 1.25 * Number(row.overtime || 0);
    const gross = base + overtime + Number(row.bonus || 0);
    const estimatedNet = gross * .87;
    const remaining = Math.max(0, estimatedNet - Number(row.advance || 0) - Number(row.deductions || 0));
    return { gross, estimatedNet, remaining };

}

function groupAdvances() {

    return TEAM_STATE.data.advances.reduce((acc, row) => {
        acc[row.name] = acc[row.name] || { advanced: 0, remaining: Number(row.base || 0) };
        acc[row.name].advanced += Number(row.amount || 0);
        acc[row.name].remaining = Number(row.base || 0) - acc[row.name].advanced;
        return acc;
    }, {});

}

function timeToMinutes(value) {

    if (!value || !String(value).includes(":")) return null;
    const [hours, minutes] = String(value).split(":").map(Number);
    return hours * 60 + minutes;

}

function getStatusClass(status) {

    if (["present"].includes(status)) return "ready";
    if (["break", "leave"].includes(status)) return "warn";
    if (["absent", "sick"].includes(status)) return "blocked";
    return "info";

}

function getChatToolText(tool) {

    const labels = {
        photo: "Photo prête à envoyer dans le chat équipe.",
        video: "Vidéo prête à joindre au message.",
        document: "Document préparé pour le canal équipe.",
        voice: "Message vocal prêt pour la future connexion."
    };
    return labels[tool] || "Pièce jointe préparée.";

}

function getWinner(cells, lines) {

    const line = lines.find(([a, b, c]) => cells[a] && cells[a] === cells[b] && cells[a] === cells[c]);
    return line ? cells[line[0]] : "";

}

function randomCard() {

    return 1 + Math.floor(Math.random() * 13);

}

function shuffle(items) {

    return items.slice().sort(() => Math.random() - .5);

}

function formatMoney(value) {

    return Math.round(Number(value || 0)).toLocaleString("fr-FR") + " F";

}

function getShortTime() {

    return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

}

function updateClock() {

    document.getElementById("teamClock").textContent = new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "2-digit",
        month: "long"
    }) + " - " + getShortTime();

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

window.KynexyTeam = {
    refresh: renderApp,
    getState: () => ({
        view: TEAM_STATE.view,
        data: TEAM_STATE.data,
        chat: TEAM_STATE.chat,
        selectedGame: TEAM_STATE.selectedGame
    })
};
