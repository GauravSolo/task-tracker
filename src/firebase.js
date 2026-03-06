import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let db = null;

export function initFirebase() {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    return true;
  } catch (e) {
    console.error("Firebase init failed:", e);
    return false;
  }
}

export function isFirebaseReady() {
  return db !== null && !firebaseConfig.apiKey.startsWith("YOUR_");
}

// Save data to Firestore under a sync code
export async function saveToCloud(syncCode, key, value) {
  if (!db || !syncCode) return;
  try {
    await setDoc(doc(db, "rooms", syncCode, "data", key), { value: JSON.stringify(value) });
  } catch (e) {
    console.error("Cloud save failed:", e);
  }
}

// Listen to real-time changes from Firestore
export function listenToCloud(syncCode, key, callback) {
  if (!db || !syncCode) return () => {};
  return onSnapshot(doc(db, "rooms", syncCode, "data", key), (snap) => {
    if (snap.exists()) {
      try {
        callback(JSON.parse(snap.data().value));
      } catch {}
    }
  });
}
