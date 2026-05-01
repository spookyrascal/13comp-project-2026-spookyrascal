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
function safeUser(user, dbData = null) {
  return {
    uid: user?.uid,
    name: dbData?.displayName || user?.displayName || "Player",
    email: dbData?.email || user?.email || "",
    photo: dbData?.photoURL || user?.photoURL || "./Images/defaultPFP.jpg",
    age: dbData?.age ?? null
  };
}

/* =========================
   MAIN
========================= */
document.addEventListener("DOMContentLoaded", () => {

  let currentUser = null;

  // =========================
  // DOM
  // =========================
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

  // =========================
  // GOOGLE SIGN IN
  // =========================
  async function googleSignIn() {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          displayName: user.displayName || "Player",
          email: user.email || "",
          photoURL: user.photoURL || "./Images/defaultPFP.jpg",
          age: null,
          isAdmin: false,
          createdAt: serverTimestamp()
        });
      }

    } catch (err) {
      console.error("Google sign-in error:", err);
      alert("Sign in failed");
    }
  }

  signInBtn?.addEventListener("click", googleSignIn);

  // =========================
  // EMAIL SIGN UP
  // =========================
  signUpForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const displayName = document.getElementById("displayName")?.value.trim();
      const email = document.getElementById("signupEmail")?.value.trim();
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
      console.error("Signup error:", err);
      alert(err.message);
    }
  });

  // =========================
  // SIGN OUT
  // =========================
  signOutBtn?.addEventListener("click", () => {
    signOut(auth);
  });

  // =========================
  // AUTH STATE 
  // =========================
  onAuthStateChanged(auth, async (user) => {

    currentUser = user;

    if (!user) {
      profileImage.src = "./Images/defaultPFP.jpg";

      if (menuPfp) menuPfp.src = "./Images/defaultPFP.jpg";
      if (menuName) menuName.textContent = "Guest";
      if (menuEmail) menuEmail.textContent = "Not signed in";

      signInBtn?.classList.remove("hidden");
      signUpBtn?.classList.remove("hidden");
      signOutBtn?.classList.add("hidden");

      return;
    }

    let dbData = null;

    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) dbData = snap.data();
    } catch (err) {
      console.warn("Firestore fetch failed:", err);
    }

    const safe = safeUser(user, dbData);

    // top profile icon
    profileImage.src = safe.photo;

    // discord menu sync
    if (menuPfp) menuPfp.src = safe.photo;
    if (menuName) menuName.textContent = safe.name;
    if (menuEmail) menuEmail.textContent = safe.email;

    // UI buttons
    signInBtn?.classList.add("hidden");
    signUpBtn?.classList.add("hidden");
    signOutBtn?.classList.remove("hidden");
  });

  // =========================
  // PLAY BUTTON
  // =========================
  playBtn?.addEventListener("click", () => {
    if (!currentUser) return alert("Sign in first");
    window.location.href = "games.html";
  });

});