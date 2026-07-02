const DOMAIN_BLUEPRINT = [
    { id:'planning', name:'Temps', mission:'Comprendre les rendez-vous, les départs et les conflits.', required:['prochain rendez-vous','heure','lieu'] },
    { id:'terrain', name:'Terrain', mission:'Lire les conditions réelles qui peuvent bloquer l’action.', required:['météo','trajet','site'] },
    { id:'clients', name:'Clients', mission:'Relier chaque action à une personne, un besoin et une urgence.', required:['fiche client','contact','historique'] },
    { id:'team', name:'Humain', mission:'Savoir qui travaille, qui doit être payé, qui manque.', required:['présences','heures','paiements'] },
    { id:'finance', name:'Argent', mission:'Comprendre trésorerie, factures, risques et décisions financières.', required:['factures','soldes','échéances'] }
];

const DEFAULT_CONTEXT = {
    planning: { connected:false, signals:[] },
    terrain: { connected:false, signals:[] },
    clients: { connected:false, signals:[] },
    team: { connected:false, signals:[] },
    finance: { connected:false, signals:[] }
};

const state = { context:null, analysis:null, events:[] };

document.addEventListener('DOMContentLoaded', initContext);

function initContext(){
    bindSharedContext();
    refreshSharedContextIfAvailable();
    state.context = getContextData();
    state.analysis = analyseContext(state.context);
    render();
    publish();
}

function getContextData(){
    const shared = getSharedContext();
    if (shared) return normalizeSharedContext(shared);
    const injected = window.KYNEXY_CONTEXT_DATA || window.AUREL_CONTEXT_DATA || null;
    if (injected && typeof injected === 'object') return normalizeContext(injected, 'connecté');
    return normalizeContext(DEFAULT_CONTEXT, 'préparation');
}

function bindSharedContext(){
    window.addEventListener('kynexy:shared-context:updated', event=>{
        const shared = event.detail && event.detail.context ? event.detail.context : getSharedContext();
        if (!shared) return;
        state.context = normalizeSharedContext(shared);
        state.analysis = analyseContext(state.context);
        render();
        publish();
    });
}

function refreshSharedContextIfAvailable(){
    if (window.KynexyContextHub && typeof window.KynexyContextHub.refresh === 'function') {
        window.KynexyContextHub.refresh();
    }
}

function getSharedContext(){
    if (window.KynexySharedContext && window.KynexySharedContext.domains) return window.KynexySharedContext;
    if (window.KynexyContextHub && typeof window.KynexyContextHub.getContext === 'function') {
        const context = window.KynexyContextHub.getContext();
        if (context && context.domains) return context;
    }
    return null;
}

function normalizeSharedContext(shared){
    const raw = {
        planning: mapSharedDomain(shared.domains.planning),
        terrain: mapSharedDomain(shared.domains.weather),
        clients: mapSharedDomain(shared.domains.crm),
        team: mapSharedDomain(shared.domains.team),
        finance: mapSharedDomain(shared.domains.crypto),
        updatedAt: shared.generatedAt
    };
    return normalizeContext(raw, 'contexte partagé');
}

function mapSharedDomain(domain){
    if (!domain || domain.status === 'unavailable' || domain.status === 'error') {
        return { connected:false, signals:[], facts:[], risks:[] };
    }
    return {
        connected: domain.status === 'ready' || domain.status === 'partial',
        confidence: domain.status === 'ready' ? 80 : 45,
        signals: buildSharedSignals(domain),
        facts: domain.facts || [],
        risks: domain.risks || []
    };
}

function buildSharedSignals(domain){
    const signals = [];
    if (domain.summary) signals.push(domain.summary);
    (domain.facts || []).slice(0,2).forEach(fact=>signals.push(String(fact.type || 'signal') + ' : ' + String(fact.value ?? '')));
    return signals.filter(Boolean);
}

function normalizeContext(raw, source){
    const domains = {};
    DOMAIN_BLUEPRINT.forEach(domain=>{
        const input = raw[domain.id] || {};
        const signals = Array.isArray(input.signals) ? input.signals.filter(Boolean) : [];
        domains[domain.id] = {
            ...domain,
            connected: Boolean(input.connected || signals.length),
            confidence: clamp(Number(input.confidence ?? (signals.length ? 55 : 0)),0,100),
            signals,
            facts: Array.isArray(input.facts) ? input.facts : [],
            risks: Array.isArray(input.risks) ? input.risks : []
        };
    });
    return { source, domains, updatedAt: raw.updatedAt || new Date().toISOString() };
}

function analyseContext(context){
    const domains = Object.values(context.domains);
    const active = domains.filter(d=>d.connected);
    const confidence = Math.round(domains.reduce((sum,d)=>sum+d.confidence,0)/domains.length);
    const missing = domains.filter(d=>!d.connected).map(d=>({title:d.name, detail:'KYNEXY attend : '+d.required.join(', ')+'.'}));
    const decisions = buildDecisions(context.domains);
    const automations = buildAutomations(context.domains);
    return { active, confidence, missing, decisions, automations };
}

function buildDecisions(domains){
    return [
        {
            title:'Prioriser la journée',
            detail:'Possible quand Temps, Terrain et Clients sont connectés.',
            ready: domains.planning.connected && domains.terrain.connected && domains.clients.connected
        },
        {
            title:'Détecter un chantier à risque',
            detail:'Possible quand KYNEXY relie météo, trajet, équipe et urgence client.',
            ready: domains.terrain.connected && domains.team.connected && domains.clients.connected
        },
        {
            title:'Préparer une décision financière',
            detail:'Possible quand factures, planning et contexte client sont cohérents.',
            ready: domains.finance.connected && domains.planning.connected && domains.clients.connected
        },
        {
            title:'Proposer une automatisation utile',
            detail:'Possible quand l’action peut être expliquée, validée et tracée.',
            ready: Object.values(domains).filter(d=>d.connected).length >= 4
        }
    ];
}

function buildAutomations(domains){
    return [
        { title:'Brief du matin', detail:'Résumer les décisions du jour sans ouvrir chaque module.', ready: domains.planning.connected || domains.terrain.connected },
        { title:'Alerte friction', detail:'Prévenir quand météo, retard, paiement ou client créent un blocage.', ready: domains.terrain.connected && (domains.clients.connected || domains.finance.connected) },
        { title:'Action préparée', detail:'Préparer appel, relance, facture ou report, puis attendre validation humaine.', ready: Object.values(domains).filter(d=>d.connected).length >= 3 }
    ];
}

function render(){
    renderBrief();
    renderDomains();
    renderDecisions();
    renderMissing();
    renderAutomations();
    renderFooter();
}

function renderBrief(){
    const a = state.analysis;
    confidenceValue.textContent = a.confidence + '%';
    if (!a.active.length) {
        contextBrief.textContent = 'KYNEXY est prêt, mais aucun domaine fiable n’est encore connecté. La prochaine étape n’est pas une fonctionnalité : c’est brancher des signaux réels.';
        domainSummary.textContent = '0 domaine actif';
        decisionSummary.textContent = 'Aucune décision fiable';
        return;
    }
    const names = a.active.map(d=>d.name).join(', ');
    contextBrief.textContent = 'KYNEXY comprend déjà : ' + names + '. Plus les domaines se relient, plus les conseils deviennent précis.';
    domainSummary.textContent = a.active.length + ' domaine(s) actif(s)';
    decisionSummary.textContent = a.decisions.filter(d=>d.ready).length + ' décision(s) possible(s)';
}

function renderDomains(){
    domainGrid.innerHTML = Object.values(state.context.domains).map(domain=>{
        const status = domain.connected ? (domain.confidence >= 70 ? 'ready' : 'partial') : 'missing';
        const label = domain.connected ? domain.confidence + '% fiable' : 'à connecter';
        const signals = domain.signals.length ? domain.signals.slice(0,3) : domain.required.slice(0,3);
        return `<article class="domain-card"><div class="domain-top"><h3>${esc(domain.name)}</h3><span class="status-pill ${status}">${esc(label)}</span></div><p>${esc(domain.mission)}</p><div class="signal-row">${signals.map(s=>`<span class="signal-chip">${esc(s)}</span>`).join('')}</div></article>`;
    }).join('');
}

function renderDecisions(){
    decisionList.innerHTML = state.analysis.decisions.map((decision,index)=>`<article class="decision-card ${decision.ready?'':'locked'}"><span class="decision-rank">${decision.ready ? index + 1 : '•'}</span><div><h3>${esc(decision.title)}</h3><p>${esc(decision.detail)}</p></div></article>`).join('');
}

function renderMissing(){
    if (!state.analysis.missing.length) { missingList.innerHTML = '<article class="missing-card"><h3>Contexte complet</h3><p>KYNEXY dispose des domaines essentiels pour produire des recommandations transversales.</p></article>'; return; }
    missingList.innerHTML = state.analysis.missing.map(item=>`<article class="missing-card"><h3>${esc(item.title)}</h3><p>${esc(item.detail)}</p></article>`).join('');
}

function renderAutomations(){
    automationList.innerHTML = state.analysis.automations.map(item=>`<article class="automation-card"><div><h3>${esc(item.title)}</h3><p>${esc(item.detail)}</p></div><button class="${item.ready?'ready':''}" type="button" data-automation="${esc(item.title)}">${item.ready?'Préparer':'Verrouillé'}</button></article>`).join('');
    automationList.querySelectorAll('button.ready').forEach(button=>button.addEventListener('click',()=>emitIntent(button.dataset.automation)));
}

function renderFooter(){
    const date = new Date(state.context.updatedAt);
    lastUpdated.textContent = Number.isNaN(date.getTime()) ? 'Contexte initialisé' : 'Mis à jour ' + date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
}

function emitIntent(name){
    state.events.unshift({ id:'intent_'+Date.now(), type:'automation_prepared', name, createdAt:new Date().toISOString(), requiresHumanValidation:true });
    publish();
}

function publish(){
    window.KynexyContextState = { context:state.context, analysis:state.analysis, events:state.events };
    window.AurelContextState = window.KynexyContextState;
}

function clamp(n,min,max){ return Math.max(min, Math.min(max, Number.isFinite(n)?n:min)); }
function esc(v){return String(v||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
