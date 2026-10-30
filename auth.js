
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

// Firebase project configuration
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

let isCreatingAccount = false;

function showError(message) {
  authError.textContent = message;
}

authToggle.addEventListener("click", () => {
  isCreatingAccount = !isCreatingAccount;
  showError("");

  authTitle.textContent = isCreatingAccount
    ? "Create Your Account"
    : "Welcome Back";

  authDescription.textContent = isCreatingAccount
    ? "Join the NEXUS AI command center."
    : "Sign in to access your command center.";

  authSubmit.textContent = isCreatingAccount
    ? "CREATE ACCOUNT"
    : "SIGN IN";

  authSwitchText.textContent = isCreatingAccount
    ? "Already have an account?"
    : "Don't have an account?";

  authToggle.textContent = isCreatingAccount
    ? "Sign in"
    : "Create account";
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError("");

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  authSubmit.disabled = true;
  authSubmit.textContent = "PLEASE WAIT...";

  try {
    if (isCreatingAccount) {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    const messages = {
      "auth/email-already-in-use": "This email already has an account. Try signing in.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/weak-password": "Your password must contain at least 6 characters.",
      "auth/invalid-credential": "Incorrect email or password.",
      "auth/network-request-failed": "Network error. Please check your connection."
    };

    showError(messages[error.code] || error.message);
  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent = isCreatingAccount
      ? "CREATE ACCOUNT"
      : "SIGN IN";
  }
});

googleButton.addEventListener("click", async () => {
  showError("");
  googleButton.disabled = true;
  googleButton.textContent = "CONNECTING...";

  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (error) {
    showError(error.code === "auth/popup-closed-by-user"
      ? "Sign-in window was closed."
      : error.message);
  } finally {
    googleButton.disabled = false;
    googleButton.textContent = "Continue with Google";
  }
});

// Keep the application protected until Firebase confirms login.
if (appScreen) appScreen.hidden = true;

onAuthStateChanged(auth, (user) => {
  if (user) {
    authScreen.hidden = true;
    if (appScreen) appScreen.hidden = false;
    document.body.classList.add("authenticated");
    window.nexusAuth = {
      auth,
      user,
      getIdToken: () => user.getIdToken(),
      signOut: () => signOut(auth)
    };
    console.log("NEXUS AI: Authenticated", user.email);
  } else {
    authScreen.hidden = false;
    if (appScreen) appScreen.hidden = true;
    document.body.classList.remove("authenticated");
    window.nexusAuth = null;
    console.log("NEXUS AI: Waiting for authentication");
  }
});
