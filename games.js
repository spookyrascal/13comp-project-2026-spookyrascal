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

import { initProfileNav } from "./authState.js";

initProfileNav();

/* =========================
   AUTH INIT
========================= */
initAuth((user) => {
  renderUserHeader(user);

  if (!user) window.location.href = "index.html";
});

/* =========================
   STATE
========================= */
let currentUser = null;
let currentGameId = null;

/* =========================
   DOM
========================= */
const el = {
  createGameBtn: document.getElementById("createGameBtn"),
  lobbyNameInput: document.getElementById("lobbyNameInput"),

  guessInput: document.getElementById("guessInput"),
  guessBtn: document.getElementById("guessBtn"),

  lobbyList: document.getElementById("lobbyList"),

  lobbySection: document.getElementById("lobbySection"),
  gameSection: document.getElementById("gameSection"),

  opponentInfo: document.getElementById("opponentInfo"),
  turnInfo: document.getElementById("turnInfo")
};

/* =========================
   AUTH STATE
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
el.createGameBtn?.addEventListener("click", async () => {
  if (!currentUser) return;

  const lobbyName = el.lobbyNameInput?.value?.trim() || "Lobby";

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
  if (!el.lobbyList) return;

  const q = query(
    collection(db, "games"),
    where("status", "==", "waiting")
  );

  onSnapshot(q, (snapshot) => {
    el.lobbyList.innerHTML = "";

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

      el.lobbyList.appendChild(card);
    });
  });
}

/* =========================
   JOIN GAME
========================= */
function joinGame(id) {
  currentGameId = id;

  el.lobbySection?.classList.add("hidden");
  el.gameSection?.classList.remove("hidden");

  listenToGame(id);
}

/* =========================
   GAME RULES
========================= */
function canPlay(game) {
  return (
    game.status === "playing" &&
    game.player1Id &&
    game.player2Id &&
    game.currentTurn === currentUser.uid
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

    if (el.opponentInfo) {
      el.opponentInfo.textContent =
        `Opponent: ${opponent || "Waiting for opponent..."}`;
    }

    if (el.turnInfo) {
      if (game.status === "waiting") {
        el.turnInfo.textContent = "Waiting for opponent...";
      } else if (game.status === "finished") {
        el.turnInfo.textContent = "Game Finished";
      } else {
        el.turnInfo.textContent = canPlay(game)
          ? "🔥 Your Turn"
          : "⏳ Opponent Turn";
      }
    }

    const playable = canPlay(game);
    if (el.guessInput) el.guessInput.disabled = !playable;
    if (el.guessBtn) el.guessBtn.disabled = !playable;
  });
}

/* =========================
   GUESS SYSTEM
========================= */
el.guessBtn?.addEventListener("click", async () => {
  if (!currentGameId || !currentUser) return;

  const ref = doc(db, "games", currentGameId);
  const snap = await getDoc(ref);
  const game = snap.data();

  if (!game || !canPlay(game)) return;

  const guess = Number(el.guessInput.value);
  if (isNaN(guess)) return;

  const isP1 = currentUser.uid === game.player1Id;

  const guessField = isP1 ? "player1Guesses" : "player2Guesses";
  const attemptField = isP1 ? "player1Attempts" : "player2Attempts";

  const updatedGuesses = [
    ...(game[guessField] || []),
    guess
  ];

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

  el.guessInput.value = "";
});

/* =========================
   CLEANUP
========================= */
window.addEventListener("beforeunload", () => {
  // reserved for later cleanup
});