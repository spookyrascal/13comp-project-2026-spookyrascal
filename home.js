import { auth, db } from "./firebase.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   AUTH PROVIDER
========================= */
const provider = new GoogleAuthProvider();

/* =========================
   STATE
========================= */
let currentUser = null;
let uiReady = false;

/* =========================
   HELPERS
========================= */
function safeUser(user, dbData = {}) {
  return {
    uid: user?.uid,
    name: dbData.displayName || user?.displayName || "Player",
    email: dbData.email || user?.email || "",
    photo: dbData.photoURL || user?.photoURL || "./Images/defaultPFP.jpg"
  };
}

async function getOrCreateUser(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const data = {
      uid: user.uid,
      displayName: null,
      email: user.email || "",
      photoURL: user.photoURL || "./Images/defaultPFP.jpg",
      createdAt: serverTimestamp()
    };

    await setDoc(ref, data);
    return { ...data, isNew: true };
  }

  return { ...snap.data(), isNew: false };
}

/* =========================
   DOM
========================= */
const profileBtn = document.getElementById("profileBtn");
const dropdownMenu = document.getElementById("dropdownMenu");

const profileImage = document.getElementById("profileImage");
const menuPfp = document.getElementById("menuPfp");
const menuName = document.getElementById("menuName");
const menuEmail = document.getElementById("menuEmail");

const signInBtn = document.getElementById("signInBtn");
const signUpBtn = document.getElementById("signUpBtn");
const signOutBtn = document.getElementById("signOutBtn");

const playBtn = document.getElementById("playBtn");

const signUpPopup = document.getElementById("signUpPopup");
const signUpForm = document.getElementById("signUpForm");
const closePopup = document.getElementById("closePopup");

const usernamePopup = document.getElementById("usernamePopup");
const usernameInput = document.getElementById("usernameInput");
const saveUsernameBtn = document.getElementById("saveUsernameBtn");

/* =========================
   UI ANIMATION
========================= */
function showWelcome(text = "Welcome back!") {
  const toast = document.createElement("div");

  toast.textContent = text;
  toast.style.position = "fixed";
  toast.style.top = "20px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = "rgba(122,168,116,0.95)";
  toast.style.color = "white";
  toast.style.padding = "10px 18px";
  toast.style.borderRadius = "12px";
  toast.style.boxShadow = "0 10px 25px rgba(0,0,0,0.2)";
  toast.style.zIndex = "9999";
  toast.style.fontWeight = "600";

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "0.4s ease";
    setTimeout(() => toast.remove(), 400);
  }, 1800);
}

/* =========================
   UI UPDATE
========================= */
function updateUI(user) {
  if (!user) {
    profileImage.src = "./Images/defaultPFP.jpg";

    menuPfp.src = "./Images/defaultPFP.jpg";
    menuName.textContent = "Guest";
    menuEmail.textContent = "Not signed in";

    signInBtn.classList.remove("hidden");
    signUpBtn.classList.remove("hidden");
    signOutBtn.classList.add("hidden");

    return;
  }

  profileImage.src = user.photo;
  menuPfp.src = user.photo;
  menuName.textContent = user.name;
  menuEmail.textContent = user.email;

  signInBtn.classList.add("hidden");
  signUpBtn.classList.add("hidden");
  signOutBtn.classList.remove("hidden");
}

/* =========================
   DROPDOWN
========================= */
profileBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownMenu.classList.toggle("hidden");
});

document.addEventListener("click", () => {
  dropdownMenu.classList.add("hidden");
});

/* =========================
   GOOGLE SIGN IN
========================= */
async function handleGoogleSignIn() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const dbUser = await getOrCreateUser(user);

    currentUser = safeUser(user, dbUser);

    updateUI(currentUser);
    showWelcome("Welcome back, Player!");

    if (!dbUser.displayName) {
      usernamePopup.style.display = "flex";
    } else {
      setTimeout(() => {
        window.location.href = "games.html";
      }, 1200);
    }

  } catch (err) {
    console.error(err);
    alert("Sign in failed");
  }
}

signInBtn?.addEventListener("click", handleGoogleSignIn);

/* =========================
   EMAIL SIGN UP
========================= */
signUpForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const displayName = document.getElementById("displayName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const age = document.getElementById("age").value;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    const photo = "./Images/defaultPFP.jpg";

    await updateProfile(user, {
      displayName,
      photoURL: photo
    });

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      displayName,
      email,
      age,
      photoURL: photo,
      createdAt: serverTimestamp()
    });

    updateUI(safeUser(user, { displayName, email, photoURL: photo }));

    showWelcome("Account created!");

    signUpPopup.style.display = "none";

    setTimeout(() => {
      window.location.href = "games.html";
    }, 1200);

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

/* =========================
   USERNAME SET
========================= */
saveUsernameBtn?.addEventListener("click", async () => {
  const name = usernameInput.value.trim();
  if (!name) return alert("Enter username");

  const user = auth.currentUser;
  if (!user) return;

  await updateProfile(user, { displayName: name });

  await setDoc(doc(db, "users", user.uid), {
    displayName: name
  }, { merge: true });

  usernamePopup.style.display = "none";

  updateUI({
    uid: user.uid,
    name,
    email: user.email,
    photo: user.photoURL || "./Images/defaultPFP.jpg"
  });

  showWelcome("Welcome, " + name + "!");

  setTimeout(() => {
    window.location.href = "games.html";
  }, 1200);
});

/* =========================
   SIGN OUT
========================= */
signOutBtn?.addEventListener("click", async () => {
  await signOut(auth);
});

/* =========================
   AUTH STATE
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    updateUI(null);
    return;
  }

  const dbUser = await getOrCreateUser(user);
  const safe = safeUser(user, dbUser);

  currentUser = safe;
  updateUI(safe);

  showWelcome("Welcome back!");

  if (!dbUser.displayName) {
    usernamePopup.style.display = "flex";
  } else if (!uiReady) {
    uiReady = true;
    setTimeout(() => {
      window.location.href = "games.html";
    }, 1000);
  }
});

/* =========================
   PLAY BUTTON
========================= */
playBtn?.addEventListener("click", () => {
  if (!currentUser) return alert("Sign in first");
  window.location.href = "games.html";
});