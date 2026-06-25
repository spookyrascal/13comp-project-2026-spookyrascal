/*
========================================
FILE: home.js

PURPOSE:
Clean unified auth + onboarding flow.

FLOW:
1. User enters username + age
2. Clicks Google login
3. Google popup authenticates user
4. Firestore profile is created/updated using stored inputs
5. Redirect to games
========================================
*/

import { auth, db } from "./firebase.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const provider = new GoogleAuthProvider();

/* =========================
   DOM
========================= */

const el = {
  googleLoginBtn: document.getElementById("googleLoginBtn"),
  openAuthBtn: document.getElementById("openAuthBtn"),
  openAuthBtn2: document.getElementById("openAuthBtn2"),
  authPopup: document.getElementById("authPopup"),
  authUsername: document.getElementById("authUsername"),
  authAge: document.getElementById("authAge"),
  closeAuthBtn: document.getElementById("closeAuthBtn"),
  loadingScreen: document.getElementById("loadingScreen")
};

/* =========================
   LOADING
========================= */

function showLoading() {
  if (el.loadingScreen) el.loadingScreen.classList.remove("hidden");
}

function hideLoading() {
  if (el.loadingScreen) el.loadingScreen.classList.add("hidden");
}

window.addEventListener("load", () => {
  const boot = document.getElementById("bootScreen");
  if (!boot) return;

  setTimeout(() => {
    boot.style.display = "none";
  }, 2800);
});
/* =========================
   POPUP
========================= */

function openPopup() {
  if (el.authPopup) el.authPopup.classList.remove("hidden");
}

function closePopup() {
  if (el.authPopup) el.authPopup.classList.add("hidden");
}

if (el.openAuthBtn) el.openAuthBtn.addEventListener("click", openPopup);
if (el.openAuthBtn2) el.openAuthBtn2.addEventListener("click", openPopup);
if (el.closeAuthBtn) el.closeAuthBtn.addEventListener("click", closePopup);

/* =========================
   LOGIN
========================= */

if (el.googleLoginBtn) {
  el.googleLoginBtn.addEventListener("click", async () => {
    try {
      showLoading();

      const username = el.authUsername.value.trim();
      const age = Number(el.authAge.value);
      const safeAge = Number.isFinite(age) ? age : null;

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await handleUser(user, username, safeAge);

    } catch (err) {
      console.log(err);
      alert("Login failed");
    } finally {
      hideLoading();
    }
  });
}

/* =========================
   USER HANDLER
========================= */

async function handleUser(user, username, age) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  const exists = snap.exists();

  try {
    if (exists) {
      await updateDoc(ref, {
        lastActive: serverTimestamp()
      });

      window.location.href = "games.html";
      return;
    }

    const data = snap.exists() ? snap.data() : {};

    const newUser = {
      uid: user.uid,
      displayName: data.displayName || username || "Player",
      email: user.email,
      photoURL: data.photoURL || "./Images/defaultPFP.jpg",
      age: data.age ?? age,
      wins: data.wins || 0,
      losses: data.losses || 0,
      gamesPlayed: data.gamesPlayed || 0,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp()
    };

    await setDoc(ref, newUser);

    window.location.href = "profile.html";

  } catch (err) {
    console.log("User setup failed:", err);
  }
}

/* =========================
   AUTO LOGIN GUARD
========================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      window.location.href = "games.html";
    }
  } catch (err) {
    console.log("Auth redirect error:", err);
  }
});