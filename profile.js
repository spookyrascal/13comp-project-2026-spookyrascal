import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   STATE SYSTEM 
========================= */

const state = {
  user: null,
  profile: null
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
const ageInput = document.getElementById("ageInput");
const photoInput = document.getElementById("photoInput");
const livePreview = document.getElementById("livePreview");

const saveProfileBtn = document.getElementById("saveProfileBtn");
const badgeRow = document.getElementById("badgeRow");
const backBtn = document.getElementById("backBtn");

/* =========================
   AUTH
========================= */

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  state.user = user;
  await loadProfile();
});

/* =========================
   LOAD PROFILE
========================= */

async function loadProfile() {

  const ref = doc(db, "users", state.user.uid);
  const snap = await getDoc(ref);

  let data = snap.exists() ? snap.data() : {};

  // ensure email exists once 
  if (!data.email) {
    await setDoc(ref, { email: state.user.email }, { merge: true });
    data.email = state.user.email;
  }

  state.profile = data;

  renderProfile();
}

/* =========================
   RENDER UI 
========================= */

function renderProfile() {

  const user = state.user;
  const data = state.profile;

  if (!user || !data) return;

  const photo = data.photoURL || "./Images/defaultPFP.jpg";

  const wins = Number(data.wins) || 0;
  const losses = Number(data.losses) || 0;
  const games = Number(data.gamesPlayed) || 0;
  const rate = games ? Math.round((wins / games) * 100) : 0;

  const age = data.age;

  /* HERO */
  headerProfileImage.src = photo;
  profilePreview.src = photo;
  livePreview.src = photo;

  profileDisplayName.textContent = data.displayName || "Player";
  profileEmail.textContent = user.email;

  profileAge.textContent =
    age != null ? `Age: ${age}` : "Age: Not set";

  /* INPUTS */
  usernameInput.value = data.displayName || "";
  ageInput.value = age ?? "";
  photoInput.value = data.photoURL || "";

  /* STATS */
  winsStat.textContent = wins;
  lossesStat.textContent = losses;
  gamesStat.textContent = games;
  rateStat.textContent = rate + "%";

  renderBadges({ wins, games, rate });
}

/* =========================
   LIVE PREVIEW
========================= */

photoInput.addEventListener("input", () => {
  livePreview.src =
    photoInput.value.trim() || "./Images/defaultPFP.jpg";
});

/* =========================
   SAVE PROFILE 
========================= */

saveProfileBtn.addEventListener("click", async () => {

  const newName = usernameInput.value.trim();

  const ageRaw = ageInput.value.trim();
  const newAge = ageRaw === "" ? null : Number(ageRaw);

  const newPhoto = photoInput.value.trim();

  if (!newName) return alert("Enter username");

  const updateData = {
    displayName: newName,
    age: newAge,
    photoURL: newPhoto || "./Images/defaultPFP.jpg",
    lastActive: serverTimestamp()
  };

  // Update Firebase Auth profile
  await updateProfile(state.user, {
    displayName: newName,
    photoURL: newPhoto || "./Images/defaultPFP.jpg"
  });

  // Update Firestore
  await updateDoc(doc(db, "users", state.user.uid), updateData);

  // Update local state instantly (no reload needed)
  state.profile = {
    ...state.profile,
    ...updateData
  };

  renderProfile();

  alert("Profile updated 🔥");
});

/* =========================
   BADGES
========================= */

function renderBadges({ wins, games, rate }) {

  badgeRow.innerHTML = "";

  const badges = [];

  if (wins >= 1) badges.push("🏆 First Win");
  if (wins >= 10) badges.push("🔥 10 Wins");
  if (wins >= 25) badges.push("👑 Elite Player");
  if (games >= 50) badges.push("🎮 Grinder");
  if (rate >= 75 && games >= 10) badges.push("⚡ High Win Rate");

  if (!badges.length) badges.push("🌱 Beginner");

  badges.forEach(text => {

    const el = document.createElement("div");
    el.className = "badge";
    el.textContent = text;

    if (text.includes("Elite") || text.includes("High")) {
      el.classList.add("rare");
    }

    badgeRow.appendChild(el);
  });
}

/* =========================
   BACK BUTTON
========================= */

backBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});