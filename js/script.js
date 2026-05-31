/**
 * GLOBAL CAPITAL INSIGHTS - Lógica del Portal Unificada
 * Fecha: Mayo 2026
 */

// ==========================================
// 1. DASHBOARD DE TICKERS AUTOMÁTICO (Top)
// ==========================================
async function updateDashboard() {
    // A. Obtener Bitcoin (vía CoinGecko API - Libre de CORS y sin límites estrictos)
    try {
        const btcResponse = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true");
        if (btcResponse.ok) {
            const btcData = await btcResponse.json();
            const price = btcData.bitcoin.usd;
            const change = btcData.bitcoin.usd_24h_change;
            
            const formattedBTC = "$" + Number(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            renderCard("ticker-btc", formattedBTC, change);
        }
    } catch (error) {
        console.error("Error fetching BTC data:", error);
    }
    
    // B. Obtener TradFi (DXY, S&P 500, Oro) vía Twelve Data con Sistema Anti-Saturación (Caché)
    const apiKey = "2418b15dc273451786ce2bd8d222ab50"; 
    const symbols = "GSPC,XAU/USD,EUR/USD"; 
    const url = `https://api.twelvedata.com/quote?symbol=${symbols}&apikey=${apiKey}`;

    // Revisamos si tenemos datos guardados en este minuto para no saturar los "8 créditos por minuto"
    const cachedData = sessionStorage.getItem("tradfi_data");
    const cachedTime = sessionStorage.getItem("tradfi_time");
    const now = Date.now();

    // Si hay datos guardados y tienen menos de 5 minutos (300,000 ms), los usamos y evitamos pedir a la API
    if (cachedData && cachedTime && (now - cachedTime < 300000)) {
        console.log("Cargando mercados desde la caché local para ahorrar créditos...");
        procesarDatosTradFi(JSON.parse(cachedData));
        return; 
    }

    // Si no hay caché o ya expiró, vamos a la API de Twelve Data de forma segura
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            
            // Si la API nos devuelve el error de velocidad ("status": "error"), no guardamos nada
            if (data.status === "error") {
                console.warn("Límite de peticiones por minuto alcanzado en Twelve Data.");
                setDashboardError();
                return;
            }

            // Guardamos en la memoria del navegador para los próximos refrescos
            sessionStorage.setItem("tradfi_data", JSON.stringify(data));
            sessionStorage.setItem("tradfi_time", now);

            // Procesamos la información para pintarla en las tarjetas
            procesarDatosTradFi(data);

        } else {
            console.error("Twelve Data API Error:", response.status);
            setDashboardError();
        }
    } catch (error) {
        console.error("Error en procesamiento TradFi:", error);
        setDashboardError();
    }
}

// Función auxiliar encargada exclusivamente de extraer y pintar los valores en el HTML
function procesarDatosTradFi(data) {
    // 1. S&P 500 (Procesar GSPC / ^GSPC)
    const spxData = data["GSPC"] || data["^GSPC"];
    if (spxData && (spxData.close || spxData.price)) {
        const rawPrice = spxData.close || spxData.price;
        const spxPrice = Number(rawPrice);
        const spxChange = Number(spxData.percent_change || 0);
        renderCard("ticker-sp500", spxPrice.toLocaleString('en-US', { maximumFractionDigits: 2 }), spxChange);
    } else {
        const elSPX = document.getElementById("ticker-sp500");
        if (elSPX) elSPX.innerText = "Mkt Closed";
    }

    // 2. Oro Spot (Procesar XAU/USD)
    if (data["XAU/USD"] && data["XAU/USD"].close) {
        let goldPrice = Number(data["XAU/USD"].close);
        
        // Si el precio viene duplicado por el formato del contrato (> 3500), lo normalizamos
        if (goldPrice > 3500) {
            goldPrice = goldPrice / 2;
        }
        
        const goldChange = Number(data["XAU/USD"].percent_change || 0);
        renderCard("ticker-gold", `$${goldPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, goldChange);
    }
    
    // 3. Dollar Index Mapeado (Calculado en vivo vía EUR/USD)
    if (data["EUR/USD"] && data["EUR/USD"].close) {
        const eurUsdPrice = Number(data["EUR/USD"].close);
        const eurUsdChange = Number(data["EUR/USD"].percent_change || 0);
        
        // Sumamos la constante base (55.5) al reflejo del Euro para que escale a los ~101-105 puntos reales del mercado
        const calculatedDXY = 55.5 + (50.1434272 * Math.pow(1 / eurUsdPrice, 0.576));
        const dxyChange = eurUsdChange * -1; 

        renderCard("ticker-dxy", calculatedDXY.toFixed(2), dxyChange);
    }
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

function setDashboardError() {
    ["ticker-dxy", "ticker-sp500", "ticker-gold"].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.innerText === "Loading...") {
            el.innerText = "Error API";
        }
    });
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