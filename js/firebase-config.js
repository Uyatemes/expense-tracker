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

// Устанавливаем persistence для сохранения состояния авторизации
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log('Persistence установлен на LOCAL');
        // После установки persistence, проверяем текущего пользователя
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('Пользователь авторизован:', user.email);
            } else {
                console.log('Пользователь не авторизован');
            }
        });
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

        const docRef = await db.collection('users').doc(user.uid)
            .collection('transactions').add({
                ...transaction,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        console.log('Транзакция сохранена в Firebase с ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Ошибка при сохранении:', error);
        return null;
    }
}

// Функция для загрузки транзакций из Firebase с пагинацией
async function loadTransactionsFromFirebase(limit = 50, lastDoc = null) {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('Пользователь не авторизован');
            return { transactions: [], lastDoc: null };
        }

        let query = db.collection('users').doc(user.uid)
            .collection('transactions')
            .orderBy('timestamp', 'desc')
            .limit(limit);

        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();
        
        const transactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        
        console.log(`Загружено ${transactions.length} транзакций`);
        
        return {
            transactions,
            lastDoc: lastVisible,
            hasMore: snapshot.docs.length === limit
        };
    } catch (error) {
        console.error('Ошибка при загрузке:', error);
        return { transactions: [], lastDoc: null, hasMore: false };
    }
}

// Функция для удаления транзакции из Firebase
async function deleteTransactionFromFirebase(transactionId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('Пользователь не авторизован');
            return false;
        }

        console.log('Удаление транзакции с ID:', transactionId);
        
        await db.collection('users').doc(user.uid)
            .collection('transactions').doc(String(transactionId)).delete();
        
        console.log('Транзакция успешно удалена из Firebase');
        return true;
    } catch (error) {
        console.error('Ошибка при удалении:', error);
        return false;
    }
}

// Функция для авторизации пользователя
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        console.log('Успешная авторизация:', result.user.email);
        return true;
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        return false;
    }
} 