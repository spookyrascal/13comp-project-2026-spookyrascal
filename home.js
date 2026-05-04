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
   HELPERS
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

async function getOrCreateUser(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const data = {
      uid: user.uid,
      displayName: null,  
      email: user.email || "",
      photoURL: user.photoURL || "./Images/defaultPFP.jpg",
      age: null,
      isAdmin: false,
      createdAt: serverTimestamp()
    };

    await setDoc(ref, data);
    return { ...data, isNew: true };
  }

  return { ...snap.data(), isNew: false };
}

/* =========================
   MAIN
========================= */
document.addEventListener("DOMContentLoaded", () => {

  let currentUser = null;

  // DOM
  const profileBtn = document.getElementById("profileBtn");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const profileImage = document.getElementById("profileImage");

  const signInBtn = document.getElementById("signInBtn");
  const signUpBtn = document.getElementById("signUpBtn");
  const signOutBtn = document.getElementById("signOutBtn");

  const playBtn = document.getElementById("playBtn");

  const signUpPopup = document.getElementById("signUpPopup");
  const closePopup = document.getElementById("closePopup");
  const signUpForm = document.getElementById("signUpForm");

  //  username popup
  const usernamePopup = document.getElementById("usernamePopup");
  const usernameInput = document.getElementById("usernameInput");
  const saveUsernameBtn = document.getElementById("saveUsernameBtn");

  function showUsernamePopup() {
    usernamePopup.style.display = "flex";
  }

  /* =========================
     DROPDOWN
  ========================= */
  profileBtn?.addEventListener("click", () => {
    dropdownMenu?.classList.toggle("hidden");
  });

  /* =========================
     GOOGLE SIGN IN
  ========================= */
  async function handleGoogleSignIn() {
    try {
      const result = await signInWithPopup(auth, provider);
      await getOrCreateUser(result.user);
    } catch (err) {
      console.error(err);
      alert("Google sign-in failed");
    }
  }

  signInBtn?.addEventListener("click", handleGoogleSignIn);

  /* =========================
     EMAIL SIGN UP
  ========================= */
  signUpForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const displayName = document.getElementById("displayName").value.trim();
    const email = document.getElementById("signupEmail").value.trim().toLowerCase();
    const password = document.getElementById("signupPassword").value;
    const age = Number(document.getElementById("age").value);

    if (!displayName || !email || !password || !age) {
      return alert("Fill all fields");
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

      alert("Account created!");
      signUpPopup.style.display = "none";
      signUpForm.reset();

    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  /* =========================
     USERNAME SAVE
  ========================= */
  saveUsernameBtn?.addEventListener("click", async () => {
    const name = usernameInput.value.trim();

    if (!name) return alert("Enter a username");

    try {
      const user = auth.currentUser;

      await updateProfile(user, {
        displayName: name
      });

      await setDoc(doc(db, "users", user.uid), {
        displayName: name
      }, { merge: true });

      usernamePopup.style.display = "none";

      const snap = await getDoc(doc(db, "users", user.uid));
      updateUI(safeUser(user, snap.data()));

    } catch (err) {
      console.error(err);
      alert("Failed to save username");
    }
  });

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

// Username Setup
    if (dbData.isNew || !dbData.displayName) {
      showUsernamePopup();
      return;
    }

    updateUI(safeUser(user, dbData));
  });

  /* =========================
     UI UPDATE
  ========================= */
  function updateUI(user) {
    if (!user) {
      profileImage.src = "./Images/defaultPFP.jpg";
      signInBtn?.classList.remove("hidden");
      signUpBtn?.classList.remove("hidden");
      signOutBtn?.classList.add("hidden");
    } else {
      profileImage.src = user.photo;
      signInBtn?.classList.add("hidden");
      signUpBtn?.classList.add("hidden");
      signOutBtn?.classList.remove("hidden");
    }
  }

  /* =========================
     PLAY
  ========================= */
  playBtn?.addEventListener("click", () => {
    if (!currentUser) return alert("Sign in first");
    window.location.href = "games.html";
  });

});