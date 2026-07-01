(function () {
    const DEFAULT_STATE = "rest";

    function createAurelAvatar(className) {
        const avatar = document.createElement("div");
        avatar.className = className || "kx-aurel-avatar";
        avatar.setAttribute("aria-hidden", "true");
        avatar.innerHTML = `
            <div class="kx-cloud-shape">
                <span class="kx-cloud-lobe one"></span>
                <span class="kx-cloud-lobe two"></span>
                <span class="kx-cloud-lobe three"></span>
                <span class="kx-cloud-face eye left"></span>
                <span class="kx-cloud-face eye right"></span>
                <span class="kx-cloud-face smile"></span>
            </div>
            <span class="kx-cloud-orbit"></span>
        `;
        return avatar;
    }

    function hydratePresence(target) {
        target.innerHTML = "";
        target.dataset.aurelState = target.dataset.aurelState || DEFAULT_STATE;
        target.appendChild(createAurelAvatar("kx-aurel-avatar large"));
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
        button.appendChild(createAurelAvatar("kx-aurel-avatar"));
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
            setState: setAurelState,
            open: () => window.dispatchEvent(new CustomEvent("kynexy:aurel:open", {
                detail: { source: window.location.pathname }
            }))
        };
    }

    document.addEventListener("DOMContentLoaded", initAurelSystem);
}());
