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
const app = firebase.initializeApp(currentConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Проверяем сохраненную сессию и токен
const savedEmail = localStorage.getItem('lastSignedInUser');
const savedToken = localStorage.getItem('authToken');

// Функция для проверки валидности токена
async function checkToken() {
    const token = localStorage.getItem('authToken');
    if (!token) return false;
    
    try {
        const user = auth.currentUser;
        if (user) {
            const newToken = await user.getIdToken();
            localStorage.setItem('authToken', newToken);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Ошибка при проверке токена:', error);
        return false;
    }
}

// Устанавливаем persistence и проверяем авторизацию
async function initializeAuth() {
    try {
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        console.log('Firebase Auth persistence установлен на LOCAL');

        const currentUser = auth.currentUser;
        if (currentUser) {
            console.log('Текущий пользователь:', currentUser.email);
            await checkToken();
        } else if (savedEmail && savedToken) {
            console.log('Пытаемся восстановить сессию для:', savedEmail);
            const isValid = await checkToken();
            if (!isValid) {
                await signInWithGoogle();
            }
        }
    } catch (error) {
        console.error('Ошибка при инициализации авторизации:', error);
    }
}

// Инициализируем авторизацию
initializeAuth();

// Слушатель изменения состояния авторизации
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('Пользователь авторизован:', user.email);
        localStorage.setItem('lastSignedInUser', user.email);
        const token = await user.getIdToken();
        localStorage.setItem('authToken', token);
        
        // Обновляем токен каждые 30 минут
        setInterval(async () => {
            try {
                const newToken = await user.getIdToken(true);
                localStorage.setItem('authToken', newToken);
            } catch (error) {
                console.error('Ошибка при обновлении токена:', error);
            }
        }, 1800000);
    } else {
        console.log('Пользователь не авторизован');
        localStorage.removeItem('authToken');
    }
});

// Функция для загрузки транзакций
async function loadTransactionsFromFirebase(limit = 1000) {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.error('Пользователь не авторизован');
            return { transactions: [] };
        }

        // Получаем все транзакции
        const snapshot = await db.collection('users')
            .doc(user.uid)
            .collection('transactions')
            .get();

        const seenIds = new Set();
        const transactions = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (!seenIds.has(data.id)) {
                seenIds.add(data.id);
                
                // Используем существующую дату из данных
                const transactionDate = data.date ? new Date(data.date) : new Date();
                
                transactions.push({
                    ...data,
                    docId: doc.id,
                    date: transactionDate
                });
            }
        });

        // Сортируем транзакции по дате (новые сверху)
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        console.log(`Загружено ${transactions.length} уникальных транзакций`);
        return { transactions };
    } catch (error) {
        console.error('Ошибка при загрузке транзакций:', error);
        return { transactions: [] };
    }
}

// Функция для сохранения транзакции
async function saveTransactionToFirebase(transaction) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('Пользователь не авторизован');
        }

        // Проверяем, существует ли уже такая транзакция
        const existingDocs = await db.collection('users')
            .doc(user.uid)
            .collection('transactions')
            .where('id', '==', transaction.id)
            .get();

        if (!existingDocs.empty) {
            console.log('Транзакция уже существует, пропускаем');
            return existingDocs.docs[0].id;
        }

        // Сохраняем транзакцию с оригинальной датой
        const docRef = await db.collection('users')
            .doc(user.uid)
            .collection('transactions')
            .add({
                ...transaction,
                userId: user.uid,
                created: firebase.firestore.FieldValue.serverTimestamp()
            });

        console.log('Транзакция сохранена с ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Ошибка при сохранении транзакции:', error);
        throw error;
    }
}

// Функция для удаления транзакции
async function deleteTransactionFromFirebase(docId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('Пользователь не авторизован');
        }

        console.log('Удаление транзакции с ID:', docId);
        await db.collection('users')
            .doc(user.uid)
            .collection('transactions')
            .doc(docId)
            .delete();

        console.log('Транзакция успешно удалена');
        return true;
    } catch (error) {
        console.error('Ошибка при удалении транзакции:', error);
        throw error;
    }
}

// Функция для авторизации через Google
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        const result = await auth.signInWithPopup(provider);
        console.log('Успешная авторизация:', result.user.email);
        
        // Сохраняем токен сразу после авторизации
        const token = await result.user.getIdToken();
        localStorage.setItem('authToken', token);
        localStorage.setItem('lastSignedInUser', result.user.email);
        
        return true;
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        return false;
    }
} 