// ==========================
// MAIN
// ==========================
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
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const provider = new GoogleAuthProvider();

document.addEventListener("DOMContentLoaded", () => {

  // ==========================
  // STATE
  // ==========================
  let currentUser = null;

  // ==========================
  // DOM Elements
  // ==========================
  const profileBtn = document.getElementById("profileBtn");
  const dropdownMenu = document.getElementById("dropdownMenu");

  const signInBtn = document.getElementById("signInBtn");
  const signUpBtn = document.getElementById("signUpBtn");
  const signOutBtn = document.getElementById("signOutBtn");

  const playBtn = document.getElementById("playBtn");
  const profileImage = document.getElementById("profileImage");

  const signUpPopup = document.getElementById("signUpPopup");
  const closePopup = document.getElementById("closePopup");
  const signUpForm = document.getElementById("signUpForm");

  // ==========================
  // Dropdown Toggle
  // ==========================
  profileBtn?.addEventListener("click", () => {
    dropdownMenu?.classList.toggle("hidden");
    const expanded = profileBtn.getAttribute("aria-expanded") === "true";
    profileBtn.setAttribute("aria-expanded", !expanded);
  });

  // ==========================
  // Google Sign In
  // ==========================
  async function handleSignIn() {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          displayName: user.displayName,
          email: user.email,
          uid: user.uid,
          photoURL: user.photoURL || "defaultPFP.jpg",
          isAdmin: false,
          createdAt: serverTimestamp()
        });
      }

    } catch (err) {
      console.error("Error signing in:", err);
      alert("Google sign-in failed: " + err.message);
    }
  }

  signInBtn?.addEventListener("click", handleSignIn);

  // ==========================
  // Sign Up Popup
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
  // Email Sign Up
  // ==========================
  signUpForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const displayName = document.getElementById("displayName")?.value.trim();
    const email = document.getElementById("signupEmail")?.value.trim().toLowerCase();
    const password = document.getElementById("signupPassword")?.value;

    if (!displayName || !email || !password) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const defaultPhoto = "defaultPFP.jpg";

      await updateProfile(user, {
        displayName,
        photoURL: defaultPhoto
      });

      await user.reload();

      await setDoc(doc(db, "users", user.uid), {
        displayName,
        email,
        photoURL: defaultPhoto,
        createdAt: serverTimestamp(),
        isAdmin: false,
        uid: user.uid
      });

      alert("Account created successfully!");
      signUpPopup.style.display = "none";
      signUpForm.reset();

    } catch (error) {
      console.error("Error creating user:", error);
      alert(error.message);
    }
  });

  // ==========================
  // Sign Out
  // ==========================
  signOutBtn?.addEventListener("click", async () => {
    await signOut(auth);
  });

  // ==========================
  // Auth State Listener (FIXED)
  // ==========================
  onAuthStateChanged(auth, async (user) => {
    currentUser = user; // 🔥 IMPORTANT FIX

    if (user) {
      signInBtn?.classList.add("hidden");
      signUpBtn?.classList.add("hidden");
      signOutBtn?.classList.remove("hidden");

      try {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        const data = docSnap.exists() ? docSnap.data() : {};
        profileImage.src = data.photoURL || user.photoURL || "defaultPFP.jpg";
      } catch (err) {
        console.error("Firestore error:", err);
        profileImage.src = user.photoURL || "defaultPFP.jpg";
      }

    } else {
      signInBtn?.classList.remove("hidden");
      signUpBtn?.classList.remove("hidden");
      signOutBtn?.classList.add("hidden");

      profileImage.src = "defaultPFP.jpg";
    }
  });

  // ==========================
  // Play Button (FIXED)
  // ==========================
  playBtn?.addEventListener("click", () => {
    if (!currentUser) {
      alert("Please sign in first.");
      return;
    }

    window.location.href = "games.html";
  });

});