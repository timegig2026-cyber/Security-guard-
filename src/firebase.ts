import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, doc, updateDoc, serverTimestamp, getDocs, orderBy, deleteDoc, setDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

let dbInstance: any = null;
let authInstance: any = null;
let appInstance: any = null;

const getFirebaseApp = () => {
  if (!appInstance) {
    appInstance = initializeApp(firebaseConfig);
  }
  return appInstance;
};

export const getDb = () => {
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseApp());
  }
  return dbInstance;
};

export const getAuthInstance = () => {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
};

export { collection, addDoc, onSnapshot, query, doc, updateDoc, serverTimestamp, getDocs, orderBy, deleteDoc, setDoc, onAuthStateChanged };
