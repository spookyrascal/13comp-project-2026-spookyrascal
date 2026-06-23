import { auth, db } from "./firebase.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { initProfileNav } from "./authState.js";
initProfileNav();

/* =========================
   STATE
========================= */
const provider = new GoogleAuthProvider();
let currentUser = null;
let isNewUserFlow = false;

/* =========================
   DOM
========================= */
const el = {
  googleLoginBtn: document.getElementById("googleLoginBtn"),
  authPopup: document.getElementById("authPopup"),
  authUsername: document.getElementById("authUsername"),
  authAge: document.getElementById("authAge"),
  submitAuthBtn: document.getElementById("submitAuthBtn"),
  switchAuthModeBtn: document.getElementById("switchAuthModeBtn"),
  loadingScreen: document.getElementById("loadingScreen"),
  logoutBtn: document.getElementById("logoutBtn")
};

const openAuthBtn = document.getElementById("openAuthBtn");
const authTitle = document.getElementById("authTitle");

const authButtons = document.getElementById("authButtons");
const profileArea = document.getElementById("profileArea");
const profileImage = document.getElementById("profileImage");

const menuPfp = document.getElementById("menuPfp");
const menuName = document.getElementById("menuName");
const menuEmail = document.getElementById("menuEmail");

const dropdownMenu = document.getElementById("dropdownMenu");

const profileBtn = document.getElementById("profileBtn");
const profilePageBtn = document.getElementById("profilePageBtn");
const playBtn = document.getElementById("playBtn");

const quickStats = document.getElementById("quickStats");
const statWins = document.getElementById("statWins");
const statGames = document.getElementById("statGames");
const statRate = document.getElementById("statRate");

/* =========================
   LOADING
========================= */
const showLoading = () =>
  el.loadingScreen?.classList.remove("hidden");

const hideLoading = () =>
  el.loadingScreen?.classList.add("hidden");

/* =========================
   OPEN AUTH
========================= */
openAuthBtn?.addEventListener("click", () => {
  el.authPopup?.classList.remove("hidden");
});

/* =========================
   GOOGLE LOGIN
========================= */
el.googleLoginBtn?.addEventListener("click", async () => {
  try {
    showLoading();

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    currentUser = user;
    await handleUser(user);

  } catch (err) {
    console.error(err);
    alert(err.message);
  } finally {
    hideLoading();
  }
});

/* =========================
   USER HANDLING
========================= */
async function handleUser(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "",
      photoURL: user.photoURL || "./Images/defaultPFP.jpg",
      age: null,
      profileComplete: false,
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp()
    });

    openProfileSetup();
    return;
  }

  const data = snap.data();

  if (!data.profileComplete) {
    openProfileSetup();
    return;
  }

  window.location.href = "games.html";
}

/* =========================
   PROFILE SETUP
========================= */
function openProfileSetup() {
  isNewUserFlow = true;

  el.authPopup?.classList.remove("hidden");
  el.authUsername?.classList.remove("hidden");
  el.authAge?.classList.remove("hidden");

  el.submitAuthBtn.textContent = "Finish Setup";
  el.switchAuthModeBtn?.classList.add("hidden");
  authTitle.textContent = "Finish your profile";
}

/* =========================
   SAVE PROFILE (NEW USER FLOW)
========================= */
el.submitAuthBtn?.addEventListener("click", async () => {
  if (!isNewUserFlow || !currentUser) return;

  const username = el.authUsername.value.trim();
  const age = Number(el.authAge.value);

  if (!username) return alert("Pick a username");

  try {
    showLoading();

    const ref = doc(db, "users", currentUser.uid);

    await updateDoc(ref, {
      displayName: username,
      age: age || 0,
      profileComplete: true,
      lastActive: serverTimestamp()
    });

    await updateProfile(currentUser, {
      displayName: username
    });

    isNewUserFlow = false;
    el.authPopup.classList.add("hidden");

    window.location.href = "games.html";

  } catch (err) {
    console.error(err);
    alert(err.message);
  } finally {
    hideLoading();
  }
});

/* =========================
   AUTH STATE LISTENER
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) return showLoggedOut();

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await handleUser(user);
    return;
  }

  const data = snap.data();

  if (!data.profileComplete) {
    showProfileSetup(user, data);
    return;
  }

  showLoggedIn(data);
});

/* =========================
   PROFILE UI
========================= */
function showProfileSetup(user, data) {
  authButtons?.classList.add("hidden");
  profileArea?.classList.remove("hidden");
  quickStats?.classList.add("hidden");

  profileImage.src = data.photoURL || "./Images/defaultPFP.jpg";
  menuName.textContent = "Finish Setup";
  menuEmail.textContent = user.email;

  el.authPopup?.classList.remove("hidden");
  authTitle.textContent = "Finish your profile";
}

/* =========================
   LOGGED IN UI
========================= */
function showLoggedIn(data) {
  authButtons?.classList.add("hidden");
  profileArea?.classList.remove("hidden");
  quickStats?.classList.remove("hidden");

  const pfp = data.photoURL || "./Images/defaultPFP.jpg";

  profileImage.src = pfp;
  menuPfp.src = pfp;

  menuName.textContent = data.displayName || "Player";
  menuEmail.textContent = data.email || "";

  const wins = data.wins || 0;
  const games = data.gamesPlayed || 0;
  const rate = games ? Math.round((wins / games) * 100) : 0;

  statWins.textContent = wins;
  statGames.textContent = games;
  statRate.textContent = `${rate}%`;
}

/* =========================
   LOGGED OUT UI
========================= */
function showLoggedOut() {
  authButtons?.classList.remove("hidden");
  profileArea?.classList.add("hidden");
  quickStats?.classList.add("hidden");

  profileImage.src = "./Images/defaultPFP.jpg";
  menuPfp.src = "./Images/defaultPFP.jpg";
  menuName.textContent = "Guest";
  menuEmail.textContent = "";
}

/* =========================
   DROPDOWN
========================= */
profileBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownMenu?.classList.toggle("hidden");
});

document.addEventListener("click", () => {
  dropdownMenu?.classList.add("hidden");
});

/* =========================
   NAV
========================= */
profilePageBtn?.addEventListener("click", () => {
  window.location.href = "profile.html";
});

playBtn?.addEventListener("click", () => {
  if (!auth.currentUser) return alert("Sign in first");
  window.location.href = "games.html";
});

/* =========================
   LOGOUT
========================= */
el.logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
});