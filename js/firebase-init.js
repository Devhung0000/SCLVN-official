import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {

    getAuth,

    onAuthStateChanged,

    createUserWithEmailAndPassword,

    signInWithEmailAndPassword,

    signOut,

    GoogleAuthProvider,

    signInWithPopup,

    updateProfile,

} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {

    getFirestore,

    doc,

    getDoc,

    getDocs,

    setDoc,

    updateDoc,

    addDoc,

    deleteDoc,

    collection,

    query,

    where,

    orderBy,

    arrayUnion,

    serverTimestamp,

} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";



const firebaseConfig = {

    apiKey: "AIzaSyDQlxzz9Jc1Fxxi91moGTNChtRz1neGtmQ",

    authDomain: "sclvn-list.firebaseapp.com",

    projectId: "sclvn-list",

    storageBucket: "sclvn-list.firebasestorage.app",

    messagingSenderId: "151402764885",

    appId: "1:151402764885:web:297f68c6d02076a1edd2dc",

};



const firebaseApp = initializeApp(firebaseConfig);

const auth = getAuth(firebaseApp);

const db = getFirestore(firebaseApp);



export {

    firebaseApp,

    auth,

    db,

    // Auth functions

    onAuthStateChanged,

    createUserWithEmailAndPassword,

    signInWithEmailAndPassword,

    signOut,

    GoogleAuthProvider,

    signInWithPopup,

    updateProfile,

    // Firestore functions

    doc,

    getDoc,

    getDocs,

    setDoc,

    updateDoc,

    addDoc,

    deleteDoc,

    collection,

    query,

    where,

    orderBy,

    arrayUnion,

    serverTimestamp,

};
