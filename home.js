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

const provider = new GoogleAuthProvider();

/* =========================
   SAFE USER
========================= */
function safeUser(user, dbData = {}) {
  return {
    uid: user?.uid,
    name: dbData.displayName || user?.displayName || "Player",
    email: dbData.email || user?.email || "",
    photo: dbData.photoURL || user?.photoURL || "./Images/defaultPFP.jpg",
    age: dbData.age ?? null
  };
}

/* =========================
   GET OR CREATE USER
========================= */
async function getOrCreateUser(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const data = {
      uid: user.uid,
      displayName: user.displayName || "Player",
      email: user.email || "",
      photoURL: user.photoURL || "./Images/defaultPFP.jpg",
      age: null,
      isAdmin: false,
      createdAt: serverTimestamp()
    };

    await setDoc(ref, data);
    return data;
  }

  return snap.data();
}

/* =========================
   MAIN
========================= */
document.addEventListener("DOMContentLoaded", () => {

  let currentUser = null;
  let dropdownOpen = false;

  /* =========================
     DOM 
  ========================= */
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

  /* =========================
     DROPDOWN 
  ========================= */
  function closeDropdown() {
    dropdownOpen = false;
    dropdownMenu?.classList.add("hidden");
    profileBtn?.setAttribute("aria-expanded", "false");
  }

  function toggleDropdown() {
    dropdownOpen = !dropdownOpen;

    dropdownMenu?.classList.toggle("hidden", !dropdownOpen);
    profileBtn?.setAttribute("aria-expanded", String(dropdownOpen));
  }

  profileBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  document.addEventListener("click", (e) => {
    if (!dropdownOpen) return;

    if (
      !dropdownMenu?.contains(e.target) &&
      !profileBtn?.contains(e.target)
    ) {
      closeDropdown();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDropdown();
  });

  dropdownMenu?.addEventListener("click", (e) => e.stopPropagation());

  /* =========================
     POPUP
  ========================= */
  signUpBtn?.addEventListener("click", () => {
    signUpPopup.style.display = "flex";
  });

  closePopup?.addEventListener("click", () => {
    signUpPopup.style.display = "none";
  });

  /* =========================
     GOOGLE SIGN IN
  ========================= */
  async function googleSignIn() {
    try {
      const result = await signInWithPopup(auth, provider);
      await getOrCreateUser(result.user);
    } catch (err) {
      console.error(err);
      alert("Google sign-in failed");
    }
  }

  signInBtn?.addEventListener("click", googleSignIn);

  /* =========================
     EMAIL SIGN UP
  ========================= */
  signUpForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const displayName = document.getElementById("displayName")?.value.trim();
      const email = document.getElementById("signupEmail")?.value.trim().toLowerCase();
      const password = document.getElementById("signupPassword")?.value;
      const age = Number(document.getElementById("age")?.value);

      if (!displayName || !email || !password || !age) {
        return alert("Fill all fields");
      }

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
        isAdmin: false,
        createdAt: serverTimestamp()
      });

      signUpPopup.style.display = "none";
      signUpForm.reset();

    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  /* =========================
     SIGN OUT
  ========================= */
  signOutBtn?.addEventListener("click", () => signOut(auth));

  /* =========================
     AUTH STATE
  ========================= */
  onAuthStateChanged(auth, async (user) => {

    currentUser = user;

    if (!user) {
      updateUI(null);
      return;
    }

    const dbData = await getOrCreateUser(user);
    updateUI(safeUser(user, dbData));
  });

  /* =========================
     UI UPDATE
  ========================= */
  function updateUI(user) {

    if (!user) {
      profileImage.src = "./Images/defaultPFP.jpg";

      menuPfp && (menuPfp.src = "./Images/defaultPFP.jpg");
      menuName && (menuName.textContent = "Guest");
      menuEmail && (menuEmail.textContent = "Not signed in");

      signInBtn?.classList.remove("hidden");
      signUpBtn?.classList.remove("hidden");
      signOutBtn?.classList.add("hidden");

      return;
    }

    profileImage.src = user.photo;

    menuPfp && (menuPfp.src = user.photo);
    menuName && (menuName.textContent = user.name);
    menuEmail && (menuEmail.textContent = user.email);

    signInBtn?.classList.add("hidden");
    signUpBtn?.classList.add("hidden");
    signOutBtn?.classList.remove("hidden");
  }

  /* =========================
     PLAY
  ========================= */
  playBtn?.addEventListener("click", () => {
    if (!currentUser) return alert("Sign in first");
    window.location.href = "games.html";
  });

});