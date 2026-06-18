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

<<<<<<< HEAD
/* =========================
   GOOGLE PROVIDER
========================= */
=======
import { initProfileNav } from "./authState.js";
>>>>>>> d86f5834d556dab96f4eb8492f3891e4b8a8158c

initProfileNav();

/* =========================
   AUTH
========================= */
const provider = new GoogleAuthProvider();

/* =========================
   DOM
========================= */
<<<<<<< HEAD

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
=======
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
>>>>>>> d86f5834d556dab96f4eb8492f3891e4b8a8158c

/* =========================
   STATE
========================= */
<<<<<<< HEAD

let currentUserData = null;

/* =========================
   OPEN POPUP
=======
let currentUser = null;
let isNewUserFlow = false;

/* =========================
   LOADING
>>>>>>> d86f5834d556dab96f4eb8492f3891e4b8a8158c
========================= */
const showLoading = () =>
  el.loadingScreen?.classList.remove("hidden");

<<<<<<< HEAD
openAuthBtn?.addEventListener("click", () => {
  authPopup?.classList.remove("hidden");
});

/* =========================
   GOOGLE LOGIN ONLY
=======
const hideLoading = () =>
  el.loadingScreen?.classList.add("hidden");

/* =========================
   GOOGLE LOGIN
>>>>>>> d86f5834d556dab96f4eb8492f3891e4b8a8158c
========================= */
el.googleLoginBtn?.addEventListener("click", async () => {
  try {
    showLoading();

    const result = await signInWithPopup(auth, provider);
<<<<<<< HEAD
    const user = result.user;

    await ensureUserExists(user);
=======
    currentUser = result.user;
>>>>>>> d86f5834d556dab96f4eb8492f3891e4b8a8158c

    await handleUser(result.user);

  } catch (err) {
    console.error(err);
    alert(err.message);
  } finally {
    hideLoading();
  }
});

/* =========================
<<<<<<< HEAD
   CREATE / FETCH USER SHELL
========================= */

async function ensureUserExists(user) {
=======
   USER HANDLING
========================= */
async function handleUser(user) {
>>>>>>> d86f5834d556dab96f4eb8492f3891e4b8a8158c
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
<<<<<<< HEAD
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
=======
    await createNewUser(user, ref);
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
   CREATE USER
========================= */
async function createNewUser(user, ref) {
  await setDoc(ref, {
    uid: user.uid,
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "./Images/defaultPFP.jpg",
    age: null,
    profileComplete: false,
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
    createdAt: serverTimestamp(),
    lastActive: serverTimestamp()
  });
>>>>>>> d86f5834d556dab96f4eb8492f3891e4b8a8158c
}

/* =========================
   PROFILE SETUP UI
========================= */
function openProfileSetup() {
  isNewUserFlow = true;

  el.authPopup.classList.remove("hidden");
  el.authUsername.classList.remove("hidden");
  el.authAge.classList.remove("hidden");

  el.submitAuthBtn.textContent = "Finish Setup";
  el.switchAuthModeBtn.classList.add("hidden");
}

/* =========================
   SAVE PROFILE
========================= */
el.submitAuthBtn?.addEventListener("click", async () => {
  if (!isNewUserFlow || !currentUser) return;

  const username = el.authUsername.value.trim();
  const age = Number(el.authAge.value);

  if (!username) {
    alert("Pick a username");
    return;
  }

  try {
    showLoading();

    const ref = doc(db, "users", currentUser.uid);

    await updateDoc(ref, {
      displayName: username,
      age: age || 0,
      profileComplete: true
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
   AUTO LOGIN CHECK
========================= */
onAuthStateChanged(auth, async (user) => {
<<<<<<< HEAD
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
=======
  if (!user) return;

  try {
    showLoading();
    currentUser = user;
    await handleUser(user);
  } catch (err) {
    console.error(err);
  } finally {
    hideLoading();
  }
>>>>>>> d86f5834d556dab96f4eb8492f3891e4b8a8158c
});

/* =========================
   LOGOUT
========================= */
el.logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
});