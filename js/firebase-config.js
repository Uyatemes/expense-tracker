// Проверяем, не был ли уже определен firebaseConfig
if (typeof window.firebaseConfig === 'undefined') {
    window.firebaseConfig = {
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
}

if (typeof window.isProd === 'undefined') {
    window.isProd = window.location.hostname === 'uyatemes.github.io';
}

if (typeof window.currentConfig === 'undefined') {
    window.currentConfig = window.isProd ? window.firebaseConfig.prod : window.firebaseConfig.dev;
}

// Заменяем эту часть
const firebaseConfig = {
    // Ваши настройки Firebase
};

// На правильную инициализацию
// Инициализируем Firebase с правильной конфигурацией
if (!firebase.apps.length) {
    try {
        firebase.initializeApp(window.currentConfig);
        console.log('Firebase успешно инициализирован');
    } catch (error) {
        console.error('Ошибка при инициализации Firebase:', error);
    }
}

// Создаем глобальные ссылки на сервисы
window.db = firebase.firestore();
window.auth = firebase.auth();

// Проверяем сохраненную сессию и токен
if (typeof window.savedEmail === 'undefined') {
    window.savedEmail = localStorage.getItem('lastSignedInUser');
}

if (typeof window.savedToken === 'undefined') {
    window.savedToken = localStorage.getItem('authToken');
}

// Обновляем Promise для отслеживания состояния авторизации
if (typeof window.authInitialized === 'undefined') {
    window.authInitialized = false;
    window.authInitializedPromise = new Promise((resolve) => {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (!window.authInitialized) {
                window.authInitialized = true;
                if (user) {
                    console.log('Пользователь авторизован:', user.email);
                    localStorage.setItem('lastSignedInUser', user.email);
                    const token = await user.getIdToken();
                    localStorage.setItem('authToken', token);
                    updateAuthButtonState(user);
                } else {
                    console.log('Пользователь не авторизован');
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('lastSignedInUser');
                    updateAuthButtonState(null);
                }
                resolve(user);
            }
        });
    });
}

// Функция для обновления состояния кнопки авторизации
function updateAuthButtonState(user) {
    const authButton = document.getElementById('authButton');
    const authButtonText = document.getElementById('authButtonText');
    
    // Проверяем существование элементов перед использованием
    if (authButton && authButtonText) {
        if (user) {
            authButtonText.textContent = 'Выйти';
            authButton.onclick = () => {
                firebase.auth().signOut().then(() => {
                    console.log('Пользователь вышел из системы');
                }).catch((error) => {
                    console.error('Ошибка при выходе:', error);
                });
            };
        } else {
            authButtonText.textContent = 'Войти';
            authButton.onclick = signInWithGoogle;
        }
    }
}

// Добавим функцию для безопасного использования loader
function safeShowLoader() {
    if (window.loaderManager) {
        window.loaderManager.show();
    }
}

function safeHideLoader() {
    if (window.loaderManager) {
        window.loaderManager.hide();
    }
}

// Используем эти функции при инициализации Firebase
firebase.auth().onAuthStateChanged(async user => {
    safeShowLoader();
    try {
        if (user) {
            // ... существующий код ...
            if (window.expenseManager) {
                await window.expenseManager.loadFromFirebase();
            }
        }
    } finally {
        safeHideLoader();
    }
});

// Обновляем функцию инициализации авторизации
async function initializeAuth() {
    try {
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        console.log('Firebase Auth persistence установлен на LOCAL');

        // Ждем инициализации авторизации
        const user = await window.authInitializedPromise;
        
        // Просто обновляем состояние кнопки, без попытки автоматической авторизации
        if (user) {
            console.log('Пользователь уже авторизован:', user.email);
            updateAuthButtonState(user);
        } else {
            updateAuthButtonState(null);
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
        await window.authInitializedPromise;
        
        const user = window.auth.currentUser;
        if (!user) {
            console.log('Для просмотра транзакций необходима авторизация');
            return { transactions: [] }; // Просто возвращаем пустой массив без вызова авторизации
        }

        const snapshot = await window.db.collection('users')
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

// Функция для тестового сохранения транзакции
async function testSaveTransaction() {
    const testTransaction = {
        amount: 1000,
        type: 'expense',
        description: 'test',
        paymentType: 'kaspi-gold',
        date: new Date().toISOString()
    };
    try {
        const result = await saveTransactionToFirebase(testTransaction);
        console.log('Тестовая транзакция сохранена:', result);
        return result;
    } catch (error) {
        console.error('Ошибка при тестовом сохранении:', error);
        return null;
    }
}

// Обновляем функцию сохранения транзакции
async function saveTransactionToFirebase(transaction) {
    console.log('Начало сохранения транзакции:', transaction);
    
    try {
        const user = window.auth.currentUser;
        if (!user) {
            console.error('Нет авторизованного пользователя');
            return null;
        }

        // Проверяем обязательные поля
        if (!transaction.amount || !transaction.type || !transaction.description) {
            console.error('Отсутствуют обязательные поля транзакции');
            return null;
        }

        // Генерируем ID для новой транзакции
        const transactionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Подготавливаем данные транзакции
        const transactionData = {
            id: transactionId,
            amount: Number(transaction.amount),
            type: transaction.type,
            description: transaction.description,
            paymentType: transaction.paymentType || 'unknown',
            date: transaction.date || new Date().toISOString(),
            userId: user.uid,
            created: firebase.firestore.FieldValue.serverTimestamp()
        };

        console.log('Подготовленные данные транзакции:', transactionData);

        // Сохраняем транзакцию
        const docRef = await window.db.collection('users')
            .doc(user.uid)
            .collection('transactions')
            .add(transactionData);

        console.log('Транзакция успешно сохранена с ID:', docRef.id);
        return docRef.id;

    } catch (error) {
        console.error('Ошибка при сохранении транзакции:', error);
        throw error;
    }
}

// Экспортируем функции для тестирования
window.testSaveTransaction = testSaveTransaction;
window.saveTransactionToFirebase = saveTransactionToFirebase;

// Обновляем функцию удаления транзакции
async function deleteTransactionFromFirebase(docId) {
    try {
        await window.authInitializedPromise;
        
        const user = window.auth.currentUser;
        if (!user) {
            console.log('Для удаления транзакции необходима авторизация');
            return false;
        }

        console.log('Удаление транзакции с ID:', docId);
        await window.db.collection('users')
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
        const result = await window.auth.signInWithPopup(provider);
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

// Экспортируем функции в глобальную область
window.signInWithGoogle = signInWithGoogle;
window.updateAuthButtonState = updateAuthButtonState; 