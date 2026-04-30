// ==========================
// MAIN
// ==========================
import { auth, db } from "./firebase.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import "./auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const provider = new GoogleAuthProvider();


document.addEventListener("DOMContentLoaded", () => {

  // ==========================
  // DOM ELEMENTS
  // ==========================
  const profileBtn = document.getElementById("profileBtn");
  const dropdownMenu = document.getElementById("dropdownMenu");

  const signInBtn = document.getElementById("signInBtn");
  const signUpBtn = document.getElementById("signUpBtn");
  const signOutBtn = document.getElementById("signOutBtn");

  const playBtn = document.getElementById("playBtn");

  const signUpPopup = document.getElementById("signUpPopup");
  const closePopup = document.getElementById("closePopup");
  const signUpForm = document.getElementById("signUpForm");


  // ==========================
  // DROPDOWN TOGGLE
  // ==========================
  profileBtn?.addEventListener("click", () => {
    dropdownMenu?.classList.toggle("hidden");
  });


  // ==========================
  // GOOGLE SIGN IN
  // ==========================
  async function handleGoogleSignIn() {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          displayName: user.displayName,
          email: user.email,
          uid: user.uid,
          photoURL: user.photoURL || "./Images/defaultPFP.jpg",
          isAdmin: false,
          createdAt: serverTimestamp()
        });
      }

    } catch (err) {
      console.error(err);
      alert("Google sign-in failed");
    }
  }

  signInBtn?.addEventListener("click", handleGoogleSignIn);


  // ==========================
  // SIGN UP POPUP
  // ==========================
  signUpBtn?.addEventListener("click", () => {
    signUpPopup.style.display = "flex";
  });

  closePopup?.addEventListener("click", () => {
    signUpPopup.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === signUpPopup) signUpPopup.style.display = "none";
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") signUpPopup.style.display = "none";
  });


  // ==========================
  // EMAIL SIGN UP
  // ==========================
  signUpForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const displayName = document.getElementById("displayName")?.value.trim();
    const email = document.getElementById("signupEmail")?.value.trim().toLowerCase();
    const password = document.getElementById("signupPassword")?.value;

    if (!displayName || !email || !password) {
      alert("Fill all fields");
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      const photo = "./Images/defaultPFP.jpg";

      await updateProfile(user, {
        displayName,
        photoURL: photo
      });

      await setDoc(doc(db, "users", user.uid), {
        displayName,
        email,
        photoURL: photo,
        uid: user.uid,
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


  // ==========================
  // SIGN OUT
  // ==========================
  signOutBtn?.addEventListener("click", async () => {
    const { signOut } = await import("firebase/auth");
    signOut(auth);
  });


  // ==========================
  // PLAY BUTTON
  // ==========================
  playBtn?.addEventListener("click", () => {
    if (!auth.currentUser) {
      alert("Please sign in first");
      return;
    }

    window.location.href = "games.html";
  });

});

