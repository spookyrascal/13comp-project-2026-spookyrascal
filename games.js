/*
========================================
FILE: games.js

PURPOSE:
Simple game hub controller ONLY.

ROLE:
- Auth check
- Load user profile + PFP
- Render header UI
- Navigate between games

NO GAME LOGIC HERE.
========================================
*/

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   CONSTANTS
========================= */

const DEFAULT_PFP = "./Images/defaultPFP.jpg";

/* =========================
   STATE
========================= */

let currentUser = null;

/* =========================
   NAV HELPER
========================= */

function go(page) {
  window.location.href = page;
}

window.addEventListener("load", () => {
  const boot = document.getElementById("bootScreen");
  if (!boot) return;

  setTimeout(() => {
    boot.style.display = "none";
  }, 2800);
});

/* =========================
   AUTH + LOAD USER
========================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    go("index.html");
    return;
  }

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    let data = {};

    if (snap.exists()) {
      data = snap.data();
    }

    currentUser = {
      uid: user.uid,
      name: data.displayName || user.displayName || "Player",
      photo: data.photoURL || user.photoURL || DEFAULT_PFP
    };

    renderHeader();

  } catch (err) {
    console.log("Failed to load user data:", err);

    currentUser = {
      uid: user.uid,
      name: user.displayName || "Player",
      photo: DEFAULT_PFP
    };

    renderHeader();
  }
});

/* =========================
   HEADER RENDER
========================= */

function renderHeader() {
  const img = document.getElementById("profileImage");

  if (img && currentUser) {
    img.src = currentUser.photo;
  }
}

/* =========================
   NAVIGATION (SAFE BINDING)
========================= */

const gtnBtn = document.getElementById("gtnBtn");
const meteorBtn = document.getElementById("meteorBtn");
const leaderboardBtn = document.getElementById("leaderboardBtn");
const profileBtn = document.getElementById("profileBtn");

if (gtnBtn) {
  gtnBtn.addEventListener("click", function () {
    go("GTN.html");
  });
}

if (meteorBtn) {
  meteorBtn.addEventListener("click", function () {
    go("meteorRush.html");
  });
}

if (leaderboardBtn) {
  leaderboardBtn.addEventListener("click", function () {
    go("leaderboard.html");
  });
}

if (profileBtn) {
  profileBtn.addEventListener("click", function () {
    go("profile.html");
  });
}