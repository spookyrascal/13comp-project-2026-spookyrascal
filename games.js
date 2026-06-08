import { auth, db } from "./firebase.js";
import { getUserProfile } from "./user.js";
import { initAuth } from "./authState.js";
import { renderUserHeader } from "./ui.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   AUTH INIT
========================= */

initAuth((user) => {
  renderUserHeader(user);

  if (!user) {
    window.location.href = "index.html";
  }
});

/* =========================
   STATE
========================= */

let currentUser = null;
let currentGameId = null;

/* =========================
   DOM
========================= */

const createGameBtn = document.getElementById("createGameBtn");
const lobbyNameInput = document.getElementById("lobbyNameInput");

const guessInput = document.getElementById("guessInput");
const guessBtn = document.getElementById("guessBtn");

/* =========================
   AUTH
========================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  try {
    currentUser = await getUserProfile(user);
  } catch {
    currentUser = {
      uid: user.uid,
      name: user.displayName || "Player",
      photo: user.photoURL || "./Images/defaultPFP.jpg"
    };
  }

  loadLobby();
});

/* =========================
   CREATE GAME
========================= */

createGameBtn?.addEventListener("click", async () => {
  if (!currentUser) return;

  const lobbyName = lobbyNameInput?.value?.trim() || "Lobby";

  const ref = await addDoc(collection(db, "games"), {
    lobbyName,

    player1Id: currentUser.uid,
    player1Name: currentUser.name,

    player2Id: null,
    player2Name: null,

    status: "waiting",
    currentTurn: null,

    turnNumber: 0,
    secretNumber: Math.floor(Math.random() * 100) + 1,

    player1Guesses: [],
    player2Guesses: [],

    player1Attempts: 0,
    player2Attempts: 0,

    winnerId: "",

    createdAt: serverTimestamp()
  });

  joinGame(ref.id);
});

/* =========================
   LOBBY
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

          status: "playing",
          currentTurn: game.player1Id,
          turnNumber: 1
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
   TURN CHECK
========================= */

function canPlay(game) {
  return (
    game.status === "playing" &&
    game.currentTurn === currentUser.uid &&
    game.player1Id &&
    game.player2Id
  );
}

/* =========================
   GAME LISTENER
========================= */

function listenToGame(id) {
  const ref = doc(db, "games", id);

  onSnapshot(ref, (snap) => {
    const game = snap.data();
    if (!game) return;

    const opponent =
      currentUser.uid === game.player1Id
        ? game.player2Name
        : game.player1Name;

    const opponentInfo = document.getElementById("opponentInfo");
    const turnInfo = document.getElementById("turnInfo");

    if (opponentInfo) {
      opponentInfo.textContent =
        "Opponent: " + (opponent || "Waiting for opponent...");
    }

    if (turnInfo) {
      if (game.status === "waiting") {
        turnInfo.textContent = "Waiting for opponent...";
      } else if (game.status === "finished") {
        turnInfo.textContent = "Game Finished";
      } else {
        turnInfo.textContent = canPlay(game)
          ? "🔥 Your Turn"
          : "⏳ Opponent Turn";
      }
    }

    /* HARD UI LOCK */
    const playable = canPlay(game);
    if (guessInput) guessInput.disabled = !playable;
    if (guessBtn) guessBtn.disabled = !playable;
  });
}

/* =========================
   TURN SYSTEM (GUESS)
========================= */

guessBtn?.addEventListener("click", async () => {
  if (!currentGameId || !currentUser) return;

  const ref = doc(db, "games", currentGameId);
  const snap = await getDoc(ref);
  const game = snap.data();

  if (!game || !canPlay(game)) return;

  const guess = Number(guessInput.value);
  if (isNaN(guess)) return;

  const isP1 = currentUser.uid === game.player1Id;

  const guessField = isP1 ? "player1Guesses" : "player2Guesses";
  const attemptField = isP1 ? "player1Attempts" : "player2Attempts";

  const updatedGuesses = [...(game[guessField] || []), guess];

  const nextTurn =
    currentUser.uid === game.player1Id
      ? game.player2Id
      : game.player1Id;

  await updateDoc(ref, {
    [guessField]: updatedGuesses,
    [attemptField]: (game[attemptField] || 0) + 1,

    currentTurn: nextTurn,
    turnNumber: (game.turnNumber || 0) + 1,

    lastActive: serverTimestamp()
  });

  guessInput.value = "";
});

/* =========================
   CLEANUP
========================= */

window.addEventListener("beforeunload", () => {
  // optional cleanup later
});