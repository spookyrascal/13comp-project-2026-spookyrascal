import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  updateProfile,
  verifyBeforeUpdateEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   STATE
========================= */

const state = {
  user: null,
  profile: null,
  unsub: null
};

/* =========================
   DOM
========================= */

const $ = (id) => document.getElementById(id);

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
   TOAST
========================= */

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
   AUTH CHECK
========================= */

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("index.html");
    return;
  }

  state.user = user;
  listenProfile();
});

/* =========================
   FIRESTORE LISTENER
========================= */

function listenProfile() {
  if (state.unsub) state.unsub();

  const ref = doc(db, "users", state.user.uid);

  state.unsub = onSnapshot(ref, async (snap) => {
    if (!snap.exists()) {
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

    state.profile = snap.data();
    render();
  });
}

/* =========================
   RENDER UI
========================= */

function render() {
  const u = state.user;
  const p = state.profile;

  if (!u || !p) return;

  const photo = p.photoURL || "./Images/defaultPFP.jpg";

  const wins = Number(p.wins) || 0;
  const losses = Number(p.losses) || 0;
  const games = Number(p.gamesPlayed) || 0;

  const rate = games
    ? Math.round((wins / games) * 100)
    : 0;

  [el.headerImg, el.preview, el.live].forEach((img) => {
    if (img) img.src = photo;
  });

  el.name.textContent = p.displayName || "Player";
  el.email.textContent = p.email || u.email;
  el.age.textContent = p.age
    ? `Age: ${p.age}`
    : "Age: Not set";

  el.inputs.name.value = p.displayName || "";
  el.inputs.email.value = p.email || u.email || "";
  el.inputs.age.value = p.age || "";
  el.inputs.photo.value = p.photoURL || "";

  el.wins.textContent = wins;
  el.losses.textContent = losses;
  el.games.textContent = games;
  el.rate.textContent = `${rate}%`;
}

/* =========================
   IMAGE PREVIEW
========================= */

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

el.saveBtn.addEventListener("click", async () => {
  try {
    el.saveBtn.disabled = true;
    el.saveBtn.textContent = "Saving...";

    const name = el.inputs.name.value.trim();
    const email = el.inputs.email.value.trim();
    const ageRaw = el.inputs.age.value.trim();
    const photo = el.inputs.photo.value.trim();

    /* =========================
       VALIDATION
    ========================= */

    if (name.length < 3) {
      throw new Error("Username too short");
    }

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

    /* =========================
       EMAIL UPDATE
    ========================= */

    if (email !== state.user.email) {
      await verifyBeforeUpdateEmail(state.user, email);

      toast("Verification email sent to new address.");

      el.saveBtn.disabled = false;
      el.saveBtn.textContent = "Save Changes";

      return;
    }

    /* =========================
       AUTH PROFILE UPDATE
    ========================= */

    await updateProfile(state.user, {
      displayName: name,
      photoURL: finalPhoto
    });

    /* =========================
       FIRESTORE UPDATE
    ========================= */

    const ref = doc(db, "users", state.user.uid);

    await setDoc(
      ref,
      {
        displayName: name,
        email,
        age,
        photoURL: finalPhoto,
        lastActive: serverTimestamp()
      },
      { merge: true }
    );

    /* =========================
       LOCAL STATE UPDATE
    ========================= */

    state.profile = {
      ...state.profile,
      displayName: name,
      email,
      age,
      photoURL: finalPhoto
    };

    render();

    toast("🔥 Profile updated");

  } catch (err) {
    console.error(err);

    /* =========================
       FIREBASE ERRORS
    ========================= */

    if (err.code === "auth/requires-recent-login") {
      toast("Please log in again before changing email.");
    }

    else if (err.code === "auth/email-already-in-use") {
      toast("Email already in use.");
    }

    else if (err.code === "auth/invalid-email") {
      toast("Invalid email address.");
    }

    else {
      toast(err.message || "Update failed");
    }

  } finally {
    el.saveBtn.disabled = false;
    el.saveBtn.textContent = "Save Changes";
  }
});

/* =========================
   BACK BUTTON
========================= */

el.backBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});

/* =========================
   CLEANUP
========================= */

window.addEventListener("beforeunload", () => {
  if (state.unsub) {
    state.unsub();
  }
});