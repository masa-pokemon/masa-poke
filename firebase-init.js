// firebase-init.js

// TODO: 以下に Firebase プロジェクトの設定を入力してください
const firebaseConfig = {
  apiKey: "AIzaSyCk8-GzoRyKMEp32X-zf8FNx1hNoOc56CE",
  authDomain: "lets-go-to-school-server.firebaseapp.com",
  databaseURL: "https://lets-go-to-school-server-default-rtdb.firebaseio.com",
  projectId: "lets-go-to-school-server",
  storageBucket: "lets-go-to-school-server.appspot.com",
  messagingSenderId: "149825716219",
  appId: "1:149825716219:web:ef2c1e3b169efc5629155e",
  measurementId: "G-8WN948RYY3"
};
// Firebaseの初期化
firebase.initializeApp(firebaseConfig);
// Firestore と Storage のリファレンスを準備
const db = firebase.firestore();
const storage = firebase.storage();
