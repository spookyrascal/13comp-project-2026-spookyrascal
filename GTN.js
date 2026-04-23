import { auth, db } from "../../firebase.js";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  getDocs,
  getDoc,
  arrayUnion,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let currentUser = null;
let currentGameId = null;
let unsubscribeGame = null; 

const ui = {
  lobby: document.getElementById("lobby"),
  gameArea: document.getElementById("gameArea"),
  createBtn: document.getElementById("createGameBtn"),
  gameList: document.getElementById("gameList"),
  guessBtn: document.getElementById("guessBtn"),
  guessInput: document.getElementById("guessInput"),
  statusText: document.getElementById("statusText"),
  opponentText: document.getElementById("opponentText"),
  turnText: document.getElementById("turnText"),
  feedback: document.getElementById("feedback"),
  history: document.getElementById("history")
};

// AUTH
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "../../index.html";
    return;
  }

  currentUser = user;
  loadLobby();
});

// CREATE GAME
ui.createBtn.addEventListener("click", async () => {
  const gameRef = await addDoc(collection(db, "games"), {
    player1Id: currentUser.uid,
    player1Name: currentUser.displayName || "Player 1",
    player2Id: null,
    player2Name: null,
    secretNumber: randomNumber(),
    currentTurn: currentUser.uid,
    status: "waiting",
    player1Guesses: [],
    player2Guesses: [],
    player1Attempts: 0,
    player2Attempts: 0,
    winnerId: null,
    createdAt: serverTimestamp(),
    lastActive: serverTimestamp()
  });

  listenToGame(gameRef.id);
});

// LOAD LOBBY
async function loadLobby() {
  const snap = await getDocs(collection(db, "games"));
  ui.gameList.innerHTML = "";

  snap.forEach((docSnap) => {
    const game = docSnap.data();

    if (game.status !== "waiting") return;
    if (game.player1Id === currentUser.uid) return; 

    const btn = document.createElement("button");
    btn.textContent = `Join vs ${game.player1Name}`;

    btn.onclick = () => joinGame(docSnap.id);

    ui.gameList.appendChild(btn);
  });
}

// JOIN GAME
async function joinGame(gameId) {
  const ref = doc(db, "games", gameId);

  await updateDoc(ref, {
    player2Id: currentUser.uid,
    player2Name: currentUser.displayName || "Player 2",
    status: "playing",
    lastActive: serverTimestamp()
  });

  listenToGame(gameId);
}

// LISTEN
function listenToGame(gameId) {
  currentGameId = gameId;

  if (unsubscribeGame) unsubscribeGame(); 

  unsubscribeGame = onSnapshot(doc(db, "games", gameId), (snap) => {
    const game = snap.data();
    if (!game) return;

    ui.lobby.classList.add("hidden");
    ui.gameArea.classList.remove("hidden");

    updateUI(game);
  });
}

// UPDATE UI
function updateUI(game) {
  const isPlayer1 = currentUser.uid === game.player1Id;

  const opponent = isPlayer1
    ? game.player2Name
    : game.player1Name;

  ui.opponentText.textContent = `Opponent: ${opponent || "Waiting..."}`;
  ui.statusText.textContent = `Status: ${game.status}`;

  const isMyTurn = game.currentTurn === currentUser.uid;

  ui.turnText.textContent = isMyTurn
    ? "Your Turn"
    : "Opponent's Turn";

  ui.guessBtn.disabled = !isMyTurn; 

  const myGuesses = isPlayer1
    ? game.player1Guesses
    : game.player2Guesses;

  ui.history.innerHTML = myGuesses
    .map(g => `<p>${g}</p>`)
    .join("");

  if (game.status === "finished") {
    ui.feedback.textContent =
      game.winnerId === currentUser.uid
        ? "You Win!"
        : "You Lose";

    ui.guessBtn.disabled = true;
  }
}

// GUESS
ui.guessBtn.addEventListener("click", handleGuess);

async function handleGuess() {
  const guess = Number(ui.guessInput.value);

  if (!isValidGuess(guess)) {
    ui.feedback.textContent = "Enter 1–100";
    return;
  }

  const ref = doc(db, "games", currentGameId);
  const snap = await getDoc(ref);
  const game = snap.data();

  if (!game || game.currentTurn !== currentUser.uid) return;

  const isPlayer1 = currentUser.uid === game.player1Id;

  const guessField = isPlayer1 ? "player1Guesses" : "player2Guesses";
  const attemptField = isPlayer1 ? "player1Attempts" : "player2Attempts";

  await updateDoc(ref, {
    [guessField]: arrayUnion(guess),
    [attemptField]: increment(1),
    lastActive: serverTimestamp()
  });

  ui.guessInput.value = "";

  if (guess === game.secretNumber) {
    await updateDoc(ref, {
      status: "finished",
      winnerId: currentUser.uid
    });
    return;
  }

  ui.feedback.textContent =
    guess > game.secretNumber ? "Too high" : "Too low";

  const nextTurn =
    game.currentTurn === game.player1Id
      ? game.player2Id
      : game.player1Id;

  await updateDoc(ref, { currentTurn: nextTurn });
}

// UTIL
function randomNumber() {
  return Math.floor(Math.random() * 100) + 1;
}

function isValidGuess(n) {
  return Number.isInteger(n) && n >= 1 && n <= 100;
}