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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   PROVIDER
========================= */
const provider = new GoogleAuthProvider();

/* =========================
   DOM
========================= */
const authButtons = document.getElementById("authButtons");
const profileArea = document.getElementById("profileArea");

const googleLoginBtn = document.getElementById("googleLoginBtn");
const openAuthBtn = document.getElementById("openAuthBtn");

const authPopup = document.getElementById("authPopup");

const authTitle = document.getElementById("authTitle");

const authUsername = document.getElementById("authUsername");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");

const submitAuthBtn = document.getElementById("submitAuthBtn");
const switchAuthModeBtn = document.getElementById("switchAuthModeBtn");

const profileBtn = document.getElementById("profileBtn");
const dropdownMenu = document.getElementById("dropdownMenu");

const profileImage = document.getElementById("profileImage");
const menuPfp = document.getElementById("menuPfp");

const menuName = document.getElementById("menuName");
const menuEmail = document.getElementById("menuEmail");

const logoutBtn = document.getElementById("logoutBtn");

/* =========================
   HELPERS
========================= */
function show(el) {
  el.classList.remove("hidden");
}

function hide(el) {
  el.classList.add("hidden");
}

/* =========================
   AUTH MODE
========================= */
let isLogin = true;

function updateAuthMode() {

  if (isLogin) {

    authTitle.textContent = "Login";

    hide(authUsername);

    submitAuthBtn.textContent = "Login";

    switchAuthModeBtn.textContent =
      "Need an account?";

  } else {

    authTitle.textContent = "Create Account";

    show(authUsername);

    submitAuthBtn.textContent = "Sign Up";

    switchAuthModeBtn.textContent =
      "Already have an account?";
  }
}

updateAuthMode();

/* =========================
   OPEN/CLOSE POPUP
========================= */
openAuthBtn?.addEventListener("click", () => {
  show(authPopup);
});

switchAuthModeBtn?.addEventListener("click", () => {
  isLogin = !isLogin;
  updateAuthMode();
});

/* =========================
   GOOGLE LOGIN
========================= */
googleLoginBtn?.addEventListener("click", async () => {

  try {

    const result =
      await signInWithPopup(auth, provider);

    await syncUser(result.user);

  } catch (err) {

    alert(err.message);
  }
});

/* =========================
   EMAIL AUTH
========================= */
submitAuthBtn?.addEventListener("click", async () => {

  const email =
    authEmail.value.trim();

  const password =
    authPassword.value;

  const username =
    authUsername.value.trim();

  try {

    if (isLogin) {

      const cred =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      await syncUser(cred.user);

    } else {

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

      await updateProfile(user, {
        displayName: username
      });

      await syncUser(user, username);
    }

    hide(authPopup);

  } catch (err) {

    alert(err.message);
  }
});

/* =========================
   DROPDOWN
========================= */
profileBtn?.addEventListener("click", (e) => {

  e.stopPropagation();

  dropdownMenu.classList.toggle("hidden");
});

document.addEventListener("click", () => {
  hide(dropdownMenu);
});

/* =========================
   LOGOUT
========================= */
logoutBtn?.addEventListener("click", async () => {

  await signOut(auth);
});

/* =========================
   SYNC USER
========================= */
async function syncUser(user) {

  const ref = doc(db, "users", user.uid);

  const snap = await getDoc(ref);

  const userData = {

    uid: user.uid,

    username:
      user.displayName || "Player",

    email:
      user.email || "",

    photoURL:
      user.photoURL ||
      "./Images/defaultPFP.jpg",

    createdAt:
      serverTimestamp()
  };

  if (!snap.exists()) {

    await setDoc(ref, userData);

    return userData;
  }

  return {
    ...userData,
    ...snap.data()
  };
}

/* =========================
   LOGGED IN UI
========================= */
function loggedInUI(profile) {

  hide(authButtons);

  show(profileArea);

  const photo =
    profile.photoURL ||
    "./Images/defaultPFP.jpg";

  profileImage.src = photo;
  menuPfp.src = photo;

  menuName.textContent =
    profile.username;

  menuEmail.textContent =
    profile.email;
}

/* =========================
   LOGGED OUT UI
========================= */
function loggedOutUI() {

  show(authButtons);

  hide(profileArea);

  profileImage.src =
    "./Images/defaultPFP.jpg";

  menuPfp.src =
    "./Images/defaultPFP.jpg";

  menuName.textContent =
    "Guest";

  menuEmail.textContent =
    "";
}

/* =========================
   AUTH STATE
========================= */
onAuthStateChanged(auth, async (user) => {

  if (!user) {

    loggedOutUI();

    return;
  }

  const profile =
    await syncUser(user);

  loggedInUI(profile);
});
