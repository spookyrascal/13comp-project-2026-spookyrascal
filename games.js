import { auth, db } from "./firebase.js";
import { getUserProfile } from "./user.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   STATE
========================= */
let currentUser = null;
let currentGameId = null;

/* =========================
   SAFE DOM HELPERS
========================= */
const createGameBtn = document.getElementById("createGameBtn");
const lobbyNameInput = document.getElementById("lobbyNameInput");

const guessInput = document.getElementById("guessInput");
const guessBtn = document.getElementById("guessBtn");
const guessList = document.getElementById("guessList");

/* =========================
   AUTH (same pattern as home.js)
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  try {
    currentUser = await getUserProfile(user);
  } catch (err) {
    console.warn("Profile fallback used:", err);

    // fallback if getUserProfile fails
    currentUser = {
      uid: user.uid,
      name: user.displayName || "Player",
      photo: user.photoURL || "./Images/defaultPFP.jpg"
    };
  }

  loadLobby();
});

/* =========================
   CREATE GAME (SAFE)
========================= */
createGameBtn?.addEventListener("click", async () => {
  if (!currentUser) return alert("Not signed in yet");

  const lobbyName = lobbyNameInput?.value?.trim() || "Lobby";

  try {
    const ref = await addDoc(collection(db, "games"), {
      lobbyName,

      player1Id: currentUser.uid,
      player1Name: currentUser.name,
      player1Photo: currentUser.photo,

      player2Id: null,
      player2Name: null,

      secretNumber: Math.floor(Math.random() * 100) + 1,

      currentTurn: currentUser.uid,
      status: "waiting",

      player1Guesses: [],
      player2Guesses: [],

      winnerId: null,
      createdAt: serverTimestamp()
    });

    joinGame(ref.id);

  } catch (err) {
    console.error("Create game error:", err);
  }
});

/* =========================
   LOBBY (SAFE INIT)
========================= */
function loadLobby() {
  const lobbyList = document.getElementById("lobbyList");
  if (!lobbyList) return;

  const q = query(collection(db, "games"), where("status", "==", "waiting"));

  onSnapshot(q, (snapshot) => {
    lobbyList.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const game = docSnap.data();

      const card = document.createElement("div");
      card.className = "lobbyCard";

      card.innerHTML = `
        <h3>${game.lobbyName}</h3>
        <p>${game.player1Name}</p>
        <button class="joinBtn">Join</button>
      `;

      card.querySelector(".joinBtn")?.addEventListener("click", async () => {
        if (!currentUser) return;

        await updateDoc(doc(db, "games", docSnap.id), {
          player2Id: currentUser.uid,
          player2Name: currentUser.name,
          status: "playing"
        });

        joinGame(docSnap.id);
      });

      lobbyList.appendChild(card);
    });
  });
}

/* =========================
   JOIN GAME
========================= */
function joinGame(id) {
  currentGameId = id;

  document.getElementById("lobbySection")?.classList.add("hidden");
  document.getElementById("gameSection")?.classList.remove("hidden");

  listenToGame(id);
}

/* =========================
   GAME LISTENER
========================= */
function listenToGame(id) {
  const ref = doc(db, "games", id);

  onSnapshot(ref, (snap) => {
    const data = snap.data();
    if (!data) return;

    const opponent =
      currentUser.uid === data.player1Id
        ? data.player2Name
        : data.player1Name;

    const opponentInfo = document.getElementById("opponentInfo");
    const turnInfo = document.getElementById("turnInfo");

    if (opponentInfo) {
      opponentInfo.textContent = "Opponent: " + (opponent || "Waiting...");
    }

    if (turnInfo) {
      turnInfo.textContent =
        data.currentTurn === currentUser.uid
          ? "Your Turn"
          : "Opponent Turn";
    }
  });
}