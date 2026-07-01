(function () {
    const AUREL_ASSET = "assets/aurel/aurel-official.gif";
    const DEFAULT_STATE = "rest";

    function createAurelImage(className) {
        const image = document.createElement("img");
        image.className = className || "kx-aurel-media";
        image.src = AUREL_ASSET;
        image.alt = "Aurel";
        image.decoding = "async";
        image.loading = "eager";
        return image;
    }

    function hydratePresence(target) {
        target.innerHTML = "";
        target.dataset.aurelState = target.dataset.aurelState || DEFAULT_STATE;
        target.appendChild(createAurelImage("kx-aurel-media"));
    }

    function createFloatingAurel() {
        if (document.querySelector("[data-aurel-floating]")) {
            return;
        }

        const wrapper = document.createElement("aside");
        wrapper.className = "kx-aurel-floating";
        wrapper.setAttribute("aria-label", "Aurel");
        wrapper.dataset.aurelFloating = "true";

        const button = document.createElement("button");
        button.className = "kx-aurel-button";
        button.type = "button";
        button.dataset.aurelState = DEFAULT_STATE;
        button.setAttribute("aria-label", "Ouvrir Aurel");
        button.appendChild(createAurelImage("kx-aurel-media"));
        button.addEventListener("click", () => {
            window.dispatchEvent(new CustomEvent("kynexy:aurel:open", {
                detail: {
                    source: window.location.pathname,
                    state: button.dataset.aurelState || DEFAULT_STATE
                }
            }));
        });

        wrapper.appendChild(button);
        document.body.appendChild(wrapper);
    }

    function setAurelState(state) {
        document.querySelectorAll("[data-aurel-presence], .kx-aurel-button").forEach((node) => {
            node.dataset.aurelState = state || DEFAULT_STATE;
        });
    }

    function initAurelSystem() {
        document.querySelectorAll("[data-aurel-presence]").forEach(hydratePresence);

        if (!document.body.dataset.aurelPage) {
            createFloatingAurel();
        }

        window.KynexyAurel = {
            asset: AUREL_ASSET,
            setState: setAurelState,
            open: () => window.dispatchEvent(new CustomEvent("kynexy:aurel:open", {
                detail: { source: window.location.pathname }
            }))
        };
    }

    document.addEventListener("DOMContentLoaded", initAurelSystem);
}());
