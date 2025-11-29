// scripts/authUtils.js

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let user = null;

// Called once when app loads
export function initAuth(callback) {
  const auth = getAuth();
  onAuthStateChanged(auth, (currentUser) => {
    user = currentUser || null;
    if (callback && typeof callback === "function") {
      callback(user);
    }
  });
}

// Is user logged in?
export function isUserLoggedIn() {
  return user !== null;
}

// Get user UID or null
export function getUserId() {
  return user?.uid || null;
}

// Get user email or null
export function getUserEmail() {
  return user?.email || null;
}
