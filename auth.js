// ==========================
// auth.js (GLOBAL AUTH SYSTEM)
// ==========================
import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


let currentUser = null;


/* =========================
   GLOBAL AUTH LISTENER
========================= */
onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  let userData = null;

  if (user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    userData = snap.exists() ? snap.data() : null;
  }

  updateUI(user, userData);
});


/* =========================
   UI SYNC ACROSS ALL PAGES
========================= */
function updateUI(user, data) {
  const profileImages = document.querySelectorAll(".profile-img");
  const signInBtns = document.querySelectorAll("#signInBtn");
  const signUpBtns = document.querySelectorAll("#signUpBtn");
  const signOutBtns = document.querySelectorAll("#signOutBtn");
  const statusIcons = document.querySelectorAll("#statusIcon");

  const image =
    user?.photoURL ||
    data?.photoURL ||
    "./Images/defaultPFP.jpg";

  // PROFILE IMAGE (ALL PAGES)
  profileImages.forEach(img => {
    if (img) img.src = image;
  });

  // SIGN IN / SIGN UP / SIGN OUT UI
  signInBtns.forEach(btn => {
    if (btn) btn.classList.toggle("hidden", !!user);
  });

  signUpBtns.forEach(btn => {
    if (btn) btn.classList.toggle("hidden", !!user);
  });

  signOutBtns.forEach(btn => {
    if (btn) btn.classList.toggle("hidden", !user);
  });

  // STATUS ICON (optional green/red dot)
  statusIcons.forEach(icon => {
    if (icon) {
      icon.style.background = user ? "green" : "red";
    }
  });
}


/* =========================
   LOGOUT FUNCTION (USE ANYWHERE)
========================= */
export function logout() {
  return signOut(auth);
}


/* =========================
   GET CURRENT USER
========================= */
export function getCurrentUser() {
  return currentUser;
}

