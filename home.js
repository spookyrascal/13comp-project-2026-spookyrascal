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

/* =========================
   GOOGLE PROVIDER
========================= */

const provider = new GoogleAuthProvider();

/* =========================
   DOM
========================= */

const authPopup = document.getElementById("authPopup");
const openAuthBtn = document.getElementById("openAuthBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");

const authTitle = document.getElementById("authTitle");
const authUsername = document.getElementById("authUsername");
const authAge = document.getElementById("authAge");

const submitAuthBtn = document.getElementById("submitAuthBtn");

const authButtons = document.getElementById("authButtons");
const profileArea = document.getElementById("profileArea");

const profileImage = document.getElementById("profileImage");

const menuPfp = document.getElementById("menuPfp");
const menuName = document.getElementById("menuName");
const menuEmail = document.getElementById("menuEmail");

const dropdownMenu = document.getElementById("dropdownMenu");

const profileBtn = document.getElementById("profileBtn");
const profilePageBtn = document.getElementById("profilePageBtn");
const logoutBtn = document.getElementById("logoutBtn");

const playBtn = document.getElementById("playBtn");

const quickStats = document.getElementById("quickStats");
const statWins = document.getElementById("statWins");
const statGames = document.getElementById("statGames");
const statRate = document.getElementById("statRate");

/* =========================
   STATE
========================= */

let currentUserData = null;

/* =========================
   OPEN POPUP
========================= */

openAuthBtn?.addEventListener("click", () => {
  authPopup?.classList.remove("hidden");
});

/* =========================
   GOOGLE LOGIN ONLY
========================= */

googleLoginBtn?.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    await ensureUserExists(user);

    authPopup?.classList.add("hidden");

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

/* =========================
   CREATE / FETCH USER SHELL
========================= */

async function ensureUserExists(user) {
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
  } else {
    await updateDoc(ref, {
      lastActive: serverTimestamp()
    });
  }
}

/* =========================
   AUTH STATE LISTENER
========================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showLoggedOut();
    return;
  }

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await ensureUserExists(user);
    return;
  }

  const data = snap.data();
  currentUserData = data;

  if (!data.profileComplete) {
    showProfileSetup(user, data);
    return;
  }

  showLoggedIn(data);
});

/* =========================
   PROFILE SETUP SCREEN
========================= */

function showProfileSetup(user, data) {
  authButtons?.classList.add("hidden");
  profileArea?.classList.remove("hidden");
  quickStats?.classList.add("hidden");

  profileImage.src = data?.photoURL || "./Images/defaultPFP.jpg";

  menuName.textContent = "Finish Setup";
  menuEmail.textContent = user.email;

  authPopup?.classList.remove("hidden");

  authTitle.textContent = "Finish your profile";
  authUsername.classList.remove("hidden");
  authAge.classList.remove("hidden");

  submitAuthBtn.textContent = "Complete Profile";
}

/* =========================
   COMPLETE PROFILE
========================= */

submitAuthBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const username = authUsername.value.trim();
  const age = Number(authAge.value);

  if (!username) {
    alert("Pick a username");
    return;
  }

  const ref = doc(db, "users", user.uid);

  await updateDoc(ref, {
    displayName: username,
    age: age || 0,
    profileComplete: true,
    lastActive: serverTimestamp()
  });

  authPopup?.classList.add("hidden");
});

/* =========================
   LOGGED IN UI
========================= */

async function showLoggedIn(data) {
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

  const rate = games > 0 ? Math.round((wins / games) * 100) : 0;

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
   NAVIGATION
========================= */

profilePageBtn?.addEventListener("click", () => {
  window.location.href = "profile.html";
});

playBtn?.addEventListener("click", () => {
  if (!auth.currentUser) {
    alert("Sign in first");
    return;
  }

  window.location.href = "games.html";
});

/* =========================
   LOGOUT
========================= */

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});