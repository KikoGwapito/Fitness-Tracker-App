import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAKdR1B0z-iX-A5FqMiz-cwNmQLbYtofuA",
  authDomain: "g-refine-app.firebaseapp.com",
  projectId: "g-refine-app",
  storageBucket: "g-refine-app.firebasestorage.app",
  messagingSenderId: "96353192385",
  appId: "1:96353192385:web:ced476c7d9f80a54004740",
  measurementId: "G-8W0JCNBJP0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
