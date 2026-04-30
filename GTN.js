import { auth, db } from "./firebase.js";
import "./auth";
import {
    collection,
    addDoc,
    doc,
    updateDoc,
    onSnapshot,
    query,
    where,
    arrayUnion,
    increment,
    serverTimestamp,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* =========================
   STATE
========================= */
import { getCurrentUser } from "./auth.js";
let currentGameId = null;
let gameData = null;

/* =========================
   SAFE USER HELPERS
========================= */
function getSafeName(user) {
    return (
        user?.displayName ||
        user?.email?.split("@")[0] ||
        "Anonymous"
    );
}

function getSafePhoto(user) {
    return user?.photoURL || "./Images/defaultPFP.jpg";
}

/* =========================
   UI
========================= */
const lobbySection = document.getElementById("lobbySection");
const gameSection = document.getElementById("gameSection");

const lobbyList = document.getElementById("lobbyList");
const lobbyNameInput = document.getElementById("lobbyNameInput");

const createGameBtn = document.getElementById("createGameBtn");
const guessBtn = document.getElementById("guessBtn");
const guessInput = document.getElementById("guessInput");

const feedback = document.getElementById("feedback");
const guessHistory = document.getElementById("guessHistory");

const opponentInfo = document.getElementById("opponentInfo");
const turnInfo = document.getElementById("turnInfo");

const winScreen = document.getElementById("winScreen");
const winText = document.getElementById("winText");

const rematchBtn = document.getElementById("rematchBtn");
const leaveBtn = document.getElementById("leaveBtn");
const currentUser = getCurrentUser();

/* =========================
   AUTH
========================= */
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "../../index.html";
        return;
    }

    currentUser = user;
    loadLobby();
});

/* =========================
   CREATE GAME
========================= */
createGameBtn.addEventListener("click", async () => {

    const lobbyName = lobbyNameInput.value.trim() || "Untitled Lobby";

    const ref = await addDoc(collection(db, "games"), {
        lobbyName,

        player1Id: currentUser.uid,
        player1Name: getSafeName(currentUser),
        player1Photo: getSafePhoto(currentUser),

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

    const q = query(collection(db, "games"), where("status", "==", "waiting"));

    onSnapshot(q, (snapshot) => {

        lobbyList.innerHTML = "";

        snapshot.forEach((docSnap) => {

            const game = docSnap.data();

            const card = document.createElement("div");
            card.className = "lobbyCard";

            card.innerHTML = `
                <h3>${game.lobbyName}</h3>
                <p>Host: ${game.player1Name || "Unknown"}</p>
                <button>Join</button>
            `;

            card.querySelector("button").onclick = async () => {

                await updateDoc(doc(db, "games", docSnap.id), {
                    player2Id: currentUser.uid,
                    player2Name: getSafeName(currentUser),
                    player2Photo: getSafePhoto(currentUser),
                    status: "playing"
                });

                joinGame(docSnap.id);
            };

            lobbyList.appendChild(card);
        });
    });
}

/* =========================
   JOIN GAME
========================= */
function joinGame(id) {
    currentGameId = id;
    lobbySection.classList.add("hidden");
    gameSection.classList.remove("hidden");
    listenToGame(id);
}

/* =========================
   GAME LISTENER
========================= */
function listenToGame(id) {

    const ref = doc(db, "games", id);

    onSnapshot(ref, async (snap) => {

        gameData = snap.data();
        if (!gameData) return;

        /* =========================
           WIN SCREEN
        ========================= */
        if (gameData.status === "finished") {

            gameSection.classList.add("hidden");
            winScreen.classList.remove("hidden");

            winText.textContent =
                gameData.winnerId === currentUser.uid
                    ? "🏆 YOU WON!"
                    : "💀 YOU LOST";

            return;
        }

        /* =========================
           OPPONENT INFO
        ========================= */
        const opponentName =
            currentUser.uid === gameData.player1Id
                ? gameData.player2Name
                : gameData.player1Name;

        opponentInfo.textContent = `Opponent: ${opponentName || "Waiting..."}`;

        /* =========================
           TURN INFO
        ========================= */
        turnInfo.textContent =
            gameData.currentTurn === currentUser.uid
                ? "🎯 Your Turn"
                : "⏳ Opponent Turn";

        /* =========================
           GUESS HISTORY
        ========================= */
        const myGuesses =
            currentUser.uid === gameData.player1Id
                ? gameData.player1Guesses
                : gameData.player2Guesses;

        guessHistory.innerHTML = myGuesses
            .map(g => `<p>${g}</p>`)
            .join("");
    });
}

/* =========================
   MAKE GUESS
========================= */
guessBtn.addEventListener("click", async () => {

    const guess = Number(guessInput.value);

    if (!Number.isInteger(guess) || guess < 1 || guess > 100) {
        feedback.textContent = "Enter 1–100";
        return;
    }

    if (gameData.currentTurn !== currentUser.uid) return;

    const ref = doc(db, "games", currentGameId);

    const isP1 = currentUser.uid === gameData.player1Id;

    const guessField = isP1 ? "player1Guesses" : "player2Guesses";
    const attemptField = isP1 ? "player1Attempts" : "player2Attempts";

    await updateDoc(ref, {
        [guessField]: arrayUnion(guess),
        [attemptField]: increment(1)
    });

    /* =========================
       WIN CHECK
    ========================= */
    if (guess === gameData.secretNumber) {

        await updateDoc(ref, {
            status: "finished",
            winnerId: currentUser.uid
        });

        await updateLeaderboard(gameData, currentUser.uid);
        return;
    }

    feedback.textContent =
        guess > gameData.secretNumber ? "Too high 📈" : "Too low 📉";

    /* SWITCH TURN */
    const nextTurn =
        gameData.currentTurn === gameData.player1Id
            ? gameData.player2Id
            : gameData.player1Id;

    await updateDoc(ref, {
        currentTurn: nextTurn
    });
});

/* =========================
   LEADERBOARD 
========================= */
async function updateLeaderboard(game, winnerId) {

    const players = [
        game.player1Id,
        game.player2Id
    ];

    for (let uid of players) {

        if (!uid) continue;

        const ref = doc(db, "leaderboard", uid);
        const snap = await getDoc(ref);

        const isWinner = uid === winnerId;

        const displayName =
            uid === game.player1Id
                ? game.player1Name
                : game.player2Name;

        const photoURL =
            uid === game.player1Id
                ? game.player1Photo
                : game.player2Photo;

        const safeName = displayName || "Anonymous";
        const safePhoto = photoURL || "./Images/defaultPFP.jpg";

        if (!snap.exists()) {
            await setDoc(ref, {
                userId: uid,

                displayName: safeName,
                photoURL: safePhoto,

                wins: isWinner ? 1 : 0,
                gamesPlayed: 1,

                bestScore: 1,

                updatedAt: serverTimestamp()
            });
        } else {
            await updateDoc(ref, {
                displayName: safeName,
                photoURL: safePhoto,

                wins: increment(isWinner ? 1 : 0),
                gamesPlayed: increment(1),

                updatedAt: serverTimestamp()
            });
        }
    }
}

/* =========================
   REMATCH
========================= */
rematchBtn?.addEventListener("click", async () => {

    const ref = doc(db, "games", currentGameId);

    await updateDoc(ref, {
        status: "playing",
        secretNumber: Math.floor(Math.random() * 100) + 1,

        player1Guesses: [],
        player2Guesses: [],

        player1Attempts: 0,
        player2Attempts: 0,

        winnerId: null,
        currentTurn: gameData.player1Id
    });

    winScreen.classList.add("hidden");
    gameSection.classList.remove("hidden");
});

/* =========================
   LEAVE
========================= */
leaveBtn?.addEventListener("click", () => location.reload());

