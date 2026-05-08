import { auth, db } from "./firebase.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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
   AUTH PROVIDER
========================= */
const provider = new GoogleAuthProvider();

/* =========================
   DOM
========================= */

/* AUTH */
const authPopup = document.getElementById("authPopup");

const openAuthBtn = document.getElementById("openAuthBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");

const authTitle = document.getElementById("authTitle");

const authUsername = document.getElementById("authUsername");
const authAge = document.getElementById("authAge");

const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");

const submitAuthBtn = document.getElementById("submitAuthBtn");
const switchAuthModeBtn = document.getElementById("switchAuthModeBtn");

/* PROFILE */
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

/* PLAY */
const playBtn = document.getElementById("playBtn");

/* QUICK STATS */
const quickStats = document.getElementById("quickStats");

const statWins = document.getElementById("statWins");
const statGames = document.getElementById("statGames");
const statRate = document.getElementById("statRate");

/* =========================
   STATE
========================= */
let isLogin = true;

/* =========================
   OPEN AUTH
========================= */
openAuthBtn?.addEventListener("click", () => {

  authPopup.classList.remove("hidden");
  updateMode();
});

/* =========================
   CLOSE AUTH
========================= */
authPopup?.addEventListener("click", (e) => {

  if (e.target === authPopup) {
    authPopup.classList.add("hidden");
  }
});

/* =========================
   SWITCH MODE
========================= */
switchAuthModeBtn?.addEventListener("click", () => {

  isLogin = !isLogin;
  updateMode();
});

/* =========================
   UPDATE MODE UI
========================= */
function updateMode() {

  if (isLogin) {

    authTitle.textContent = "Login";

    authUsername.classList.add("hidden");
    authAge.classList.add("hidden");

    submitAuthBtn.textContent = "Login";

    switchAuthModeBtn.textContent =
      "Need an account?";

  } else {

    authTitle.textContent = "Create Account";

    authUsername.classList.remove("hidden");
    authAge.classList.remove("hidden");

    submitAuthBtn.textContent = "Sign Up";

    switchAuthModeBtn.textContent =
      "Already have an account?";
  }
}

updateMode();

/* =========================
   GOOGLE LOGIN
========================= */
googleLoginBtn?.addEventListener("click", async () => {

  try {

    const result = await signInWithPopup(auth, provider);

    await syncUser(result.user);

    authPopup.classList.add("hidden");

  } catch (err) {

    console.error(err);
    alert(err.message);
  }
});

/* =========================
   EMAIL AUTH
========================= */
submitAuthBtn?.addEventListener("click", async () => {

  const email = authEmail.value.trim();
  const password = authPassword.value;

  const username = authUsername.value.trim();
  const age = Number(authAge.value);

  if (!email || !password) {
    alert("Fill in all required fields");
    return;
  }

  try {

    /* LOGIN */
    if (isLogin) {

      const cred =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      await syncUser(cred.user);

    }

    /* SIGN UP */
    else {

      if (!username) {
        alert("Enter username");
        return;
      }

      const cred =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = cred.user;

      /* UPDATE AUTH PROFILE */
      await updateProfile(user, {
        displayName: username
      });

      /* CREATE FIRESTORE USER */
      await setDoc(doc(db, "users", user.uid), {

        uid: user.uid,

        displayName: username,

        email,

        age: age || 0,

        photoURL: "./Images/defaultPFP.jpg",

        wins: 0,
        losses: 0,
        gamesPlayed: 0,

        createdAt: serverTimestamp(),
        lastActive: serverTimestamp()
      });
    }

    /* RESET FORM */
    authEmail.value = "";
    authPassword.value = "";
    authUsername.value = "";
    authAge.value = "";

    authPopup.classList.add("hidden");

  } catch (err) {

    console.error(err);
    alert(err.message);
  }
});

/* =========================
   USER SYNC
========================= */
async function syncUser(user) {

  const ref = doc(db, "users", user.uid);

  const snap = await getDoc(ref);

  /* CREATE USER IF MISSING */
  if (!snap.exists()) {

    await setDoc(ref, {

      uid: user.uid,

      displayName:
        user.displayName || "Player",

      email:
        user.email || "",

      photoURL:
        user.photoURL ||
        "./Images/defaultPFP.jpg",

      wins: 0,
      losses: 0,
      gamesPlayed: 0,

      age: 0,

      createdAt: serverTimestamp(),
      lastActive: serverTimestamp()
    });

    return;
  }

  /* KEEP STATS SAFE */
  const data = snap.data();

  await updateDoc(ref, {

    wins: data.wins ?? 0,
    losses: data.losses ?? 0,
    gamesPlayed: data.gamesPlayed ?? 0,

    lastActive: serverTimestamp()
  });
}

/* =========================
   AUTH STATE
========================= */
onAuthStateChanged(auth, async (user) => {

  /* LOGGED OUT */
  if (!user) {

    authButtons.classList.remove("hidden");
    profileArea.classList.add("hidden");

    quickStats?.classList.add("hidden");

    profileImage.src =
      "./Images/defaultPFP.jpg";

    menuPfp.src =
      "./Images/defaultPFP.jpg";

    menuName.textContent = "Guest";
    menuEmail.textContent = "";

    return;
  }

  /* LOGGED IN */
  authButtons.classList.add("hidden");

  profileArea.classList.remove("hidden");

  await syncUser(user);

  const ref = doc(db, "users", user.uid);

  const snap = await getDoc(ref);

  const data = snap.data();

  /* PROFILE */
  const pfp =
    data?.photoURL ||
    "./Images/defaultPFP.jpg";

  profileImage.src = pfp;
  menuPfp.src = pfp;

  menuName.textContent =
    data?.displayName || "Player";

  menuEmail.textContent =
    data?.email || "";

  /* QUICK STATS */
  const wins = data?.wins || 0;
  const games = data?.gamesPlayed || 0;

  const rate =
    games > 0
      ? Math.round((wins / games) * 100)
      : 0;

  statWins.textContent = wins;
  statGames.textContent = games;
  statRate.textContent = `${rate}%`;

  quickStats?.classList.remove("hidden");
});

/* =========================
   PROFILE DROPDOWN
========================= */
profileBtn?.addEventListener("click", (e) => {

  e.stopPropagation();

  dropdownMenu.classList.toggle("hidden");
});

/* CLOSE MENU */
document.addEventListener("click", () => {

  dropdownMenu.classList.add("hidden");
});

/* STOP CLOSE INSIDE MENU */
dropdownMenu?.addEventListener("click", (e) => {

  e.stopPropagation();
});

/* =========================
   PROFILE PAGE
========================= */
profilePageBtn?.addEventListener("click", () => {

  window.location.href = "profile.html";
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

/* =========================
   PLAY BUTTON
========================= */
playBtn?.addEventListener("click", () => {

  if (!auth.currentUser) {

    alert("Sign in first");
    return;
  }

  window.location.href = "games.html";
});