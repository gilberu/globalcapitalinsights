/**
 * GLOBAL CAPITAL INSIGHTS - Lógica del Portal Unificada
 * Fecha: Mayo 2026
 */

// ==========================================
// 1. DASHBOARD DE TICKERS AUTOMÁTICO (Top)
// ==========================================
async function updateDashboard() {
    // A. Obtener Bitcoin (vía CoinGecko API)
    try {
        const btcResponse = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true");
        if (btcResponse.ok) {
            const btcData = await btcResponse.json();
            const price = btcData.bitcoin.usd;
            const change = btcData.bitcoin.usd_24h_change;
            
            // Forzamos el formato de moneda en inglés (EE.UU.) para asegurar las comas en los miles
            const formattedBTC = "$" + Number(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            renderCard("ticker-btc", formattedBTC, change);
        }
    } catch (error) {
        console.error("Error fetching BTC data:", error);
    }

    // B. Obtener Mercados Tradicionales (DXY, S&P 500, Oro)
    const symbols = "DX-Y.NYB,^GSPC,GC=F"; 
    // Añadimos un proxy abierto antes de la URL de Yahoo para saltarnos el bloqueo CORS de local
    const proxyUrl = "https://corsproxy.io/?";
    const yahooUrl = `https://query1.financecharts.yahoo.com/v7/finance/quote?symbols=${symbols}`;

    try {
        const marketResponse = await fetch(proxyUrl + encodeURIComponent(yahooUrl));
        if (marketResponse.ok) {
            const marketData = await marketResponse.json();
            const quotes = marketData.quoteResponse.result;

            quotes.forEach(quote => {
                const price = quote.regularMarketPrice;
                const change = quote.regularMarketChangePercent;

                if (quote.symbol === "DX-Y.NYB") {
                    renderCard("ticker-dxy", price.toFixed(2), change);
                } else if (quote.symbol === "^GSPC") {
                    renderCard("ticker-sp500", Number(price.toFixed(2)).toLocaleString('en-US'), change);
                } else if (quote.symbol === "GC=F") {
                    renderCard("ticker-gold", `$${Number(price.toFixed(2)).toLocaleString('en-US')}`, change);
                }
            });
        } else {
            // Si el proxy falla, mostramos un mensaje amigable en lugar de "Loading..." eterno
            setDashboardError();
        }
    } catch (error) {
        console.error("Error fetching market data via proxy:", error);
        setDashboardError();
    }
}

// Función extra por si ocurre un fallo general de red en los mercados tradicionales
function setDashboardError() {
    ["ticker-dxy", "ticker-sp500", "ticker-gold"].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.innerText === "Loading...") {
            el.innerText = "Offline";
        }
    });
}

// Función auxiliar para pintar las tarjetas superiores
function renderCard(elementId, formattedPrice, changeValue) {
    const container = document.getElementById(elementId);
    if (!container) return;

    const isPositive = changeValue >= 0;
    const arrow = isPositive ? "▲" : "▼";
    const colorVar = isPositive ? "var(--accent-green)" : "var(--accent-red)";

    container.innerHTML = `${formattedPrice} <span style="color:${colorVar};">${arrow}</span>`;
}

// ==========================================
// 2. CALCULADORA DE ARBITRAJE
// ==========================================
function calculateProfit_tb() {
    const capital = parseFloat(document.getElementById('capital_tb').value) || 0;
    const buy = parseFloat(document.getElementById('buy_tb').value) || 1;
    const sell = parseFloat(document.getElementById('sell_tb').value) || 1;
    
    const gross = (capital / buy) * sell;
    const profit = gross - capital;
    
    document.getElementById('result_tb').innerHTML = `ROI: <strong>$${profit.toFixed(2)}</strong>`;
}

// ==========================================
// 3. CONVERSOR DE MONEDAS (AUTOMATIZADO)
// ==========================================
async function convertCurrency() {
    const amountInput = document.getElementById("base_amount");
    const targetSelect = document.getElementById("target_currency");
    const resultContainer = document.getElementById("rate_val");

    if (!amountInput || !targetSelect || !resultContainer) return;

    const amount = parseFloat(amountInput.value);
    const target = targetSelect.value;

    if (isNaN(amount) || amount <= 0) {
        resultContainer.innerText = "Invalid amount";
        return;
    }

    resultContainer.innerText = "Converting...";

    try {
        let exchangeRate = 0;

        if (target === "EUR" || target === "CNY") {
            const res = await fetch("https://open.er-api.com/v6/latest/USD");
            if (!res.ok) throw new Error("Fiat API Error");
            const data = await res.json();
            exchangeRate = data.rates[target];
            
        } else if (target === "XAU") {
            const res = await fetch("https://query1.financecharts.yahoo.com/v7/finance/quote?symbols=GC=F");
            if (!res.ok) throw new Error("Gold API Error");
            const data = await res.json();
            const goldPriceInUSD = data.quoteResponse.result[0].regularMarketPrice;
            exchangeRate = 1 / goldPriceInUSD;

        } else if (target === "BTC") {
            const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
            if (!res.ok) throw new Error("Crypto API Error");
            const data = await res.json();
            const btcPriceInUSD = data.bitcoin.usd;
            exchangeRate = 1 / btcPriceInUSD;
        }

        const finalCalculated = amount * exchangeRate;
        const decimals = (target === "BTC") ? 6 : (target === "XAU") ? 4 : 2;
        
        resultContainer.innerHTML = `${finalCalculated.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${target}`;

    } catch (error) {
        console.error("Error doing conversion:", error);
        resultContainer.innerText = "Error fetching rate";
    }
}

// ==========================================
// 4. LÓGICA DEL CARRUSEL (SLIDER) Y DISPARADORES
// ==========================================
let slideIndex = 0;
let timer;
const slides = document.querySelectorAll('.slide');
const dotsContainer = document.getElementById('dots');

// Inicializar puntos de navegación del carrusel
if (dotsContainer) {
    slides.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => currentSlide(i));
        dotsContainer.appendChild(dot);
    });
}

const dots = document.querySelectorAll('.dot');

function showSlides() {
    if (slides.length === 0) return;

    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    
    slideIndex++;
    if (slideIndex > slides.length) slideIndex = 1;
    
    slides[slideIndex - 1].classList.add('active');
    if (dots[slideIndex - 1]) dots[slideIndex - 1].classList.add('active');
    
    timer = setTimeout(showSlides, 7000);
}

function moveSlide(n) {
    clearTimeout(timer);
    slideIndex += n - 1;
    if (slideIndex < 0) slideIndex = slides.length - 1;
    showSlides();
}

function currentSlide(n) {
    clearTimeout(timer);
    slideIndex = n;
    showSlides();
}

// Control de pausa del carrusel
const slider = document.getElementById('main-slider');
if (slider) {
    slider.onmouseenter = () => clearTimeout(timer);
    slider.onmouseleave = () => timer = setTimeout(showSlides, 7000);
}

// --- DISPARADOR AL CARGAR LA PÁGINA ---
document.addEventListener("DOMContentLoaded", () => {
    // Iniciar el carrusel de noticias
    showSlides();
    
    // Iniciar y programar la actualización de tickers del top cada 5 minutos
    updateDashboard();
    setInterval(updateDashboard, 300000);
});