/*
========================================
FILE: profile.js

PURPOSE:
This file powers the user's profile page.

BIG PICTURE:
It:
- Checks if user is logged in
- Loads their profile data from Firestore in real time
- Displays stats (wins, losses, etc.)
- Lets users edit and save their profile
- Shows live preview of profile image
- Syncs updates back to Firebase

AKA
"the live dashboard + editor for a player's account"
========================================
*/

import { auth, db } from "./firebase.js";

import {
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  onAuthStateChanged,
  updateEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* =========================
   STATE
========================= */

let user = null;
let profile = null;

/* =========================
   ELEMENTS
========================= */

const headerImg = document.getElementById("headerProfileImage");
const preview = document.getElementById("profilePreview");
const live = document.getElementById("livePreview");

const nameEl = document.getElementById("profileDisplayName");
const emailEl = document.getElementById("profileEmail");
const ageEl = document.getElementById("profileAge");

const winsEl = document.getElementById("winsStat");
const lossesEl = document.getElementById("lossesStat");
const gamesEl = document.getElementById("gamesStat");
const rateEl = document.getElementById("rateStat");

const usernameInput = document.getElementById("usernameInput");
const ageInput = document.getElementById("ageInput");
const pfpInput = document.getElementById("pfpUrlInput");

const saveBtn = document.getElementById("saveProfileBtn");
const backBtn = document.getElementById("backBtn");

const modal = document.getElementById("editModal");
const openBtn = document.getElementById("openEditBtn");
const closeBtn = document.getElementById("closeModalBtn");

const toastEl = document.getElementById("toast");

const emailInput = document.getElementById("emailInput");
const emailSaveBtn = document.getElementById("saveEmailBtn");

/* =========================
   TOAST
========================= */

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");

  setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2000);
}

/* =========================
   NAV
========================= */

backBtn.onclick = () => {
  window.location.href = "games.html";
};

openBtn.onclick = () => modal.classList.remove("hidden");
closeBtn.onclick = () => modal.classList.add("hidden");

/* =========================
   AUTH + INIT
========================= */

onAuthStateChanged(auth, async (u) => {
  if (!u) {
    window.location.href = "index.html";
    return;
  }

  user = u;

  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: u.uid,
      displayName: u.displayName || "Player",
      email: null, // 🔥 removed dependency (Auth owns email)
      photoURL: "./Images/defaultPFP.jpg",
      age: null,
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp()
    });
  }

  listenProfile(u.uid);
});

/* =========================
   LIVE PROFILE SYNC
========================= */

function listenProfile(uid) {
  const ref = doc(db, "users", uid);

  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;

    profile = snap.data();
    render();
  });
}

/* =========================
   EMAIL UPDATE (AUTH ONLY)
========================= */

async function changeEmail(newEmail) {
  try {
    await updateEmail(auth.currentUser, newEmail);

    toast("Email updated! Refreshing...");

    await auth.currentUser.reload();

    render();
  } catch (err) {
    console.log(err);

    if (err.code === "auth/requires-recent-login") {
      toast("Log in again to change email");
    } else {
      toast("Email update failed");
    }
  }
}

if (emailSaveBtn && emailInput) {
  emailSaveBtn.onclick = async () => {
    const newEmail = emailInput.value.trim();

    if (!newEmail.includes("@")) {
      toast("Enter a valid email");
      return;
    }

    await changeEmail(newEmail);
  };
}

/* =========================
   RENDER (MERGED DATA MODEL)
========================= */

function render() {
  if (!user || !profile) return;

  const games = profile.gamesPlayed || 0;
  const wins = profile.wins || 0;
  const rate = games > 0 ? Math.round((wins / games) * 100) : 0;

  const img = profile.photoURL || "./Images/defaultPFP.jpg";

  headerImg.src = img;
  preview.src = img;
  live.src = img;

  nameEl.textContent = profile.displayName || "Player";

  // 🔥 AUTH is single source of truth for email
  emailEl.textContent =
    auth.currentUser?.email || "No email linked";

  ageEl.textContent =
    profile.age != null ? `Age: ${profile.age}` : "Age: Not set";

  winsEl.textContent = wins;
  lossesEl.textContent = profile.losses || 0;
  gamesEl.textContent = games;
  rateEl.textContent = rate;

  usernameInput.value = profile.displayName || "";
  ageInput.value = profile.age || "";
  pfpInput.value = profile.photoURL || "";
}

/* =========================
   IMAGE VALIDATION
========================= */

function validateImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => reject(false);
    img.src = url;
  });
}

/* =========================
   SAVE PROFILE
========================= */

saveBtn.onclick = async function () {
  if (!user || !profile) return;

  const ref = doc(db, "users", user.uid);

  const rawUrl = pfpInput.value.trim();
  let photoURL = profile.photoURL;

  try {
    if (rawUrl) {
      await validateImage(rawUrl);
      photoURL = rawUrl;
    }
  } catch {
    toast("Invalid image link");
    return;
  }

  const ageValue = Number(ageInput.value);
  const safeAge =
    Number.isFinite(ageValue) && ageValue > 0 ? ageValue : null;

  await updateDoc(ref, {
    displayName: usernameInput.value.trim() || "Player",
    age: safeAge,
    photoURL,
    lastActive: serverTimestamp()
  });

  toast("Saved!");
};