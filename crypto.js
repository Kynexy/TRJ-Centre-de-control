const state = { pools: [], filtered: [], wallet: null, risk: 'conservative', amount: 1000, source: 'DefiLlama yields' };
const YIELD_ENDPOINT = 'https://yields.llama.fi/pools';

document.addEventListener('DOMContentLoaded', initCrypto);

function initCrypto(){
    bind();
    loadPools();
    publish();
}

function bind(){
    connectWallet.addEventListener('click', connectExternalWallet);
    refreshPools.addEventListener('click', loadPools);
    aurelToggle.addEventListener('click', () => aurelPanel.scrollIntoView({ behavior:'smooth', block:'start' }));
    amountInput.addEventListener('input', () => { state.amount = Number(amountInput.value) || 0; renderPools(); renderAurel(); publish(); });
    document.querySelectorAll('[data-risk]').forEach(button => button.addEventListener('click', () => {
        state.risk = button.dataset.risk;
        document.querySelectorAll('[data-risk]').forEach(node => node.classList.toggle('active', node === button));
        filterPools();
        renderPools();
        renderAurel();
        publish();
    }));
}

async function connectExternalWallet(){
    if (!window.ethereum || typeof window.ethereum.request !== 'function') {
        walletTitle.textContent = 'Aucun wallet détecté';
        walletDetail.textContent = 'Installe ou ouvre un wallet compatible EIP-1193. Kynexy ne créera pas de seed phrase.';
        renderAurel('Aucun wallet externe disponible. Bonne décision : ne rien simuler.');
        return;
    }
    try {
        const accounts = await window.ethereum.request({ method:'eth_requestAccounts' });
        const chainId = await window.ethereum.request({ method:'eth_chainId' });
        state.wallet = { address: accounts[0], chainId };
        walletTitle.textContent = 'Wallet connecté';
        walletDetail.textContent = shortAddress(accounts[0]) + ' · réseau ' + chainId + ' · lecture seule';
        renderAurel();
        publish();
    } catch (error) {
        walletTitle.textContent = 'Connexion refusée';
        walletDetail.textContent = 'Aucune donnée wallet ne sera utilisée sans validation explicite.';
    }
}

async function loadPools(){
    sourceStatus.textContent = 'Chargement';
    poolList.innerHTML = '<div class="empty">Chargement des rendements réels depuis DefiLlama.</div>';
    try {
        const response = await fetch(YIELD_ENDPOINT, { cache:'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const json = await response.json();
        state.pools = Array.isArray(json.data) ? json.data : [];
        filterPools();
        sourceStatus.textContent = 'Réelle';
        poolCount.textContent = state.filtered.length;
        renderPools();
        renderAurel();
        publish();
    } catch (error) {
        sourceStatus.textContent = 'Indisponible';
        bestApy.textContent = '--';
        poolCount.textContent = '0';
        state.filtered = [];
        poolList.innerHTML = '<div class="empty">Source rendement indisponible. Kynexy refuse d’afficher des rendements fictifs.</div>';
        renderAurel('La source réelle est indisponible. Aucune estimation ne doit être prise au sérieux sans données fraîches.');
    }
}

function filterPools(){
    const stableSymbols = ['USDC','USDT','DAI','USDS','FRAX','PYUSD','USDE'];
    const minTvl = state.risk === 'conservative' ? 50000000 : state.risk === 'balanced' ? 10000000 : 1000000;
    const maxApy = state.risk === 'conservative' ? 12 : state.risk === 'balanced' ? 35 : 120;
    state.filtered = state.pools
        .filter(pool => Number(pool.tvlUsd) >= minTvl)
        .filter(pool => Number(pool.apy) > 0 && Number(pool.apy) <= maxApy)
        .filter(pool => stableSymbols.some(symbol => String(pool.symbol || '').toUpperCase().includes(symbol)))
        .sort((a,b) => Number(b.apy) - Number(a.apy))
        .slice(0, 8);
    bestApy.textContent = state.filtered[0] ? formatPercent(state.filtered[0].apy) : '--';
    poolCount.textContent = state.filtered.length;
}

function renderPools(){
    if (!state.filtered.length) {
        poolList.innerHTML = '<div class="empty">Aucun rendement ne passe les filtres de sécurité actuels.</div>';
        return;
    }
    poolList.innerHTML = state.filtered.map(renderPool).join('');
}

function renderPool(pool){
    const risk = classifyRisk(pool);
    const yearly = state.amount * Number(pool.apy || 0) / 100;
    const monthly = yearly / 12;
    return `<article class="pool-card">
        <div class="pool-top"><div><h3>${esc(pool.project || 'Protocole')}</h3><p>${esc(pool.symbol || 'Actif')} · ${esc(pool.chain || 'Chain')}</p></div><div class="apy">${formatPercent(pool.apy)}</div></div>
        <span class="risk ${risk.className}">${esc(risk.label)}</span>
        <p>TVL ${formatUsd(pool.tvlUsd)} · APY réel publié par la source. Rendement variable, non garanti.</p>
        <div class="estimate"><span>Estimation / mois<strong>${formatUsd(monthly)}</strong></span><span>Estimation / an<strong>${formatUsd(yearly)}</strong></span></div>
    </article>`;
}

function classifyRisk(pool){
    const apy = Number(pool.apy || 0);
    const tvl = Number(pool.tvlUsd || 0);
    if (apy <= 8 && tvl >= 50000000) return { label:'Risque filtré bas', className:'low' };
    if (apy <= 25 && tvl >= 10000000) return { label:'Risque modéré', className:'medium' };
    return { label:'Risque élevé', className:'high' };
}

function renderAurel(forced){
    if (forced) {
        aurelTitle.textContent = 'Je bloque la décision.';
        aurelBrief.textContent = forced;
        return;
    }
    if (!state.filtered.length) {
        aurelTitle.textContent = 'Je n’ai pas assez de données fiables.';
        aurelBrief.textContent = 'Connecte une source réelle ou baisse l’ambition. Kynexy ne doit jamais inventer un rendement.';
        return;
    }
    const best = state.filtered[0];
    const walletText = state.wallet ? ' Wallet externe connecté en lecture seule.' : ' Aucun wallet connecté : analyse marché uniquement.';
    aurelTitle.textContent = 'Je vois ' + state.filtered.length + ' opportunité(s) filtrée(s).';
    aurelBrief.textContent = 'Meilleur APY filtré : ' + formatPercent(best.apy) + ' sur ' + (best.project || 'un protocole') + '. ' + walletText + ' Je recommande de traiter ceci comme une piste à vérifier, pas comme une promesse.';
}

function publish(){
    window.KynexyCryptoState = { wallet: state.wallet, risk: state.risk, amount: state.amount, source: state.source, pools: state.filtered };
    window.AurelState = window.AurelState || {};
    window.AurelState.crypto = { status: state.filtered.length ? 'ready' : 'unavailable', summary: state.filtered.length + ' rendements réels filtrés', walletConnected: Boolean(state.wallet) };
}

function formatPercent(value){ return (Number(value) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + '%'; }
function formatUsd(value){ return '$' + (Number(value) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }); }
function shortAddress(address){ return address ? address.slice(0,6) + '...' + address.slice(-4) : ''; }
function esc(value){ return String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char])); }