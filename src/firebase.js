import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDYOUb7vjxL2Uoyc6KV7ZE12KZeWhCeQCs",
  authDomain: "foodtech-iot.firebaseapp.com",
  databaseURL: "https://foodtech-iot-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "foodtech-iot",
  storageBucket: "foodtech-iot.firebasestorage.app",
  messagingSenderId: "674050646346",
  appId: "1:674050646346:web:1b188988cd6aa2a9c7a1b3",
  measurementId: "G-39PMTL2Z8N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and export it so your dashboard can use it
export const database = getDatabase(app);