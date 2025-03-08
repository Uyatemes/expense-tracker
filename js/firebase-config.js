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

// Добавляем Promise для отслеживания состояния авторизации
let authInitialized = false;
const authInitializedPromise = new Promise((resolve) => {
    auth.onAuthStateChanged(async (user) => {
        if (!authInitialized) {
            authInitialized = true;
            if (user) {
                console.log('Пользователь авторизован:', user.email);
                localStorage.setItem('lastSignedInUser', user.email);
                const token = await user.getIdToken();
                localStorage.setItem('authToken', token);
                
                // Обновляем UI
                updateAuthButtonState(true, user.email);
                
                // Обновляем токен каждые 30 минут
                setInterval(async () => {
                    try {
                        if (auth.currentUser) {
                            const newToken = await auth.currentUser.getIdToken(true);
                            localStorage.setItem('authToken', newToken);
                            console.log('Токен успешно обновлен');
                        }
                    } catch (error) {
                        console.error('Ошибка при обновлении токена:', error);
                    }
                }, 1800000);
            } else {
                console.log('Пользователь не авторизован');
                localStorage.removeItem('authToken');
                localStorage.removeItem('lastSignedInUser');
                updateAuthButtonState(false);
            }
            resolve(user);
        }
    });
});

// Функция для обновления состояния кнопки авторизации
function updateAuthButtonState(isAuthenticated, email = '') {
    const authButton = document.getElementById('authButton');
    const authButtonText = document.getElementById('authButtonText');
    
    if (isAuthenticated) {
        authButtonText.textContent = email;
        authButton.title = 'Нажмите для выхода';
    } else {
        authButtonText.textContent = 'Войти';
        authButton.title = 'Нажмите для входа';
    }
}

// Обработчик клика по кнопке авторизации
document.getElementById('authButton').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (user) {
        // Если пользователь авторизован - выходим
        try {
            await auth.signOut();
            console.log('Пользователь вышел из системы');
            updateAuthButtonState(false);
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        }
    } else {
        // Если пользователь не авторизован - входим
        await signInWithGoogle();
    }
});

// Обновляем функцию инициализации авторизации
async function initializeAuth() {
    try {
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        console.log('Firebase Auth persistence установлен на LOCAL');

        // Ждем инициализации авторизации
        const user = await authInitializedPromise;
        
        // Не пытаемся автоматически авторизоваться
        if (user) {
            console.log('Пользователь уже авторизован:', user.email);
        }
    } catch (error) {
        console.error('Ошибка при инициализации авторизации:', error);
    }
}

// Инициализируем авторизацию
initializeAuth();

// Обновляем функцию загрузки транзакций
async function loadTransactionsFromFirebase(limit = 1000) {
    try {
        await authInitializedPromise;
        
        const user = auth.currentUser;
        if (!user) {
            console.log('Для просмотра транзакций необходима авторизация');
            return { transactions: [] };
        }

        const snapshot = await db.collection('users')
            .doc(user.uid)
            .collection('transactions')
            .orderBy('date', 'desc')
            .get();

        const seenIds = new Set();
        const transactions = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (!seenIds.has(data.id)) {
                seenIds.add(data.id);
                transactions.push({
                    ...data,
                    docId: doc.id,
                    date: data.date
                });
            }
        });

        console.log(`Загружено ${transactions.length} уникальных транзакций`);
        return { transactions };
    } catch (error) {
        console.error('Ошибка при загрузке транзакций:', error);
        return { transactions: [] };
    }
}

// Обновляем функцию сохранения транзакции
async function saveTransactionToFirebase(transaction) {
    try {
        await authInitializedPromise;
        
        const user = auth.currentUser;
        if (!user) {
            console.log('Для сохранения транзакции необходима авторизация');
            return null;
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

        // Сохраняем транзакцию
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

// Обновляем функцию удаления транзакции
async function deleteTransactionFromFirebase(docId) {
    try {
        await authInitializedPromise;
        
        const user = auth.currentUser;
        if (!user) {
            console.log('Для удаления транзакции необходима авторизация');
            return false;
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
        // Убираем принудительный выбор аккаунта
        const result = await auth.signInWithPopup(provider);
        console.log('Успешная авторизация:', result.user.email);
        
        const token = await result.user.getIdToken();
        localStorage.setItem('authToken', token);
        localStorage.setItem('lastSignedInUser', result.user.email);
        
        return true;
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        return false;
    }
} 