import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   HELPERS
========================= */

function cleanName(authUser, dbData) {
  return (
    dbData?.displayName ||
    authUser?.displayName ||
    authUser?.email?.split("@")[0] ||
    "Player"
  );
}

function cleanPhoto(authUser, dbData) {
  return (
    dbData?.photoURL ||
    authUser?.photoURL ||
    "./Images/defaultPFP.jpg"
  );
}

/* =========================
   GET USER PROFILE
========================= */

export async function getUserProfile(user) {
  if (!user) return null;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};

  // auto-create user if missing
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      displayName: cleanName(user, data),
      email: user.email || "",
      photoURL: user.photoURL || "./Images/defaultPFP.jpg",
      createdAt: serverTimestamp()
    });
  }

  return {
    uid: user.uid,
    name: cleanName(user, data),
    email: data.email || user.email || "",
    photo: cleanPhoto(user, data)
  };
}

/* =========================
   UPDATE USERNAME
========================= */

export async function updateUsername(uid, username) {
  const ref = doc(db, "users", uid);

  await updateDoc(ref, {
    displayName: username
  });
}