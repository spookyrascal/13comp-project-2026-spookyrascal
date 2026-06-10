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
   AUTH
========================= */
const provider = new GoogleAuthProvider();

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

/* =========================
   STATE
========================= */
let currentUser = null;
let isNewUserFlow = false;

/* =========================
   LOADING
========================= */
const showLoading = () =>
  el.loadingScreen?.classList.remove("hidden");

const hideLoading = () =>
  el.loadingScreen?.classList.add("hidden");

/* =========================
   GOOGLE LOGIN
========================= */
el.googleLoginBtn?.addEventListener("click", async () => {
  try {
    showLoading();

    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;

    await handleUser(result.user);

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
});

/* =========================
   LOGOUT
========================= */
el.logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
});