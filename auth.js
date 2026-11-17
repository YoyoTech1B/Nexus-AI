import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

/* =========================================
   NEXUS AI — AUTHENTICATION
========================================= */

// Firebase project configuration (these values are public by design)
const firebaseConfig = {
  apiKey: "AIzaSyCc5rXV1XBQKlEO3RzFPqTRe63DzfJbgO4",
  authDomain: "nexus-ai-be7e2.firebaseapp.com",
  projectId: "nexus-ai-be7e2",
  storageBucket: "nexus-ai-be7e2.firebasestorage.app",
  messagingSenderId: "1083296669233",
  appId: "1:1083296669233:web:327f07d41c37ea840c3f10"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

// Use the visitor's own language for Firebase emails and popups
auth.useDeviceLanguage();

/* ---------- Elements ---------- */

const downloadScreen = document.getElementById("download-screen");
const authScreen = document.getElementById("auth-screen");
const appScreen = document.querySelector(".app");
const authForm = document.getElementById("auth-form");
const emailInput = document.getElementById("auth-email");
const passwordInput = document.getElementById("auth-password");
const authTitle = document.getElementById("auth-title");
const authDescription = document.getElementById("auth-description");
const authSubmit = document.getElementById("auth-submit");
const authToggle = document.getElementById("auth-toggle");
const authSwitchText = document.getElementById("auth-switch-text");
const googleButton = document.getElementById("google-signin");
const authError = document.getElementById("auth-error");
const userCard = document.querySelector(".user-card");

const GOOGLE_LABEL = "Continue with Google";

let isCreatingAccount = false;
let isBusy = false;

/* ---------- Helpers ---------- */

const ERROR_MESSAGES = {
  "auth/email-already-in-use": "This email already has an account. Try signing in.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/weak-password": "Your password must contain at least 6 characters.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed": "Network error. Please check your connection.",
  "auth/popup-closed-by-user": "Sign-in window was closed.",
  "auth/cancelled-popup-request": "Sign-in was cancelled. Please try again.",
  "auth/popup-blocked": "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.",
  "auth/account-exists-with-different-credential":
    "An account already exists with this email using a different sign-in method.",
  "auth/operation-not-allowed": "This sign-in method isn't enabled yet.",
  "auth/unauthorized-domain": "This website isn't authorized for sign-in yet."
};

function friendlyError(error) {
  console.error("NEXUS AI auth error:", error);
  return (
    ERROR_MESSAGES[error && error.code] ||
    "Something went wrong. Please try again."
  );
}

function showError(message) {
  authError.textContent = message;
}

function submitLabel() {
  return isCreatingAccount ? "CREATE ACCOUNT" : "SIGN IN";
}

function setBusy(busy) {
  isBusy = busy;
  authSubmit.disabled = busy;
  googleButton.disabled = busy;
  authToggle.disabled = busy;
  authForm.setAttribute("aria-busy", String(busy));
}

/* ---------- Switch between sign in / create account ---------- */

authToggle.addEventListener("click", () => {
  if (isBusy) return;

  isCreatingAccount = !isCreatingAccount;
  showError("");

  authTitle.textContent = isCreatingAccount
    ? "Create Your Account"
    : "Welcome Back";

  authDescription.textContent = isCreatingAccount
    ? "Join the NEXUS AI command center."
    : "Sign in to access your command center.";

  authSubmit.textContent = submitLabel();

  authSwitchText.textContent = isCreatingAccount
    ? "Already have an account?"
    : "Don't have an account?";

  authToggle.textContent = isCreatingAccount ? "Sign in" : "Create account";

  // Helps password managers offer to save or suggest a password
  passwordInput.autocomplete = isCreatingAccount
    ? "new-password"
    : "current-password";

  emailInput.focus();
});

/* ---------- Email + password ---------- */

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isBusy) return;

  showError("");

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError("Please enter your email and password.");
    return;
  }

  if (isCreatingAccount && password.length < 6) {
    showError(ERROR_MESSAGES["auth/weak-password"]);
    passwordInput.focus();
    return;
  }

  setBusy(true);
  authSubmit.textContent = "PLEASE WAIT...";

  try {
    if (isCreatingAccount) {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    showError(friendlyError(error));
    passwordInput.select();
  } finally {
    setBusy(false);
    authSubmit.textContent = submitLabel();
  }
});

/* ---------- Google ---------- */

googleButton.addEventListener("click", async () => {
  if (isBusy) return;

  showError("");
  setBusy(true);
  googleButton.textContent = "CONNECTING...";

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
  } catch (error) {
    showError(friendlyError(error));
  } finally {
    setBusy(false);
    googleButton.textContent = GOOGLE_LABEL;
  }
});

/* ---------- Sign out (click the account card in the sidebar) ---------- */

async function confirmSignOut() {
  if (!window.nexusAuth) return;

  if (!confirm("Sign out of NEXUS AI?")) return;

  try {
    await signOut(auth);
  } catch (error) {
    alert(friendlyError(error));
  }
}

if (userCard) {
  userCard.setAttribute("role", "button");
  userCard.setAttribute("tabindex", "0");
  userCard.setAttribute("aria-label", "Sign out");
  userCard.title = "Sign out";
  userCard.style.cursor = "pointer";

  userCard.addEventListener("click", confirmSignOut);

  userCard.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      confirmSignOut();
    }
  });
}

function updateUserCard(user) {
  if (!userCard) return;

  const subtitle = userCard.querySelector("small");

  if (subtitle) {
    subtitle.textContent = user && user.email ? user.email : "Personal account";
    subtitle.style.overflow = "hidden";
    subtitle.style.textOverflow = "ellipsis";
    subtitle.style.maxWidth = "120px";
  }

  const avatar = userCard.querySelector(".avatar");

  if (avatar) {
    const source = (user && (user.displayName || user.email)) || "Y";
    avatar.textContent = source.trim().charAt(0).toUpperCase() || "Y";
  }

  userCard.setAttribute(
    "aria-label",
    user && user.email ? `Sign out ${user.email}` : "Sign out"
  );
}

/* ---------- Keep the app protected until Firebase confirms login ---------- */

// Hide everything until the first auth check finishes, so a signed-in
// visitor never sees a flash of the login form.
if (appScreen) appScreen.hidden = true;
authScreen.hidden = true;
if (downloadScreen) downloadScreen.hidden = true;

onAuthStateChanged(auth, (user) => {
  if (user) {
    authScreen.hidden = true;

    // The landing screen must not cover the app after login
    if (downloadScreen) downloadScreen.hidden = true;

    if (appScreen) appScreen.hidden = false;

    document.body.classList.add("authenticated");

    window.nexusAuth = {
      auth,
      user,
      // Always uses the current user, and Firebase refreshes expired tokens
      getIdToken: () => {
        const current = auth.currentUser;

        return current
          ? current.getIdToken()
          : Promise.reject(new Error("Please sign in again."));
      },
      signOut: () => signOut(auth)
    };

    updateUserCard(user);

    // Don't leave the password sitting in the form after login
    authForm.reset();
    showError("");
  } else {
    authScreen.hidden = false;
    if (downloadScreen) downloadScreen.hidden = false;
    if (appScreen) appScreen.hidden = true;

    document.body.classList.remove("authenticated");

    window.nexusAuth = null;

    updateUserCard(null);
    passwordInput.value = "";
  }

  // Lets other scripts react to login/logout if needed
  window.dispatchEvent(
    new CustomEvent("nexus:authchange", { detail: { signedIn: Boolean(user) } })
  );
});
