/*
========================================
FILE: firebase.js

PURPOSE:
Initialises Firebase for the whole app.

WHAT IT DOES:
- Connects to Firebase project
- Enables Authentication
- Enables Firestore database
- Sets login persistence (stay logged in)
========================================
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDh5jFP6KcIzuEMHrXgaHUL4RcKhrx5L4M",
  authDomain: "comp-carmen.firebaseapp.com",
  projectId: "comp-carmen",
  storageBucket: "comp-carmen.firebasestorage.app",
  messagingSenderId: "477005803846",
  appId: "1:477005803846:web:f1f3a01fef6e8d4a3f7547",
  measurementId: "G-112075NKRL"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Maintain user session across refresh
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Auth persistence failed:", err);
});