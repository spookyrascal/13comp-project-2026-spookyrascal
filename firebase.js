// ==========================
// Firebase Core
// ==========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// ==========================
// Firebase Services
// ==========================
import { 
  getAuth, 
  signInAnonymously 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";


// ==========================
// Firebase Configuration
// ==========================
const firebaseConfig = {
  apiKey: "AIzaSyDh5jFP6KcIzuEMHrXgaHUL4RcKhrx5L4M",
  authDomain: "comp-carmen.firebaseapp.com",
  projectId: "comp-carmen",
  storageBucket: "comp-carmen.firebasestorage.app",
  messagingSenderId: "477005803846",
  appId: "1:477005803846:web:f1f3a01fef6e8d4a3f7547",
  measurementId: "G-112075NKRL"
};


// ==========================
// Initialize Firebase
// ==========================
const app = initializeApp(firebaseConfig);


// ==========================
// Initialize Services
// ==========================
const auth = getAuth(app);
const db = getFirestore(app);

signInAnonymously(auth).catch((error) => {
  console.error("Anonymous login failed:", error);
});


// ==========================
// Analytics 
// ==========================
let analytics;
try {
  analytics = getAnalytics(app);
} catch (err) {
  console.warn("Analytics not supported in this environment");
}


// ==========================
// Export Services
// ==========================
export { auth, db };