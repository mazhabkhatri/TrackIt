/* TrackIt navigation compatibility fix */
(function () {
    const core = document.createElement("script");
    core.src = "script-core.js";
    core.onload = function () {
        window.switchPage = function (page) {
            const pageId = page.endsWith("Page") ? page : page + "Page";

            window.currentPage = pageId.replace(/Page$/, "");

            document.querySelectorAll(".page").forEach(section => {
                section.classList.toggle("active", section.id === pageId);
            });

            document.querySelectorAll(".nav-item").forEach(button => {
                button.classList.toggle("active", button.dataset.page === pageId);
            });

            if (pageId === "dashboardPage" && typeof window.renderDashboard === "function") {
                window.renderDashboard();
            } else if (pageId === "transactionsPage" && typeof window.renderTransactionsPage === "function") {
                window.renderTransactionsPage();
            } else if (pageId === "statisticsPage" && typeof window.renderStatistics === "function") {
                window.renderStatistics();
            } else if (pageId === "settingsPage" && typeof window.renderSettings === "function") {
                window.renderSettings();
            }

            window.scrollTo({ top: 0, behavior: "smooth" });
        };

        const headerSettings = document.getElementById("headerSettingsButton");
        if (headerSettings && !headerSettings.dataset.trackitBound) {
            headerSettings.dataset.trackitBound = "true";
            headerSettings.addEventListener("click", function () {
                window.switchPage("settingsPage");
            });
        }
    };
    core.onerror = function () {
        console.error("TrackIt: unable to load script-core.js");
    };
    document.head.appendChild(core);
})();