import { auth, db } from "./firebase.js";
import { initAuth } from "./authState.js";
import { renderUserHeader } from "./ui.js";

import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   STATE
========================= */
let user = null;
let gameId = null;
let unsub = null;
let ended = false;

/* =========================
   DOM
========================= */
const lobbySection = document.getElementById("lobbySection");
const gameSection = document.getElementById("gameSection");
const winScreen = document.getElementById("winScreen");

const lobbyList = document.getElementById("lobbyList");
const createBtn = document.getElementById("createGameBtn");
const lobbyInput = document.getElementById("lobbyNameInput");

const guessInput = document.getElementById("guessInput");
const guessBtn = document.getElementById("guessBtn");

const feedback = document.getElementById("feedback");
const history = document.getElementById("guessHistory");

const opponent = document.getElementById("opponentInfo");
const turn = document.getElementById("turnInfo");

const winText = document.getElementById("winText");
const leaveBtn = document.getElementById("leaveBtn");

/* =========================
   AUTH (FIXED)
========================= */
initAuth((u) => {
  renderUserHeader(u);

  if (!u) {
    location.href = "index.html";
    return;
  }

  user = u;
  loadLobby();
});

/* =========================
   CREATE GAME
========================= */
createBtn.addEventListener("click", async () => {
  if (!user) return;

  const name = lobbyInput.value.trim() || "Lobby";

  const ref = await addDoc(collection(db, "games"), {
    lobbyName: name,

    player1Id: user.uid,
    player1Name: user.name,
    player1Photo: user.photo,

    player2Id: null,
    player2Name: null,
    player2Photo: null,

    secretNumber: Math.floor(Math.random() * 100) + 1,

    currentTurn: user.uid,
    status: "waiting",

    player1Guesses: [],
    player2Guesses: [],

    winnerId: null,
    createdAt: serverTimestamp()
  });

  join(ref.id);
});

/* =========================
   LOBBY
========================= */
function loadLobby() {
  const q = query(collection(db, "games"), where("status", "==", "waiting"));

  onSnapshot(q, (snap) => {
    lobbyList.innerHTML = "";

    snap.forEach((docSnap) => {
      const g = docSnap.data();

      if (g.player1Id === user.uid) return;

      const div = document.createElement("div");
      div.className = "lobbyCard";

      div.innerHTML = `
        <h3>${g.lobbyName}</h3>
        <p>${g.player1Name}</p>
        <button>Join</button>
      `;

      div.querySelector("button").onclick = async () => {
        await updateDoc(doc(db, "games", docSnap.id), {
          player2Id: user.uid,
          player2Name: user.name,
          player2Photo: user.photo,
          status: "playing"
        });

        join(docSnap.id);
      };

      lobbyList.appendChild(div);
    });
  });
}

/* =========================
   JOIN
========================= */
function join(id) {
  gameId = id;
  ended = false;

  lobbySection.classList.add("hidden");
  gameSection.classList.remove("hidden");
  winScreen.classList.add("hidden");

  if (unsub) unsub();
  listen(id);
}

/* =========================
   GUESS
========================= */
guessBtn.onclick = async () => {
  if (!gameId || ended) return;

  const guess = Number(guessInput.value);

  if (!guess || guess < 1 || guess > 100) {
    feedback.textContent = "1–100 only";
    return;
  }

  const ref = doc(db, "games", gameId);
  const snap = await getDoc(ref);
  const g = snap.data();

  if (g.currentTurn !== user.uid) {
    feedback.textContent = "Not your turn";
    return;
  }

  const isP1 = user.uid === g.player1Id;
  const win = guess === g.secretNumber;

  feedback.textContent = win
    ? "Correct!"
    : guess < g.secretNumber
      ? "Too low"
      : "Too high";

  await updateDoc(ref, {
    [isP1 ? "player1Guesses" : "player2Guesses"]: arrayUnion(guess),
    currentTurn: isP1 ? g.player2Id : g.player1Id,
    winnerId: win ? user.uid : g.winnerId,
    status: win ? "finished" : "playing"
  });

  guessInput.value = "";
};

/* =========================
   LISTENER
========================= */
function listen(id) {
  const ref = doc(db, "games", id);

  unsub = onSnapshot(ref, async (snap) => {
    const g = snap.data();
    if (!g) return;

    const opp =
      user.uid === g.player1Id
        ? g.player2Name
        : g.player1Name;

    opponent.textContent = "Opponent: " + (opp || "Waiting");

    turn.textContent =
      g.currentTurn === user.uid ? "Your turn" : "Opponent turn";

    const guesses =
      user.uid === g.player1Id
        ? g.player1Guesses
        : g.player2Guesses;

    history.innerHTML = (guesses || [])
      .map(x => `<div class="guessChip">${x}</div>`)
      .join("");

    if (g.status === "finished" && !ended) {
      ended = true;

      const win = g.winnerId === user.uid;

      gameSection.classList.add("hidden");
      winScreen.classList.remove("hidden");

      winText.textContent = win ? "YOU WIN" : "YOU LOSE";
    }
  });
}

/* =========================
   LEAVE
========================= */
leaveBtn.onclick = () => {
  gameId = null;

  gameSection.classList.add("hidden");
  winScreen.classList.add("hidden");
  lobbySection.classList.remove("hidden");

  if (unsub) unsub();
};