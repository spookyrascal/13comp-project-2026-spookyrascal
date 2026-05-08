export function renderUserHeader(user) {

  const authButtons = document.getElementById("authButtons");
  const profileArea = document.getElementById("profileArea");
  const profileImage = document.getElementById("profileImage");
  const menuPfp = document.getElementById("menuPfp");
  const menuName = document.getElementById("menuName");
  const menuEmail = document.getElementById("menuEmail");

  // PAGE SAFETY CHECK (prevents crashes on pages without header UI)
  if (!authButtons || !profileArea) return;

  if (!user) {

    authButtons.classList.remove("hidden");
    profileArea.classList.add("hidden");

    return;
  }

  authButtons.classList.add("hidden");
  profileArea.classList.remove("hidden");

  const photo = user.photo || "./Images/defaultPFP.jpg";
  const name = user.name || user.username || "Player";
  const email = user.email || "";

  // main header profile
  if (profileImage) profileImage.src = photo;

  // dropdown profile
  if (menuPfp) menuPfp.src = photo;
  if (menuName) menuName.textContent = name;
  if (menuEmail) menuEmail.textContent = email;
}