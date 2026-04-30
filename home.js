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

document.addEventListener("DOMContentLoaded", () => {

  let currentUser = null;

  // ==========================
  // SAFE USER HELPER (NEW)
  // ==========================
  function getSafeUser(user) {
    return {
      uid: user?.uid || null,
      name: user?.displayName || "Player",
      email: user?.email || "",
      photo: user?.photoURL || "./Images/defaultPFP.jpg"
    };
  }

  // ==========================
  // DOM
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
  // DROPDOWN
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
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          age: null,
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
  // POPUP CONTROL
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
    const age = Number(document.getElementById("age")?.value);

    if (!displayName || !email || !password || !age) {
      alert("Please fill in all fields.");
      return;
    }

    if (age < 1 || age > 120) {
      alert("Enter a valid age.");
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
        uid: user.uid,
        displayName,
        email,
        age,
        photoURL: photo,
        isAdmin: false,
        createdAt: serverTimestamp()
      });

      alert("Account created successfully!");
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
  signOutBtn?.addEventListener("click", () => {
    signOut(auth);
  });

  // ==========================
  // AUTH STATE 
  // ==========================
  onAuthStateChanged(auth, (user) => {
    currentUser = user;

    const safe = getSafeUser(user);

    if (user) {
      signInBtn?.classList.add("hidden");
      signUpBtn?.classList.add("hidden");
      signOutBtn?.classList.remove("hidden");

      profileImage.src = safe.photo;

    } else {
      signInBtn?.classList.remove("hidden");
      signUpBtn?.classList.remove("hidden");
      signOutBtn?.classList.add("hidden");

      profileImage.src = "./Images/defaultPFP.jpg";
    }
  });

  // ==========================
  // PLAY BUTTON
  // ==========================
  playBtn?.addEventListener("click", () => {
    if (!currentUser) {
      alert("Please sign in first");
      return;
    }

    window.location.href = "games.html";
  });

});

