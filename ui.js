/*
========================================
FILE: ui.js

PURPOSE:
Handles top navigation UI updates.

WHAT IT DOES:
- Shows/hides login vs profile UI
- Updates profile picture + name + email
========================================
*/

export function renderUserHeader(user) {

  const authButtons = document.getElementById("authButtons");
  const profileArea = document.getElementById("profileArea");

  const profileImage = document.getElementById("profileImage");
  const menuPfp = document.getElementById("menuPfp");
  const menuName = document.getElementById("menuName");
  const menuEmail = document.getElementById("menuEmail");

  // safety check
  if (!authButtons || !profileArea) return;

  // logged out state
  if (!user) {
    authButtons.classList.remove("hidden");
    profileArea.classList.add("hidden");
    return;
  }

  // logged in state
  authButtons.classList.add("hidden");
  profileArea.classList.remove("hidden");

  const photo = user.photo || "./Images/defaultPFP.jpg";
  const name = user.name || "Player";
  const email = user.email || "";

  if (profileImage) profileImage.src = photo;
  if (menuPfp) menuPfp.src = photo;
  if (menuName) menuName.textContent = name;
  if (menuEmail) menuEmail.textContent = email;
}