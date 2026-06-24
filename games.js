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

let currentUser = null;

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.exists() ? snap.data() : {};

  currentUser = {
    uid: user.uid,
    name: data.displayName || "Player",
    photo: data.photoURL || "./Images/defaultPFP.jpg"
  };

  const img = document.getElementById("profileImage");
  if (img) img.src = currentUser.photo;
});

/* NAV */
document.getElementById("gtnBtn")?.addEventListener("click", () => {
  window.location.href = "GTN.html";
});

document.getElementById("meteorBtn")?.addEventListener("click", () => {
  window.location.href = "meteorRush.html";
});

document.getElementById("leaderboardBtn")?.addEventListener("click", () => {
  window.location.href = "leaderBoard.html";
});

document.getElementById("profileBtn")?.addEventListener("click", () => {
  window.location.href = "profile.html";
});