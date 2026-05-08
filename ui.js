export function renderUserHeader(user) {

    const authButtons = document.getElementById("authButtons");
    const profileArea = document.getElementById("profileArea");
    const profileImage = document.getElementById("profileImage");
  
    if (!user) {
  
      // SHOW login, HIDE profile
      authButtons.classList.remove("hidden");
      profileArea.classList.add("hidden");
  
      return;
    }
  
    // SHOW profile, HIDE login
    authButtons.classList.add("hidden");
    profileArea.classList.remove("hidden");
  
    profileImage.src =
      user.photo || "./Images/defaultPFP.jpg";
  }