/*
========================================
FILE: leaderboard.js

PURPOSE:
This file builds and updates the leaderboard page.

BIG PICTURE:
It:
- Listens to Firestore "users" collection
- Sorts players by wins
- Displays leaderboard table in real time
- Shows current logged-in user in header
- Renders podium for top 3 players
========================================
*/

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

import { auth } from "./firebase.js";
import { renderUserHeader } from "./ui.js";
import { getUserProfile } from "./auth.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* =========================
   USER STATE
========================= */

let currentUser = null;

/* =========================
   AUTH INIT
========================= */

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  let profile;

  try {
    profile = await getUserProfile(user);
  } catch {
    profile = null;
  }

  currentUser = {
    uid: user.uid,
    name: profile?.name || user.displayName || "Player",
    photo: profile?.photo || user.photoURL || "./Images/defaultPFP.jpg"
  };

  renderUserHeader(currentUser);

  const img = document.getElementById("profileImage");
  if (img) img.src = currentUser.photo;
});

/* =========================
   NAVIGATION (OPTIONAL)
========================= */

document.getElementById("gtnBtn")?.addEventListener("click", () => {
  window.location.href = "GTN.html";
});

document.getElementById("meteorBtn")?.addEventListener("click", () => {
  window.location.href = "meteorRush.html";
});

document.getElementById("leaderboardBtn")?.addEventListener("click", () => {
  window.location.href = "leaderBoard.html";
});

/* =========================
   PROFILE BUTTON
========================= */

document.getElementById("profileBtn")?.addEventListener("click", () => {
  window.location.href = "profile.html";
});