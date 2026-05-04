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
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   STATE
========================= */
let currentUser = null;
let currentGameId = null;
let gameData = null;
let unsubscribeGame = null;

/* =========================
   DOM
========================= */
const el = {
  lobbyList: document.getElementById("lobbyList"),
  lobbySection: document.getElementById("lobbySection"),
  gameSection: document.getElementById("gameSection"),

  lobbyInput: document.getElementById("lobbyNameInput"),
  createBtn: document.getElementById("createGameBtn"),

  guessInput: document.getElementById("guessInput"),
  guessBtn: document.getElementById("guessBtn"),
  guessList: document.getElementById("guessList"),

  opponentInfo: document.getElementById("opponentInfo"),
  turnInfo: document.getElementById("turnInfo")
};

/* =========================
   AUTH
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../../index.html";
    return;
  }

  currentUser = await getUserProfile(user);
  loadLobby();
});

/* =========================
   CREATE GAME
========================= */
el.createBtn?.addEventListener("click", async () => {
  if (!currentUser) return;

  const lobbyName = el.lobbyInput?.value.trim() || "Lobby";

  const ref = await addDoc(collection(db, "games"), {
    lobbyName,

    player1Id: currentUser.uid,
    player1Name: currentUser.name,
    player1Photo: currentUser.photo,

    player2Id: null,
    player2Name: null,
    player2Photo: null,

    secretNumber: Math.floor(Math.random() * 100) + 1,

    currentTurn: currentUser.uid,
    status: "waiting",

    player1Guesses: [],
    player2Guesses: [],

    player1Attempts: 0,
    player2Attempts: 0,

    winnerId: null,
    createdAt: serverTimestamp()
  });

  joinGame(ref.id);
});

/* =========================
   LOBBY
========================= */
function loadLobby() {
  if (!el.lobbyList) return;

  const q = query(collection(db, "games"), where("status", "==", "waiting"));

  onSnapshot(q, (snapshot) => {
    el.lobbyList.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const game = docSnap.data();

      const card = document.createElement("div");
      card.className = "lobbyCard";

      card.innerHTML = `
        <h3>${game.lobbyName}</h3>
        <p>Host: ${game.player1Name}</p>
        <button class="joinBtn">Join</button>
      `;

      const btn = card.querySelector(".joinBtn");

      btn?.addEventListener("click", async () => {
        if (!currentUser) return;

        await updateDoc(doc(db, "games", docSnap.id), {
          player2Id: currentUser.uid,
          player2Name: currentUser.name,
          player2Photo: currentUser.photo,
          status: "playing"
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
   GAME LISTENER
========================= */
function listenToGame(id) {
  if (unsubscribeGame) unsubscribeGame();

  const ref = doc(db, "games", id);

  unsubscribeGame = onSnapshot(ref, (snap) => {
    gameData = snap.data();
    if (!gameData) return;

    const opponent =
      currentUser.uid === gameData.player1Id
        ? gameData.player2Name
        : gameData.player1Name;

    if (el.opponentInfo) {
      el.opponentInfo.textContent = `Opponent: ${opponent || "Waiting..."}`;
    }

    if (el.turnInfo) {
      el.turnInfo.textContent =
        gameData.currentTurn === currentUser.uid
          ? "Your Turn"
          : "Opponent Turn";
    }

    renderGuesses();
  });
}

/* =========================
   GUESS SYSTEM
========================= */
el.guessBtn?.addEventListener("click", async () => {
  if (!gameData || !currentGameId) return;

  const guess = Number(el.guessInput.value);

  if (!guess || guess < 1 || guess > 100) {
    return alert("Pick a number 1–100");
  }

  if (gameData.currentTurn !== currentUser.uid) {
    return alert("Not your turn");
  }

  const isP1 = currentUser.uid === gameData.player1Id;

  const guessField = isP1 ? "player1Guesses" : "player2Guesses";
  const attemptField = isP1 ? "player1Attempts" : "player2Attempts";

  const newGuesses = [...(gameData[guessField] || []), guess];

  let updateData = {
    [guessField]: newGuesses,
    [attemptField]: (gameData[attemptField] || 0) + 1
  };


  if (guess === gameData.secretNumber) {
    updateData.status = "finished";
    updateData.winnerId = currentUser.uid;
    updateData.currentTurn = null;
  } else {
    updateData.currentTurn =
      currentUser.uid === gameData.player1Id
        ? gameData.player2Id
        : gameData.player1Id;
  }

  await updateDoc(doc(db, "games", currentGameId), updateData);

  el.guessInput.value = "";
});

/* =========================
   RENDER GUESSES
========================= */
function renderGuesses() {
  if (!el.guessList || !gameData) return;

  const guesses =
    currentUser.uid === gameData.player1Id
      ? gameData.player1Guesses
      : gameData.player2Guesses;

  el.guessList.innerHTML = (guesses || [])
    .map(g => `<li>${g}</li>`)
    .join("");
}