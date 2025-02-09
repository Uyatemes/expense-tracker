// Конфигурация Firebase
const firebaseConfig = {
  apiKey: "ваш_api_key",
  authDomain: "ваш_проект.firebaseapp.com",
  projectId: "ваш_проект",
  storageBucket: "ваш_проект.appspot.com",
  messagingSenderId: "ваш_id",
  appId: "ваш_app_id"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); 