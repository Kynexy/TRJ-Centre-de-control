// =====================================
// SALLE DE PAUSE
// =====================================

const pauseGames = [
    {
        label: "Snake",
        url: "https://playsnake.org/"
    },
    {
        label: "2048",
        url: "https://play2048.co/"
    },
    {
        label: "Échecs",
        url: "https://lichess.org/"
    },
    {
        label: "Sudoku",
        url: "https://sudoku.com/"
    }
];

function initPause() {

    refreshPause();

}

function getPauseData() {

    return {
        raw: pauseGames,
        status: "ready",
        summary: "🎮 Salle de pause prête.",
        details: pauseGames.map((game) => game.label)
    };

}

function renderPause(data) {

    const gameElements = Array.from(document.querySelectorAll(".game"));

    gameElements.forEach((gameElement) => {
        const game = data.raw.find((item) => gameElement.textContent.includes(item.label));

        if (!game) {
            return;
        }

        gameElement.setAttribute("role", "button");
        gameElement.setAttribute("tabindex", "0");
        gameElement.setAttribute("title", "Ouvrir " + game.label);

        const openGame = () => {
            window.open(game.url, "_blank", "noopener");
        };

        gameElement.addEventListener("click", openGame);
        gameElement.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openGame();
            }
        });
    });

    window.AurelState = window.AurelState || {};
    window.AurelState.pause = {
        raw: data.raw,
        status: data.status,
        summary: data.summary,
        details: data.details
    };

}

function refreshPause() {

    renderPause(getPauseData());

}
