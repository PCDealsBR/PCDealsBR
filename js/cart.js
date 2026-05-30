/* ── Cart Functionality ───────────────────────────────────── */
let cart = JSON.parse(localStorage.getItem('cart')) || [];
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
    
    renderCart();
  } catch (error) {
    console.error('Error loading deals:', error);
    renderCart();
  }
}

function formatPrice(price) {
  return price ? `R$ ${Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
}

function renderCart() {
  const cartItems = document.getElementById('cartItems');
  const cartEmpty = document.getElementById('cartEmpty');
  const cartSummary = document.getElementById('cartSummary');
  const totalItems = document.getElementById('totalItems');
  const totalSavings = document.getElementById('totalSavings');
  
  if (cart.length === 0) {
    cartItems.innerHTML = '';
    cartEmpty.style.display = 'flex';
    cartSummary.style.display = 'none';
    return;
  }
  
  cartEmpty.style.display = 'none';
  cartSummary.style.display = 'block';
  
  const cartDeals = allDeals.filter(deal => cart.includes(deal.id));
  
  let totalDiscount = 0;
  
  cartItems.innerHTML = cartDeals.map(deal => {
    const discount = deal.priceOld && deal.priceNew ? deal.priceOld - deal.priceNew : 0;
    totalDiscount += discount;
    
    const imageUrl = deal.imageUrl;
    const imgHTML = imageUrl
      ? `<img src="${imageUrl}" alt="${deal.title}" loading="lazy" />`
      : `<span class="placeholder-icon">🔧</span>`;
    
    return `
      <div class="cart-item" data-id="${deal.id}">
        <div class="cart-item-img">
          ${imgHTML}
        </div>
        <div class="cart-item-content">
          <span class="cart-item-store">${deal.store || 'Loja'}</span>
          <h3 class="cart-item-title">${deal.title}</h3>
          <div class="cart-item-prices">
            ${deal.priceOld ? `<span class="price-old">${formatPrice(deal.priceOld)}</span>` : ''}
            <span class="price-new">${formatPrice(deal.priceNew)}</span>
          </div>
          ${discount > 0 ? `<span class="cart-item-savings">Economia: ${formatPrice(discount)}</span>` : ''}
        </div>
        <div class="cart-item-actions">
          <button class="btn-remove" data-id="${deal.id}" title="Remover">
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
  
  totalItems.textContent = cart.length;
  totalSavings.textContent = formatPrice(totalDiscount);
  
  // Add event listeners
  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const dealId = e.currentTarget.dataset.id;
      removeFromCart(dealId);
    });
  });
}

function removeFromCart(dealId) {
  const index = cart.indexOf(dealId);
  if (index > -1) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    renderCart();
  }
}

function clearCart() {
  if (confirm('Tem certeza que deseja limpar o carrinho?')) {
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    renderCart();
  }
}

function updateCartCount() {
  const cartCount = document.getElementById('cartCount');
  if (cartCount) {
    cartCount.textContent = cart.length;
  }
}

// Event listeners
document.getElementById('clearCart')?.addEventListener('click', clearCart);
document.getElementById('checkoutAll')?.addEventListener('click', () => {
  window.location.href = 'index.html#offers';
});

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
