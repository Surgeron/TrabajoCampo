// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCW3DyswiJYIeqs9bld4NkkX35knhI55nA",
  authDomain: "bd-impostor-surgeron.firebaseapp.com",
  projectId: "bd-impostor-surgeron",
  storageBucket: "bd-impostor-surgeron.firebasestorage.app",
  messagingSenderId: "1020302604136",
  appId: "1:1020302604136:web:73517d27c630e0e69008dd",
  measurementId: "G-0V9XLZMHTC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app);