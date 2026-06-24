/*
========================================
FILE: auth.js

PURPOSE:
Single unified authentication system.
Handles:
- Firebase auth state
- profile creation/loading
- profile navigation button
- safe fallback user object
========================================
*/

import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   PROFILE NAV BUTTON
========================= */

export function initProfileNav() {
  const btn = document.getElementById("profileBtn");

  if (!btn) return;

  btn.addEventListener("click", () => {
    window.location.href = "profile.html";
  });
}

/* =========================
   CLEAN USER PROFILE BUILDER
========================= */

function buildUser(authUser, dbData = {}) {
  return {
    uid: authUser.uid,
    name:
      dbData.displayName ||
      authUser.displayName ||
      authUser.email?.split("@")[0] ||
      "Player",
    email: dbData.email || authUser.email || "",
    photo:
      dbData.photoURL ||
      authUser.photoURL ||
      "./Images/defaultPFP.jpg"
  };
}

/* =========================
   GET OR CREATE USER PROFILE
========================= */

export async function getUserProfile(user) {
  if (!user) return null;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      displayName: user.displayName || "Player",
      email: user.email || "",
      photoURL: user.photoURL || "./Images/defaultPFP.jpg",
      createdAt: serverTimestamp()
    });
  }

  const data = snap.exists() ? snap.data() : {};
  return buildUser(user, data);
}

/* =========================
   AUTH STATE LISTENER
========================= */

export function initAuth(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return callback(null);

    try {
      const profile = await getUserProfile(user);
      callback(profile);
    } catch (err) {
      console.warn("Auth fallback:", err);
      callback(buildUser(user, {}));
    }
  });
}

/* =========================
   GOOGLE LOGIN
========================= */

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
}

/* =========================
   LOGOUT
========================= */

export async function logout() {
  return await signOut(auth);
}

/* =========================
   UPDATE DISPLAY NAME
========================= */

export async function updateUsername(uid, username) {
  const ref = doc(db, "users", uid);

  await setDoc(ref, { displayName: username }, { merge: true });
}