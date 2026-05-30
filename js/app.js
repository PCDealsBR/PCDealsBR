import { db, auth, storage } from "./firebase-config.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

let allDeals       = [];
let activeStore    = "all";
let activeCategory = "all";
let searchTerm     = "";
let sortMode       = "newest";

const CATEGORY_LABELS = {
  gpu:"GPU", cpu:"CPU", ram:"RAM", storage:"Armazenamento",
  monitor:"Monitor", keyboard:"Teclado", mouse:"Mouse",
  headset:"Headset", psu:"Fonte", case:"Gabinete",
  cooling:"Cooler", notebook:"Notebook", other:"Outros"
};
const CATEGORY_ICONS = {
  gpu:"🎮", cpu:"⚙️", ram:"🧠", storage:"💾", monitor:"🖥️",
  keyboard:"⌨️", mouse:"🖱️", headset:"🎧", psu:"🔌",
  case:"📦", cooling:"❄️", notebook:"💻", other:"🔧"
};

const grid         = document.getElementById("dealsGrid");
const emptyState   = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const countBadge   = document.getElementById("dealsCount");
const searchInput  = document.getElementById("searchInput");
const sortSelect   = document.getElementById("sortSelect");
const storeFilter  = document.getElementById("filterStores");

function isExpired(d) {
  if (!d.expiresAt) return false;
  return new Date(d.expiresAt) < new Date();
}

function subscribeDeals() {
  const q = query(collection(db, "deals"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    allDeals = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(d => !isExpired(d));
    buildStoreFilter();
    render();
    loadingState.style.display = "none";
  }, (err) => {
    console.warn("Firebase:", err.message);
    loadingState.innerHTML = "<p style='color:var(--accent)'>Erro ao carregar promoções.</p>";
  });
}

function buildStoreFilter() {
  const stores = [...new Set(allDeals.map(d => d.store).filter(Boolean))].sort();
  storeFilter.innerHTML = `<button class="filter-pill ${activeStore==="all"?"active":""}" data-store="all">Todas</button>`;
  stores.forEach(store => {
    const btn = document.createElement("button");
    btn.className = `filter-pill${activeStore===store?" active":""}`;
    btn.dataset.store = store;
    btn.textContent = store;
    storeFilter.appendChild(btn);
  });
  storeFilter.querySelectorAll(".filter-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      activeStore = btn.dataset.store;
      storeFilter.querySelectorAll(".filter-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      render();
    });
  });
}

function getFiltered() {
  let list = [...allDeals];
  if (activeStore    !== "all") list = list.filter(d => d.store    === activeStore);
  if (activeCategory !== "all") list = list.filter(d => d.category === activeCategory);
  if (searchTerm) {
    const t = searchTerm.toLowerCase();
    list = list.filter(d =>
      (d.title||"").toLowerCase().includes(t) ||
      (d.store||"").toLowerCase().includes(t)
    );
  }
  switch (sortMode) {
    case "discount":
      list.sort((a,b) => {
        const dA = a.priceOld ? (a.priceOld-a.priceNew)/a.priceOld : 0;
        const dB = b.priceOld ? (b.priceOld-b.priceNew)/b.priceOld : 0;
        return dB - dA;
      }); break;
    case "price_asc":  list.sort((a,b) => (a.priceNew||0)-(b.priceNew||0)); break;
    case "price_desc": list.sort((a,b) => (b.priceNew||0)-(a.priceNew||0)); break;
    default: list.sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  }
  return list;
}

function render() {
  const list = getFiltered();
  countBadge.textContent = `${list.length} resultado${list.length!==1?"s":""}`;
  if (!list.length) { grid.innerHTML=""; emptyState.style.display="flex"; return; }
  emptyState.style.display = "none";
  grid.innerHTML = list.map(buildCard).join("");
}

function buildCard(d) {
  const pctOff   = d.priceOld && d.priceNew ? Math.round((1-d.priceNew/d.priceOld)*100) : 0;
  const fmtP     = v => v ? `R$\u00A0${Number(v).toLocaleString("pt-BR",{minimumFractionDigits:2})}` : "";
  const catLabel = CATEGORY_LABELS[d.category] || "Outros";
  const catIcon  = CATEGORY_ICONS[d.category]  || "🔧";
  const isNew    = d.createdAt && (Date.now()/1000 - d.createdAt.seconds) < 86400;
  const dateStr  = d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}) : "";

  let expBadge = "";
  if (d.expiresAt) {
    const diff  = new Date(d.expiresAt) - new Date();
    const hours = Math.floor(diff / 3600000);
    if (hours >= 0 && hours < 24) {
      expBadge = `<span class="badge-expiring">⏰ Expira em ${hours}h</span>`;
    }
  }

  // Use imageUrl directly from Firestore - Firebase Storage URLs should already be full URLs
  const imageUrl = d.imageUrl;

  const imgHTML = imageUrl
    ? `<img src="${imageUrl}" alt="${d.title}" loading="lazy" 
         onerror="this.style.display='none';this.nextElementSibling.style.display='flex';console.log('Image failed to load: ${imageUrl}')"
         onload="this.style.display='block';this.nextElementSibling.style.display='none'"/>
       <span class="placeholder-icon" style="display:none">${catIcon}</span>`
    : `<span class="placeholder-icon">${catIcon}</span>`;

  return `
  <article class="deal-card">
    <div class="card-img">
      ${imgHTML}
      ${pctOff > 0 ? `<span class="badge-discount">-${pctOff}%</span>` : ""}
      ${isNew     ? `<span class="badge-new">Novo</span>` : ""}
      ${expBadge}
    </div>
    <div class="card-body">
      <span class="card-store">${d.store||"Loja"}</span>
      <h3 class="card-title">${d.title}</h3>
      <span class="card-category">${catLabel}</span>
      <div class="card-prices">
        ${d.priceOld ? `<span class="price-old">${fmtP(d.priceOld)}</span>` : ""}
        <span class="price-new">${fmtP(d.priceNew)}</span>
      </div>
      ${d.installment ? `<span class="price-installment">${d.installment}</span>` : ""}
    </div>
    <div class="card-footer">
      <span class="card-date">${dateStr}</span>
      <div class="card-actions">
        <button class="btn-save" data-id="${d.id}" title="Salvar promo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        <button class="btn-add-cart" data-id="${d.id}" title="Adicionar ao carrinho">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
        </button>
        <a href="${d.url||"#"}" target="_blank" rel="noopener noreferrer" class="btn-deal">Ver oferta →</a>
      </div>
    </div>
  </article>`;
}

// Search input event
if (searchInput) {
  searchInput.addEventListener("input", e => { searchTerm = e.target.value; render(); });
}

// Sort select event
if (sortSelect) {
  sortSelect.addEventListener("change", e => { sortMode = e.target.value; render(); });
}

// Category filter pills
const categoryFilter = document.getElementById("filterCategories");
if (categoryFilter) {
  categoryFilter.querySelectorAll(".filter-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.category;
      categoryFilter.querySelectorAll(".filter-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      render();
    });
  });
}

// Reset filters function
window.resetFilters = function() {
  activeStore = activeCategory = "all"; searchTerm = ""; sortMode = "newest";
  if (searchInput) searchInput.value = "";
  if (sortSelect) sortSelect.value = "newest";
  document.querySelectorAll(".filter-pill").forEach(b => {
    b.classList.toggle("active", b.dataset.store==="all" || b.dataset.category==="all");
  });
  render();
};

// Check expiration every 10 minutes
setInterval(() => {
  allDeals = allDeals.filter(d => !isExpired(d));
  render();
}, 10 * 60 * 1000);

// Subscribe to deals
subscribeDeals();

/* ── Theme Toggle ─────────────────────────────────────── */
const themeToggle = document.getElementById('themeToggle');
const themeToggleMobile = document.getElementById('themeToggleMobile');

function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Initialize theme from localStorage or system preference
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
}

initTheme();

if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
if (themeToggleMobile) themeToggleMobile.addEventListener('click', toggleTheme);

/* ── Firebase Authentication ───────────────────────────── */
const provider = new GoogleAuthProvider();
const btnLogin = document.getElementById('btnLogin');
const btnLoginMobile = document.getElementById('btnLoginMobile');

onAuthStateChanged(auth, (user) => {
  const btnAccount = document.getElementById('btnAccount');
  if (user) {
    if (btnLogin) {
      const loginText = btnLogin.querySelector('.login-text');
      if (loginText) loginText.textContent = 'Sair';
    }
    if (btnLoginMobile) btnLoginMobile.textContent = 'Sair';
    if (btnAccount) btnAccount.style.display = 'flex';
  } else {
    if (btnLogin) {
      const loginText = btnLogin.querySelector('.login-text');
      if (loginText) loginText.textContent = 'Entrar';
    }
    if (btnLoginMobile) btnLoginMobile.textContent = 'Entrar';
    if (btnAccount) btnAccount.style.display = 'none';
  }
});

async function handleLogin() {
  try {
    if (auth.currentUser) {
      await signOut(auth);
      console.log('User signed out');
    } else {
      const result = await signInWithPopup(auth, provider);
      console.log('User signed in:', result.user);
    }
  } catch (error) {
    console.error('Authentication error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    alert(`Erro ao fazer login: ${error.message}\n\nVerifique se o Google Sign-In está habilitado no console do Firebase.`);
  }
}

if (btnLogin) btnLogin.addEventListener('click', handleLogin);
if (btnLoginMobile) btnLoginMobile.addEventListener('click', handleLogin);

// Account button
const btnAccount = document.getElementById('btnAccount');
if (btnAccount) {
  btnAccount.addEventListener('click', () => {
    window.location.href = 'account.html';
  });
}

/* ── Cart Functionality ─────────────────────────────────── */
let cart = JSON.parse(localStorage.getItem('cart')) || [];

function updateCartCount() {
  const cartCount = document.getElementById('cartCount');
  if (cartCount) {
    cartCount.textContent = cart.length;
  }
}

function addToCart(dealId) {
  if (!cart.includes(dealId)) {
    cart.push(dealId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    alert('Promoção adicionada ao carrinho!');
  } else {
    alert('Esta promoção já está no carrinho.');
  }
}

// Cart button click
const btnCart = document.getElementById('btnCart');
if (btnCart) {
  btnCart.addEventListener('click', () => {
    window.location.href = 'cart.html';
  });
}

// Saved button click
const btnSaved = document.getElementById('btnSaved');
if (btnSaved) {
  btnSaved.addEventListener('click', () => {
    window.location.href = 'saved.html';
  });
}

/* ── Save Promo Functionality ─────────────────────────────── */
let savedPromos = JSON.parse(localStorage.getItem('savedPromos')) || [];

function updateSavedButtons() {
  document.querySelectorAll('.btn-save').forEach(btn => {
    const dealId = btn.dataset.id;
    if (savedPromos.includes(dealId)) {
      btn.classList.add('saved');
    } else {
      btn.classList.remove('saved');
    }
  });
}

function toggleSavePromo(dealId) {
  const index = savedPromos.indexOf(dealId);
  if (index > -1) {
    savedPromos.splice(index, 1);
    alert('Promoção removida dos salvos.');
  } else {
    savedPromos.push(dealId);
    alert('Promoção salva!');
  }
  localStorage.setItem('savedPromos', JSON.stringify(savedPromos));
  updateSavedButtons();
}

// Event delegation for save and cart buttons
document.addEventListener('click', (e) => {
  const saveBtn = e.target.closest('.btn-save');
  const cartBtn = e.target.closest('.btn-add-cart');

  if (saveBtn) {
    const dealId = saveBtn.dataset.id;
    toggleSavePromo(dealId);
  }

  if (cartBtn) {
    const dealId = cartBtn.dataset.id;
    addToCart(dealId);
  }
});

// Initialize cart count and saved buttons on load
updateCartCount();
setTimeout(updateSavedButtons, 1000); // Wait for cards to render
