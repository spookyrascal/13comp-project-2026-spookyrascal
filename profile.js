import { auth, db } from "./firebase.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { initProfileNav } from "./authState.js";

initProfileNav();

/* =========================
   STATE
========================= */

// Tracks current user + live Firestore subscription
// TODO:
// - add cache layer for offline profile viewing

const state = {
  user: null,
  profile: null,
  unsub: null
};

/* =========================
   DOM HELPERS
========================= */

const $ = (id) => document.getElementById(id);

// Centralised DOM references
// TODO:
// - split into profile / stats / editor modules if app grows

const el = {
  headerImg: $("headerProfileImage"),
  preview: $("profilePreview"),
  live: $("livePreview"),

  name: $("profileDisplayName"),
  email: $("profileEmail"),
  age: $("profileAge"),

  wins: $("winsStat"),
  losses: $("lossesStat"),
  games: $("gamesStat"),
  rate: $("rateStat"),

  inputs: {
    name: $("usernameInput"),
    email: $("emailInput"),
    age: $("ageInput"),
    photo: $("photoInput")
  },

  saveBtn: $("saveProfileBtn"),
  backBtn: $("backBtn"),
  toast: $("toast")
};

/* =========================
   TOAST SYSTEM
========================= */

// Lightweight feedback system
// TODO:
// - queue multiple messages instead of overriding
// - add success/error styling variants

let toastTimer;

function toast(msg) {
  clearTimeout(toastTimer);

  el.toast.textContent = msg;
  el.toast.classList.add("show");

  toastTimer = setTimeout(() => {
    el.toast.classList.remove("show");
  }, 2500);
}

/* =========================
   AUTH
========================= */

// Redirects unauthenticated users
// TODO:
// - add loading skeleton before redirect check completes

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("index.html");
    return;
  }

  state.user = user;
  listenProfile(user.uid);
});

/* =========================
   FIRESTORE SYNC
========================= */

// Live profile listener
// TODO:
// - debounce updates if Firestore writes become frequent
// - reduce re-renders by diffing changes

function listenProfile(uid) {
  if (state.unsub) state.unsub();

  const ref = doc(db, "users", uid);

  state.unsub = onSnapshot(ref, async (snap) => {
    if (!snap.exists()) {
      // Auto-create user profile if missing
      await setDoc(ref, {
        displayName: state.user.displayName || "Player",
        email: state.user.email || "",
        photoURL: state.user.photoURL || "./Images/defaultPFP.jpg",

        age: null,
        wins: 0,
        losses: 0,
        gamesPlayed: 0,

        createdAt: serverTimestamp(),
        lastActive: serverTimestamp()
      });

      return;
    }

    const data = snap.data();

    state.profile = {
      displayName: data.displayName || "Player",
      email: data.email || "",
      photoURL: data.photoURL || "./Images/defaultPFP.jpg",
      age: data.age ?? null,
      wins: data.wins || 0,
      losses: data.losses || 0,
      gamesPlayed: data.gamesPlayed || 0
    };

    render();
  });
}

/* =========================
   RENDER UI
========================= */

// Updates all profile UI elements
// TODO:
// - animate stat changes
// - highlight updated fields
// - skeleton loading before first render

function render() {
  const p = state.profile;
  if (!p) return;

  const wins = Number(p.wins);
  const losses = Number(p.losses);
  const games = Number(p.gamesPlayed);

  const rate = games ? Math.round((wins / games) * 100) : 0;
  const photo = p.photoURL || "./Images/defaultPFP.jpg";

  // Sync all profile images
  [el.headerImg, el.preview, el.live].forEach(img => {
    if (img) img.src = photo;
  });

  el.name.textContent = p.displayName;
  el.email.textContent = p.email;
  el.age.textContent = p.age ? `Age: ${p.age}` : "Age: Not set";

  // Fill form inputs
  el.inputs.name.value = p.displayName || "";
  el.inputs.email.value = p.email || "";
  el.inputs.age.value = p.age || "";
  el.inputs.photo.value = p.photoURL || "";

  // Stats
  el.wins.textContent = wins;
  el.losses.textContent = losses;
  el.games.textContent = games;
  el.rate.textContent = `${rate}%`;
}

/* =========================
   LIVE IMAGE PREVIEW
========================= */

// Updates preview image as user types URL
// TODO:
// - allow file upload instead of URL
// - cache valid images to avoid flicker

el.inputs.photo.addEventListener("input", () => {
  const url = el.inputs.photo.value.trim();

  if (!url) {
    el.live.src = "./Images/defaultPFP.jpg";
    return;
  }

  try {
    new URL(url);
    el.live.src = url;
  } catch {
    el.live.src = "./Images/defaultPFP.jpg";
  }
});

/* =========================
   SAVE PROFILE
========================= */

// Validates + writes profile changes
// TODO:
// - username uniqueness check
// - rate limit saves
// - add "unsaved changes" warning

el.saveBtn.addEventListener("click", async () => {
  try {
    el.saveBtn.disabled = true;
    el.saveBtn.textContent = "Saving...";

    const name = el.inputs.name.value.trim();
    const email = el.inputs.email.value.trim();
    const ageRaw = el.inputs.age.value.trim();
    const photo = el.inputs.photo.value.trim();

    if (name.length < 3) throw new Error("Username too short");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid email");
    }

    let age = null;
    if (ageRaw !== "") {
      age = Number(ageRaw);
      if (isNaN(age) || age < 1 || age > 120) {
        throw new Error("Invalid age");
      }
    }

    let finalPhoto = "./Images/defaultPFP.jpg";

    if (photo) {
      try {
        new URL(photo);
        finalPhoto = photo;
      } catch {
        throw new Error("Invalid image URL");
      }
    }

    // Update Firebase Auth profile
    await updateProfile(state.user, {
      displayName: name,
      photoURL: finalPhoto
    });

    // Update Firestore profile
    const ref = doc(db, "users", state.user.uid);

    await setDoc(ref, {
      displayName: name,
      email,
      age,
      photoURL: finalPhoto,
      lastActive: serverTimestamp()
    }, { merge: true });

    toast("🔥 Profile updated");

  } catch (err) {
    console.error(err);
    toast(err.message || "Update failed");

  } finally {
    el.saveBtn.disabled = false;
    el.saveBtn.textContent = "Save Changes";
  }
});

/* =========================
   NAVIGATION
========================= */

el.backBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});

/* =========================
   CLEANUP
========================= */

// Ensures Firestore listener doesn't leak memory
window.addEventListener("beforeunload", () => {
  if (state.unsub) state.unsub();
});
