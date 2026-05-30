/* ── Saved Promos Functionality ───────────────────────────── */
let savedPromos = JSON.parse(localStorage.getItem('savedPromos')) || [];
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
    
    renderSaved();
  } catch (error) {
    console.error('Error loading deals:', error);
    renderSaved();
  }
}

function formatPrice(price) {
  return price ? `R$ ${Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
}

function renderSaved() {
  const savedGrid = document.getElementById('savedGrid');
  const savedEmpty = document.getElementById('savedEmpty');
  
  if (savedPromos.length === 0) {
    savedGrid.innerHTML = '';
    savedEmpty.style.display = 'flex';
    return;
  }
  
  savedEmpty.style.display = 'none';
  
  const savedDeals = allDeals.filter(deal => savedPromos.includes(deal.id));
  
  savedGrid.innerHTML = savedDeals.map(deal => {
    const pctOff = deal.priceOld && deal.priceNew ? Math.round((1 - deal.priceNew / deal.priceOld) * 100) : 0;
    const imageUrl = deal.imageUrl;
    const imgHTML = imageUrl
      ? `<img src="${imageUrl}" alt="${deal.title}" loading="lazy" />`
      : `<span class="placeholder-icon">🔧</span>`;
    
    return `
      <div class="deal-card" data-id="${deal.id}">
        <div class="card-img">
          ${imgHTML}
          ${pctOff > 0 ? `<span class="badge-discount">-${pctOff}%</span>` : ''}
          <button class="btn-unsave" data-id="${deal.id}" title="Remover dos salvos">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>
        <div class="card-body">
          <span class="card-store">${deal.store || 'Loja'}</span>
          <h3 class="card-title">${deal.title}</h3>
          <div class="card-prices">
            ${deal.priceOld ? `<span class="price-old">${formatPrice(deal.priceOld)}</span>` : ''}
            <span class="price-new">${formatPrice(deal.priceNew)}</span>
          </div>
        </div>
        <div class="card-footer">
          <a href="${deal.url || '#'}" target="_blank" rel="noopener noreferrer" class="btn-deal">Ver oferta →</a>
        </div>
      </div>
    `;
  }).join('');
  
  // Add event listeners for unsave buttons
  document.querySelectorAll('.btn-unsave').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const dealId = e.currentTarget.dataset.id;
      unsavePromo(dealId);
    });
  });
}

function unsavePromo(dealId) {
  const index = savedPromos.indexOf(dealId);
  if (index > -1) {
    savedPromos.splice(index, 1);
    localStorage.setItem('savedPromos', JSON.stringify(savedPromos));
    renderSaved();
  }
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
