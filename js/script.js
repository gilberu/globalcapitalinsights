/**
 * GLOBAL CAPITAL INSIGHTS - Lógica del Portal
 * Fecha: Marzo 2026
 */

// --- CALCULADORA DE ARBITRAJE ---
function calculateProfit_tb() {
    const capital = parseFloat(document.getElementById('capital_tb').value) || 0;
    const buy = parseFloat(document.getElementById('buy_tb').value) || 1;
    const sell = parseFloat(document.getElementById('sell_tb').value) || 1;
    
    const gross = (capital / buy) * sell;
    const profit = gross - capital;
    
    document.getElementById('result_tb').innerHTML = `ROI: <strong>$${profit.toFixed(2)}</strong>`;
}

// --- CONVERSOR DE MONEDAS ---
function convertCurrency() {
    const amount = parseFloat(document.getElementById('base_amount').value) || 0;
    const target = document.getElementById('target_currency').value;
    
    // Tasas fijas (Simulación Marzo 2026)
    const rates = {
    'EUR': 0.8633,      // 1 USD = 0.8633 EUR
    'CNY': 7.21,        // 1 USD = 7.21 CNY
    'XAU': 0.00021816,  // 1 / 4,583.86 (Onzas por cada 1 USD)
    'BTC': 0.00001423   // 1 / 70,283 (Satoshi ratio por cada 1 USD)
};
    
    const rate = rates[target] || 0;
    const finalAmount = amount * rate;
    const decimals = (target === 'BTC' || target === 'XAU') ? 8 : 2;
    
    document.getElementById('rate_val').innerHTML = `${finalAmount.toFixed(decimals)} ${target}`;
}






// --- LÓGICA DEL CARRUSEL (SLIDER) ---
let slideIndex = 0;
let timer;
const slides = document.querySelectorAll('.slide');
const dotsContainer = document.getElementById('dots');

// Inicializar puntos de navegación
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
    
    timer = setTimeout(showSlides, 7000); // Cambio cada 7 segundos
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

// Control de pausa al pasar el ratón
const slider = document.getElementById('main-slider');
if (slider) {
    slider.onmouseenter = () => clearTimeout(timer);
    slider.onmouseleave = () => timer = setTimeout(showSlides, 7000);
}

// Iniciar carrusel
showSlides();
