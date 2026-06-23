import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAitlsqJl-NqfXiVNfpNVaamhwqefgYQ9k",
  authDomain: "gen-lang-client-0258578294.firebaseapp.com",
  projectId: "gen-lang-client-0258578294",
  storageBucket: "gen-lang-client-0258578294.firebasestorage.app",
  messagingSenderId: "162941323686",
  appId: "1:162941323686:web:c63ecdb5da2a0f54f36767",
  measurementId: "G-WV3FPRX2KH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app); // For user settings
