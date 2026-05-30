/* ── Price Alerts Functionality ─────────────────────────── */
let priceAlerts = JSON.parse(localStorage.getItem('priceAlerts')) || [];
let allDeals = [];

// Load all deals from Firebase
async function loadDeals() {
  try {
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const { db } = await import('./firebase-config.js');
    
    const querySnapshot = await getDocs(collection(db, 'deals'));
    allDeals = [];
    querySnapshot.forEach((doc) => {
      allDeals.push({ id: doc.id, ...doc.data() });
    });
    
    renderAlerts();
  } catch (error) {
    console.error('Error loading deals:', error);
    renderAlerts();
  }
}

function formatPrice(price) {
  return price ? `R$ ${Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
}

function renderAlerts() {
  const alertsList = document.getElementById('alertsList');
  const alertsEmpty = document.getElementById('alertsEmpty');
  
  if (priceAlerts.length === 0) {
    alertsList.innerHTML = '';
    alertsEmpty.style.display = 'flex';
    return;
  }
  
  alertsEmpty.style.display = 'none';
  alertsList.style.display = 'block';
  
  const alertDeals = allDeals.filter(deal => priceAlerts.some(alert => alert.dealId === deal.id));
  
  alertsList.innerHTML = alertDeals.map(deal => {
    const alert = priceAlerts.find(a => a.dealId === deal.id);
    const currentPrice = deal.priceNew || 0;
    const targetPrice = alert.targetPrice || 0;
    const isBelowTarget = currentPrice <= targetPrice;
    
    const imageUrl = deal.imageUrl;
    const imgHTML = imageUrl
      ? `<img src="${imageUrl}" alt="${deal.title}" loading="lazy" />`
      : `<span class="placeholder-icon">🔧</span>`;
    
    return `
      <div class="alert-item" data-id="${deal.id}">
        <div class="alert-item-img">
          ${imgHTML}
        </div>
        <div class="alert-item-content">
          <span class="alert-item-store">${deal.store || 'Loja'}</span>
          <h3 class="alert-item-title">${deal.title}</h3>
          <div class="alert-item-prices">
            <span class="price-current">Preço atual: ${formatPrice(currentPrice)}</span>
            <span class="price-target">Alerta: ${formatPrice(targetPrice)}</span>
          </div>
          <div class="alert-item-status ${isBelowTarget ? 'status-success' : 'status-waiting'}">
            ${isBelowTarget ? '✅ Preço abaixo do alerta!' : '⏳ Aguardando preço baixar'}
          </div>
        </div>
        <div class="alert-item-actions">
          <button class="btn-remove-alert" data-id="${deal.id}" title="Remover alerta">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
          <a href="${deal.url || '#'}" target="_blank" rel="noopener noreferrer" class="btn-view">
            Ver Oferta
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
      </div>
    `;
  }).join('');
  
  // Add event listeners for remove buttons
  document.querySelectorAll('.btn-remove-alert').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const dealId = e.currentTarget.dataset.id;
      removeAlert(dealId);
    });
  });
}

function removeAlert(dealId) {
  priceAlerts = priceAlerts.filter(alert => alert.dealId !== dealId);
  localStorage.setItem('priceAlerts', JSON.stringify(priceAlerts));
  renderAlerts();
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const cartCount = document.getElementById('cartCount');
  if (cartCount) {
    cartCount.textContent = cart.length;
  }
}

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  });
}

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
}

// Mobile menu
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
  });
}

// Initialize
loadDeals();
updateCartCount();
