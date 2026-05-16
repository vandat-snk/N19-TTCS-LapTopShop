import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; // 1. THÊM DÒNG NÀY

const firebaseConfig = {
  apiKey: "AIzaSyBrnussR7BWoeNmYGcRyQxYBJE7ShC7nF0",
  authDomain: "n19vn-e8402.firebaseapp.com",
  projectId: "n19vn-e8402",
  storageBucket: "n19vn-e8402.firebasestorage.app",
  messagingSenderId: "1074897753306",
  appId: "1:1074897753306:web:74ae3ec71d57823e59c1e3",
  measurementId: "G-CC6H9P3BDG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 2. THÊM DÒNG NÀY ĐỂ EXPORT BIẾN auth RA NGOÀI
export const auth = getAuth(app); 
export default app;