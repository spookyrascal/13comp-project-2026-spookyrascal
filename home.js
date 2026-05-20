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
const el = (id) => document.getElementById(id);

const authPopup = el("authPopup");
const openAuthBtn = el("openAuthBtn");
const googleLoginBtn = el("googleLoginBtn");

const authTitle = el("authTitle");
const authUsername = el("authUsername");
const authAge = el("authAge");
const authEmail = el("authEmail");
const authPassword = el("authPassword");

const submitAuthBtn = el("submitAuthBtn");
const switchAuthModeBtn = el("switchAuthModeBtn");

const authButtons = el("authButtons");
const profileArea = el("profileArea");

const profileImage = el("profileImage");
const menuPfp = el("menuPfp");
const menuName = el("menuName");
const menuEmail = el("menuEmail");

const dropdownMenu = el("dropdownMenu");

const profileBtn = el("profileBtn");
const profilePageBtn = el("profilePageBtn");
const logoutBtn = el("logoutBtn");
const playBtn = el("playBtn");

const quickStats = el("quickStats");
const statWins = el("statWins");
const statGames = el("statGames");
const statRate = el("statRate");

/* =========================
   STATE
========================= */
let isLogin = true;

/* =========================
   HELPERS
========================= */
const DEFAULT_PFP = "./Images/defaultPFP.jpg";

function safeSetImage(img, url) {
  if (!img) return;
  img.src = url || DEFAULT_PFP;
}

/* =========================
   POPUP CONTROL
========================= */
function openPopup() {
  authPopup?.classList.remove("hidden");
  updateMode();
}

function closePopup() {
  authPopup?.classList.add("hidden");
  resetForm();
}

function resetForm() {
  if (authEmail) authEmail.value = "";
  if (authPassword) authPassword.value = "";
  if (authUsername) authUsername.value = "";
  if (authAge) authAge.value = "";
}

/* =========================
   MODE SWITCH
========================= */
function updateMode() {
  if (!authTitle) return;

  if (isLogin) {
    authTitle.textContent = "Login";

    authUsername?.classList.add("hidden");
    authAge?.classList.add("hidden");

    submitAuthBtn.textContent = "Login";
    switchAuthModeBtn.textContent = "Need an account?";
  } else {
    authTitle.textContent = "Create Account";

    authUsername?.classList.remove("hidden");
    authAge?.classList.remove("hidden");

    submitAuthBtn.textContent = "Sign Up";
    switchAuthModeBtn.textContent = "Already have an account?";
  }
}

updateMode();

/* =========================
   EVENTS
========================= */
openAuthBtn?.addEventListener("click", openPopup);

authPopup?.addEventListener("click", (e) => {
  if (e.target === authPopup) closePopup();
});

switchAuthModeBtn?.addEventListener("click", () => {
  isLogin = !isLogin;
  updateMode();
});

/* =========================
   GOOGLE LOGIN
========================= */
googleLoginBtn?.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    await syncUser(result.user);
    closePopup();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

/* =========================
   EMAIL AUTH
========================= */
submitAuthBtn?.addEventListener("click", async () => {
  const email = authEmail?.value?.trim();
  const password = authPassword?.value;

  const username = authUsername?.value?.trim();
  const age = Number(authAge?.value);

  if (!email || !password) {
    alert("Fill required fields");
    return;
  }

  try {
    let user;

    if (isLogin) {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      user = cred.user;
    } else {
      if (!username) {
        alert("Enter username");
        return;
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      user = cred.user;

      await updateProfile(user, { displayName: username });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: username,
        email,
        age: age || 0,
        photoURL: DEFAULT_PFP,
        wins: 0,
        losses: 0,
        gamesPlayed: 0,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp()
      });
    }

    await syncUser(user);
    closePopup();

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

/* =========================
   USER SYNC (SAFE)
========================= */
async function syncUser(user) {
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      displayName: user.displayName || "Player",
      email: user.email || "",
      photoURL: user.photoURL || DEFAULT_PFP,
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
      age: 0,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp()
    });
    return;
  }

  await updateDoc(ref, {
    lastActive: serverTimestamp()
  });
}

/* =========================
   AUTH STATE
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    authButtons?.classList.remove("hidden");
    profileArea?.classList.add("hidden");
    quickStats?.classList.add("hidden");

    safeSetImage(profileImage, DEFAULT_PFP);
    safeSetImage(menuPfp, DEFAULT_PFP);

    if (menuName) menuName.textContent = "Guest";
    if (menuEmail) menuEmail.textContent = "";

    return;
  }

  authButtons?.classList.add("hidden");
  profileArea?.classList.remove("hidden");

  await syncUser(user);

  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.data();

  const pfp = data?.photoURL || DEFAULT_PFP;

  safeSetImage(profileImage, pfp);
  safeSetImage(menuPfp, pfp);

  if (menuName) menuName.textContent = data?.displayName || "Player";
  if (menuEmail) menuEmail.textContent = data?.email || "";

  const wins = data?.wins || 0;
  const games = data?.gamesPlayed || 0;

  const rate = games ? Math.round((wins / games) * 100) : 0;

  if (statWins) statWins.textContent = wins;
  if (statGames) statGames.textContent = games;
  if (statRate) statRate.textContent = `${rate}%`;

  quickStats?.classList.remove("hidden");
});

/* =========================
   MENU
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
    isLogin = true;
    updateMode();
    closePopup();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});
