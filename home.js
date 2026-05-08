import { auth, db } from "./firebase.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   AUTH PROVIDER
========================= */
const provider = new GoogleAuthProvider();

/* =========================
   DOM
========================= */
const profileBtn = document.getElementById("profileBtn");
const dropdownMenu = document.getElementById("dropdownMenu");

const profileImage = document.getElementById("profileImage");
const menuPfp = document.getElementById("menuPfp");
const menuName = document.getElementById("menuName");
const menuEmail = document.getElementById("menuEmail");
const menuAge = document.getElementById("menuAge");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const emailSignupBtn = document.getElementById("emailSignupBtn");

const signupPopup = document.getElementById("signupPopup");
const signupUsername = document.getElementById("signupUsername");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupAge = document.getElementById("signupAge");
const createAccountBtn = document.getElementById("createAccountBtn");

const usernamePopup = document.getElementById("usernamePopup");
const usernameInput = document.getElementById("usernameInput");
const saveUsernameBtn = document.getElementById("saveUsernameBtn");

const playBtn = document.getElementById("playBtn");

/* =========================
   SAFE UI HELPERS
========================= */
function show(el) {
  el.classList.remove("hidden");
}

function hide(el) {
  el.classList.add("hidden");
}

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
   GOOGLE LOGIN
========================= */
loginBtn?.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    alert(err.message);
  }
});

/* =========================
   EMAIL SIGNUP
========================= */
emailSignupBtn?.addEventListener("click", () => {
  show(signupPopup);
});

createAccountBtn?.addEventListener("click", async () => {

  const username = signupUsername.value.trim();
  const email = signupEmail.value.trim();
  const password = signupPassword.value;
  const age = Number(signupAge.value);

  if (!username || !email || !password || !age) {
    alert("Fill all fields (including age)");
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    await updateProfile(user, { displayName: username });

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      username,
      email,
      age,
      photoURL: "./Images/defaultPFP.jpg",
      createdAt: serverTimestamp()
    });

    hide(signupPopup);

  } catch (err) {
    alert(err.message);
  }
});

/* =========================
   LOGOUT
========================= */
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
});

/* =========================
   SAVE USERNAME
========================= */
saveUsernameBtn?.addEventListener("click", async () => {

  const username = usernameInput.value.trim();
  if (!username) return alert("Enter username");

  const user = auth.currentUser;
  if (!user) return;

  await updateProfile(user, { displayName: username });

  await setDoc(
    doc(db, "users", user.uid),
    { username },
    { merge: true }
  );

  hide(usernamePopup);
});

/* =========================
   SYNC USER 
========================= */
async function syncUser(user) {

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  const baseData = {
    uid: user.uid,
    username: user.displayName || "",
    email: user.email || "",
    age: null,
    photoURL: user.photoURL || "./Images/defaultPFP.jpg"
  };

  if (!snap.exists()) {
    await setDoc(ref, {
      ...baseData,
      createdAt: serverTimestamp()
    });

    return baseData;
  }

  return {
    ...baseData,
    ...snap.data()
  };
}

/* =========================
   UI STATES
========================= */
function loggedInUI(profile) {

  const photo = profile.photoURL || "./Images/defaultPFP.jpg";

  profileImage.src = photo;
  menuPfp.src = photo;

  menuName.textContent = profile.username || "Player";
  menuEmail.textContent = profile.email || "";
  menuAge.textContent = `Age: ${profile.age ?? "-"}`;

  hide(loginBtn);
  hide(emailSignupBtn);
  show(logoutBtn);
}

function loggedOutUI() {

  profileImage.src = "./Images/defaultPFP.jpg";
  menuPfp.src = "./Images/defaultPFP.jpg";

  menuName.textContent = "Guest";
  menuEmail.textContent = "Not signed in";
  menuAge.textContent = "Age: -";

  show(loginBtn);
  show(emailSignupBtn);
  hide(logoutBtn);
}

/* =========================
   AUTH STATE 
========================= */
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    loggedOutUI();
    return;
  }

  const profile = await syncUser(user);
  loggedInUI(profile);

  // force username setup if missing
  if (!profile.username) {
    show(usernamePopup);
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