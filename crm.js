const CLIENT_STATE = {
    clients: [],
    documents: [],
    databaseReady: false,
    databaseError: null,
    search: "",
    focusBeforePanel: null,
    scrollY: 0
};

document.addEventListener("DOMContentLoaded", initClientModule);

async function initClientModule() {
    bindShell();
    renderClientModule();

    try {
        assertClientDatabase();
        await window.ClientDB.open();
        CLIENT_STATE.databaseReady = true;
        await reloadClientData();
    } catch (error) {
        CLIENT_STATE.databaseError = error;
        console.error("Client database unavailable", error);
    }

    renderClientModule();
}

function assertClientDatabase() {
    if (!window.ClientDB) {
        throw new Error("ClientDB is not loaded. client-db.js must be loaded before crm.js.");
    }
}

function bindShell() {
    document.getElementById("newClient").addEventListener("click", () => openClientForm());
    document.getElementById("newQuote").addEventListener("click", () => openDocumentForm("quote"));
    document.getElementById("newInvoice").addEventListener("click", () => openDocumentForm("invoice"));
    document.getElementById("closePanel").addEventListener("click", closePanel);
    document.getElementById("clientPanel").addEventListener("click", (event) => {
        if (event.target.id === "clientPanel") {
            closePanel();
        }
    });
    document.getElementById("clientSearch").addEventListener("input", (event) => {
        CLIENT_STATE.search = event.target.value.trim().toLowerCase();
        renderClients();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closePanel();
        }
    });
}

async function reloadClientData() {
    const [clients, documents] = await Promise.all([
        window.ClientDB.listClients(),
        window.ClientDB.listDocuments()
    ]);
    CLIENT_STATE.clients = clients;
    CLIENT_STATE.documents = documents;
}

function renderClientModule() {
    document.getElementById("storageStatus").textContent = getStorageLabel();

    if (CLIENT_STATE.databaseError) {
        document.getElementById("clientList").innerHTML = `<div class="empty-state">Base Clients indisponible : ${escapeHtml(CLIENT_STATE.databaseError.message)}</div>`;
        document.getElementById("documentList").innerHTML = "";
        return;
    }

    renderSummary();
    renderClients();
    renderDocuments();
}

function renderSummary() {
    const quotes = CLIENT_STATE.documents.filter((doc) => doc.type === "quote");
    const invoices = CLIENT_STATE.documents.filter((doc) => doc.type === "invoice");
    document.getElementById("summarySection").innerHTML = `
        ${summaryTile("Clients", CLIENT_STATE.clients.length)}
        ${summaryTile("Devis", quotes.length)}
        ${summaryTile("Factures", invoices.length)}
    `;
}

function renderClients() {
    const list = document.getElementById("clientList");
    const clients = CLIENT_STATE.clients.filter((client) => {
        const haystack = `${client.name} ${client.phone} ${client.email} ${client.address}`.toLowerCase();
        return !CLIENT_STATE.search || haystack.includes(CLIENT_STATE.search);
    });

    if (!clients.length) {
        list.innerHTML = `<button class="empty-state" type="button" id="emptyClient">Créer le premier client</button>`;
        document.getElementById("emptyClient").addEventListener("click", () => openClientForm());
        return;
    }

    list.innerHTML = clients.map((client) => `
        <article class="client-card">
            <h3>${escapeHtml(client.name)}</h3>
            <p>${escapeHtml(client.phone || "Telephone non renseigne")}${client.email ? " · " + escapeHtml(client.email) : ""}</p>
            <p>${escapeHtml(client.address || "Adresse a completer")}</p>
            <div class="card-actions three">
                <button class="tiny-btn primary" type="button" data-client-quote="${escapeAttribute(client.id)}">Devis</button>
                <button class="tiny-btn primary" type="button" data-client-invoice="${escapeAttribute(client.id)}">Facture</button>
                <button class="tiny-btn" type="button" data-client-detail="${escapeAttribute(client.id)}">Historique</button>
            </div>
        </article>
    `).join("");

    list.querySelectorAll("[data-client-quote]").forEach((button) => {
        button.addEventListener("click", () => openDocumentForm("quote", button.dataset.clientQuote));
    });
    list.querySelectorAll("[data-client-invoice]").forEach((button) => {
        button.addEventListener("click", () => openDocumentForm("invoice", button.dataset.clientInvoice));
    });
    list.querySelectorAll("[data-client-detail]").forEach((button) => {
        button.addEventListener("click", () => openClientDetail(button.dataset.clientDetail));
    });
}

function renderDocuments() {
    const list = document.getElementById("documentList");
    const docs = CLIENT_STATE.documents.slice(0, 8);
    if (!docs.length) {
        list.innerHTML = `<div class="empty-state">Aucun devis ni facture.</div>`;
        return;
    }

    list.innerHTML = docs.map(renderDocumentCard).join("");
    bindDocumentActions(list);
}

function renderDocumentCard(doc) {
    return `
        <article class="document-card">
            <span class="doc-badge">${doc.type === "invoice" ? "Facture" : "Devis"} · ${escapeHtml(doc.number)}</span>
            <h3>${escapeHtml(doc.clientName)}</h3>
            <p>${escapeHtml(doc.description || "Description libre")} · ${formatMoney(doc.totalTtc)} TTC</p>
            <div class="card-actions three">
                <button class="tiny-btn primary" type="button" data-download-doc="${escapeAttribute(doc.id)}">PDF</button>
                <button class="tiny-btn ok" type="button" data-email-doc="${escapeAttribute(doc.id)}">E-mail</button>
                <button class="tiny-btn" type="button" data-view-doc="${escapeAttribute(doc.id)}">Voir</button>
            </div>
        </article>
    `;
}

function bindDocumentActions(root) {
    root.querySelectorAll("[data-download-doc]").forEach((button) => {
        button.addEventListener("click", () => downloadDocumentPdf(button.dataset.downloadDoc));
    });
    root.querySelectorAll("[data-email-doc]").forEach((button) => {
        button.addEventListener("click", () => emailDocumentPdf(button.dataset.emailDoc));
    });
    root.querySelectorAll("[data-view-doc]").forEach((button) => {
        button.addEventListener("click", () => openDocumentDetail(button.dataset.viewDoc));
    });
}

function summaryTile(label, value) {
    return `<article class="summary-tile"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function openClientForm(client = null) {
    document.getElementById("panelTitle").textContent = client ? "Modifier client" : "Nouveau client";
    document.getElementById("panelContent").innerHTML = `
        <form class="form" id="clientForm">
            <label class="form-row"><span>Nom</span><input name="name" required value="${escapeAttribute(client ? client.name : "")}" placeholder="Nom du client"></label>
            <div class="form-grid">
                <label class="form-row"><span>Telephone</span><input name="phone" type="tel" value="${escapeAttribute(client ? client.phone : "")}" placeholder="+689 ..."></label>
                <label class="form-row"><span>E-mail</span><input name="email" type="email" value="${escapeAttribute(client ? client.email : "")}" placeholder="client@email.com"></label>
            </div>
            <label class="form-row"><span>Adresse</span><input name="address" value="${escapeAttribute(client ? client.address : "")}" placeholder="Commune, quartier, repere"></label>
            <label class="form-row"><span>Notes</span><textarea name="notes" placeholder="Notes utiles">${escapeHtml(client ? client.notes : "")}</textarea></label>
            <button class="primary-btn big" type="submit">Enregistrer</button>
        </form>
    `;
    openPanel();
    document.getElementById("clientForm").addEventListener("submit", (event) => saveClientForm(event, client ? client.id : null));
}

function openDocumentForm(type, clientId = "") {
    const client = CLIENT_STATE.clients.find((item) => item.id === clientId) || null;
    document.getElementById("panelTitle").textContent = type === "invoice" ? "Nouvelle facture" : "Nouveau devis";
    document.getElementById("panelContent").innerHTML = `
        <form class="form" id="documentForm">
            <label class="form-row"><span>Client</span><select name="clientId" required>${renderClientOptions(clientId)}</select></label>
            <label class="form-row"><span>Description libre</span><textarea name="description" required placeholder="Taille complète des haies"></textarea></label>
            <div class="form-grid">
                <label class="form-row"><span>Montant TTC</span><input name="totalTtc" type="number" min="0" step="1" required placeholder="158000"></label>
                <label class="form-row"><span>TVA</span><select name="taxRate"><option value="0">0%</option><option value="5">5%</option><option value="13" selected>13%</option><option value="16">16%</option><option value="20">20%</option></select></label>
            </div>
            <div class="totals-box" id="liveTotals">
                ${renderTotals(window.ClientDB.calculateTotals(0, 13))}
            </div>
            <button class="primary-btn big" type="submit">Créer ${type === "invoice" ? "la facture" : "le devis"}</button>
        </form>
    `;
    openPanel();
    const form = document.getElementById("documentForm");
    if (client) {
        form.elements.clientId.value = client.id;
    }
    form.elements.totalTtc.addEventListener("input", () => updateLiveTotals(form));
    form.elements.taxRate.addEventListener("change", () => updateLiveTotals(form));
    form.addEventListener("submit", (event) => saveDocumentForm(event, type));
}

function renderClientOptions(selectedId = "") {
    const options = CLIENT_STATE.clients.map((client) => {
        const selected = client.id === selectedId ? "selected" : "";
        return `<option value="${escapeAttribute(client.id)}" ${selected}>${escapeHtml(client.name)}</option>`;
    }).join("");
    return options || `<option value="">Créez d'abord un client</option>`;
}

function updateLiveTotals(form) {
    const totals = window.ClientDB.calculateTotals(form.elements.totalTtc.value, form.elements.taxRate.value);
    document.getElementById("liveTotals").innerHTML = renderTotals(totals);
}

function renderTotals(totals) {
    return `
        ${summaryTile("HT", formatMoney(totals.totalHt))}
        ${summaryTile("TVA", formatMoney(totals.taxAmount))}
        ${summaryTile("TTC", formatMoney(totals.totalTtc))}
    `;
}

async function saveClientForm(event, clientId = null) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (clientId) {
        await window.ClientDB.updateClient(clientId, data);
    } else {
        await window.ClientDB.createClient(data);
    }
    await reloadClientData();
    closePanel();
    renderClientModule();
}

async function saveDocumentForm(event, type) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const client = CLIENT_STATE.clients.find((item) => item.id === data.clientId);
    if (!client) {
        return;
    }
    const doc = await window.ClientDB.createDocument({
        type,
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
        clientAddress: client.address,
        description: data.description,
        totalTtc: data.totalTtc,
        taxRate: data.taxRate
    });
    await reloadClientData();
    closePanel();
    renderClientModule();
    openDocumentDetail(doc.id);
}

function openClientDetail(clientId) {
    const client = CLIENT_STATE.clients.find((item) => item.id === clientId);
    if (!client) {
        return;
    }
    const docs = CLIENT_STATE.documents.filter((doc) => doc.clientId === client.id);
    document.getElementById("panelTitle").textContent = client.name;
    document.getElementById("panelContent").innerHTML = `
        <div class="panel-scroll">
            <div class="detail-row"><span>Telephone</span><strong>${escapeHtml(client.phone || "Non renseigne")}</strong></div>
            <div class="detail-row"><span>E-mail</span><strong>${escapeHtml(client.email || "Non renseigne")}</strong></div>
            <div class="detail-row"><span>Adresse</span><strong>${escapeHtml(client.address || "Non renseignee")}</strong></div>
            <div class="card-actions three">
                <button class="tiny-btn primary" type="button" id="clientQuote">Devis</button>
                <button class="tiny-btn primary" type="button" id="clientInvoice">Facture</button>
                <button class="tiny-btn" type="button" id="editClient">Modifier</button>
            </div>
            <section class="history-block">
                <h3>Historique</h3>
                ${docs.map(renderDocumentCard).join("") || `<div class="empty-state">Aucun document.</div>`}
            </section>
        </div>
    `;
    openPanel();
    document.getElementById("clientQuote").addEventListener("click", () => openDocumentForm("quote", client.id));
    document.getElementById("clientInvoice").addEventListener("click", () => openDocumentForm("invoice", client.id));
    document.getElementById("editClient").addEventListener("click", () => openClientForm(client));
    bindDocumentActions(document.getElementById("panelContent"));
}

function openDocumentDetail(documentId) {
    const doc = CLIENT_STATE.documents.find((item) => item.id === documentId);
    if (!doc) {
        return;
    }
    document.getElementById("panelTitle").textContent = doc.number;
    document.getElementById("panelContent").innerHTML = `
        <div class="panel-scroll">
            ${renderDocumentPreview(doc)}
            <div class="card-actions">
                <button class="tiny-btn primary" type="button" id="downloadPdf">Télécharger PDF</button>
                <button class="tiny-btn ok" type="button" id="emailPdf">Envoyer e-mail</button>
            </div>
        </div>
    `;
    openPanel();
    document.getElementById("downloadPdf").addEventListener("click", () => downloadDocumentPdf(doc.id));
    document.getElementById("emailPdf").addEventListener("click", () => emailDocumentPdf(doc.id));
}

function renderDocumentPreview(doc) {
    return `
        <article class="document-preview">
            <h3>${doc.type === "invoice" ? "Facture" : "Devis"} ${escapeHtml(doc.number)}</h3>
            <p class="muted">Client : ${escapeHtml(doc.clientName)}</p>
            <p class="muted">${escapeHtml(doc.clientAddress || "")}</p>
            <hr>
            <p>${escapeHtml(doc.description)}</p>
            <hr>
            <p>HT : <strong>${formatMoney(doc.totalHt)}</strong></p>
            <p>TVA ${escapeHtml(doc.taxRate)}% : <strong>${formatMoney(doc.taxAmount)}</strong></p>
            <p>TTC : <strong>${formatMoney(doc.totalTtc)}</strong></p>
        </article>
    `;
}

async function downloadDocumentPdf(documentId) {
    const doc = await window.ClientDB.getDocument(documentId);
    if (!doc) {
        return;
    }
    const blob = createSimplePdf(doc);
    downloadBlob(blob, `${doc.number}.pdf`);
}

async function emailDocumentPdf(documentId) {
    const doc = await window.ClientDB.getDocument(documentId);
    if (!doc) {
        return;
    }
    const blob = createSimplePdf(doc);
    const file = new File([blob], `${doc.number}.pdf`, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        await navigator.share({
            title: doc.number,
            text: `${doc.type === "invoice" ? "Facture" : "Devis"} ${doc.number}`,
            files: [file]
        });
        return;
    }
    const subject = encodeURIComponent(`${doc.type === "invoice" ? "Facture" : "Devis"} ${doc.number}`);
    const body = encodeURIComponent("Bonjour,\n\nVous trouverez le document en pièce jointe.\n\nCordialement");
    window.location.href = `mailto:${encodeURIComponent(doc.clientEmail || "")}?subject=${subject}&body=${body}`;
}

function createSimplePdf(doc) {
    const lines = [
        "KYNEXY",
        `${doc.type === "invoice" ? "FACTURE" : "DEVIS"} ${doc.number}`,
        `Date: ${new Date(doc.createdAt).toLocaleDateString("fr-FR")}`,
        "",
        `Client: ${doc.clientName}`,
        doc.clientAddress ? `Adresse: ${doc.clientAddress}` : "",
        doc.clientPhone ? `Telephone: ${doc.clientPhone}` : "",
        doc.clientEmail ? `Email: ${doc.clientEmail}` : "",
        "",
        "Description:",
        doc.description,
        "",
        `Total HT: ${formatMoney(doc.totalHt)}`,
        `TVA ${doc.taxRate}%: ${formatMoney(doc.taxAmount)}`,
        `Total TTC: ${formatMoney(doc.totalTtc)}`,
        "",
        "Document genere par Kynexy."
    ].filter((line) => line !== "");

    const escapedLines = lines.map(escapePdfText);
    const content = [
        "BT",
        "/F1 20 Tf",
        "50 790 Td",
        `(${escapedLines[0]}) Tj`,
        "/F1 12 Tf",
        ...escapedLines.slice(1).map((line) => `0 -20 Td (${line}) Tj`),
        "ET"
    ].join("\n");

    return buildPdf(content);
}

function buildPdf(content) {
    const objects = [];
    objects.push("<< /Type /Catalog /Pages 2 0 R >>");
    objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
        offsets.push(pdf.length);
        pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
        pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function openPanel() {
    const panel = document.getElementById("clientPanel");
    CLIENT_STATE.focusBeforePanel = document.activeElement;
    CLIENT_STATE.scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.top = `-${CLIENT_STATE.scrollY}px`;
    document.body.classList.add("panel-open");
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
}

function closePanel() {
    const panel = document.getElementById("clientPanel");
    if (!panel.classList.contains("open")) {
        return;
    }
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("panel-open");
    document.body.style.top = "";
    window.scrollTo(0, CLIENT_STATE.scrollY);
    document.getElementById("panelTitle").textContent = "Clients";
    document.getElementById("panelContent").innerHTML = "";
    if (CLIENT_STATE.focusBeforePanel && typeof CLIENT_STATE.focusBeforePanel.focus === "function") {
        CLIENT_STATE.focusBeforePanel.focus();
    }
}

function getStorageLabel() {
    if (CLIENT_STATE.databaseError) {
        return "Hors ligne";
    }
    if (!CLIENT_STATE.databaseReady) {
        return "Chargement";
    }
    return window.ClientDB.engineType === "indexeddb" ? "Données locales" : "Fallback local";
}

function formatMoney(value) {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(value || 0))} F`;
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

function escapePdfText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
}

window.KynexyClientModule = {
    reload: async () => {
        await reloadClientData();
        renderClientModule();
    },
    getState: () => ({
        clients: CLIENT_STATE.clients.slice(),
        documents: CLIENT_STATE.documents.slice(),
        databaseReady: CLIENT_STATE.databaseReady
    })
};
