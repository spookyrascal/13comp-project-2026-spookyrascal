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
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   STATE
========================= */
let user = null;
let gameId = null;
let unsub = null;
let ended = false;
let lastDistance = null;

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
   AUTH
========================= */
initAuth((u) => {

  if (!u) {
    location.href = "index.html";
    return;
  }

  user = {
    uid: u.uid,
    name: u.displayName || "Player",
    email: u.email || "",
    photo: u.photoURL || "./Images/defaultPFP.jpg"
  };

  renderUserHeader(user);

  loadLobby();
});

/* =========================
   CREATE GAME
========================= */
createBtn?.addEventListener("click", async () => {

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
    createdAt: serverTimestamp(),
    lastActive: serverTimestamp()
  });

  join(ref.id);
});

/* =========================
   LOBBY
========================= */
function loadLobby() {

  const q = query(
    collection(db, "games"),
    where("status", "==", "waiting")
  );

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
          status: "playing",
          lastActive: serverTimestamp()
        });

        join(docSnap.id);
      };

      lobbyList.appendChild(div);
    });
  });
}

/* =========================
   JOIN GAME
========================= */
function join(id) {

  gameId = id;
  ended = false;
  lastDistance = null;

  lobbySection.classList.add("hidden");
  gameSection.classList.remove("hidden");
  winScreen.classList.add("hidden");

  if (unsub) unsub();
  listen(id);
}

/* =========================
   EXIT GAME 
========================= */
function exitGame() {

  gameId = null;
  lastDistance = null;
  ended = false;

  if (unsub) unsub();

  gameSection.classList.add("hidden");
  winScreen.classList.add("hidden");
  lobbySection.classList.remove("hidden");

  feedback.textContent = "";
  history.innerHTML = "";
}

/* =========================
   GUESS SYSTEM
========================= */
guessBtn?.addEventListener("click", async () => {

  if (!gameId || ended) return;

  const guess = Number(guessInput.value);

  if (!guess || guess < 1 || guess > 100) {
    feedback.textContent = "1–100 only";
    return;
  }

  const ref = doc(db, "games", gameId);
  const snap = await getDoc(ref);
  const g = snap.data();

  if (!g || g.currentTurn !== user.uid) {
    feedback.textContent = "Not your turn";
    return;
  }

  const isP1 = user.uid === g.player1Id;
  const opponentId = isP1 ? g.player2Id : g.player1Id;

  const distance = Math.abs(guess - g.secretNumber);

  let trend = "";

  if (lastDistance !== null) {
    trend =
      distance < lastDistance ? " 🔥 HOTTER" :
      distance > lastDistance ? " 🧊 COLDER" :
      " 😐 SAME";
  }

  lastDistance = distance;

  feedback.textContent =
    distance === 0
      ? "🎯 EXACT!"
      : distance <= 3
        ? "🔥 BURNING"
        : distance <= 10
          ? "☀️ HOT"
          : "❄️ COLD" + trend;

  const win = distance === 0;

  const updates = {
    [isP1 ? "player1Guesses" : "player2Guesses"]: arrayUnion(guess),
    currentTurn: isP1 ? g.player2Id : g.player1Id,
    lastActive: serverTimestamp(),
    status: win ? "finished" : "playing"
  };

  /* =========================
     WIN HANDLING 
  ========================= */
  if (win && !ended) {

    ended = true;

    updates.winnerId = user.uid;

    await updateDoc(doc(db, "users", user.uid), {
      wins: increment(1),
      gamesPlayed: increment(1)
    });

    if (opponentId) {
      await updateDoc(doc(db, "users", opponentId), {
        gamesPlayed: increment(1)
      });
    }

    setTimeout(() => {
      exitGame();
    }, 2500);
  }

  await updateDoc(ref, updates);

  guessInput.value = "";
});

/* =========================
   LISTENER
========================= */
function listen(id) {

  const ref = doc(db, "games", id);

  unsub = onSnapshot(ref, (snap) => {

    const g = snap.data();
    if (!g) return;

    opponent.textContent =
      "Opponent: " +
      (user.uid === g.player1Id
        ? g.player2Name
        : g.player1Name || "Waiting");

    turn.textContent =
      g.currentTurn === user.uid
        ? "🔥 Your turn"
        : "⏳ Opponent turn";

    const guesses =
      user.uid === g.player1Id
        ? g.player1Guesses
        : g.player2Guesses;

    history.innerHTML =
      (guesses || [])
        .map(x => `<div class="guessChip">${x}</div>`)
        .join("");

    /* =========================
       GAME END STATE
    ========================= */
    if (g.status === "finished" && !ended) {

      ended = true;

      gameSection.classList.add("hidden");
      winScreen.classList.remove("hidden");

      winText.textContent =
        g.winnerId === user.uid
          ? "YOU WIN 🔥"
          : "YOU LOSE 💀";

      setTimeout(() => {
        exitGame();
      }, 3000);
    }
  });
}

/* =========================
   LEAVE BUTTON
========================= */
leaveBtn?.addEventListener("click", exitGame);