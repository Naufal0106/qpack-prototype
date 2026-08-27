/* ================================================================
   QPACK PROTOTYPE — INTERACTION
   Frontend-only prototype behavior
   ================================================================ */

document.addEventListener("DOMContentLoaded", () => {
    initRoleSelector();
    initTabs();
    initSizeSelector();
    initFakeForms();
    initReportDownload();
    initScanner();
    initNavHighlight();
});

function initRoleSelector() {
    const roles = document.querySelectorAll("[data-role]");
    if (!roles.length) return;

    roles.forEach(role => {
        role.addEventListener("click", () => {
            roles.forEach(item => item.classList.remove("selected"));
            role.classList.add("selected");
            const input = document.querySelector("#selected-role");
            if (input) input.value = role.dataset.role;
        });
    });
}

function initTabs() {
    document.querySelectorAll("[data-tab-group]").forEach(group => {
        const buttons = group.querySelectorAll("[data-tab]");
        const panels = group.querySelectorAll("[data-panel]");

        buttons.forEach(button => {
            button.addEventListener("click", () => {
                const target = button.dataset.tab;
                buttons.forEach(item => item.classList.remove("active"));
                panels.forEach(panel => panel.hidden = true);
                button.classList.add("active");
                const panel = group.querySelector(`[data-panel="${target}"]`);
                if (panel) panel.hidden = false;
            });
        });
    });
}

function initSizeSelector() {
    document.querySelectorAll(".size-option").forEach(option => {
        option.addEventListener("click", () => {
            option.parentElement.querySelectorAll(".size-option")
                .forEach(item => item.classList.remove("selected"));
            option.classList.add("selected");
        });
    });
}

function initFakeForms() {
    document.querySelectorAll("[data-demo-form]").forEach(form => {
        form.addEventListener("submit", event => {
            event.preventDefault();

            if (form.closest(".auth-card") && document.querySelector("#selected-role")) {
                const role = document.querySelector("#selected-role").value;
                window.location.href = role === "consumer"
                    ? "consumer/dashboard.html"
                    : "merchant/dashboard.html";
                return;
            }

            const target = form.dataset.demoForm;
            if (target) window.location.href = target;
        });
    });
}

function initReportDownload() {
    document.querySelectorAll("[data-report-download]").forEach(button => {
        button.addEventListener("click", () => {
            const content = [
                "QPack — Laporan ESG",
                "Periode: Mei 2026",
                "",
                "Ringkasan:",
                "- 865 paket terkirim",
                "- 50 kg plastik terkurangi",
                "- Engagement QR: 18%",
                "- Data dampak tercatat secara digital",
                "",
                "Dokumen ini merupakan prototype laporan otomatis QPack."
            ].join("\n");

            const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "QPack-ESG-Report-Mei-2026.txt";
            link.click();
            URL.revokeObjectURL(url);
        });
    });
}

function initScanner() {
    document.querySelectorAll("[data-scan-demo]").forEach(button => {
        button.addEventListener("click", () => {
            window.location.href = "hasil-scan.html";
        });
    });
}

function initNavHighlight() {
    const current = window.location.pathname.split("/").pop();
    document.querySelectorAll(".bottom-nav a").forEach(link => {
        const href = link.getAttribute("href") || "";
        if (href === current) link.classList.add("active");
    });
}
