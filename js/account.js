/* ── Account Page JavaScript ───────────────────────────── */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const loginRequired = document.getElementById('loginRequired');
const accountContent = document.getElementById('accountContent');
const btnGoogleLogin = document.getElementById('btnGoogleLogin');
const btnSignOut = document.getElementById('btnSignOut');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const userAvatar = document.getElementById('userAvatar');

// Check auth state
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    if (loginRequired) loginRequired.style.display = 'none';
    if (accountContent) accountContent.style.display = 'block';
    
    if (userName) userName.textContent = user.displayName || 'Usuário';
    if (userEmail) userEmail.textContent = user.email;
    
    if (userAvatar && user.photoURL) {
      userAvatar.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName}" />`;
    }
  } else {
    // User is signed out
    if (loginRequired) loginRequired.style.display = 'block';
    if (accountContent) accountContent.style.display = 'none';
  }
});

// Google login
if (btnGoogleLogin) {
  btnGoogleLogin.addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in:', error);
      alert('Erro ao fazer login. Tente novamente.');
    }
  });
}

// Sign out
if (btnSignOut) {
  btnSignOut.addEventListener('click', async () => {
    if (confirm('Tem certeza que deseja sair?')) {
      try {
        await signOut(auth);
        window.location.href = 'index.html';
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }
  });
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
