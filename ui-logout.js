/* Persistent logout control shown on every authenticated screen */
(function () {
    if (typeof UI === "undefined" || typeof SNPDatabase === "undefined") return;

    const originalRenderLayout = UI.renderLayout;
    if (typeof originalRenderLayout !== "function") return;

    UI.renderLayout = function (...args) {
        const result = originalRenderLayout.apply(UI, args);

        const topbarRight = document.querySelector(".topbar-right");
        if (topbarRight && !document.getElementById("snpLogoutButton")) {
            const button = document.createElement("button");
            button.id = "snpLogoutButton";
            button.type = "button";
            button.textContent = "Log Out";
            button.onclick = async function () {
                await SNPDatabase.signOut();
            };
            topbarRight.appendChild(button);
        }

        return result;
    };
})();
