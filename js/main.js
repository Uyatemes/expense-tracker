// Глобальная функция для добавления транзакций
window.addTransaction = function(transaction) {
    console.log('5. Вызов window.addTransaction с данными:', transaction);
    
    if (!window.expenseManager) {
        console.error('ExpenseManager не инициализирован!');
        window.expenseManager = new window.ExpenseManager();
    }
    
    try {
        console.log('6. Попытка добавить транзакцию через ExpenseManager');
        return window.expenseManager.addTransaction(transaction);
    } catch (error) {
        console.error('7. Ошибка при добавлении транзакции:', error);
        throw error;
    }
};

// Проверяем, не был ли уже создан ExpenseManager
if (!window.ExpenseManager) {
// Класс для управления данными
    window.ExpenseManager = class ExpenseManager {
    constructor() {
        console.log('ExpenseManager: Инициализация');
        
            // Добавляем проверку инициализации Firebase
            if (!firebase.apps.length) {
                console.error('Firebase не инициализирован');
                // Пробуем инициализировать Firebase
                try {
                    firebase.initializeApp(window.currentConfig);
                    console.log('Firebase успешно инициализирован из ExpenseManager');
                } catch (error) {
                    console.error('Ошибка при инициализации Firebase:', error);
                    // Продолжаем работу в локальном режиме
                    this.isProduction = false;
                }
            }

            this.transactions = [];
        this.dateFilters = {
            from: null,
            to: null
        };
        
            // Определяем текущую страницу
            this.currentPage = window.location.pathname.split('/').pop() || 'index.html';
            console.log('Определена текущая страница:', this.currentPage, 'pathname:', window.location.pathname);
            
            // Определяем режим работы
            const hostname = window.location.host;
            this.isProduction = hostname === 'uyatemes.github.io' || 
                               hostname === '192.168.3.10' || 
                               hostname === '192.168.3.10:8080' || 
                               hostname === 'localhost:8080' ||
                               hostname === '10.131.1.174:8080';
            console.log('Режим работы:', this.isProduction ? 'Production' : 'Local');

            // Инициализируем компоненты в зависимости от страницы
            if (this.currentPage === 'index.html') {
                this.initializeModal();
                this.initializeEventHandlers();
                this.initializeQuickButtons();
            } else if (this.currentPage === 'export.html') {
                this.initializeExportHandlers();
            }

            // Загружаем данные только один раз
            if (this.isProduction) {
                // Сначала загружаем из localStorage как кэш
                this.loadFromLocalStorage();
                
                firebase.auth().onAuthStateChanged(async user => {
                    console.log('Состояние авторизации изменилось:', user ? user.email : 'не авторизован');
                    if (user) {
                        await this.loadFromFirebase();
                    }
                });
        } else {
                this.loadFromLocalStorage();
            }
        }

        async loadInitialData() {
            console.log('Загрузка начальных данных...');
            try {
                if (this.isProduction) {
                    const user = firebase.auth().currentUser;
                    if (user) {
                        await this.loadFromFirebase();
                    } else {
                        this.loadFromLocalStorage();
                    }
                } else {
                    this.loadFromLocalStorage();
                }
            } catch (error) {
                console.error('Ошибка при загрузке данных:', error);
                this.transactions = [];
            }
        }

        initializeComponents() {
            console.log('Инициализация компонентов для страницы:', this.currentPage);
            if (this.currentPage === 'index.html') {
        this.initializeModal();
                this.initializeEventHandlers();
                this.initializeQuickButtons();
                this.renderTransactions();
            } else if (this.currentPage === 'export.html') {
                this.initializeExportHandlers();
            }
        }

        loadFromLocalStorage() {
            try {
                console.log('Загрузка транзакций из localStorage...');
                const savedData = localStorage.getItem('transactions');
                if (savedData) {
                    const loadedTransactions = JSON.parse(savedData);
                    console.log('Загружено транзакций из localStorage:', loadedTransactions.length);
                    
                    // Удаляем дубликаты перед установкой
                    this.transactions = this.removeDuplicates(loadedTransactions);
                    
                    // Обновляем отображение только на главной странице
                    if (this.currentPage === 'index.html') {
                        console.log('Обновляем отображение на главной странице');
                        this.renderTransactions();
                        this.updateTotals(this.transactions);
                    }
                } else {
                    console.log('В localStorage нет сохраненных транзакций');
                    this.transactions = [];
                }
            } catch (error) {
                console.error('Ошибка при загрузке из localStorage:', error);
                this.transactions = [];
            }
        }

        saveToLocalStorage() {
            try {
                console.log('Сохранение транзакций в localStorage...');
                localStorage.setItem('transactions', JSON.stringify(this.transactions));
                console.log('Транзакции сохранены в localStorage:', this.transactions.length);
                
                // Обновляем транзакции в exportManager при каждом сохранении
                if (window.exportManager) {
                    console.log('Обновляем транзакции в exportManager после сохранения');
                    window.exportManager.transactions = [...this.transactions];
                }
            } catch (error) {
                console.error('Ошибка при сохранении в localStorage:', error);
            }
        }

        async initialize() {
        console.log('ExpenseManager: DOM готов, начинаем инициализацию');
            
            if (this.isProduction) {
                // Проверяем авторизацию только если нет сохраненной сессии
                const user = firebase.auth().currentUser;
                const lastSession = localStorage.getItem('lastAuthSession');
                if (!user && !lastSession) {
                    await this.showSignInPrompt();
                }
            }
            
        this.renderTransactions();
        this.initializeEventHandlers();
        console.log('ExpenseManager: Инициализация завершена');
            
            // Загружаем актуальный список поставщиков
            this.loadSuppliersFromFirebase();
        }

        async showSignInPrompt() {
            const result = await signInWithGoogle();
            if (result) {
                // Сохраняем информацию о сессии
                localStorage.setItem('lastAuthSession', new Date().toISOString());
                this.loadFromFirebase();
            } else {
                console.error('Не удалось авторизоваться');
            }
        }

        async loadFromFirebase() {
            try {
                console.log('ExpenseManager: Загрузка транзакций из Firebase');
                
                // Проверяем авторизацию
                const user = firebase.auth().currentUser;
                if (!user) {
                    console.log('Пользователь не авторизован');
                    return;
                }

                // Получаем транзакции из Firestore
                const snapshot = await firebase.firestore()
                    .collection('users')
                    .doc(user.uid)
                    .collection('transactions')
                    .orderBy('date', 'desc')
                    .get();

                // Преобразуем документы в массив транзакций
                const loadedTransactions = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    docId: doc.id
                }));
                
                // Объединяем с существующими транзакциями и удаляем дубликаты
                this.transactions = this.removeDuplicates([...loadedTransactions, ...this.transactions]);
                
                // Сохраняем в localStorage для кэширования
                this.saveToLocalStorage();
                
                // Обновляем отображение только на главной странице
                if (this.currentPage === 'index.html') {
                    this.renderTransactions();
        this.updateTotals(this.transactions);
    }

            } catch (error) {
                console.error('Ошибка при загрузке из Firebase:', error);
            }
        }

        async addTransaction(transaction) {
            try {
                console.log('8. ExpenseManager.addTransaction начало:', transaction);

                // Проверяем авторизацию
                if (this.isProduction) {
                    const user = firebase.auth().currentUser;
                    console.log('Проверка авторизации в production:', {
                        isProduction: this.isProduction,
                        user: user ? { uid: user.uid, email: user.email } : null,
                        firebaseInitialized: !!firebase.apps.length
                    });
                    
                    if (!user) {
                        console.error('9. Ошибка: необходима авторизация');
                        throw new Error('Необходима авторизация');
                    }
                }

                // Проверяем на дубликаты за последние 5 минут
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                const duplicates = this.transactions.filter(t => 
                    t.amount === transaction.amount &&
                    t.description.toLowerCase() === transaction.description.toLowerCase() &&
                    t.paymentType === transaction.paymentType &&
                    new Date(t.date) > fiveMinutesAgo
                );

                if (duplicates.length > 0) {
                    const confirmed = await new Promise(resolve => {
                        const message = `
                            Найдена похожая транзакция за последние 5 минут:
                            Сумма: ${Math.abs(duplicates[0].amount)} ₸
                            Описание: ${duplicates[0].description}
                            
                            Вы уверены, что хотите добавить еще одну такую же транзакцию?
                        `;
                        resolve(confirm(message));
                    });

                    if (!confirmed) {
                        throw new Error('Транзакция отменена пользователем');
                    }
                }

                // Подготавливаем данные транзакции
        const newTransaction = {
            ...transaction,
                    userId: this.isProduction ? firebase.auth().currentUser.uid : 'local',
                    timestamp: this.isProduction ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
                    date: transaction.date,
                };

                console.log('Подготовленная транзакция:', newTransaction);

                let savedTransaction;

                if (this.isProduction) {
                    // Сохраняем в Firebase
                    try {
                        const docRef = await firebase.firestore()
                            .collection('users')
                            .doc(firebase.auth().currentUser.uid)
                            .collection('transactions')
                            .add(newTransaction);

                        // Создаем объект транзакции с ID документа
                        savedTransaction = {
                            ...newTransaction,
                            docId: docRef.id
                        };
                        console.log('Транзакция успешно сохранена в Firebase с ID:', docRef.id);
                    } catch (firebaseError) {
                        console.error('Ошибка при сохранении в Firebase:', firebaseError);
                        // Если Firebase недоступен, сохраняем локально
                        savedTransaction = {
                            ...newTransaction,
                            id: Date.now()
                        };
                        console.log('Транзакция сохранена локально из-за ошибки Firebase');
                    }
                } else {
                    savedTransaction = {
                        ...newTransaction,
                        id: Date.now()
                    };
                }

                console.log('Сохраненная транзакция:', savedTransaction);

                // Добавляем в начало массива транзакций
                this.transactions.unshift(savedTransaction);

                // Добавляем транзакцию в DOM
                this.addTransactionToDOM(savedTransaction);

                // Обновляем итоги
                this.updateTotals(this.transactions);
                
                // Обновляем графики, если они есть
        if (typeof window.updateCharts === 'function') {
            window.updateCharts();
        }
        
                // Сохраняем в локальное хранилище для кэширования
                this.saveToLocalStorage();

                console.log('10. Транзакция успешно добавлена');
                return savedTransaction;
                
            } catch (error) {
                console.error('11. Ошибка при сохранении транзакции:', error);
                throw error;
            }
        }

        async deleteTransaction(id) {
            try {
                console.log('Начало удаления транзакции:', id);
                const user = firebase.auth().currentUser;

                // Сохраняем длину массива до удаления для проверки
                const initialLength = this.transactions.length;
                console.log('Количество транзакций до удаления:', initialLength);
                console.log('ID для удаления:', id);
                console.log('Текущие транзакции:', this.transactions);

                // Удаляем из Firebase если в production режиме и пользователь авторизован
                if (this.isProduction && user) {
                    try {
                        console.log('Удаление из Firebase, ID:', id);
                        await firebase.firestore()
                            .collection('users')
                            .doc(user.uid)
                            .collection('transactions')
                            .doc(id)
                            .delete();
                        console.log('Успешно удалено из Firebase');
                    } catch (error) {
                        console.error('Ошибка при удалении из Firebase:', error);
                        throw error;
                    }
                }

                // Удаляем из локального массива
                this.transactions = this.transactions.filter(t => {
                    // Проверяем оба возможных ID
                    const transactionId = String(t.docId || t.id);
                    const targetId = String(id);
                    const shouldKeep = transactionId !== targetId;
                    
                    console.log('Сравнение ID:', {
                        transactionId,
                        targetId,
                        shouldKeep,
                        transaction: t
                    });
                    
                    return shouldKeep;
                });

                console.log('Количество транзакций после удаления:', this.transactions.length);

                // Проверяем, была ли удалена транзакция
                if (this.transactions.length === initialLength) {
                    console.warn('Транзакция не была найдена в массиве');
                    throw new Error('Транзакция не найдена');
                }

                // Сохраняем обновленный список в localStorage
                this.saveToLocalStorage();
                
                // Обновляем UI
                this.renderTransactions();
                this.updateTotals(this.transactions);

                console.log('Транзакция успешно удалена');
                return true;

            } catch (error) {
                console.error('Ошибка при удалении транзакции:', error);
                throw error;
            }
        }

        // Добавляем вспомогательный метод для обновления итогов группы
        updateDateGroupTotals(dateGroup) {
            const dateKey = dateGroup.querySelector('.date-label')?.textContent;
            if (!dateKey) return;

            const transactions = this.transactions.filter(t => 
                new Date(t.date).toLocaleDateString('ru-RU') === dateKey
            );

            const income = transactions.reduce((sum, t) => 
                sum + (t.amount > 0 ? Math.abs(t.amount) : 0), 0
            );
            const expense = transactions.reduce((sum, t) => 
                sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0
            );

            const incomeTotal = dateGroup.querySelector('.income-total');
            const expenseTotal = dateGroup.querySelector('.expense-total');

            if (incomeTotal) incomeTotal.textContent = `+${this.formatAmount(income)} ₸`;
            if (expenseTotal) expenseTotal.textContent = `-${this.formatAmount(expense)} ₸`;
        }

        async updateTransaction(id, updatedTransaction) {
            console.log('Обновление транзакции:', id, updatedTransaction);
            
            // Находим транзакцию по docId или id
            const transactionIndex = this.transactions.findIndex(transaction => 
                (transaction.docId === id) || (transaction.id === id)
            );
            
            if (transactionIndex === -1) {
                console.error('Транзакция не найдена:', id);
                return;
            }
            
            // Обновляем транзакцию
            const oldTransaction = this.transactions[transactionIndex];
            const updatedData = { ...oldTransaction, ...updatedTransaction };
            
            // Если в production режиме, обновляем в Firebase
            if (this.isProduction && firebase.auth().currentUser) {
                try {
                    await firebase.firestore()
                        .collection('users')
                        .doc(firebase.auth().currentUser.uid)
                        .collection('transactions')
                        .doc(id)
                        .update(updatedData);
                    console.log('Транзакция обновлена в Firebase');
                } catch (error) {
                    console.error('Ошибка при обновлении в Firebase:', error);
                    return;
                }
            }
            
            // Обновляем в локальном массиве
            this.transactions[transactionIndex] = updatedData;
            
            // Сохраняем в localStorage
            this.saveToLocalStorage();
            
            // Обновляем отображение
            this.renderTransactions();
            
            // Обновляем графики, если они есть
            if (typeof window.updateCharts === 'function') {
                window.updateCharts();
            }
            
            // Обновляем итоги
            this.updateTotals(this.transactions);
            
            console.log('Транзакция успешно обновлена');
        }

        setupDateFilter() {
            const startDate = document.getElementById('startDate');
            const endDate = document.getElementById('endDate');
            const showBtn = document.querySelector('.show-btn');
            const resetBtn = document.querySelector('.reset-btn');

            showBtn.onclick = () => {
                this.renderTransactions();
                this.updateSummary();
                updateCharts();
            };

            resetBtn.onclick = () => {
                startDate.value = '';
                endDate.value = '';
                this.renderTransactions();
                this.updateSummary();
                updateCharts();
            };
        }

        getFilteredTransactions() {
            if (!this.dateFilters.from && !this.dateFilters.to) {
                return this.transactions;
            }

            return this.transactions.filter(t => {
                const transactionDate = new Date(t.date).getTime();
                const fromDate = this.dateFilters.from ? new Date(this.dateFilters.from).getTime() : null;
                const toDate = this.dateFilters.to ? new Date(this.dateFilters.to).getTime() : null;

                if (fromDate && transactionDate < fromDate) return false;
                if (toDate && transactionDate > toDate) return false;
                return true;
            });
        }

        renderTransactions() {
                // Добавляем проверку на текущую страницу
                console.log('renderTransactions вызван, currentPage:', this.currentPage, 'pathname:', window.location.pathname);
                if (this.currentPage !== 'index.html') {
                    console.log('renderTransactions пропущен - не главная страница');
                    return;
                }

                const container = document.getElementById('expensesTableBody');
                if (!container) {
                    console.log('container expensesTableBody не найден');
                    return;
                }

                // Очищаем контейнер перед рендерингом
                container.innerHTML = '';

                const transactions = this.getFilteredTransactions();
                console.log('Транзакций для отображения:', transactions.length);
                if (transactions.length === 0) {
                    container.innerHTML = '<div class="no-transactions">Нет транзакций за выбранный период</div>';
            return;
        }
        
                // Удаляем дубликаты перед отображением
                const uniqueTransactions = this.removeDuplicates(transactions);

                // Группируем транзакции по дате
                const groupedTransactions = uniqueTransactions.reduce((groups, transaction) => {
                    const date = new Date(transaction.date);
                    const dateKey = date.toLocaleDateString('ru-RU');
                    
                    if (!groups[dateKey]) {
                        groups[dateKey] = [];
                    }
                    groups[dateKey].push(transaction);
                    return groups;
                }, {});

                // Сортируем даты в обратном порядке (новые сверху)
                const sortedDates = Object.keys(groupedTransactions).sort((a, b) => {
                    return new Date(b.split('.').reverse().join('-')) - new Date(a.split('.').reverse().join('-'));
                });

                sortedDates.forEach(dateKey => {
                    // Создаем заголовок группы с датой
                    const dateGroup = document.createElement('div');
                    dateGroup.className = 'date-group';
                    dateGroup.innerHTML = `
                        <div class="date-header">
                            <div class="date-label">${dateKey}</div>
                            <div class="date-summary">
                                <span class="income-total">+${this.formatAmount(
                                    groupedTransactions[dateKey].reduce((sum, t) => sum + (t.amount > 0 ? Math.abs(t.amount) : 0), 0)
                                )} ₸</span>
                                <span class="expense-total">-${this.formatAmount(
                                    groupedTransactions[dateKey].reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0)
                                )} ₸</span>
                    </div>
                    </div>
                `;
                    container.appendChild(dateGroup);

                    // Сортируем транзакции внутри группы по времени (от новых к старым)
                    const sortedTransactions = groupedTransactions[dateKey].sort((a, b) => {
                        return new Date(b.date) - new Date(a.date);
                    });

                    // Добавляем транзакции группы
                    sortedTransactions.forEach(transaction => {
                        this.addTransactionToDOM(transaction);
                    });
                });
        }

        updateSummary() {
            const transactions = this.getFilteredTransactions();
            
            const income = transactions
                .filter(t => t.type === 'приход')
                .reduce((sum, t) => sum + t.amount, 0);

            const expenses = transactions
                .filter(t => t.type === 'расход')
                .reduce((sum, t) => sum + t.amount, 0);

            document.getElementById('totalIncome').textContent = `${income} ₸`;
            document.getElementById('totalExpenses').textContent = `${expenses} ₸`;
        }

        formatDate(dateStr) {
            const date = new Date(dateStr);
            return date.toLocaleDateString('ru-RU');
        }

        getTransactions() {
                console.log('ExpenseManager: Получение транзакций, всего:', this.transactions?.length);
                if (!Array.isArray(this.transactions)) {
                    console.warn('ExpenseManager: transactions не является массивом, возвращаем пустой массив');
                    return [];
                }
                return [...this.transactions].sort((a, b) => {
                    // Получаем timestamp из даты
                    const dateA = new Date(a.date).getTime();
                    const dateB = new Date(b.date).getTime();
                    // Сортируем по убыванию (новые сверху)
                    return dateB - dateA;
                });
        }

        handleApplyFilter() {
            const dateFrom = document.getElementById('dateFrom');
            const dateTo = document.getElementById('dateTo');
            if (dateFrom && dateTo) {
                this.setDateFilter(dateFrom.value, dateTo.value);
            }
        }

        handleResetFilter() {
            const dateFrom = document.getElementById('dateFrom');
            const dateTo = document.getElementById('dateTo');
            if (dateFrom && dateTo) {
                dateFrom.value = '';
                dateTo.value = '';
                this.resetDateFilter();
            }
        }

        setDateFilter(startDate, endDate) {
            this.dateFilters.from = startDate ? new Date(startDate) : null;
            this.dateFilters.to = endDate ? new Date(endDate) : null;
            this.renderTransactions();
            console.log('Date filter set:', { from: this.dateFilters.from, to: this.dateFilters.to });
        }

        resetDateFilter() {
            this.dateFilters.from = null;
            this.dateFilters.to = null;
            this.renderTransactions();
            console.log('Date filter reset');
        }

            updateTotals() {
                console.log('Обновление итогов за месяц...');
                
                // Получаем даты для текущего месяца
                const now = new Date();
                const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const todayInMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                
                // Получаем даты для предыдущего месяца
                const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const sameDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 23, 59, 59, 999);

                // Фильтруем транзакции текущего месяца
                const currentMonthTransactions = this.transactions.filter(t => {
                    const transactionDate = new Date(t.date);
                    return transactionDate >= firstDayOfMonth && transactionDate <= todayInMonth;
                });

                // Фильтруем транзакции предыдущего месяца
                const prevMonthTransactions = this.transactions.filter(t => {
                    const transactionDate = new Date(t.date);
                    return transactionDate >= firstDayOfPrevMonth && transactionDate <= sameDayLastMonth;
                });

                // Считаем итоги текущего месяца
                const currentTotals = currentMonthTransactions.reduce((acc, t) => {
                    const amount = Math.abs(parseFloat(t.amount));
                    if (t.amount > 0) {
                        acc.totalIncome += amount;
            } else {
                        acc.totalExpense += amount;
                    }
                    return acc;
                }, { totalIncome: 0, totalExpense: 0 });

                // Считаем итоги предыдущего месяца
                const prevTotals = prevMonthTransactions.reduce((acc, t) => {
                    const amount = Math.abs(parseFloat(t.amount));
                    if (t.amount > 0) {
                        acc.totalIncome += amount;
            } else {
                        acc.totalExpense += amount;
                    }
                    return acc;
                }, { totalIncome: 0, totalExpense: 0 });

                // Вычисляем разницу
                const expenseDiff = currentTotals.totalExpense - prevTotals.totalExpense;
                const incomeDiff = currentTotals.totalIncome - prevTotals.totalIncome;

                // Обновляем отображение в блоке totals
                const totalsBlock = document.querySelector('.totals');
                if (totalsBlock) {
                    const currentMonth = now.toLocaleString('ru-RU', { month: 'long' });
                    const prevMonth = new Date(firstDayOfPrevMonth).toLocaleString('ru-RU', { month: 'long' });
                    
                    totalsBlock.innerHTML = `
                        <div class="total-box expense">
                            <div class="label">Расходы за ${currentMonth}</div>
                            <div class="amount">-${this.formatAmount(currentTotals.totalExpense)} ₸</div>
                            <div class="comparison ${expenseDiff > 0 ? 'increase' : 'decrease'}">
                                ${Math.abs(expenseDiff) > 0 ? `
                                    <span class="diff-icon">${expenseDiff > 0 ? 'больше на' : 'меньше на'}</span>
                                    <span class="diff-amount">
                                        ${this.formatAmount(Math.abs(expenseDiff))} ₸
                                    </span>
                                    <span class="diff-text">
                                        чем в ${prevMonth}
                                    </span>
                                ` : `
                                    <span class="diff-text">Как в ${prevMonth}</span>
                                `}
                            </div>
                        </div>
                        <div class="total-box income">
                            <div class="label">Доходы за ${currentMonth}</div>
                            <div class="amount">+${this.formatAmount(currentTotals.totalIncome)} ₸</div>
                            <div class="comparison ${incomeDiff > 0 ? 'increase' : 'decrease'}">
                                ${Math.abs(incomeDiff) > 0 ? `
                                    <span class="diff-icon" style="color:${incomeDiff < 0 ? 'var(--md-sys-color-error)' : 'inherit'};">${incomeDiff > 0 ? 'больше на' : 'меньше на'}</span>
                                    <span class="diff-amount" style="color:${incomeDiff < 0 ? 'var(--md-sys-color-error)' : 'inherit'};">
                                        ${this.formatAmount(Math.abs(incomeDiff))} ₸
                                    </span>
                                    <span class="diff-text">
                                        чем в ${prevMonth}
                                    </span>
                                ` : `
                                    <span class="diff-text">Как в ${prevMonth}</span>
                                `}
                            </div>
                        </div>
                    `;
                }
            }

            // Добавляем вспомогательный метод для получения названия месяца
            getMonthName(monthIndex) {
                const months = [
                    'январю', 'февралю', 'марту', 'апрелю', 'маю', 'июню',
                    'июлю', 'августу', 'сентябрю', 'октябрю', 'ноябрю', 'декабрю'
                ];
                // Обрабатываем отрицательный индекс для декабря
                if (monthIndex < 0) monthIndex = 11;
                return months[monthIndex];
        }

        showConfirmDialog(id) {
                console.log('Показываем диалог подтверждения для ID:', id);
                
                let modal = document.getElementById('confirmDialog');
                if (!modal) {
                    modal = document.createElement('div');
                    modal.id = 'confirmDialog';
                    modal.className = 'modal';
                    modal.innerHTML = `
                        <div class="modal-content confirm-dialog">
                            <div class="modal-header">
                                <h3>Подтверждение удаления</h3>
                            </div>
                            <div class="modal-body">
                                <p>Вы уверены, что хотите удалить эту транзакцию?</p>
                                <div class="loader" style="display: none;">
                                    <div class="spinner"></div>
                                    <p>Удаление транзакции...</p>
                                </div>
                            </div>
                            <div class="modal-actions">
                                <button id="cancelDelete" class="action-button">Отмена</button>
                                <button id="confirmDelete" class="action-button delete-action">Удалить</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);
                }

                const confirmBtn = modal.querySelector('#confirmDelete');
                const cancelBtn = modal.querySelector('#cancelDelete');
                const loader = modal.querySelector('.loader');
                const actions = modal.querySelector('.modal-actions');
                const body = modal.querySelector('.modal-body p');

                // Удаляем старые обработчики
                const newConfirmBtn = confirmBtn.cloneNode(true);
                const newCancelBtn = cancelBtn.cloneNode(true);
                confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
                cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

                // Добавляем новые обработчики
                newConfirmBtn.addEventListener('click', async () => {
                    console.log('Подтверждено удаление транзакции:', id);
                    
                    // Показываем лоадер и скрываем кнопки
                    if (loader) loader.style.display = 'flex';
                    if (actions) actions.style.display = 'none';
                    if (body) body.style.display = 'none';
                    
                    try {
                        await this.deleteTransaction(id);
                        console.log('Транзакция успешно удалена');
                        modal.classList.remove('show');
                    } catch (error) {
                        console.error('Ошибка при удалении:', error);
                        alert('Не удалось удалить транзакцию. Попробуйте еще раз.');
                    } finally {
                        // Возвращаем элементы в исходное состояние
                        if (loader) loader.style.display = 'none';
                        if (actions) actions.style.display = 'flex';
                        if (body) body.style.display = 'block';
                    }
                });

                newCancelBtn.addEventListener('click', () => {
                    console.log('Отмена удаления');
                    modal.classList.remove('show');
                });

                // Закрытие по клику вне модального окна
                modal.onclick = (e) => {
                    if (e.target === modal) {
                        modal.classList.remove('show');
                    }
                };

                // Показываем модальное окно
            modal.classList.add('show');
        }

        async exportToPDF() {
            // Метод удален, так как он теперь в export.js
        }

        calculateTotals(transactions) {
            return transactions.reduce((totals, t) => {
                if (t.type === 'income') {
                    totals.totalIncome += Math.abs(t.amount);
                } else {
                    totals.totalExpense += Math.abs(t.amount);
                }
                return totals;
            }, { totalIncome: 0, totalExpense: 0 });
        }

        formatDateRange() {
            const startDate = this.dateFilters.from 
                ? new Date(this.dateFilters.from).toLocaleDateString('ru-RU')
                : 'начало';
            const endDate = this.dateFilters.to
                ? new Date(this.dateFilters.to).toLocaleDateString('ru-RU')
                : 'конец';
            return `${startDate} — ${endDate}`;
        }

        generatePDFContent() {
            // Метод удален, так как он теперь в export.js
        }

        initializeEventHandlers() {
            const applyFilter = document.getElementById('applyDateFilter');
            const resetFilter = document.getElementById('resetDateFilter');

            if (applyFilter) {
                applyFilter.onclick = this.handleApplyFilter;
            }

            if (resetFilter) {
                resetFilter.onclick = this.handleResetFilter;
            }

            // Слушатель для синхронизации поставщиков между страницами
            window.addEventListener('storage', (event) => {
                if (event.key === 'suppliersList') {
                    console.log('Обновление поставщиков из другой вкладки');
                    const suppliers = event.newValue ? JSON.parse(event.newValue) : [];
                    this.updateSuppliersModal(suppliers);
                }
            });

            // Удаляем обработчик экспорта PDF, так как он теперь в export.js
            // const exportBtn = document.getElementById('exportPDF');
            // if (exportBtn) {
            //     exportBtn.onclick = () => this.exportToPDF();
            // }

            // Обработчик формы добавления транзакции
            document.getElementById('expenseForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Форма отправлена');

                const amount = parseFloat(document.getElementById('expenseAmount').value);
                const description = document.getElementById('expenseDescription').value.trim();
                const paymentType = document.getElementById('paymentType').value;

                if (!amount || !description) {
                    alert('Заполните все поля!');
                    return;
                }

                const transaction = {
                    amount,
                    description,
                    paymentType,
                    date: new Date().toISOString(),
                    type: amount < 0 ? 'expense' : 'income'
                };

                console.log('Добавляемая транзакция:', transaction);

                try {
                    this.addTransaction(transaction).then((result) => {
                        if (result) {
                            const responseMessage = document.createElement('div');
                            responseMessage.className = 'message system';
                            const paymentTypeText = transaction.paymentType === 'halyk' ? 'Halyk' : 'Kaspi';
                            responseMessage.textContent = `✅ ${transaction.type === 'expense' ? 'Расход' : 'Доход'} на сумму ${Math.abs(amount)} ₸ через ${paymentTypeText} успешно добавлен`;
                            chatMessages.appendChild(responseMessage);
                            input.value = '';

                            // Обновляем итоги
                            this.updateTotals(this.transactions);
                            
                            // Обновляем графики, если они есть
                            if (typeof window.updateCharts === 'function') {
                                window.updateCharts();
                            }

                            // Убираем автоматическую прокрутку чата
                            // chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    }).catch(error => {
                        const errorMessage = document.createElement('div');
                        errorMessage.className = 'message system error';
                        errorMessage.textContent = 'Ошибка при сохранении: ' + error.message;
                        chatMessages.appendChild(errorMessage);
                    });

                } catch (error) {
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'message system error';
                    errorMessage.innerHTML = `❌ ${error.message}<br><br>Примеры:<br>` +
                        '"5000 расход каспи такси"<br>' +
                        '"приход 10000 халык зарплата"<br>' +
                        '"-5000 халык такси"<br>' +
                        '"+10000 каспи зарплата"';
                    chatMessages.appendChild(errorMessage);
                }

                // Убираем автоматическую прокрутку чата
                // chatMessages.scrollTop = chatMessages.scrollHeight;
            });

            // Обработчики модального окна
            document.getElementById('cancelExpense')?.addEventListener('click', () => {
                const modal = document.getElementById('addExpenseModal');
                if (modal) modal.classList.remove('show');
            });
        }

        initializeModal() {
                if (this.currentPage !== 'index.html') return;

            const modal = document.getElementById('confirmDialog');
                if (!modal) return; // Добавляем проверку на существование модального окна

            const confirmBtn = document.getElementById('confirmDelete');
            const cancelBtn = document.getElementById('cancelDelete');

                if (confirmBtn && cancelBtn) {
            confirmBtn.addEventListener('click', () => {
                if (this.currentTransactionToDelete !== null) {
                    this.deleteTransaction(this.currentTransactionToDelete);
                    this.currentTransactionToDelete = null;
                }
                modal.classList.remove('show');
            });

            cancelBtn.addEventListener('click', () => {
                this.currentTransactionToDelete = null;
                modal.classList.remove('show');
            });
                }
        }

        formatAmount(amount) {
            return new Intl.NumberFormat('ru-RU').format(Math.abs(amount));
        }

        categorizeDescription(description) {
            description = description.toLowerCase();
            
            // Правила категоризации с приоритетами
            const rules = [
                {
                        category: 'Счет на оплату',
                    test: (desc) => {
                            // Получаем актуальный список поставщиков из localStorage
                            const suppliersList = localStorage.getItem('suppliersList');
                            const suppliers = suppliersList ? JSON.parse(suppliersList) : this.getSuppliersList();
                            
                            // Проверяем, есть ли в описании название поставщика
                            const isSupplier = suppliers.some(supplier => 
                                desc.includes(supplier.value.toLowerCase()) || 
                                desc.includes(supplier.name.toLowerCase())
                            );
                            
                            // Дополнительные ключевые слова для категории
                            const keywords = ['базар', 'магазин', 'доставка', 'полиграфия'];
                            const hasKeyword = keywords.some(word => desc.includes(word));
                            
                            return isSupplier || 
                                   hasKeyword || 
                               (desc.startsWith('ип') && !desc.includes('налог')) ||
                               desc.startsWith('тоо');
                    }
                },
                {
                    category: 'Зарплата',
                    test: (desc) => {
                            return desc.includes('зарплата') || 
                                   desc.includes('на зарплату') || 
                               desc.includes('аванс');
                    }
                },
                {
                        category: 'Руководство',
                    test: (desc) => {
                            const management = ['ига', 'ержан', 'альфия', 'сека'];
                            return management.some(name => {
                                const isManagement = desc.includes(name);
                            const isNotSupplier = !desc.startsWith('ип');
                            const isNotTransport = !desc.includes('такси');
                                return isManagement && isNotSupplier && isNotTransport;
                        });
                    }
                },
                {
                    category: 'Долг',
                    test: (desc) => {
                        // ПРОВЕРКА НА ЕРЛАН - ВСЕ РАСХОДЫ С ЕРЛАН = ДОЛГ
                        if (desc.includes('ерлан')) {
                            return true;
                        }
                        
                        // Остальные проверки на долг
                        return desc.includes('долг') || 
                               desc.includes('кредо') || 
                                   desc.includes('займ') ||
                                   desc.includes('в долг') ||
                                   desc.includes('талгат') ||
                                   desc.includes('д талгат') ||
                                   desc.includes('ерзат') ||
                                   desc.includes('гульназ') ||
                                   desc.includes('енлик');
                    }
                },
                {
                    category: 'Смена',
                    test: (desc) => {
                        return desc.includes('сдача смены') ||
                               desc.includes('смена') ||
                               desc.includes('выручка');
                    }
                }
            ];

            // Проверяем каждое правило по порядку
            for (const rule of rules) {
                if (rule.test(description)) {
                    return rule.category;
                }
            }
            
            return 'Прочее';
        }

            async migrateLocalDataToFirebase() {
                try {
                    // Проверяем, была ли уже выполнена миграция
                    if (localStorage.getItem('transactions_migrated')) {
                        console.log('Миграция уже была выполнена ранее');
                        return;
                    }

                    // Получаем данные из localStorage
                    const localData = localStorage.getItem('transactions');
                    if (!localData) {
                        console.log('Локальные данные отсутствуют');
                        return;
                    }

                    const transactions = JSON.parse(localData);
                    console.log(`Найдено ${transactions.length} локальных транзакций для миграции`);

                    // Проверяем авторизацию
                    const user = firebase.auth().currentUser;
                    if (!user) {
                        console.log('Сначала нужно авторизоваться');
                        await signInWithGoogle();
                    }

                    // Создаем копию данных перед миграцией
                    const backupData = localStorage.getItem('transactions_backup');
                    if (!backupData) {
                        localStorage.setItem('transactions_backup', localData);
                        console.log('Создана резервная копия данных');
                    }

                    let migratedCount = 0;
                    // Сохраняем каждую транзакцию в Firebase
                    for (const transaction of transactions) {
                        try {
                            // Проверяем, существует ли уже такая транзакция
                            const existingDocs = await db.collection('users')
                                .doc(firebase.auth().currentUser.uid)
                                .collection('transactions')
                                .where('id', '==', transaction.id)
                                .get();

                            if (!existingDocs.empty) {
                                console.log(`Транзакция ${transaction.id} уже существует, пропускаем`);
                                continue;
                            }

                            const newTransaction = {
                                ...transaction,
                                date: transaction.date,
                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                userId: firebase.auth().currentUser.uid,
                                migratedFromLocal: true
                            };
                            
                            await db.collection('users')
                                .doc(firebase.auth().currentUser.uid)
                                .collection('transactions')
                                .add(newTransaction);
                            
                            migratedCount++;
                            console.log(`Мигрировано ${migratedCount} из ${transactions.length} транзакций`);
                        } catch (error) {
                            console.error('Ошибка при миграции транзакции:', error);
                        }
                    }

                    if (migratedCount > 0) {
                        console.log('Миграция данных завершена успешно');
                        // Помечаем, что миграция выполнена
                        localStorage.setItem('transactions_migrated', 'true');
                        localStorage.removeItem('transactions');
                    } else {
                        console.warn('Нет новых транзакций для миграции');
                    }
                    
                    // Перезагружаем данные из Firebase
                    await this.loadFromFirebase();
                    
                } catch (error) {
                    console.error('Ошибка при миграции данных:', error);
                    // Восстанавливаем данные из бэкапа если что-то пошло не так
                    const backupData = localStorage.getItem('transactions_backup');
                    if (backupData) {
                        localStorage.setItem('transactions', backupData);
                        console.log('Данные восстановлены из резервной копии');
                    }
                }
            }

            async loadTransactions() {
                if (this.currentPage !== 'index.html') return;

                try {
                    if (this.isProduction) {
                        await this.loadFromFirebase();
                    } else {
                        this.loadFromLocalStorage();
                    }
                } catch (error) {
                    console.error('Ошибка при загрузке транзакций:', error);
                    this.transactions = [];
                }
            }

            async loadMoreTransactions() {
                if (this.hasMore && !this.isLoading) {
                    await this.loadTransactions();
                }
            }

            handleUserInput() {
                const input = document.getElementById('user-input');
                const chatMessages = document.getElementById('chat-messages');
                if (!input || !chatMessages) return;

                const text = input.value.trim();
                if (!text) return;

                try {
                    // Разбиваем ввод на слова и приводим к нижнему регистру
                    const words = text.toLowerCase().split(' ').filter(word => word.length > 0);
                    let amount = null;
                    let type = null;
                    let paymentType = null;
                    let description = [];

                    // Проверяем первый символ на наличие + или -
                    if (text.startsWith('+')) {
                        type = 'income';
                        words[0] = words[0].substring(1);
                    } else if (text.startsWith('-')) {
                        type = 'expense';
                        words[0] = words[0].substring(1);
                    }

                    // Определяем способ оплаты до обработки остальных слов
                    const paymentKeywords = {
                        'каспи': 'kaspi-gold',
                        'kaspi': 'kaspi-gold',
                        'каспий': 'kaspi-gold',
                        'kaspipay': 'kaspi-pay',
                        'каспипей': 'kaspi-pay',
                        'каспипэй': 'kaspi-pay',
                        'халык': 'halyk',
                        'halyk': 'halyk',
                        'халик': 'halyk',
                        'народный': 'halyk',
                        'нал': 'cash',
                        'наличные': 'cash'
                    };

                    // Ищем ключевые слова способа оплаты
                    for (const word of words) {
                        const normalizedWord = word.toLowerCase().replace(/[^а-яa-z]/g, '');
                        if (paymentKeywords[normalizedWord]) {
                            paymentType = paymentKeywords[normalizedWord];
                            break;
                        }
                    }

                    // Ищем сумму и другие параметры
                    for (const word of words) {
                        // Проверяем на сумму (может быть в любом месте)
                        const numStr = word.replace(/[^0-9.]/g, '');
                        if (numStr && !amount) {
                            const num = parseFloat(numStr);
                            if (!isNaN(num) && num > 0) {
                                amount = num;
                                continue;
                            }
                        }

                        // Определяем тип операции если еще не определен
                        if (!type) {
                            if (word.includes('расход') || word.includes('трат') || 
                                word.includes('минус') || word === '-') {
                                type = 'expense';
                                continue;
                            }
                            if (word.includes('приход') || word.includes('доход') || 
                                word.includes('плюс') || word === '+') {
                                type = 'income';
                                continue;
                            }
                        }

                        // Добавляем слово к описанию, если это не служебное слово
                        if (!paymentKeywords[word.toLowerCase()] && 
                            !word.match(/^[+-]?\d+$/) &&
                            !['расход', 'приход', 'доход', 'трата', 'плюс', 'минус', '+', '-'].includes(word)) {
                            description.push(word);
                        }
                    }

                    // По умолчанию считаем операцию расходом, если тип не определен
                    if (!type) {
                        type = 'expense';
                    }

                    // Формируем описание, сохраняя оригинальный регистр слов из input.value
                    const inputWords = input.value.split(' ');
                    const cleanDescription = inputWords.filter(word => {
                        const lowerWord = word.toLowerCase();
                        return !paymentKeywords[lowerWord.replace(/[^а-яa-z]/g, '')] && 
                               !word.match(/^[+-]?\d+$/) &&
                               !['расход', 'приход', 'доход', 'трата', 'плюс', 'минус', '+', '-'].includes(lowerWord);
                    }).join(' ').trim();

                    // Проверяем обязательные поля
                    if (!amount) {
                        throw new Error('Не указана сумма. Укажите число, например: 5000');
                    }
                    if (!cleanDescription) {
                        throw new Error('Не указано описание операции');
                    }

                    // Создаем транзакцию
                    const transaction = {
                        amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
                        description: cleanDescription,
                        paymentType: paymentType || 'kaspi-gold',
                        type: type,
                        date: new Date().toISOString() // Устанавливаем текущую дату и время по умолчанию
                    };
                    
                    // Определяем категорию
                    const category = this.categorizeDescription(cleanDescription);
                    
                    // Устанавливаем дату на вчера, если это "Смена"
                    if (this.categorizeDescription(cleanDescription) === 'Смена') {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                    
                        // Устанавливаем 23:59 по времени Казахстана (UTC+5 = 18:59 по UTC)
                        const dateAtAstana2359 = new Date(
                            Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 18, 59, 0)
                        );
                    
                        transaction.date = dateAtAstana2359.toISOString();
                        console.log('📅 Назначена дата смены (UTC+5 / 23:59):', transaction.date);
                    }

                    // Проверяем авторизацию перед сохранением
                    if (this.isProduction && !firebase.auth().currentUser) {
                        const errorMessage = document.createElement('div');
                        errorMessage.className = 'message system error';
                        errorMessage.textContent = 'Для добавления транзакций необходимо авторизоваться';
                        chatMessages.appendChild(errorMessage);
                        return;
                    }

                    // Сохраняем транзакцию
                    console.log('📌 Final transaction before save:', transaction);
                    this.addTransaction(transaction).then((result) => {
                        if (result) {
                            const responseMessage = document.createElement('div');
                            responseMessage.className = 'message system';
                            const paymentTypeText = transaction.paymentType === 'halyk' ? 'Halyk' : 'Kaspi';
                            responseMessage.textContent = `✅ ${transaction.type === 'expense' ? 'Расход' : 'Доход'} на сумму ${Math.abs(amount)} ₸ через ${paymentTypeText} успешно добавлен`;
                            chatMessages.appendChild(responseMessage);
                            input.value = '';

                            // Обновляем итоги
                            this.updateTotals(this.transactions);
                            
                            // Обновляем графики, если они есть
                            if (typeof window.updateCharts === 'function') {
                                window.updateCharts();
                            }

                            // Убираем автоматическую прокрутку чата
                            // chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    }).catch(error => {
                        const errorMessage = document.createElement('div');
                        errorMessage.className = 'message system error';
                        errorMessage.textContent = 'Ошибка при сохранении: ' + error.message;
                        chatMessages.appendChild(errorMessage);
                    });

                } catch (error) {
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'message system error';
                    errorMessage.innerHTML = `❌ ${error.message}<br><br>Примеры:<br>` +
                        '"5000 расход каспи такси"<br>' +
                        '"приход 10000 халык зарплата"<br>' +
                        '"-5000 халык такси"<br>' +
                        '"+10000 каспи зарплата"';
                    chatMessages.appendChild(errorMessage);
                };

                // Убираем автоматическую прокрутку чата
                // chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            // Добавляем новый метод для удаления дубликатов
            removeDuplicates(transactions) {
                const seen = new Map();
                return transactions.filter(transaction => {
                    // Создаем уникальный ключ для транзакции
                    const key = `${transaction.amount}_${transaction.description.toLowerCase()}_${transaction.paymentType}_${new Date(transaction.date).toDateString()}`;
                    
                    if (seen.has(key)) {
                        console.log('Найден дубликат:', transaction);
                        return false;
                    }
                    
                    seen.set(key, true);
                    return true;
                });
            }

            // Добавляем новый метод для инициализации кнопок быстрого ввода
            initializeQuickButtons() {
                const input = document.getElementById('user-input');
                if (!input) return;

                const quickButtonsContainer = document.createElement('div');
                quickButtonsContainer.className = 'quick-buttons';

                const buttons = [
                    { text: 'Расход', value: 'расход', colorClass: 'expense-btn', pair: 'приход' },
                    { text: 'Приход', value: 'приход', colorClass: 'income-btn', pair: 'расход' },
                    { text: 'Kaspi', value: 'каспи', colorClass: 'kaspi-btn', pair: 'халык' },
                    { text: 'Halyk', value: 'халык', colorClass: 'halyk-btn', pair: 'каспи' },
                    { text: 'Наличные', value: 'наличные', colorClass: 'cash-btn', replaces: ['каспи', 'халык'] },
                    { text: 'Поставщики', value: '', colorClass: 'suppliers-btn', isModal: true }
                ];

                // Создаем модальное окно для поставщиков
                const suppliersModal = document.createElement('div');
                suppliersModal.className = 'suppliers-modal';
                suppliersModal.innerHTML = `
                    <div class="suppliers-content">
                        <div class="suppliers-header">
                            <h3>Поставщики</h3>
                            <button class="close-suppliers">&times;</button>
                        </div>
                        <div class="suppliers-list">
                            ${this.getSuppliersList().map(supplier => `
                                <button class="supplier-item" data-value="${supplier.value}">
                                    ${supplier.name}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;
                document.body.appendChild(suppliersModal);

                // Обработчик закрытия модального окна
                const closeBtn = suppliersModal.querySelector('.close-suppliers');
                closeBtn.addEventListener('click', () => {
                    suppliersModal.classList.remove('show');
                });

                // Обработчик клика вне модального окна
                suppliersModal.addEventListener('click', (e) => {
                    if (e.target === suppliersModal) {
                        suppliersModal.classList.remove('show');
                    }
                });

                // Обработчик выбора поставщика
                const supplierItems = suppliersModal.querySelectorAll('.supplier-item');
                supplierItems.forEach(item => {
                    item.addEventListener('click', () => {
                        const supplierValue = item.dataset.value;
                        const currentValue = input.value;
                        
                        // Удаляем предыдущего активного поставщика
                        supplierItems.forEach(si => si.classList.remove('active'));
                        item.classList.add('active');
                        
                        // Ищем существующего поставщика в тексте
                        const suppliers = this.getSuppliersList().map(s => s.value);
                        let newValue = currentValue;
                        
                        // Заменяем существующего поставщика или добавляем нового
                        const supplierFound = suppliers.some(supplier => {
                            if (newValue.toLowerCase().includes(supplier)) {
                                newValue = newValue.toLowerCase().replace(supplier, supplierValue);
                                return true;
                            }
                            return false;
                        });
                        
                        // Если поставщик не найден, добавляем нового
                        if (!supplierFound) {
                            const cursorPos = input.selectionStart;
                            const beforeCursor = currentValue.slice(0, cursorPos);
                            const afterCursor = currentValue.slice(cursorPos);
                            
                            const needSpaceBefore = beforeCursor.length > 0 && !beforeCursor.endsWith(' ');
                            const needSpaceAfter = afterCursor.length > 0 && !afterCursor.startsWith(' ');
                            
                            newValue = beforeCursor + 
                                     (needSpaceBefore ? ' ' : '') + 
                                     supplierValue + 
                                     (needSpaceAfter ? ' ' : '') + 
                                     afterCursor;
                        }
                        
                        input.value = newValue;
                        input.setAttribute('data-has-supplier', 'true');
                        
                        suppliersModal.classList.remove('show');
                        input.focus();
                    });
                });

                buttons.forEach(button => {
                    const btn = document.createElement('button');
                    btn.textContent = button.text;
                    btn.className = `quick-button ${button.colorClass}`;

                    btn.addEventListener('click', (e) => {
                        if (button.isModal) {
                            // Показываем модальное окно поставщиков
                            suppliersModal.classList.add('show');
                            return;
                        }

                        // Анимация ripple
                        const ripple = document.createElement('span');
                        ripple.className = 'ripple';

                        const rect = btn.getBoundingClientRect();
                        const size = Math.max(rect.width, rect.height);
                        ripple.style.width = ripple.style.height = size + 'px';
                        
                        const x = e.clientX - rect.left - size/2;
                        const y = e.clientY - rect.top - size/2;
                        ripple.style.left = x + 'px';
                        ripple.style.top = y + 'px';

                        btn.appendChild(ripple);
                        setTimeout(() => ripple.remove(), 600);

                        if (!button.isModal) {
                            const currentValue = input.value;
                            const lowerValue = currentValue.toLowerCase();
                            const cursorPos = input.selectionStart;
                            
                            // Обновленная логика для замены способов оплаты
                            if (button.value === 'каспи' || button.value === 'халык' || button.value === 'наличные') {
                                // Удаляем все способы оплаты
                                let newValue = lowerValue
                                    .replace(/каспи|kaspi|халык|halyk|наличные|cash/gi, '')
                                    .replace(/\s+/g, ' ')
                                    .trim();

                                // Добавляем новый способ оплаты
                                newValue = newValue + (newValue ? ' ' : '') + button.value;
                                input.value = newValue;
                            } else {
                                // Для других кнопок (расход/приход) оставляем старую логику
                                if (lowerValue.includes(button.pair)) {
                                    const newValue = currentValue.replace(new RegExp(button.pair, 'i'), button.value);
                                    input.value = newValue;
                                    input.setSelectionRange(cursorPos, cursorPos);
                                } else if (!lowerValue.includes(button.value)) {
                                    const beforeCursor = currentValue.slice(0, cursorPos);
                                    const afterCursor = currentValue.slice(cursorPos);
                                    
                                    const needSpaceBefore = beforeCursor.length > 0 && !beforeCursor.endsWith(' ');
                                    const needSpaceAfter = afterCursor.length > 0 && !afterCursor.startsWith(' ');
                                    
                                    const newValue = beforeCursor + 
                                                   (needSpaceBefore ? ' ' : '') + 
                                                   button.value + 
                                                   (needSpaceAfter ? ' ' : '') + 
                                                   afterCursor;
                                    
                                    input.value = newValue;
                                    const newCursorPos = cursorPos + button.value.length + 
                                                       (needSpaceBefore ? 1 : 0) + 
                                                       (needSpaceAfter ? 1 : 0);
                                    input.setSelectionRange(newCursorPos, newCursorPos);
                                }
                            }
                        }
                        
                        input.focus();
                    });

                    quickButtonsContainer.appendChild(btn);
                });

                const sendButton = document.getElementById('send-message');
                if (sendButton) {
                    sendButton.parentNode.insertBefore(quickButtonsContainer, sendButton);
                }
            }

            getSuppliersList() {
                // Берем список поставщиков из localStorage
                const suppliersList = localStorage.getItem('suppliersList');
                if (suppliersList) {
                    const suppliers = JSON.parse(suppliersList);
                    // Фильтруем только активных поставщиков и преобразуем в нужный формат
                    return suppliers
                        .filter(supplier => supplier.isActive !== false)
                        .map(supplier => ({
                            name: supplier.name,
                            value: supplier.value || supplier.name.toLowerCase()
                        }));
                }

                // Если нет кэша, загружаем из Firebase
                this.loadSuppliersFromFirebase();

                // Возвращаем пустой список пока данные загружаются
                return [];
            }

            async loadSuppliersFromFirebase() {
                try {
                    if (!this.isProduction || !firebase.auth().currentUser) {
                        return;
                    }

                    const user = firebase.auth().currentUser;
                    const snapshot = await firebase.firestore()
                        .collection('users')
                        .doc(user.uid)
                        .collection('suppliers')
                        .orderBy('name')
                        .get();

                    const suppliers = snapshot.docs.map(doc => ({
                        id: doc.id,
                        name: doc.data().name,
                        value: doc.data().value || doc.data().name.toLowerCase(),
                        isActive: doc.data().isActive !== false // по умолчанию true
                    }))
                    .filter(supplier => supplier.isActive); // только активные поставщики

                    // Кэшируем список поставщиков в localStorage
                    localStorage.setItem('suppliersList', JSON.stringify(suppliers));

                    // Обновляем модальное окно с поставщиками
                    this.updateSuppliersModal(suppliers);

                } catch (error) {
                    console.error('Ошибка при загрузке поставщиков:', error);
                }
            }

            updateSuppliersModal(suppliers) {
                const modal = document.querySelector('.suppliers-modal');
                if (!modal) return;

                const suppliersList = modal.querySelector('.suppliers-list');
                if (!suppliersList) return;

                suppliersList.innerHTML = suppliers.map(supplier => `
                    <button class="supplier-item" data-value="${supplier.value}">
                        ${supplier.name}
                    </button>
                `).join('');

                // Переназначаем обработчики событий для новых кнопок
                const supplierItems = suppliersList.querySelectorAll('.supplier-item');
                const input = document.getElementById('user-input');

                supplierItems.forEach(item => {
                    item.addEventListener('click', () => {
                        const supplierValue = item.dataset.value;
                        const currentValue = input.value;
                        
                        supplierItems.forEach(si => si.classList.remove('active'));
                        item.classList.add('active');
                        
                        const suppliers = this.getSuppliersList().map(s => s.value);
                        let newValue = currentValue;
                        
                        const supplierFound = suppliers.some(supplier => {
                            if (newValue.toLowerCase().includes(supplier)) {
                                newValue = newValue.toLowerCase().replace(supplier, supplierValue);
                                return true;
                            }
                            return false;
                        });
                        
                        if (!supplierFound) {
                            const cursorPos = input.selectionStart;
                            const beforeCursor = currentValue.slice(0, cursorPos);
                            const afterCursor = currentValue.slice(cursorPos);
                            
                            const needSpaceBefore = beforeCursor.length > 0 && !beforeCursor.endsWith(' ');
                            const needSpaceAfter = afterCursor.length > 0 && !afterCursor.startsWith(' ');
                            
                            newValue = beforeCursor + 
                                     (needSpaceBefore ? ' ' : '') + 
                                     supplierValue + 
                                     (needSpaceAfter ? ' ' : '') + 
                                     afterCursor;
                        }
                        
                        input.value = newValue;
                        input.setAttribute('data-has-supplier', 'true');
                        
                        modal.classList.remove('show');
                        input.focus();
                    });
                });
            }

            // Добавляем новый метод для добавления одной транзакции
            addTransactionToDOM(transaction) {
                console.log('Начало добавления транзакции в DOM:', transaction);

                const container = document.getElementById('expensesTableBody');
                if (!container) {
                    console.error('Контейнер expensesTableBody не найден');
                    return;
                }

                const date = new Date(transaction.date);
                const dateKey = date.toLocaleDateString('ru-RU');
                console.log('Добавление для даты:', dateKey);

                
                // Ищем существующую группу для этой даты
                let dateGroup = Array.from(container.children).find(
                    group => group.querySelector('.date-label')?.textContent === dateKey
                );

                // Если группа не найдена, создаем новую
                if (!dateGroup) {
                    console.log('Создаем новую группу для даты:', dateKey);
                    dateGroup = document.createElement('div');
                    dateGroup.className = 'date-group';
                    dateGroup.innerHTML = `
                        <div class="date-header">
                            <div class="date-label">${dateKey}</div>
                            <div class="date-summary">
                                <span class="income-total">+${this.formatAmount(0)} ₸</span>
                                <span class="expense-total">-${this.formatAmount(0)} ₸</span>
                            </div>
                        </div>
                    `;
                    container.insertBefore(dateGroup, container.firstChild);
                }

                // Создаем карточку транзакции
                const cardWrapper = document.createElement('div');
                cardWrapper.className = 'card-wrapper';
                
                const card = document.createElement('div');
                card.className = 'transaction-card';
                card.dataset.id = transaction.id || transaction.docId; // Добавляем ID для возможности удаления

                const formattedTime = date.toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit'
                });
                const formattedAmount = this.formatAmount(Math.abs(transaction.amount));
                const paymentTypeText = (() => {
                    switch (transaction.paymentType) {
                        case 'halyk':
                            return 'Halyk';
                        case 'cash':
                            return 'Наличные';
                        case 'kaspi-gold':
                        case 'kaspi-pay':
                        default:
                            return 'Kaspi';
                    }
                })();

                card.innerHTML = `
                    <div class="transaction-content">
                        <div class="transaction-info">
                            <div class="transaction-time">${formattedTime}</div>
                            <div class="transaction-description">
                                ${transaction.description}
                            </div>
                            <div class="payment-info">
                                <span class="payment-type">${paymentTypeText}</span>
                                <span class="transaction-category">${this.categorizeDescription(transaction.description)}</span>
                            </div>
                        </div>
                        <div class="transaction-amount ${transaction.amount < 0 ? 'expense' : 'income'}">
                            ${transaction.amount < 0 ? '-' : '+'} ${formattedAmount} ₸
                        </div>
                    </div>
                `;

                // Добавляем обработчик клика для показа деталей
                card.addEventListener('click', () => {
                    this.showTransactionDetails(transaction);
                });

                cardWrapper.appendChild(card);

                // Вставляем карточку в начало группы после заголовка
                const header = dateGroup.querySelector('.date-header');
                
                // Получаем все существующие карточки в группе
                const existingCards = Array.from(dateGroup.querySelectorAll('.card-wrapper'));
                
                // Находим позицию для вставки новой карточки
                const transactionTime = date.getHours() * 60 + date.getMinutes();
                
                const insertPosition = existingCards.find(existingCard => {
                    const existingTimeText = existingCard.querySelector('.transaction-time')?.textContent;
                    if (!existingTimeText) return true;
                    
                    const [hours, minutes] = existingTimeText.split(':').map(Number);
                    const existingTime = hours * 60 + minutes;
                    
                    return transactionTime > existingTime;
                });

                if (insertPosition) {
                    dateGroup.insertBefore(cardWrapper, insertPosition);
                } else {
                    if (header.nextSibling) {
                        dateGroup.insertBefore(cardWrapper, header.nextSibling);
                    } else {
                        dateGroup.appendChild(cardWrapper);
                    }
                }

                // Обновляем итоги для группы
                const transactions = this.transactions.filter(t => 
                    new Date(t.date).toLocaleDateString('ru-RU') === dateKey
                );
                const income = transactions.reduce((sum, t) => sum + (t.amount > 0 ? Math.abs(t.amount) : 0), 0);
                const expense = transactions.reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);

                const incomeTotal = dateGroup.querySelector('.income-total');
                const expenseTotal = dateGroup.querySelector('.expense-total');
                if (incomeTotal) incomeTotal.textContent = `+${this.formatAmount(income)} ₸`;
                if (expenseTotal) expenseTotal.textContent = `-${this.formatAmount(expense)} ₸`;

                console.log('Транзакция успешно добавлена в DOM');
            }

            createTransactionCard(transaction) {
                const cardWrapper = document.createElement('div');
                cardWrapper.className = 'card-wrapper';
                
                const card = document.createElement('div');
                card.className = 'transaction-card';
                // Добавляем обработчик клика для открытия модального окна
                card.addEventListener('click', () => this.showTransactionDetails(transaction));
                
                // ... существующий код создания карточки ...
                
                return cardWrapper;
            }

            showTransactionDetails(transaction) {
                console.log('Открытие деталей транзакции:', transaction);
                
                // Создаем или получаем модальное окно
                let modal = document.querySelector('.transaction-details-modal');
                
                if (!modal) {
                    modal = document.createElement('div');
                    modal.className = 'transaction-details-modal';
                    document.body.appendChild(modal);
                }

                // Форматируем дату для input
                const transactionDate = new Date(transaction.date);
                const formattedDate = transactionDate.toISOString().split('T')[0];

                // Обновляем содержимое модального окна
                modal.innerHTML = `
                    <div class="transaction-details-content">
                        <div class="transaction-details-header">
                            <div class="transaction-details-title">Детали транзакции</div>
                            <button class="transaction-details-close">✕</button>
                        </div>
                        <div class="transaction-details-info">
                            <div class="detail-item">
                                <div class="detail-label">Дата и время</div>
                                <div class="detail-value">
                                    <input type="text" id="editTransactionDate" class="date-edit-input" value="${formattedDate}" placeholder="Выберите дату">
                                    <div class="current-time">${transactionDate.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}</div>
                                </div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Описание</div>
                                <div class="detail-value">${transaction.description}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Сумма</div>
                                <div class="detail-value ${transaction.amount < 0 ? 'expense' : 'income'}">
                                    ${transaction.amount < 0 ? '-' : '+'} ${this.formatAmount(Math.abs(transaction.amount))} ₸
                                </div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Тип оплаты</div>
                                <div class="detail-value">${transaction.paymentType === 'halyk' ? 'Halyk' : 'Kaspi'}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Категория</div>
                                <div class="detail-value">${this.categorizeDescription(transaction.description)}</div>
                            </div>
                        </div>
                        <div class="transaction-details-actions">
                            <button class="action-button save-action" data-id="${transaction.docId || transaction.id}">
                                Сохранить изменения
                            </button>
                            <button class="action-button delete-action" data-id="${transaction.docId || transaction.id}">
                                Удалить транзакцию
                            </button>
                        </div>
                    </div>
                `;

                // Инициализируем flatpickr для поля даты
                if (window.flatpickr) {
                    flatpickr('#editTransactionDate', {
                        dateFormat: 'Y-m-d',
                        allowInput: true,
                        locale: 'ru',
                        disableMobile: true
                    });
                }

                // Обработчик сохранения изменений
                const saveBtn = modal.querySelector('.save-action');
                if (saveBtn) {
                    saveBtn.addEventListener('click', async (e) => {
                        const transactionId = e.target.dataset.id;
                        const newDate = document.getElementById('editTransactionDate').value;
                        
                        if (newDate) {
                            console.log('Сохранение изменений для транзакции:', transactionId, 'Новая дата:', newDate);
                            
                            // Создаем новую дату с сохранением времени
                            const currentTime = transactionDate;
                            const newDateTime = new Date(newDate);
                            newDateTime.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds());
                            
                            // Обновляем транзакцию
                            await this.updateTransaction(transactionId, { date: newDateTime.toISOString() });
                            
                            // Закрываем модальное окно
                            this.closeTransactionDetails();
                        }
                    });
                }

                // Обработчик удаления
                const deleteBtn = modal.querySelector('.delete-action');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', async (e) => {
                        const transactionId = e.target.dataset.id;
                        console.log('Удаление транзакции с ID:', transactionId);
                        
                        // Закрываем окно деталей
                        this.closeTransactionDetails();
                        
                        // Показываем диалог подтверждения
                        this.showConfirmDialog(transactionId);
                    });
                }
                
                // Добавляем обработчики событий
                const closeBtn = modal.querySelector('.transaction-details-close');

                // Обработчик закрытия
                closeBtn.addEventListener('click', () => {
                    console.log('Закрытие модального окна');
                    this.closeTransactionDetails();
                });

                // Закрытие по клику вне контента
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeTransactionDetails();
                    }
                });

                // Показываем модальное окно
                modal.style.display = 'block';
                requestAnimationFrame(() => {
                    modal.classList.add('show');
                });
            }

            closeTransactionDetails() {
                const modal = document.querySelector('.transaction-details-modal');
                if (modal) {
                    modal.classList.remove('show');
                    setTimeout(() => {
                        modal.style.display = 'none';
                    }, 300);
                }
            }

            initializeExportHandlers() {
                if (this.currentPage !== 'export.html') return;

                const dateRangeButton = document.getElementById('dateRangeButton');
                const exportButton = document.getElementById('exportPDF');
                const dateRangeText = document.getElementById('dateRangeText');

                if (dateRangeButton) {
                    dateRangeButton.addEventListener('click', () => {
                        // Используем методы из ExportManager
                        if (window.exportManager) {
                            window.exportManager.showDateRangeModal();
                        }
                    });
                }

                if (exportButton) {
                    exportButton.addEventListener('click', () => {
                        // Используем методы из ExportManager
                        if (window.exportManager) {
                            window.exportManager.exportToPDF();
                        }
                    });
                }

                // Устанавливаем начальный текст для диапазона дат
                if (dateRangeText && window.exportManager) {
                    const startDate = new Date();
                    startDate.setDate(1);
                    const endDate = new Date();
                    dateRangeText.textContent = `${window.exportManager.formatDate(startDate)} - ${window.exportManager.formatDate(endDate)}`;
                }

                // Передаем транзакции в ExportManager
                if (window.exportManager) {
                    window.exportManager.transactions = this.transactions;
                }
            }

            // Добавляем новый метод для получения транзакций
            getAllTransactions() {
                console.log('ExpenseManager: Получение всех транзакций');
                
                // Проверяем наличие транзакций
                if (!Array.isArray(this.transactions)) {
                    console.warn('ExpenseManager: transactions не является массивом');
                    return [];
                }

                // Удаляем дубликаты и сортируем по дате
                const uniqueTransactions = this.removeDuplicates([...this.transactions]);
                
                // Сортируем по дате (новые сверху)
                uniqueTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                console.log('ExpenseManager: Возвращаем транзакций:', uniqueTransactions.length);
                return uniqueTransactions;
            }
        }
    }

// Создаем глобальный экземпляр только если его еще нет
if (!window.expenseManager) {
    console.log('Создание нового экземпляра ExpenseManager');
    window.expenseManager = new window.ExpenseManager();
} else {
    console.log('ExpenseManager уже существует');
}

// Глобальная функция удаления
window.deleteTransaction = function(id) {
    if (confirm('Вы уверены, что хотите удалить эту транзакцию?')) {
        window.expenseManager.deleteTransaction(id);
    }
};

// Функции рендеринга и обновления
window.renderExpensesTable = function() {
    const transactionsList = document.getElementById('expensesTableBody');
    if (!transactionsList) return;
    
    const transactions = window.expenseManager.getTransactions();
    // ... остальной код функции ...
};

window.updateTotals = function(transactions) {
    const totalIncome = document.getElementById('totalIncome');
    const totalExpense = document.getElementById('totalExpense');
    // ... остальной код функции ...
};

// Функция инициализации фильтров
function initializeFilters() {
    const startDate = document.querySelector('#startDate');
    const endDate = document.querySelector('#endDate');
    const applyFilter = document.querySelector('#applyDateFilter');
    const resetFilter = document.querySelector('#resetDateFilter');

    if (!startDate || !endDate) {
        console.error('Элементы календаря не найдены');
        return;
    }

    if (applyFilter) {
        applyFilter.addEventListener('click', () => {
            window.expenseManager.setDateFilter(startDate.value, endDate.value);
        });
    }

    if (resetFilter) {
        resetFilter.addEventListener('click', () => {
            startDate.value = '';
            endDate.value = '';
            window.expenseManager.resetDateFilter();
        });
    }
}

// Функция инициализации приложения
function initializeApp() {
    try {
        // Рендерим транзакции
        window.expenseManager.renderTransactions();
        
        // Инициализируем фильтры
        initializeFilters();
        
        console.log('Приложение успешно инициализировано');
    } catch (error) {
        console.error('Ошибка при инициализации приложения:', error);
    }
}

// Обновляем функцию добавления расхода
function addExpense(amount, description, paymentType) {
    const expense = {
        id: Date.now(),
        amount: parseFloat(amount),
        description: description,
        paymentType: paymentType, // kaspi-gold, kaspi-pay или halyk
        paymentTypeName: PAYMENT_TYPES[paymentType], // Русское название
        date: new Date()
    };

    expenses.push(expense);
    localStorage.setItem('expenses', JSON.stringify(expenses));
    renderExpenses();
}

// Обновляем обработчик отправки формы
document.getElementById('expenseForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = document.getElementById('expenseAmount').value;
    const description = document.getElementById('expenseDescription').value;
    const paymentType = document.getElementById('paymentType').value;

    addExpense(amount, description, paymentType);
    
    // Очищаем форму
    e.target.reset();
    document.getElementById('addExpenseModal').classList.remove('active');
});

// Обновляем функцию отображения расходов
function renderExpenses() {
    const expensesList = document.getElementById('expensesList');
    expensesList.innerHTML = '';

    const filteredExpenses = expenses.filter(expense => {
        // Фильтрация по дате остается без изменений
        return true; // Добавьте здесь вашу текущую логику фильтрации по дате
    });

    filteredExpenses.forEach(expense => {
        const expenseElement = document.createElement('div');
        expenseElement.className = 'expense-item';
        
        expenseElement.innerHTML = `
            <div class="expense-info">
                <div class="expense-details">
                    <div class="expense-description">${expense.description}</div>
                    <div class="expense-metadata">
                        <span class="expense-date">${formatDate(expense.date)}</span>
                        <span class="expense-payment-type">${expense.paymentTypeName}</span>
                    </div>
                </div>
            </div>
            <div class="expense-amount">₸ ${expense.amount.toLocaleString()}</div>
        `;
        
        expensesList.appendChild(expenseElement);
    });
}

// Функция для получения иконки типа платежа
function getPaymentTypeIcon(type) {
    const icons = {
        'kaspi-gold': `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z"/>
        </svg>`,
        'kaspi-pay': `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 2H7C5.89 2 5 2.89 5 4V20C5 21.11 5.89 22 7 22H17C18.11 22 19 21.11 19 20V4C19 2.89 18.11 2 17 2ZM17 20H7V4H17V20Z"/>
        </svg>`,
        'halyk': `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 14.43 7.75 14.47 9H16.8C16.75 7.2 15.53 5.57 13.5 5.03V3H9.5V5C7.57 5.46 6 6.93 6 8.79C6 11.01 7.89 12.19 10.76 12.88C13.3 13.5 13.85 14.38 13.85 15.31C13.85 16 13.45 17.1 11.5 17.1C9.66 17.1 8.35 16.18 8.23 15H5.9C6.03 17.19 7.6 18.54 9.5 18.97V21H13.5V19C15.45 18.59 17 17.23 17 15.3C17 12.54 14.07 11.49 11.8 10.9Z"/>
        </svg>`
    };
    return icons[type] || '';
}

const testDescriptions = [
    // Счет на оплату (берем из актуального списка поставщиков)
    ...window.expenseManager.getSuppliersList().map(supplier => `${supplier.value} поставка`),
    'базар продукты',
    'доставка товара',
    'тоо рога и копыта',
    
    // Зарплата
    'зарплата за июнь',
    'аванс сотрудникам',
    'на зарплату персоналу',
    
    // Руководство
    'ига премия',
    'ержан командировка',
    'альфия отчет',
    'сека расходы',
    
    // Долг
    'возврат долга',
    'кредо банк',
    'займ на оборудование',
    'в долг на месяц',
    
    // Должны попасть в Прочее
    'канцтовары',
    'ремонт техники',
    'такси'
];

console.log('Тестирование категоризации:');
testDescriptions.forEach(desc => {
    console.log(`"${desc}" -> ${window.expenseManager.categorizeDescription(desc)}`);
}); 

// Обновляем функцию processUserInput
function processUserInput() {
    const input = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    
    if (!input || !chatMessages) {
        console.error('Не найдены элементы input или chatMessages');
        return;
    }

    const text = input.value.trim();
    if (!text) return;

    try {
        // Разбираем введённую строку
        const words = text.toLowerCase().split(' ').filter(word => word.length > 0);
        let amount = null;
        let type = null;
        let paymentType = 'kaspi-gold';
        let description = [];

        // Проверяем первый символ на наличие + или -
        if (text.startsWith('+')) {
            type = 'income';
            words[0] = words[0].substring(1);
        } else if (text.startsWith('-')) {
            type = 'expense';
            words[0] = words[0].substring(1);
        }

        // Определяем способ оплаты до обработки остальных слов
        const paymentKeywords = {
            'каспи': 'kaspi-gold',
            'kaspi': 'kaspi-gold',
            'каспий': 'kaspi-gold',
            'kaspipay': 'kaspi-pay',
            'каспипей': 'kaspi-pay',
            'каспипэй': 'kaspi-pay',
            'халык': 'halyk',
            'halyk': 'halyk',
            'халик': 'halyk',
            'народный': 'halyk',
            'нал': 'cash',
            'наличные': 'cash'
        };

        // Ищем ключевые слова способа оплаты
        for (const word of words) {
            const normalizedWord = word.toLowerCase().replace(/[^а-яa-z]/g, '');
            if (paymentKeywords[normalizedWord]) {
                paymentType = paymentKeywords[normalizedWord];
                break;
            }
        }

        // Ищем сумму и другие параметры
        for (const word of words) {
            // Проверяем на сумму (может быть в любом месте)
            const numStr = word.replace(/[^0-9.]/g, '');
            if (numStr && !amount) {
                const num = parseFloat(numStr);
                if (!isNaN(num) && num > 0) {
                    amount = num;
                    continue;
                }
            }

            // Определяем тип операции если еще не определен
            if (!type) {
                if (word.includes('расход') || word.includes('трат') || 
                    word.includes('минус') || word === '-') {
                    type = 'expense';
                    continue;
                }
                if (word.includes('приход') || word.includes('доход') || 
                    word.includes('плюс') || word === '+') {
                    type = 'income';
                    continue;
                }
            }

            // Добавляем слово к описанию, если это не служебное слово
            if (!paymentKeywords[word.toLowerCase()] && 
                !word.match(/^[+-]?\d+$/) &&
                !['расход', 'приход', 'доход', 'трата', 'плюс', 'минус', '+', '-'].includes(word)) {
                description.push(word);
            }
        }

        // По умолчанию считаем операцию расходом, если тип не определен
        if (!type) {
            type = 'expense';
        }

        // Формируем описание, сохраняя оригинальный регистр слов из input.value
        const inputWords = input.value.split(' ');
        const cleanDescription = inputWords.filter(word => {
            const lowerWord = word.toLowerCase();
            return !paymentKeywords[lowerWord.replace(/[^а-яa-z]/g, '')] && 
                   !word.match(/^[+-]?\d+$/) &&
                   !['расход', 'приход', 'доход', 'трата', 'плюс', 'минус', '+', '-'].includes(lowerWord);
        }).join(' ').trim();

        // Проверяем обязательные поля
        if (!amount) {
            throw new Error('Не указана сумма. Укажите число, например: 5000');
        }
        if (!cleanDescription) {
            throw new Error('Не указано описание операции');
        }

        // Создаем транзакцию
        const transaction = {
            amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
            description: cleanDescription,
            paymentType: paymentType || 'kaspi-gold',
            date: (() => {
                const selectedDate = document.getElementById('chat-date')?.value; // Изменено с expenseDate на chat-date
                if (selectedDate) {
                    const selected = new Date(selectedDate);
                    const now = new Date();
                    selected.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                    return selected.toISOString();
                }
                return new Date().toISOString();
            })(),
            type: type
        };

        window.expenseManager.addTransaction(transaction).then((result) => {
            if (result) {
                const responseMessage = document.createElement('div');
                responseMessage.className = 'message system';
                const paymentTypeText = transaction.paymentType === 'halyk' ? 'Halyk' : 'Kaspi';
                responseMessage.textContent = `✅ ${transaction.type === 'expense' ? 'Расход' : 'Доход'} на сумму ${Math.abs(transaction.amount)} ₸ через ${paymentTypeText} успешно добавлен`;
                chatMessages.appendChild(responseMessage);
                input.value = '';
        
                window.expenseManager.updateTotals(window.expenseManager.transactions);
        
                if (typeof window.updateCharts === 'function') {
                    window.updateCharts();
                }
            }
        }).catch(error => {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'message system error';
            errorMessage.textContent = 'Ошибка при сохранении: ' + error.message;
            chatMessages.appendChild(errorMessage);
        });

    } catch (error) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'message system error';
        errorMessage.innerHTML = `❌ ${error.message}<br><br>Примеры:<br>
            "5000 расход каспи такси"<br>
            "приход 10000 халык зарплата"<br>
            "-5000 халык такси"<br>
            "+10000 каспи зарплата"`;
        chatMessages.appendChild(errorMessage);
    }
}

// В начале файла, после объявления класса ExpenseManager
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, инициализируем обработчики');
    
    const userInput = document.getElementById('user-input');
    const sendMessage = document.getElementById('send-message');
    
    console.log('userInput element:', userInput);
    console.log('sendMessage button:', sendMessage);

    if (userInput) {
        userInput.addEventListener('keypress', (e) => {
            console.log('Нажата клавиша:', e.key);
            if (e.key === 'Enter') {
                console.log('Нажат Enter, вызываем processUserInput');
                processUserInput();
            }
        });
    }

    if (sendMessage) {
        sendMessage.addEventListener('click', () => {
            console.log('Нажата кнопка отправки, вызываем processUserInput');
            processUserInput();
        });
    }

    // Устанавливаем текущую дату в поле выбора даты
    const chatDate = document.getElementById('chat-date');
    if (chatDate) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        chatDate.value = `${year}-${month}-${day}`;
    }

    // Остальной код инициализации
});

// В конце файла
console.log('Текущий ExpenseManager:', window.expenseManager);
console.log('Текущая страница:', window.location.pathname);

// Проверяем, что глобальная функция addTransaction доступна
console.log('window.addTransaction доступен:', typeof window.addTransaction === 'function');

// Обновляем массив служебных слов, которые нужно исключить из описания
const serviceWords = [
    'расход', 'приход', 'доход', 'трата', 
    'плюс', 'минус', '+', '-',
    'каспи', 'kaspi', 'каспий', 'kaspipay', 
    'каспипей', 'каспипэй', 'халык', 'halyk',
    'наличные', 'наличка', 'нал', 'cash'
];

// В методе processUserInput обновляем логику формирования описания
const description = words.filter(word => {
    const normalizedWord = word.toLowerCase().trim();
    // Исключаем служебные слова и числа
    return !serviceWords.includes(normalizedWord) && 
           !word.match(/^[+-]?\d+$/) &&
           !['расход', 'приход', 'доход', 'трата', 'плюс', 'минус', '+', '-'].includes(normalizedWord);
}).join(' ');

// Создаем транзакцию, где тип определяется только по сумме
const transaction = {
    amount: amount < 0 ? amount : Math.abs(amount), // если сумма отрицательная - расход, положительная - приход
    description: cleanDescription,
    paymentType: paymentType,
    date: new Date().toISOString(), // Устанавливаем текущую дату и время по умолчанию
    type: amount < 0 ? 'expense' : 'income'
};