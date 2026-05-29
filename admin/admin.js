import { db, auth } from "../js/firebase-config.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, orderBy, query, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const CATEGORY_LABELS = {
  gpu:"GPU", cpu:"CPU", ram:"RAM", storage:"Armazenamento",
  monitor:"Monitor", keyboard:"Teclado", mouse:"Mouse",
  headset:"Headset", psu:"Fonte", case:"Gabinete",
  cooling:"Cooler", notebook:"Notebook", other:"Outros"
};

// DOM
const loginScreen   = document.getElementById("loginScreen");
const adminPanel    = document.getElementById("adminPanel");
const loginError    = document.getElementById("loginError");
const formMsg       = document.getElementById("formMsg");
const formTitle     = document.getElementById("formTitle");
const tableBody     = document.getElementById("dealsTableBody");
const adminSearch   = document.getElementById("adminSearch");
const btnCancelEdit = document.getElementById("btnCancelEdit");
const showExpired   = document.getElementById("showExpired");

let allDeals  = [];
let editingId = null;

// ── AUTH ──────────────────────────────────────────────────
document.getElementById("btnLogin").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const pass  = document.getElementById("loginPassword").value;
  loginError.style.display = "none";
  try { await signInWithEmailAndPassword(auth, email, pass); }
  catch { loginError.textContent = "E-mail ou senha inválidos."; loginError.style.display = "block"; }
});
document.getElementById("btnLogout").addEventListener("click", () => signOut(auth));
onAuthStateChanged(auth, user => {
  if (user) { loginScreen.style.display="none"; adminPanel.style.display="block"; subscribeDeals(); }
  else      { loginScreen.style.display="flex";  adminPanel.style.display="none"; }
});

// ── FIRESTORE ─────────────────────────────────────────────
let unsub = null;
function subscribeDeals() {
  if (unsub) unsub();
  unsub = onSnapshot(query(collection(db,"deals"), orderBy("createdAt","desc")), snap => {
    allDeals = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    renderTable();
    populateStoreDatalist();
  });
}

function isExpired(d) {
  if (!d.expiresAt) return false;
  return new Date(d.expiresAt) < new Date();
}

function expiresLabel(d) {
  if (!d.expiresAt) return `<span class="exp-none">Sem expiração</span>`;
  const dt   = new Date(d.expiresAt);
  const diff = dt - new Date();
  if (diff < 0) return `<span class="exp-gone">Expirou</span>`;
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(hours / 24);
  if (hours < 1)  return `<span class="exp-soon">⏰ &lt;1h</span>`;
  if (hours < 24) return `<span class="exp-soon">⏰ ${hours}h</span>`;
  return `<span class="exp-ok">📅 ${days}d</span>`;
}

function statusLabel(d) {
  if (isExpired(d)) return `<span class="status-badge expired">Expirada</span>`;
  return `<span class="status-badge active">Ativa</span>`;
}

function renderTable() {
  const search = adminSearch.value.toLowerCase();
  const showExp = showExpired.checked;

  let list = allDeals.filter(d => {
    if (!showExp && isExpired(d)) return false;
    if (search) return (d.title||"").toLowerCase().includes(search) || (d.store||"").toLowerCase().includes(search);
    return true;
  });

  if (!list.length) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">Nenhuma promoção.</td></tr>`;
    return;
  }

  tableBody.innerHTML = list.map(d => {
    const disc = d.priceOld&&d.priceNew ? Math.round((1-d.priceNew/d.priceOld)*100) : 0;
    const fmtP = v => v ? `R$\u00A0${Number(v).toLocaleString("pt-BR",{minimumFractionDigits:2})}` : "—";
    const rowClass = isExpired(d) ? "row-expired" : "";
    return `<tr class="${rowClass}">
      <td class="td-title" title="${d.title}">${d.title}</td>
      <td class="td-store">${d.store||"—"}</td>
      <td class="td-price">${fmtP(d.priceNew)}</td>
      <td class="td-disc">${disc?`-${disc}%`:"—"}</td>
      <td>${expiresLabel(d)}</td>
      <td>${statusLabel(d)}</td>
      <td>
        <button class="btn-edit" onclick="editDeal('${d.id}')">✏️</button>
        <button class="btn-renew" onclick="renewDeal('${d.id}')" title="Renovar por mais 7 dias">🔄</button>
        <button class="btn-delete" onclick="deleteDeal('${d.id}','${(d.title||"").replace(/'/g,"\\'")}')">🗑️</button>
      </td>
    </tr>`;
  }).join("");
}

adminSearch.addEventListener("input", renderTable);
showExpired.addEventListener("change", renderTable);

// ── SAVE ─────────────────────────────────────────────────
document.getElementById("btnSave").addEventListener("click", async () => {
  const title       = document.getElementById("fTitle").value.trim();
  const store       = document.getElementById("fStore").value.trim();
  const category    = document.getElementById("fCategory").value;
  const priceOld    = parseFloat(document.getElementById("fPriceOld").value) || null;
  const priceNew    = parseFloat(document.getElementById("fPriceNew").value) || null;
  const installment = document.getElementById("fInstallment").value.trim();
  const url         = document.getElementById("fUrl").value.trim();
  const imageUrl    = document.getElementById("fImageUrl").value.trim();
  const expiresAt   = document.getElementById("fExpiresAt").value
    ? new Date(document.getElementById("fExpiresAt").value).toISOString()
    : null;

  if (!title || !store || !category || !priceNew || !url) {
    showMsg("Preencha os campos obrigatórios (*)", "error"); return;
  }

  const data = { title, store, category, priceOld, priceNew,
    installment: installment||null, url, imageUrl: imageUrl||null, expiresAt };

  try {
    if (editingId) {
      await updateDoc(doc(db,"deals",editingId), data);
      showMsg("✅ Promoção atualizada!", "success"); cancelEdit();
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db,"deals"), data);
      showMsg("✅ Promoção adicionada!", "success"); clearForm();
    }
  } catch(e) { showMsg("Erro: "+e.message, "error"); }
});

// ── EDIT ─────────────────────────────────────────────────
window.editDeal = function(id) {
  const d = allDeals.find(x=>x.id===id); if (!d) return;
  editingId = id;
  document.getElementById("fTitle").value       = d.title        || "";
  document.getElementById("fStore").value       = d.store        || "";
  document.getElementById("fCategory").value    = d.category     || "";
  document.getElementById("fPriceOld").value    = d.priceOld     || "";
  document.getElementById("fPriceNew").value    = d.priceNew     || "";
  document.getElementById("fInstallment").value = d.installment  || "";
  document.getElementById("fUrl").value         = d.url          || "";
  document.getElementById("fImageUrl").value    = d.imageUrl     || "";

  if (d.expiresAt) {
    // Converte ISO para formato do datetime-local
    const dt = new Date(d.expiresAt);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset()*60000).toISOString().slice(0,16);
    document.getElementById("fExpiresAt").value = local;
  } else {
    document.getElementById("fExpiresAt").value = "";
  }

  formTitle.textContent = "✏️ Editar promoção";
  btnCancelEdit.style.display = "inline-block";
  document.querySelector(".form-card").scrollIntoView({ behavior:"smooth" });
};

// ── RENOVAR (+ 7 dias) ────────────────────────────────────
window.renewDeal = async function(id) {
  const d = allDeals.find(x=>x.id===id); if (!d) return;
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + 7);
  try {
    await updateDoc(doc(db,"deals",id), { expiresAt: newExpiry.toISOString() });
    showMsg("🔄 Promoção renovada por mais 7 dias!", "success");
  } catch(e) { showMsg("Erro: "+e.message, "error"); }
};

// ── DELETE ────────────────────────────────────────────────
window.deleteDeal = async function(id, name) {
  if (!confirm(`Excluir "${name}"?`)) return;
  try { await deleteDoc(doc(db,"deals",id)); }
  catch(e) { alert("Erro: "+e.message); }
};

// ── CANCEL EDIT ───────────────────────────────────────────
btnCancelEdit.addEventListener("click", cancelEdit);
function cancelEdit() {
  editingId = null;
  formTitle.textContent = "➕ Adicionar promoção";
  btnCancelEdit.style.display = "none";
  clearForm();
}
function clearForm() {
  ["fTitle","fStore","fCategory","fPriceOld","fPriceNew","fInstallment","fUrl","fImageUrl","fExpiresAt"]
    .forEach(id => { const el=document.getElementById(id); if(el) el.value=""; });
}
function showMsg(text, type) {
  formMsg.textContent=text; formMsg.className="form-msg "+type;
  formMsg.style.display="block";
  setTimeout(()=>{formMsg.style.display="none";},4000);
}
function populateStoreDatalist() {
  const dl=document.getElementById("storesList");
  const stores=[...new Set(allDeals.map(d=>d.store).filter(Boolean))];
  dl.innerHTML=stores.map(s=>`<option value="${s}">`).join("");
}

// ── ATALHOS DE DATA ───────────────────────────────────────
document.querySelectorAll(".btn-shortcut").forEach(btn => {
  btn.addEventListener("click", () => {
    const hours = parseInt(btn.dataset.hours);
    const dt = new Date(Date.now() + hours * 3600000);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset()*60000).toISOString().slice(0,16);
    document.getElementById("fExpiresAt").value = local;
  });
});
document.querySelector(".btn-clear-expiry").addEventListener("click", () => {
  document.getElementById("fExpiresAt").value = "";
});
