// 🔥 Firebase Core
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

// 🔐 Firebase Auth
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 🗄 Firestore
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


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
getAnalytics(app);

const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();


// ==========================
// DOM Elements
// ==========================

const profileBtn = document.getElementById("profileBtn");
const dropdownMenu = document.getElementById("dropdownMenu");

const signInBtn = document.getElementById("signInBtn");
const signUpBtn = document.getElementById("signUpBtn");
const signOutBtn = document.getElementById("signOutBtn");

const playBtn = document.getElementById("playBtn");
const profileImage = document.getElementById("profileImage");


// ==========================
// Dropdown Toggle
// ==========================

profileBtn.addEventListener("click", () => {
  dropdownMenu.classList.toggle("hidden");
});


// ==========================
// Sign In / Sign Up
// ==========================

async function handleSignIn() {
  try {

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    // Create user in database if first login
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        displayName: user.displayName,
        email: user.email,
        uid: user.uid,
        isAdmin: false,
        createdAt: serverTimestamp()
      });
    }

  } catch (err) {
    console.error("Error signing in:", err);
  }
}

signInBtn.addEventListener("click", handleSignIn);
signUpBtn.addEventListener("click", handleSignIn);


// ==========================
// Sign Out
// ==========================

signOutBtn.addEventListener("click", async () => {
  await signOut(auth);
});


// ==========================
// Auth State Listener
// ==========================

onAuthStateChanged(auth, (user) => {

  if (user) {

    // Update UI
    signInBtn.classList.add("hidden");
    signUpBtn.classList.add("hidden");
    signOutBtn.classList.remove("hidden");

    // Save session data
    sessionStorage.setItem("userId", user.uid);
    sessionStorage.setItem("displayName", user.displayName);

  } else {

    // Reset UI
    signInBtn.classList.remove("hidden");
    signUpBtn.classList.remove("hidden");
    signOutBtn.classList.add("hidden");

    sessionStorage.clear();
  }

  // Profile picture logic (works for both states)
  profileImage.src = user?.photoURL || "defaultPFP.jpg";

});


// ==========================
// Play Button Protection
// ==========================

playBtn.addEventListener("click", () => {

  if (!sessionStorage.getItem("userId")) {
    alert("Please sign in first.");
    return;
  }

  window.location.href = "games.html";

});