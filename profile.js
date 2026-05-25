import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  updateProfile
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

let toastTimer;
let savingProfile = false;

/* =========================
   PAGE LOADING
========================= */

document.body.classList.add("loading");

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

  if (state.unsub) {
    state.unsub();
  }

  const ref = doc(db, "users", state.user.uid);

  state.unsub = onSnapshot(ref, async (snap) => {

    /* =========================
       CREATE USER DOC
    ========================= */

    if (!snap.exists()) {

      await setDoc(ref, {
        displayName:
          state.user.displayName || "Player",

        email:
          state.user.email || "",

        photoURL:
          state.user.photoURL ||
          "./Images/defaultPFP.jpg",

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

    /* =========================
       AUTO FIX OLD ACCOUNTS
    ========================= */

    const updates = {};

    if (typeof state.profile.wins !== "number") {
      updates.wins = 0;
    }

    if (typeof state.profile.losses !== "number") {
      updates.losses = 0;
    }

    if (typeof state.profile.gamesPlayed !== "number") {
      updates.gamesPlayed = 0;
    }

    if (Object.keys(updates).length > 0) {
      await setDoc(ref, updates, {
        merge: true
      });

      state.profile = {
        ...state.profile,
        ...updates
      };
    }

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

  const photo =
    p.photoURL ||
    "./Images/defaultPFP.jpg";

  const wins =
    Number(p.wins) || 0;

  const losses =
    Number(p.losses) || 0;

  const games =
    Number(p.gamesPlayed) || 0;

  const rate =
    games > 0
      ? Math.min(
          100,
          Math.round((wins / games) * 100)
        )
      : 0;

  /* =========================
     IMAGE HANDLING
  ========================= */

  [el.headerImg, el.preview, el.live]
    .forEach((img) => {

      if (!img) return;

      img.onerror = () => {
        img.src =
          "./Images/defaultPFP.jpg";
      };

      img.src = photo;
    });

  /* =========================
     PROFILE TEXT
  ========================= */

  el.name.textContent =
    p.displayName || "Player";

  el.email.textContent =
    p.email || u.email || "No email";

  el.age.textContent =
    p.age
      ? `Age: ${p.age}`
      : "Age: Not set";

  /* =========================
     INPUTS
  ========================= */

  el.inputs.name.value =
    p.displayName || "";

  el.inputs.email.value =
    p.email || u.email || "";

  el.inputs.age.value =
    p.age || "";

  el.inputs.photo.value =
    p.photoURL || "";

  /* =========================
     DISABLE EMAIL EDIT
  ========================= */

  if (el.inputs.email) {
    el.inputs.email.disabled = true;
  }

  /* =========================
     STATS
  ========================= */

  el.wins.textContent = wins;
  el.losses.textContent = losses;
  el.games.textContent = games;
  el.rate.textContent = `${rate}%`;

  /* =========================
     REMOVE LOADING
  ========================= */

  document.body.classList.remove("loading");
}

/* =========================
   LIVE IMAGE PREVIEW
========================= */

if (el.inputs.photo) {

  el.inputs.photo.addEventListener("input", () => {

    const url =
      el.inputs.photo.value.trim();

    if (!url) {
      el.live.src =
        "./Images/defaultPFP.jpg";

      return;
    }

    try {

      new URL(url);

      el.live.src = url;

    } catch {

      el.live.src =
        "./Images/defaultPFP.jpg";
    }
  });

  el.live.onerror = () => {
    el.live.src =
      "./Images/defaultPFP.jpg";
  };
}

/* =========================
   SAVE PROFILE
========================= */

el.saveBtn.addEventListener("click", async () => {

  if (savingProfile) return;

  savingProfile = true;

  try {

    el.saveBtn.disabled = true;
    el.saveBtn.textContent = "Saving...";

    const name =
      el.inputs.name.value.trim();

    const ageRaw =
      el.inputs.age.value.trim();

    const photo =
      el.inputs.photo.value.trim();

    /* =========================
       KEEP AUTH EMAIL
    ========================= */

    const email =
      state.user.email || "";

    /* =========================
       VALIDATION
    ========================= */

    if (!name || name.length < 3) {
      throw new Error(
        "Username too short"
      );
    }

    if (name.length > 20) {
      throw new Error(
        "Username too long"
      );
    }

    let age = null;

    if (ageRaw !== "") {

      age = Number(ageRaw);

      if (
        isNaN(age) ||
        age < 1 ||
        age > 120
      ) {
        throw new Error(
          "Invalid age"
        );
      }
    }

    let finalPhoto =
      "./Images/defaultPFP.jpg";

    if (photo) {

      try {

        new URL(photo);

        if (
          !photo.match(
            /\.(jpeg|jpg|gif|png|webp)$/i
          )
        ) {
          throw new Error(
            "Image must be a real image URL"
          );
        }

        finalPhoto = photo;

      } catch (err) {

        if (
          err.message ===
          "Image must be a real image URL"
        ) {
          throw err;
        }

        throw new Error(
          "Invalid image URL"
        );
      }
    }

    /* =========================
       UPDATE AUTH PROFILE
    ========================= */

    await updateProfile(state.user, {
      displayName: name,
      photoURL: finalPhoto
    });

    /* =========================
       UPDATE FIRESTORE
    ========================= */

    const ref = doc(
      db,
      "users",
      state.user.uid
    );

    await setDoc(ref, {
      displayName: name,
      email,
      age,
      photoURL: finalPhoto,
      lastActive: serverTimestamp()
    }, {
      merge: true
    });

    /* =========================
       LOCAL STATE
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

    toast(
      err.message ||
      "Update failed"
    );

  } finally {

    savingProfile = false;

    el.saveBtn.disabled = false;

    el.saveBtn.textContent =
      "Save Changes";
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

window.addEventListener("pagehide", () => {

  if (state.unsub) {
    state.unsub();
  }
});