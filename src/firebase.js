import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth'

// Firebase config is read from Vite env variables so you don't
// accidentally hard-code secrets into your repo.
// Make sure to define these in a `.env` file with the VITE_ prefix, e.g.:
// VITE_FIREBASE_API_KEY=...
// VITE_FIREBASE_AUTH_DOMAIN=...
// VITE_FIREBASE_PROJECT_ID=...
// VITE_FIREBASE_STORAGE_BUCKET=...
// VITE_FIREBASE_MESSAGING_SENDER_ID=...
// VITE_FIREBASE_APP_ID=...

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Only initialize Firebase if the required config values are present.
// This way the game still works locally even if you haven't set up
// your Firebase environment variables yet.
const hasFirebaseConfig =
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId

let app = null
let db = null
let auth = null

if (hasFirebaseConfig) {
  app = initializeApp(firebaseConfig)
  db = getFirestore(app)
  auth = getAuth(app)
}

export { db, auth }

// Ensure this device is signed in anonymously so it gets
// its own private user id. Leaderboard data will be stored
// per anonymous user, so other devices cannot see it.
export function ensureAnonUser() {
  // If Firebase isn't configured, just resolve with null so callers
  // can safely no-op without breaking the game board.
  if (!auth) {
    return Promise.resolve(null)
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsubscribe()
          resolve(user)
        } else {
          signInAnonymously(auth).catch((error) => {
            unsubscribe()
            // If anonymous auth isn't enabled or not configured in Firebase,
            // log a warning and resolve with null so the game still works
            // (only the leaderboard will be disabled).
            if (
              error?.code === 'auth/operation-not-allowed' ||
              error?.code === 'auth/configuration-not-found'
            ) {
              // eslint-disable-next-line no-console
              console.warn('Firebase anonymous auth not enabled; leaderboard disabled.', error)
              resolve(null)
            } else {
              reject(error)
            }
          })
        }
      },
      (error) => {
        unsubscribe()
        reject(error)
      },
    )
  })
}


