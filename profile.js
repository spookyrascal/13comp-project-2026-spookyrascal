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
  updateEmail,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* =========================
   STATE
========================= */

let user = null;
let profile = null;
let isLoading = true;
let unsubscribeProfile = null;

/* =========================
   ELEMENTS
========================= */

const DEFAULT_PFP = "./Images/defaultPFP.jpg";
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
const emailInput = document.getElementById("emailInput");

const saveBtn = document.getElementById("saveProfileBtn");

const backBtn = document.getElementById("backBtn");

const modal = document.getElementById("editModal");
const openBtn = document.getElementById("openEditBtn");
const closeBtn = document.getElementById("closeModalBtn");

const toastEl = document.getElementById("toast");
/* =========================
   TOAST SYSTEM
========================= */

function toast(msg) {
  toastEl.textContent = msg;
  
// reset animation 
toastEl.classList.remove("show");
void toastEl.offsetWidth;
toastEl.classList.add("show");

clearTimeout(toastEl._timeout);

toastEl._timeout = setTimeout(()=> {
  toastEl.classList.remove("show");;
  }, 2000);
}


/* =========================
   BOOT SCREEN
========================= */

window.addEventListener("load", () => {
  const boot = document.getElementById("bootScreen");
  if (!boot) return;

  setTimeout(() => {
    boot.style.display = "none";
  }, 2500);
});

/* =========================
   NAV
========================= */

backBtn.onclick = () => {
  window.location.href = "games.html";
};

openBtn.onclick = () => modal.classList.remove("hidden");
closeBtn.onclick = () => modal.classList.add("hidden");

/* =========================
   AUTH INIT
========================= */

onAuthStateChanged(auth, async (u) => {
  if (!u) {
    window.location.href = "index.html";
    return;
  }

  user = u;
  isLoading = true;

  const ref = doc(db, "users", u.uid);

  try {
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        uid: u.uid,
        displayName: u.displayName || "Player",
        photoURL: u.photoURL || DEFAULT_PFP,
        email: u.email,
        age: null,
        wins: 0,
        losses: 0,
        gamesPlayed: 0,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp()
      });
    }
  } catch (err) {
    console.log(err);
    toast("Failed to load profile");
  }

  listenProfile(u.uid);
});

/* =========================
   LIVE FIRESTORE SYNC
========================= */

function listenProfile(uid) {

    if (unsubscribeProfile) {
        unsubscribeProfile();
    }
    const ref = doc(db, "users", uid);
    
    unsubscribeProfile = onSnapshot(ref, (snap) => {

    if (!snap.exists()) {
      toast("Profile missing");
      return;
    }

    profile = snap.data();
    isLoading = false;
    render();
    });

  }

pfpInput.addEventListener("input", () => {

    const url = pfpInput.value.trim();

    if (url) {
        live.src = url;
    } else {
        live.src = DEFAULT_PFP;
    }

});

live.onerror = () => {
    live.src = DEFAULT_PFP;
};

/* =========================
   EMAIL UPDATE
========================= */

async function changeEmail(newEmail) {
  try {
    await updateEmail(auth.currentUser, newEmail);
    toast("Email updated!");
  } catch (err) {
    console.log(err);

    if (err.code === "auth/requires-recent-login") {
      toast("Please log in again to change email");
    } else {
      toast("Email update failed");
    }
  }
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
   RENDER
========================= */

function render() {
  if (!user || !profile || isLoading) return;

  const games = profile.gamesPlayed || 0;
  const wins = profile.wins || 0;

  const rate = games > 0 ? Math.round((wins / games) * 100) : 0;

  const img = profile.photoURL || DEFAULT_PFP;

  headerImg.src = img;
  preview.src = img;
  live.src = img;

  nameEl.textContent = profile.displayName || "Player";
  emailEl.textContent = profile.email || "";
  emailInput.value = profile.email || "";

  ageEl.textContent =
    profile.age != null ? `Age: ${profile.age}` : "Age: Not set";

  winsEl.textContent = wins;
  lossesEl.textContent = profile.losses || 0;
  gamesEl.textContent = games;
  rateEl.textContent = `${rate}%`;

  usernameInput.value = profile.displayName || "";
  ageInput.value = profile.age || "";
  pfpInput.value = profile.photoURL || "";
}

/* =========================
   SAVE PROFILE
========================= */

saveBtn.onclick = async function () {
  if (!user || !profile) return;

  const ref = doc(db, "users", user.uid);

  const newName = usernameInput.value.trim() || "Player";

  if (newName.length < 3 || newName.length > 20) {
    toast("username must be 3-20 characters");
    return;
  }

  const newEmail = emailInput.value.trim();

  const rawUrl = pfpInput.value.trim();
  let photoURL = profile.photoURL;

  try {
    if (rawUrl) {
      await validateImage(rawUrl);
      photoURL = rawUrl;
    }
  } catch {
    toast("Invalid image URL");
    return;
  }

  const ageValue = Number(ageInput.value);
  let safeAge;

  if (
    Number.isInteger(ageValue) &&
    ageValue >= 5 &&
    ageValue <= 120
  ) {
    safeAge = ageValue;
  } else {
    safeAge = null;
  }

  try {
    const updates = {};
    let hasChanges = false;

    if (newName !== profile.displayName) {
      updates.displayName = newName;
      hasChanges = true;
    }

    if (safeAge !== profile.age) {
      updates.age = safeAge;
      hasChanges = true;
    }

    if (photoURL !== profile.photoURL) {
      updates.photoURL = photoURL;
      hasChanges = true;
    }

    if (newEmail !== profile.email) {
      updates.email = newEmail;
      hasChanges = true;
    }

    if (!hasChanges) {
      toast("No changes to save");
      return;
    }

    updates.lastActive = serverTimestamp();

    await updateDoc(ref, updates);

    if (
      newEmail &&
      auth.currentUser.email &&
      newEmail !== auth.currentUser.email
    ) {
      await changeEmail(newEmail);
    }

    toast("Profile saved!");
  } catch (err) {
    console.log(err);
    toast("Save failed");
  }
};