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

import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const provider = new GoogleAuthProvider();

let pendingProfile = {
  username: "",
  age: null
};

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
const showLoading = () => el.loadingScreen?.classList.remove("hidden");
const hideLoading = () => el.loadingScreen?.classList.add("hidden");

/* =========================
   POPUP CONTROL
========================= */
el.openAuthBtn?.addEventListener("click", () =>
  el.authPopup.classList.remove("hidden")
);

el.openAuthBtn2?.addEventListener("click", () =>
  el.authPopup.classList.remove("hidden")
);

el.closeAuthBtn?.addEventListener("click", () =>
  el.authPopup.classList.add("hidden")
);

/* =========================
   GOOGLE LOGIN
========================= */
el.googleLoginBtn?.addEventListener("click", async () => {
  try {
    showLoading();

    pendingProfile.username = el.authUsername.value.trim();
    pendingProfile.age = Number(el.authAge.value) || null;

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    await handleUser(user);

  } catch (err) {
    alert(err.message);
  } finally {
    hideLoading();
  }
});

/* =========================
   CORE USER HANDLER
========================= */
async function handleUser(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  const data = snap.exists() ? snap.data() : null;

  const exists =
    data &&
    data.displayName &&
    data.age !== null &&
    data.age !== undefined;

  // ALWAYS update last active
  const baseUpdate = {
    email: user.email,
    lastActive: serverTimestamp()
  };

  // RETURNING COMPLETE USER → STRAIGHT TO GAME
  if (exists) {
    await updateDoc(ref, baseUpdate);
    window.location.href = "games.html";
    return;
  }

  // NEW OR INCOMPLETE USER → CREATE/UPDATE PROFILE
  const newData = {
    uid: user.uid,
    displayName: data?.displayName || "",
    email: user.email,
    photoURL: data?.photoURL || "./Images/defaultPFP.jpg",
    age: data?.age ?? null,
    wins: data?.wins || 0,
    losses: data?.losses || 0,
    gamesPlayed: data?.gamesPlayed || 0,
    createdAt: data?.createdAt || serverTimestamp(),
    lastActive: serverTimestamp()
  };

  if (!snap.exists()) {
    await setDoc(ref, newData);
  } else {
    await updateDoc(ref, newData);
  }

  window.location.href = "profile.html";
}

/* =========================
   AUTO LOGIN GUARD
   (prevents login screen showing again)
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    window.location.href = "games.html";
  } else {
    window.location.href = "profile.html";
  }
});