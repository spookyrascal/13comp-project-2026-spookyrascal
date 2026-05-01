import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   GLOBAL USER PROFILE LOADER
========================= */
export async function getUserProfile(user) {
  if (!user) return null;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  const data = snap.exists() ? snap.data() : {};

  return {
    uid: user.uid,
    name: data.displayName || user.displayName || "Player",
    email: data.email || user.email || "",
    age: data.age || null,
    photo: data.photoURL || user.photoURL || "./Images/defaultPFP.jpg"
  };
}