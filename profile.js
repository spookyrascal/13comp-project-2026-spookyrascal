import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential
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
  profile: null
};

let unsubscribeProfile = null;
let toastTimeout = null;

/* =========================
   DOM
========================= */

const headerProfileImage =
  document.getElementById("headerProfileImage");

const profilePreview =
  document.getElementById("profilePreview");

const profileDisplayName =
  document.getElementById("profileDisplayName");

const profileEmail =
  document.getElementById("profileEmail");

const profileAge =
  document.getElementById("profileAge");

const winsStat =
  document.getElementById("winsStat");

const lossesStat =
  document.getElementById("lossesStat");

const gamesStat =
  document.getElementById("gamesStat");

const rateStat =
  document.getElementById("rateStat");

const usernameInput =
  document.getElementById("usernameInput");

const emailInput =
  document.getElementById("emailInput");

const ageInput =
  document.getElementById("ageInput");

const photoInput =
  document.getElementById("photoInput");

const livePreview =
  document.getElementById("livePreview");

const saveProfileBtn =
  document.getElementById("saveProfileBtn");

const badgeRow =
  document.getElementById("badgeRow");

const backBtn =
  document.getElementById("backBtn");

const toast =
  document.getElementById("toast");

/* =========================
   BADGES
========================= */

const BADGES = [
  {
    text: "🏆 First Win",
    check: p => p.wins >= 1
  },

  {
    text: "🔥 10 Wins",
    check: p => p.wins >= 10
  },

  {
    text: "👑 Elite Player",
    check: p => p.wins >= 25,
    rare: true
  },

  {
    text: "🎮 Grinder",
    check: p => p.games >= 50
  },

  {
    text: "⚡ High Win Rate",
    check: p => p.rate >= 75 && p.games >= 10,
    rare: true
  }
];

/* =========================
   TOAST
========================= */

function showToast(message) {

  clearTimeout(toastTimeout);

  toast.textContent = message;
  toast.classList.add("show");

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

/* =========================
   AUTH
========================= */

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.replace("index.html");
    return;
  }

  state.user = user;

  listenToProfile();
});

/* =========================
   REALTIME PROFILE
========================= */

function listenToProfile() {

  if (unsubscribeProfile) {
    unsubscribeProfile();
  }

  const ref = doc(db, "users", state.user.uid);

  unsubscribeProfile = onSnapshot(
    ref,
    async (snap) => {

      if (!snap.exists()) {

        const starterData = {
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
        };

        await setDoc(ref, starterData);

        return;
      }

      state.profile = snap.data();

      renderProfile();
    },

    (error) => {
      console.error(error);
      showToast("Failed to sync profile");
    }
  );
}

/* =========================
   RENDER
========================= */

function renderProfile() {

  const user = state.user;
  const data = state.profile;

  if (!user || !data) return;

  const photo =
    data.photoURL ||
    "./Images/defaultPFP.jpg";

  const wins =
    Number(data.wins) || 0;

  const losses =
    Number(data.losses) || 0;

  const games =
    Number(data.gamesPlayed) || 0;

  const rate =
    games > 0
      ? Math.round((wins / games) * 100)
      : 0;

  /* IMAGES */

  headerProfileImage.src = photo;
  profilePreview.src = photo;
  livePreview.src = photo;

  /* TEXT */

  profileDisplayName.textContent =
    data.displayName || "Player";

  profileEmail.textContent =
    data.email || user.email;

  profileAge.textContent =
    data.age
      ? `Age: ${data.age}`
      : "Age: Not set";

  /* INPUTS */

  usernameInput.value =
    data.displayName || "";

  emailInput.value =
    data.email || user.email || "";

  ageInput.value =
    data.age || "";

  photoInput.value =
    data.photoURL || "";

  /* STATS */

  winsStat.textContent = wins;
  lossesStat.textContent = losses;
  gamesStat.textContent = games;
  rateStat.textContent = `${rate}%`;

  renderBadges({
    wins,
    losses,
    games,
    rate
  });
}

/* =========================
   IMAGE PREVIEW
========================= */

photoInput.addEventListener("input", () => {

  const url = photoInput.value.trim();

  if (!url) {
    livePreview.src =
      "./Images/defaultPFP.jpg";

    return;
  }

  try {

    new URL(url);

    livePreview.src = url;

  } catch {

    livePreview.src =
      "./Images/defaultPFP.jpg";
  }
});

/* =========================
   IMAGE FALLBACKS
========================= */

[
  profilePreview,
  livePreview,
  headerProfileImage
].forEach((img) => {

  img.onerror = () => {

    img.src =
      "./Images/defaultPFP.jpg";
  };
});

/* =========================
   SAVE PROFILE
========================= */

saveProfileBtn.addEventListener(
  "click",
  async () => {

    try {

      saveProfileBtn.disabled = true;
      saveProfileBtn.textContent = "Saving...";

      const newName =
        usernameInput.value.trim();

      const newEmail =
        emailInput.value.trim();

      const ageRaw =
        ageInput.value.trim();

      const newPhoto =
        photoInput.value.trim();

      /* =========================
         VALIDATION
      ========================= */

      if (newName.length < 3) {
        throw new Error(
          "Username must be at least 3 characters"
        );
      }

      if (newName.length > 20) {
        throw new Error(
          "Username too long"
        );
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(newEmail)) {
        throw new Error("Invalid email");
      }

      let newAge = null;

      if (ageRaw !== "") {

        newAge = Number(ageRaw);

        if (isNaN(newAge)) {
          throw new Error(
            "Age must be a number"
          );
        }

        if (newAge < 1 || newAge > 120) {
          throw new Error(
            "Invalid age"
          );
        }
      }

      /* =========================
         PHOTO URL
      ========================= */

      let finalPhoto =
        "./Images/defaultPFP.jpg";

      if (newPhoto) {

        try {

          new URL(newPhoto);

          finalPhoto = newPhoto;

        } catch {

          throw new Error(
            "Invalid image URL"
          );
        }
      }

      /* =========================
         EMAIL UPDATE
      ========================= */

      if (newEmail !== state.user.email) {

        const password = prompt(
          "Enter your password to confirm email change:"
        );

        if (!password) {
          throw new Error(
            "Email change cancelled"
          );
        }

        const credential =
          EmailAuthProvider.credential(
            state.user.email,
            password
          );

        await reauthenticateWithCredential(
          state.user,
          credential
        );

        await updateEmail(
          state.user,
          newEmail
        );
      }

      /* =========================
         FIREBASE AUTH PROFILE
      ========================= */

      await updateProfile(
        state.user,
        {
          displayName: newName,
          photoURL: finalPhoto
        }
      );

      /* =========================
         FIRESTORE PROFILE
      ========================= */

      const updateData = {
        displayName: newName,
        email: newEmail,
        age: newAge,
        photoURL: finalPhoto,
        lastActive: serverTimestamp()
      };

      await setDoc(
        doc(db, "users", state.user.uid),
        updateData,
        { merge: true }
      );

      state.profile = {
        ...state.profile,
        ...updateData
      };

      renderProfile();

      showToast(
        "🔥 Profile updated successfully"
      );

    } catch (err) {

      console.error(err);

      switch (err.code) {

        case "auth/wrong-password":
          showToast("Incorrect password");
          break;

        case "auth/requires-recent-login":
          showToast(
            "Please log in again before changing email"
          );
          break;

        case "auth/email-already-in-use":
          showToast(
            "That email is already in use"
          );
          break;

        case "auth/invalid-email":
          showToast("Invalid email");
          break;

        default:
          showToast(
            err.message || "Update failed"
          );
      }

    } finally {

      saveProfileBtn.disabled = false;
      saveProfileBtn.textContent =
        "Save Changes";
    }
  }
);

/* =========================
   BADGES
========================= */

function renderBadges(profile) {

  badgeRow.innerHTML = "";

  const unlocked =
    BADGES.filter(
      badge => badge.check(profile)
    );

  if (!unlocked.length) {

    unlocked.push({
      text: "🌱 Beginner"
    });
  }

  unlocked.forEach((badge) => {

    const el =
      document.createElement("div");

    el.className = "badge";

    if (badge.rare) {
      el.classList.add("rare");
    }

    el.textContent = badge.text;

    badgeRow.appendChild(el);
  });
}

/* =========================
   BACK BUTTON
========================= */

backBtn.addEventListener(
  "click",
  () => {
    window.location.href = "index.html";
  }
);

/* =========================
   CLEANUP
========================= */

window.addEventListener(
  "beforeunload",
  () => {

    if (unsubscribeProfile) {
      unsubscribeProfile();
    }
  }
);
