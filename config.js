// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAw-dwkPPmK2Afi1c_1jVOPhhuW6aXlN_M",
  authDomain: "japanese-289e0.firebaseapp.com",
  projectId: "japanese-289e0",
  storageBucket: "japanese-289e0.firebasestorage.app",
  messagingSenderId: "10967119013",
  appId: "1:10967119013:web:d542ba00a27e2ca6b0c94c",
  measurementId: "G-BDB74T8ZC4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);