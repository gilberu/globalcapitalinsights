document.addEventListener("DOMContentLoaded", () => {
    updateDashboard();
    // Opcional: Actualizar automáticamente cada 5 minutos (300000 ms)
    setInterval(updateDashboard, 300000);
});

async function updateDashboard() {
    // 1. OBTENER BITCOIN (vía CoinGecko API)
    try {
        const btcResponse = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true");
        if (btcResponse.ok) {
            const btcData = await btcResponse.json();
            const price = btcData.bitcoin.usd;
            const change = btcData.bitcoin.usd_24h_change;
            
            renderCard("ticker-btc", `$${price.toLocaleString()}`, change);
        }
    } catch (error) {
        console.error("Error fetching BTC data:", error);
    }

    // 2. OBTENER MERCADOS TRADICIONALES (DXY, S&P 500, ORO)
    // Usamos el query abierto de Yahoo Finance para obtener múltiples tickers de un tiro
    const symbols = "DX-Y.NYB,^GSPC,GC=F"; // DXY, S&P 500, Gold Futures
    const yahooUrl = `https://query1.financecharts.yahoo.com/v7/finance/quote?symbols=${symbols}`;

    try {
        const marketResponse = await fetch(yahooUrl);
        if (marketResponse.ok) {
            const marketData = await marketResponse.json();
            const quotes = marketData.quoteResponse.result;

            // Mapeamos los resultados por su símbolo para identificarlos fácil
            quotes.forEach(quote => {
                const price = quote.regularMarketPrice;
                const change = quote.regularMarketChangePercent;

                if (quote.symbol === "DX-Y.NYB") {
                    renderCard("ticker-dxy", price.toFixed(2), change);
                } else if (quote.symbol === "^GSPC") {
                    renderCard("ticker-sp500", Number(price.toFixed(2)).toLocaleString(), change);
                } else if (quote.symbol === "GC=F") {
                    renderCard("ticker-gold", `$${Number(price.toFixed(2)).toLocaleString()}`, change);
                }
            });
        }
    } catch (error) {
        console.error("Error fetching market data:", error);
    }
}

// Función auxiliar para pintar los datos en el HTML con su flecha y color correspondiente
function renderCard(elementId, formattedPrice, changeValue) {
    const container = document.getElementById(elementId);
    if (!container) return;

    const isPositive = changeValue >= 0;
    const arrow = isPositive ? "▲" : "▼";
    const colorVar = isPositive ? "var(--accent-green)" : "var(--accent-red)";

    container.innerHTML = `${formattedPrice} <span style="color:${colorVar};">${arrow}</span>`;
}