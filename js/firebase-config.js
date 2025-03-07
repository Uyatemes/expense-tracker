// Конфигурации Firebase для разных окружений
const firebaseConfig = {
    dev: {
        // Конфигурация для тестовой версии
        apiKey: "AIzaSyCPnjAWGRjR-MbMwnHCwEOjv9yYngXh9Fs",
        authDomain: "raul-2024.firebaseapp.com",
        projectId: "raul-2024",
        storageBucket: "raul-2024.firebasestorage.app",
        messagingSenderId: "96759916961",
        appId: "1:96759916961:web:346b7801e4484b52d8c3e0"
    },
    prod: {
        // Такая же конфигурация для продакшена
        apiKey: "AIzaSyCPnjAWGRjR-MbMwnHCwEOjv9yYngXh9Fs",
        authDomain: "raul-2024.firebaseapp.com",
        projectId: "raul-2024",
        storageBucket: "raul-2024.firebasestorage.app",
        messagingSenderId: "96759916961",
        appId: "1:96759916961:web:346b7801e4484b52d8c3e0"
    }
};

// Определяем текущее окружение
const isProd = window.location.hostname === 'uyatemes.github.io';
const currentConfig = isProd ? firebaseConfig.prod : firebaseConfig.dev;

// Инициализируем Firebase
firebase.initializeApp(currentConfig);

// Получаем ссылки на сервисы
const auth = firebase.auth();
const db = firebase.firestore();

// Устанавливаем persistence для сохранения состояния авторизации
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log('Persistence установлен на LOCAL');
    })
    .catch((error) => {
        console.error('Ошибка при установке persistence:', error);
    });

// Функция для сохранения транзакции в Firebase
async function saveTransactionToFirebase(transaction) {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('Пользователь не авторизован');
            return;
        }

        await db.collection('users').doc(user.uid)
            .collection('transactions').add({
                ...transaction,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        console.log('Транзакция сохранена в Firebase');
    } catch (error) {
        console.error('Ошибка при сохранении:', error);
    }
}

// Функция для загрузки транзакций из Firebase
async function loadTransactionsFromFirebase() {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('Пользователь не авторизован');
            return [];
        }

        const snapshot = await db.collection('users').doc(user.uid)
            .collection('transactions')
            .orderBy('timestamp', 'desc')
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Ошибка при загрузке:', error);
        return [];
    }
}

// Функция для удаления транзакции из Firebase
async function deleteTransactionFromFirebase(transactionId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('Пользователь не авторизован');
            return;
        }

        await db.collection('users').doc(user.uid)
            .collection('transactions').doc(transactionId).delete();
        
        console.log('Транзакция удалена из Firebase');
    } catch (error) {
        console.error('Ошибка при удалении:', error);
    }
}

// Функция для авторизации пользователя
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
        console.log('Успешная авторизация');
        return true;
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        return false;
    }
} 