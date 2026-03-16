import { getFirestore, collection, getDocs, query, orderBy }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Initialize Firestore and Auth
const db = getFirestore();
const auth = getAuth();

// Profile Picture setup
const profilePic = document.getElementById("profilePic");
onAuthStateChanged(auth, (user) => {
    if(user){
        profilePic.src = user.photoURL;
    } else {
        profilePic.src = "defaultPFP.jpg";
    }
});

// Leaderboard Table
const tableBody = document.querySelector("#leaderboardTable tbody");

//function to load leaderboard
async function loadLeaderboard(){
    try{
        // referance leaderboard collection
        const leaderboardRef = collection(db, "leaderboard");

        // order by wins descending
        const q = query(leaderboardRef, orderBy("wins", "desc"));

        const querySnpshot = await getDocs(q);

    let rank = 1;
    querySnpshot.forEach((doc) => {
        const data = doc.data();
        
        const row = document.createElement("tr");
        row.innerHTML = `
        <td>${rank}</td>
        <td>${data.displayName || "Anonymous"}</td>
        <td>${data.wins}</td>
        <td>${data.gamesPlayed}</td>
        <td>${data.highScores}</td>
    
`;
tableBody.appendChild(row);
rank++;

    });

    } catch(error){
        console.error("Error loading leaderboard:", error);
    }
}

//call on page load 
loadLeaderboard();