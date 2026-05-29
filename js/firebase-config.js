import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth }      from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCyhfLWvFFOAfOYl8ZQA-BfrLkx4LXpf0M",
  authDomain:        "pcdeals-98462.firebaseapp.com",
  projectId:         "pcdeals-98462",
  storageBucket:     "pcdeals-98462.firebasestorage.app",
  messagingSenderId: "741099921399",
  appId:             "1:741099921399:web:e776b662055fe1777098f2",
  measurementId:     "G-W1H9M7QCLK"
};

const app = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
