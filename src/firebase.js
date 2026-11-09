// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA8CmnHfmFSfgEGVSIwMNf5xqGGl1-pMfQ",
  authDomain: "prototiposistemas-553bd.firebaseapp.com",
  projectId: "prototiposistemas-553bd",
  storageBucket: "prototiposistemas-553bd.firebasestorage.app",
  messagingSenderId: "145695676690",
  appId: "1:145695676690:web:0800b68c93e7217fb73bcb",
  measurementId: "G-8NMJWVH48J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app);