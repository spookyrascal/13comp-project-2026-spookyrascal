import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   NORMALISE USER PROFILE
========================= */
function resolveName(authUser, dbData) {
  return (
    dbData?.displayName ||
    authUser?.displayName ||
    authUser?.email?.split("@")[0] ||
    "Player"
  );
}

function resolvePhoto(authUser, dbData) {
  return (
    dbData?.photoURL ||
    authUser?.photoURL ||
    "./Images/defaultPFP.jpg"
  );
}

/* =========================
   GLOBAL USER PROFILE LOADER
========================= */
export async function getUserProfile(user) {
  if (!user) return null;

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    const data = snap.exists() ? snap.data() : {};

<<<<<<< HEAD
  return {
    uid: user.uid,
    name: data.displayName || user.displayName || null,
    email: data.email || user.email || "",
    age: data.age || null,
    photo: data.photoURL || user.photoURL || "./Images/defaultPFP.jpg"
  };
=======
    const name = resolveName(user, data);
    const photo = resolvePhoto(user, data);

    return {
      uid: user.uid,
      name,
      email: data.email || user.email || "",
      age: data.age ?? null,
      photo
    };

  } catch (err) {
    console.warn("getUserProfile failed, using auth fallback:", err);

    return {
      uid: user.uid,
      name: user.displayName || user.email?.split("@")[0] || "Player",
      email: user.email || "",
      age: null,
      photo: user.photoURL || "./Images/defaultPFP.jpg"
    };
  }
>>>>>>> ee21aeda7ac9f2e6218f2f9fbe69c96ef44bdecd
}