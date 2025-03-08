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

// Проверяем сохраненную сессию
const savedEmail = localStorage.getItem('lastSignedInUser');
if (savedEmail) {
    console.log('Найдена сохраненная сессия для:', savedEmail);
}

// Устанавливаем persistence до любых операций с авторизацией
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log('Firebase Auth persistence установлен на LOCAL');
        
        // Проверяем текущего пользователя после установки persistence
        const currentUser = auth.currentUser;
        if (currentUser) {
            console.log('Текущий пользователь:', currentUser.email);
        } else if (savedEmail) {
            console.log('Пытаемся восстановить сессию для:', savedEmail);
            // Если есть сохраненная сессия, но пользователь не авторизован,
            // показываем окно авторизации
            signInWithGoogle().then(success => {
                if (success) {
                    console.log('Сессия успешно восстановлена');
                }
            });
        }
    })
    .catch((error) => {
        console.error('Ошибка при установке persistence:', error);
    });

// Слушатель изменения состояния авторизации
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('Пользователь авторизован:', user.email);
        localStorage.setItem('lastSignedInUser', user.email);
        // Обновляем токен каждый час
        setInterval(() => {
            user.getIdToken(true);
        }, 3600000);
    } else {
        console.log('Пользователь не авторизован');
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

        // Получаем все транзакции, отсортированные по timestamp по убыванию
        const snapshot = await db.collection('users')
            .doc(user.uid)
            .collection('transactions')
            .orderBy('timestamp', 'desc')
            .get();

        const seenIds = new Set();
        const transactions = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (!seenIds.has(data.id)) {
                seenIds.add(data.id);
                
                // Правильная обработка даты
                let transactionDate;
                if (data.timestamp) {
                    // Если есть timestamp из Firestore
                    transactionDate = data.timestamp.toDate();
                } else if (data.date) {
                    // Если есть строка с датой
                    transactionDate = new Date(data.date);
                } else {
                    // Если нет ни timestamp, ни даты
                    transactionDate = new Date();
                }

                transactions.push({
                    ...data,
                    docId: doc.id,
                    date: transactionDate,
                    timestamp: data.timestamp || firebase.firestore.Timestamp.fromDate(transactionDate)
                });
            }
        });

        // Сортируем транзакции по дате (новые сверху)
        transactions.sort((a, b) => {
            const dateA = a.timestamp ? a.timestamp.toDate() : new Date(a.date);
            const dateB = b.timestamp ? b.timestamp.toDate() : new Date(b.date);
            return dateB - dateA;
        });

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

        // Создаем timestamp из текущей даты
        const now = new Date();
        const timestamp = firebase.firestore.Timestamp.fromDate(now);

        const docRef = await db.collection('users')
            .doc(user.uid)
            .collection('transactions')
            .add({
                ...transaction,
                timestamp: timestamp,
                date: now.toISOString(),
                userId: user.uid
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
        return true;
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        return false;
    }
} 