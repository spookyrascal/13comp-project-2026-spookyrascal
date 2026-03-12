// firebaseConfig.ts (or firebase.js)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDh5jFP6KcIzuEMHrXgaHUL4RcKhrx5L4M",
  authDomain: "comp-carmen.firebaseapp.com",
  projectId: "comp-carmen",
  storageBucket: "comp-carmen.firebasestorage.app",
  messagingSenderId: "477005803846",
  appId: "1:477005803846:web:f1f3a01fef6e8d4a3f7547",
  measurementId: "G-112075NKRL"
};

// Initialize app **once**
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);