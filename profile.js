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
  onSnapshot,
  collection,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   STATE
========================= */

const state = {
  user: null,
  profile: null,
};

/* =========================
   DOM
========================= */

const headerProfileImage = document.getElementById("headerProfileImage");
const profilePreview = document.getElementById("profilePreview");
const profileDisplayName = document.getElementById("profileDisplayName");
const profileEmail = document.getElementById("profileEmail");
const profileAge = document.getElementById("profileAge");

const winsStat = document.getElementById("winsStat");
const lossesStat = document.getElementById("lossesStat");
const gamesStat = document.getElementById("gamesStat");
const rateStat = document.getElementById("rateStat");

const usernameInput = document.getElementById("usernameInput");
const emailInput = document.getElementById("emailInput");
const ageInput = document.getElementById("ageInput");
const photoInput = document.getElementById("photoInput");
const livePreview = document.getElementById("livePreview");

const saveProfileBtn = document.getElementById("saveProfileBtn");
const badgeRow = document.getElementById("badgeRow");
const backBtn = document.getElementById("backBtn");

/* =========================
   SCORE SYSTEM
========================= */

function calculateScore(wins, losses, games) {
  const winRate = games > 0 ? wins / games : 0;

  return Math.round(
    (wins * 12) -
    (losses * 5) +
    (winRate * 25)
  );
}
/* =========================
   LEADERBOARD
========================= */

async function getLeaderboard() {

  const snap = await getDocs(collection(db, "users"));

  const users = [];

  snap.forEach(docSnap => {

    const d = docSnap.data();

    const wins = d.wins || 0;
    const losses = d.losses || 0;
    const games = d.gamesPlayed || 0;

    const score = calculateScore(wins, losses, games);

    users.push({
      uid: docSnap.id,
      score
    });
  });

  users.sort((a, b) => b.score - a.score);

  users.forEach((u, i) => {
    u.position = i + 1;
  });

  return users;
}
/* =========================
   AUTH
========================= */

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  state.user = user;

  listenProfile();
});

/* =========================
   REALTIME PROFILE
========================= */

function listenProfile() {

  const ref = doc(db, "users", state.user.uid);

  onSnapshot(ref, async (snap) => {

    if (!snap.exists()) {

      const starter = {
        displayName: state.user.displayName || "Player",
        email: state.user.email || "",
        photoURL: state.user.photoURL || "./Images/defaultPFP.jpg",
        age: null,
        wins: 0,
        losses: 0,
        gamesPlayed: 0,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp()
      };

      await setDoc(ref, starter);
      return;
    }

    state.profile = snap.data();

    await renderProfile();

  });
}

/* =========================
   RENDER PROFILE
========================= */

async function renderProfile() {

  const p = state.profile;

  const wins = p.wins || 0;
  const losses = p.losses || 0;
  const games = p.gamesPlayed || 0;

  const score = calculateScore(wins, losses, games);

  /* IMAGES */
  const photo = p.photoURL || "./Images/defaultPFP.jpg";

  headerProfileImage.src = photo;
  profilePreview.src = photo;
  livePreview.src = photo;

  /* TEXT */
  profileEmail.textContent = p.email || state.user.email;

  profileAge.textContent =
    p.age ? `Age: ${p.age}` : "Age: Not set";

  /* STATS */
  winsStat.textContent = wins;
  lossesStat.textContent = losses;
  gamesStat.textContent = games;

  rateStat.textContent =
    games > 0 ? `${Math.round((wins / games) * 100)}%` : "0%";

  /* INPUTS */
  usernameInput.value = p.displayName || "";
  emailInput.value = p.email || "";
  ageInput.value = p.age || "";
  photoInput.value = p.photoURL || "";

  renderBadges({ wins, losses, games, score });
}

/* =========================
   SAVE PROFILE
========================= */

saveProfileBtn.addEventListener("click", async () => {

  const newName = usernameInput.value.trim();
  const newEmail = emailInput.value.trim();
  const newAge = Number(ageInput.value) || null;
  const newPhoto = photoInput.value.trim();

  await updateProfile(state.user, {
    displayName: newName,
    photoURL: newPhoto
  });

  await setDoc(doc(db, "users", state.user.uid), {
    displayName: newName,
    email: newEmail,
    age: newAge,
    photoURL: newPhoto,
    lastActive: serverTimestamp()
  }, { merge: true });

  alert("Updated 🔥");
});

/* =========================
   BACK
========================= */

backBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});
