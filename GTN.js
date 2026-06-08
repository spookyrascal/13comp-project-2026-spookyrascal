import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

const DEFAULT_PFP = "./Images/defaultPFP.jpg";

/* =========================
   AUTH
========================= */
onAuthStateChanged(auth, (u) => {
  if (!u) return (location.href = "index.html");

  user = {
    uid: u.uid,
    name: u.displayName || "Player",
    photo: u.photoURL || DEFAULT_PFP
  };

  loadLobby();
});

/* =========================
   HELPERS
========================= */
function safeArray(v) {
  return Array.isArray(v) ? v.filter(Boolean) : [];
}

function getDistanceClass(d) {
  const dist = Number(d ?? 999);

  if (dist === 0) return "guessHot";
  if (dist <= 3) return "guessHot";
  if (dist <= 10) return "guessWarm";
  return "guessCold";
}

function formatGuess(guess, secret, last) {
  const distance = Math.abs(guess - secret);

  let msg =
    distance === 0
      ? "Correct!"
      : distance <= 3
      ? "Very hot"
      : distance <= 10
      ? "Warm"
      : "Cold";

  if (last != null && distance !== 0) {
    msg += distance < last ? " (closer)" : " (colder)";
  }

  return { distance, msg };
}

/* =========================
   ENTER KEY SUPPORT
========================= */
guessInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    guessBtn.click();
  }
});

/* =========================
   CREATE GAME
========================= */
createBtn?.addEventListener("click", async () => {
  const name = lobbyInput.value.trim() || "Lobby";

  const ref = await addDoc(collection(db, "games"), {
    lobbyName: name,

    player1Id: user.uid,
    player1Name: user.name,

    player2Id: "",
    player2Name: "",

    secretNumber: Math.floor(Math.random() * 100) + 1,

    currentTurn: user.uid,
    status: "waiting",

    player1Guesses: [],
    player2Guesses: [],

    player1LastDistance: null,
    player2LastDistance: null,

    winnerId: "",

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

      if (!g.player1Id || g.player1Id === user.uid) return;

      const card = document.createElement("div");
      card.className = "lobbyCard";

      card.innerHTML = `
        <h3>${g.lobbyName || "Lobby"}</h3>
        <p>Host: ${g.player1Name || "Unknown"}</p>
        <button>Join</button>
      `;

      card.querySelector("button").onclick = async () => {
        await updateDoc(doc(db, "games", docSnap.id), {
          player2Id: user.uid,
          player2Name: user.name,
          status: "playing",
          lastActive: serverTimestamp()
        });

        join(docSnap.id);
      };

      lobbyList.appendChild(card);
    });
  });
}

/* =========================
   JOIN / EXIT
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

function exitGame() {
  gameId = null;
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
  if (!Number.isInteger(guess) || guess < 1 || guess > 100) return;

  const ref = doc(db, "games", gameId);
  const snap = await getDoc(ref);
  const g = snap.data();

  if (!g) return;
  if (g.status === "finished") return;

  if (!g.player2Id) {
    feedback.textContent = "Waiting for opponent...";
    return;
  }

  if (g.currentTurn !== user.uid) {
    feedback.textContent = "Not your turn!";
    return;
  }

  const isP1 = g.player1Id === user.uid;
  const secret = Number(g.secretNumber || 0);

  const last = isP1 ? g.player1LastDistance : g.player2LastDistance;

  const { distance, msg } = formatGuess(guess, secret, last);

  feedback.textContent = msg;

  const field = isP1 ? "player1Guesses" : "player2Guesses";

  const updates = {
    [field]: arrayUnion({
      value: guess,
      hint: msg,
      distance
    }),

    currentTurn: isP1 ? g.player2Id : g.player1Id,
    lastActive: serverTimestamp(),
    status: "playing"
  };

  if (isP1) updates.player1LastDistance = distance;
  else updates.player2LastDistance = distance;

  if (distance === 0) {
    updates.status = "finished";
    updates.winnerId = user.uid;
    updates.currentTurn = "";

    const loserId = isP1 ? g.player2Id : g.player1Id;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        wins: increment(1),
        gamesPlayed: increment(1),
        lastActive: serverTimestamp()
      });

      if (loserId) {
        await updateDoc(doc(db, "users", loserId), {
          losses: increment(1),
          gamesPlayed: increment(1),
          lastActive: serverTimestamp()
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  await updateDoc(ref, updates);
  guessInput.value = "";
});

/* =========================
   REALTIME LISTENER
========================= */
function listen(id) {
  const ref = doc(db, "games", id);

  unsub = onSnapshot(ref, (snap) => {
    const g = snap.data();
    if (!g) return;

    const isP1 = g.player1Id === user.uid;

    opponent.textContent =
      isP1 ? g.player2Name || "Waiting..." : g.player1Name || "Waiting...";

    const myTurn = g.currentTurn === user.uid;

    turn.textContent = myTurn ? "Your turn" : "Opponent's turn";

    guessInput.disabled = !myTurn || g.status === "finished";
    guessBtn.disabled = !myTurn || g.status === "finished";

    const own = safeArray(isP1 ? g.player1Guesses : g.player2Guesses);
    const opp = safeArray(isP1 ? g.player2Guesses : g.player1Guesses);

    history.innerHTML = `
      <div class="guessSection">
        <strong>You</strong>
        ${own.map((x, i) => `
          <div class="${getDistanceClass(x.distance)} guessFlash">
            #${i + 1} ${x.value} — <b>${x.hint}</b>
          </div>
        `).join("")}
      </div>

      <div class="guessSection">
        <strong>Opponent</strong>
        ${opp.map((x, i) => `
          <div>#${i + 1} ${x.value || ""}</div>
        `).join("")}
      </div>
    `;

    if (g.status === "finished") {
      ended = true;

      guessInput.disabled = true;
      guessBtn.disabled = true;

      gameSection.classList.add("hidden");
      winScreen.classList.remove("hidden");

      winText.textContent =
        g.winnerId === user.uid ? "You win 🎉" : "You lose 💀";
    }
  });
}
