// Глобальная функция для добавления транзакций
window.addTransaction = function(transaction) {
    if (window.expenseManager) {
        window.expenseManager.addTransaction(transaction);
    } else {
        console.error('ExpenseManager не инициализирован');
    }
};

// Класс для управления данными
class ExpenseManager {
    constructor() {
        console.log('ExpenseManager: Инициализация');
        
        this.transactions = [];
        this.dateFilters = {
            from: null,
            to: null
        };
        
        // Определяем, используем ли мы Firebase
        const hostname = window.location.host;
        this.isProduction = hostname === 'uyatemes.github.io' || 
                           hostname === '192.168.3.10' || 
                           hostname === '192.168.3.10:8080' || 
                           hostname === 'localhost:8080' ||
                           hostname === '10.131.1.174:8080';
        console.log('Режим работы:', this.isProduction ? 'Production' : 'Local');
        
        // Привязываем методы к контексту
        this.handleApplyFilter = this.handleApplyFilter.bind(this);
        this.handleResetFilter = this.handleResetFilter.bind(this);
        this.showConfirmDialog = this.showConfirmDialog.bind(this);
        
        // Инициализация при создании экземпляра
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }

        this.currentTransactionToDelete = null;
        this.initializeModal();
        this.initializeQuickButtons();

        if (this.isProduction) {
            // Слушаем изменения авторизации
            firebase.auth().onAuthStateChanged(async user => {
                console.log('Состояние авторизации изменилось:', user ? user.email : 'не авторизован');
                if (user) {
                    await this.migrateLocalDataToFirebase();
                    this.loadFromFirebase();
                } else {
                    // Проверяем, есть ли сохраненная сессия
                    const lastSession = localStorage.getItem('lastAuthSession');
                    if (!lastSession) {
                        this.showSignInPrompt();
                    }
                }
            });
        } else {
            this.loadFromLocalStorage();
        }

        this.lastDoc = null;
        this.hasMore = false;
        this.isLoading = false;

        // Привязываем обработчики событий
        document.getElementById('user-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUserInput();
        });
        
        document.getElementById('send-message')?.addEventListener('click', () => {
            this.handleUserInput();
        });

        // Добавляем обработчик для кнопки "Загрузить еще"
        const loadMoreButton = document.getElementById('loadMoreButton');
        if (loadMoreButton) {
            loadMoreButton.addEventListener('click', () => {
                this.loadMoreTransactions();
            });
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
                this.transactions = [];
                this.renderTransactions();
                return;
            }

            // Очищаем массив транзакций перед загрузкой
            this.transactions = [];

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
            
            console.log(`ExpenseManager: Загружено ${loadedTransactions.length} транзакций (до удаления дубликатов)`);
            
            // Удаляем дубликаты
            this.transactions = this.removeDuplicates(loadedTransactions);
            
            console.log(`ExpenseManager: Осталось ${this.transactions.length} транзакций (после удаления дубликатов)`);
            
            // Обновляем отображение
            this.renderTransactions();
            this.updateTotals(this.transactions);
            
        } catch (error) {
            console.error('Ошибка при загрузке из Firebase:', error);
            this.transactions = [];
            this.renderTransactions();
        }
    }

    loadFromLocalStorage() {
        const savedData = localStorage.getItem('transactions');
        if (savedData) {
            this.transactions = JSON.parse(savedData);
            this.renderTransactions();
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }

    async addTransaction(transaction) {
        try {
            // Проверяем авторизацию
            if (this.isProduction) {
                const user = firebase.auth().currentUser;
                if (!user) {
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
                date: new Date().toISOString()
            };

            let savedTransaction;

            if (this.isProduction) {
                // Сохраняем в Firebase
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
            } else {
                savedTransaction = {
                    ...newTransaction,
                    id: Date.now()
                };
            }

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

            // Сохраняем в локальное хранилище, если не в production
            if (!this.isProduction) {
                this.saveToLocalStorage();
            }

            return savedTransaction;
            
        } catch (error) {
            console.error('Ошибка при сохранении транзакции:', error);
            throw error;
        }
    }

    async deleteTransaction(id) {
        try {
            console.log('Удаление транзакции:', id);
            
            // Проверяем авторизацию
            const user = firebase.auth().currentUser;
            if (!user) {
                throw new Error('Необходима авторизация');
            }

            // Удаляем из Firebase
            await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .collection('transactions')
                .doc(id)
                .delete();

            console.log('Транзакция удалена из Firebase');

            // Удаляем из локального массива
            this.transactions = this.transactions.filter(t => t.docId !== id);
            
            // Обновляем отображение
            this.renderTransactions();
            this.updateTotals(this.transactions);
            
            console.log('Интерфейс обновлен');
            
        } catch (error) {
            console.error('Ошибка при удалении транзакции:', error);
            alert('Не удалось удалить транзакцию. Попробуйте еще раз.');
        }
    }

    updateTransaction(id, updatedTransaction) {
        this.transactions = this.transactions.map(transaction => 
            transaction.id === id ? {...updatedTransaction, id} : transaction
        );
        this.renderTransactions();
        if (typeof window.updateCharts === 'function') {
            window.updateCharts();
        }
        this.updateTotals(this.transactions);
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
        const container = document.getElementById('expensesTableBody');
        container.innerHTML = '';

        const transactions = this.getFilteredTransactions();
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
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateB.getTime() - dateA.getTime(); // Используем getTime() для более точного сравнения
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

    updateTotals(transactions) {
        console.log('ExpenseManager: Начало updateTotals');
        
        // Выводим все транзакции для проверки
        console.log('Все транзакции:', transactions);
        
        // Считаем итоги с учетом знака и типа
        const totals = transactions.reduce((acc, t) => {
            const amount = Math.abs(parseFloat(t.amount));
            // Если тип указан явно, используем его
            if (t.type === 'income' || (t.amount > 0 && t.type !== 'expense')) {
                acc.totalIncome += amount;
            } else {
                acc.totalExpense += amount;
            }
            return acc;
        }, { totalIncome: 0, totalExpense: 0 });
        
        console.log('Посчитанные итоги:', totals);
        
        // Обновляем отображение с учетом вложенных элементов
        const incomeElement = document.querySelector('#totalIncome .total-amount');
        const expenseElement = document.querySelector('#totalExpense .total-amount');
        
        if (incomeElement) {
            incomeElement.textContent = `${totals.totalIncome.toLocaleString('ru-RU')} ₸`;
        }
        
        if (expenseElement) {
            expenseElement.textContent = `${totals.totalExpense.toLocaleString('ru-RU')} ₸`;
        }
    }

    showConfirmDialog(id) {
        const modal = document.getElementById('confirmDialog');
        this.currentTransactionToDelete = id;
        modal.classList.add('show');
    }

    async exportToPDF() {
        const element = document.createElement('div');
        element.innerHTML = this.generatePDFContent();
        
        // Генерируем имя файла с датой и временем
        const now = new Date();
        const dateStr = now.toLocaleDateString('ru-RU').replace(/\./g, '-');
        const timeStr = now.toLocaleTimeString('ru-RU').replace(/:/g, '-');
        const fileName = `expense-report_${dateStr}_${timeStr}.pdf`;
        
        const opt = {
            margin: [15, 15, 15, 15],
            filename: fileName,
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            style: `
                .pdf-container {
                    font-family: Arial, sans-serif;
                    color: #000;
                    padding: 20px;
                    line-height: 1.5;
                }
                h1 {
                    font-size: 24px;
                    font-weight: bold;
                    margin: 0 0 15px 0;
                    color: #000;
                }
                .period {
                    font-size: 14px;
                    margin-bottom: 20px;
                    color: #000;
                }
                .totals {
                    margin-bottom: 30px;
                    font-size: 16px;
                    font-weight: bold;
                }
                .income {
                    color: #188038;
                    margin-bottom: 5px;
                }
                .expense {
                    color: #d93025;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 14px;
                }
                tr {
                    border-bottom: 1px solid #ddd;
                }
                td {
                    padding: 10px 5px;
                    color: #000;
                }
                .header td {
                    font-weight: bold;
                    background: #f5f5f5;
                    border-bottom: 2px solid #ddd;
                }
                td:last-child {
                    text-align: right;
                }
                tr td.income {
                    color: #188038;
                }
                tr td.expense {
                    color: #d93025;
                }
            `
        };

        await html2pdf().set(opt).from(element).save();
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
        // Получаем транзакции и удаляем дубликаты
        const filteredTransactions = this.getFilteredTransactions();
        console.log('Всего транзакций до удаления дубликатов:', filteredTransactions.length);
        
        // Удаляем дубликаты
        const transactions = this.removeDuplicates(filteredTransactions);
        console.log('Транзакций после удаления дубликатов:', transactions.length);
        
        // Считаем итоги по уникальным транзакциям
        const totals = this.calculateTotals(transactions);
        
        // Получаем текущую дату и время
        const now = new Date();
        const exportDateTime = now.toLocaleString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        // Сортируем транзакции по дате (от новых к старым)
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Остальной код генерации PDF остается без изменений
        const { totalIncome, totalExpense } = totals;
        
        // Описания категорий
        const categoryDescriptions = {
            'Счет на оплату': 'Fika People, Fruitata, Абадан Пэй, RockCity, Coffee Man, Shygie.kz, ИП и ТОО, базары, магазины',
            'Зарплата': 'Зарплаты, авансы и выплаты сотрудникам',
            'Руководство': 'Ига, Ержан, Альфия, Сека',
            'Долг': 'Долги, кредиты',
            'Прочее': 'Остальные операции'
        };
        
        // Группируем транзакции по категориям
        const summary = {};
        
        // Сначала собираем все транзакции по категориям
        transactions.forEach(t => {
            const category = this.categorizeDescription(t.description);
            if (!summary[category]) {
                summary[category] = { income: 0, expense: 0 };
            }
            if (t.type === 'income') {
                summary[category].income += Math.abs(t.amount);
            } else {
                summary[category].expense += Math.abs(t.amount);
            }
        });

        return `
            <div class="pdf-container" style="color: #000000 !important;">
                <style>
                    @media print {
                        table { page-break-inside: avoid; }
                        tr { page-break-inside: avoid; }
                        thead { display: table-header-group; }
                        tfoot { display: table-footer-group; }
                        .page-break { page-break-before: always; }
                        h2 { page-break-before: always; }
                    }
                </style>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h1 style="color: #000000 !important; margin: 0;">Отчет по операциям</h1>
                    <svg width="80" height="80" viewBox="0 0 685 321" style="color: #DDDDDD !important; fill: #DDDDDD !important;">
                        <g>
                            <path class="cls-1" d="m342.5,0C153.35,0,0,71.86,0,160.5s153.35,160.5,342.5,160.5,342.5-71.86,342.5-160.5S531.66,0,342.5,0Zm212.11,100.57c22.28,4.46,42.22,9.62,59.16,15.29,7.63,14.56,11.48,29.68,11.48,45.11,0,13.74-3.05,27.24-9.1,40.31-16.91,5.79-36.94,11.08-59.4,15.64,8.09-17.42,12.5-36.27,12.5-55.95,0-21.37-5.2-41.76-14.64-60.4Zm69.46,18.93c6.89,2.58,13.18,5.26,18.81,8.01,20.87,10.2,32.37,21.37,32.37,31.46s-11.11,20.88-31.28,30.93c-5.27,2.62-11.15,5.19-17.59,7.66,4.49-11.75,6.87-24,6.87-36.59,0-14.6-3.39-28.52-9.18-41.47Zm-34.58-64.91c27.59,14.24,49.16,30.71,64.13,48.98,9.59,11.7,16.16,23.81,19.66,36.18-10.18-10.71-28.68-20.63-53.73-29.33-10.13-18.41-24.95-34.55-41.26-47.45-20.26-16.03-43.24-27.36-66.88-37.44,26.5,4.6,54.21,16.74,78.08,29.06Zm-118.87-33.76c30.56,7.89,57.95,19.15,81.43,33.48,23.2,14.15,41.35,30.55,53.96,48.74.86,1.24,1.69,2.49,2.49,3.74-17.04-5.29-36.61-10.06-58.26-14.19-18.62-31.69-49.79-57.7-88.37-73.9,2.93.68,5.85,1.38,8.75,2.13Zm-135.58,159.33l-28.81-24.49h67.41c34.17,0,51.27-12.19,51.27-36.58s-17.1-35.14-51.27-35.14h-77.49v174.27h-42.06V56.58h119.55c31.1,0,54.77,5.29,71,15.85,16.23,10.56,24.34,25.83,24.34,45.8s-7.3,33.99-21.89,44.36c-14.6,10.37-36.01,16.13-64.24,17.28l92.47,78.35h-48.4l-91.88-78.06Zm126.83,123.08c40.38-16.96,72.65-44.66,90.9-78.38,21.93-4.28,41.67-9.2,58.75-14.67-1.68,2.93-3.52,5.83-5.51,8.7-12.61,18.19-30.76,34.59-53.96,48.74-23.48,14.33-50.87,25.59-81.43,33.48-2.9.75-5.82,1.45-8.75,2.13Zm191.75-84.87c-14.97,18.27-36.54,34.74-64.13,48.98-23.32,12.04-49.89,21.91-79.17,29.47,53.46-20.57,93.93-52.56,112.2-90.36,24.66-8.83,42.63-18.89,52.1-29.74-2.97,14.28-10,28.23-21,41.65Z"/>
                        </g>
                    </svg>
                </div>
                <div class="period" style="color: #000000 !important;">Период: ${this.formatDateRange()}</div>
                
                <div class="totals" style="page-break-inside: avoid;">
                    <div class="income" style="color: #188038 !important;">Доходы + ${this.formatAmount(totalIncome)} ₸</div>
                    <div class="expense" style="color: #d93025 !important;">Расходы - ${this.formatAmount(totalExpense)} ₸</div>
                </div>

                <div style="page-break-inside: avoid;">
                    <h2 style="margin-top: 20px; color: #000000 !important;">Сводка по категориям</h2>
                    <table cellspacing="0" cellpadding="8" style="width: 100%; border-collapse: collapse; color: #000000 !important;">
                        <thead>
                            <tr style="background: none !important; border-bottom: 2px solid #000000;">
                                <th style="width: 40%; text-align: left; padding: 8px;">Категория</th>
                                <th style="width: 30%; text-align: right; padding: 8px;">Доходы</th>
                                <th style="width: 30%; text-align: right; padding: 8px;">Расходы</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(summary)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([category, amounts]) => `
                                    <tr style="page-break-inside: avoid;">
                                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">
                                            <div style="font-weight: bold;">${category}</div>
                                            <div style="font-size: 12px; color: #666666; margin-top: 4px;">
                                                ${categoryDescriptions[category] || ''}
                                            </div>
                                        </td>
                                        <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd; color: #188038 !important;">
                                            ${amounts.income > 0 ? '+ ' + this.formatAmount(amounts.income) + ' ₸' : ''}
                                        </td>
                                        <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd; color: #d93025 !important;">
                                            ${amounts.expense > 0 ? '- ' + this.formatAmount(amounts.expense) + ' ₸' : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="page-break-inside: avoid;">
                    <h2 style="margin-top: 30px; color: #000000 !important;">Детализация операций</h2>
                    <table cellspacing="0" cellpadding="8" style="width: 100%; border-collapse: collapse; color: #000000 !important;">
                        <thead>
                            <tr style="background: none !important; border-bottom: 2px solid #000000;">
                                <th style="width: 20%; text-align: left; padding: 8px;">Дата</th>
                                <th style="width: 50%; text-align: left; padding: 8px;">Описание</th>
                                <th style="width: 30%; text-align: right; padding: 8px;">Сумма</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactions
                                .map(t => {
                                    const date = new Date(t.date).toLocaleDateString('ru-RU');
                                    const amount = this.formatAmount(t.amount);
                                    const sign = t.type === 'income' ? '+' : '-';
                                    const color = t.type === 'income' ? '#188038' : '#d93025';
                                    return `
                                        <tr style="page-break-inside: avoid;">
                                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${date}</td>
                                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${t.description}</td>
                                            <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd; color: ${color} !important;">
                                                ${sign} ${amount} ₸
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="margin-top: 30px; text-align: right; font-size: 12px; color: #666666; page-break-inside: avoid;">
                    Отчет сформирован: ${exportDateTime}
                </div>
            </div>
        `;
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

        const exportBtn = document.getElementById('exportPDF');
        if (exportBtn) {
            exportBtn.onclick = () => this.exportToPDF();
        }
    }

    initializeModal() {
        const modal = document.getElementById('confirmDialog');
        const confirmBtn = document.getElementById('confirmDelete');
        const cancelBtn = document.getElementById('cancelDelete');

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
                    const suppliers = [
                        'fika people', 'fruitata', 'абадан пэй', 'ип абадан',
                        'rockcity', 'coffee man', 'shygie.kz', 'юзаев талгат',
                        'илахунов', 'дана пэй', 'базар', 'магазин', 'доставка',
                        'полиграфия'
                    ];
                    return suppliers.some(s => desc.includes(s.toLowerCase())) ||
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
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            console.log('ExpenseManager: Загрузка транзакций...');
            
            const result = await loadTransactionsFromFirebase(50, this.lastDoc);
            
            if (result.transactions && result.transactions.length > 0) {
                this.transactions = this.lastDoc ? 
                    [...(this.transactions || []), ...result.transactions] : 
                    result.transactions;
                this.lastDoc = result.lastDoc;
                this.hasMore = result.hasMore;
                
                // Показываем или скрываем кнопку "Загрузить еще"
                const loadMoreButton = document.getElementById('loadMoreButton');
                if (loadMoreButton) {
                    loadMoreButton.style.display = this.hasMore ? 'inline-block' : 'none';
                }
            }

            this.renderTransactions();
            
        } catch (error) {
            console.error('Ошибка при загрузке транзакций:', error);
        } finally {
            this.isLoading = false;
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
                'народный': 'halyk'
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
                date: new Date().toISOString(),
                type: type
            };

            // Проверяем авторизацию перед сохранением
            if (this.isProduction && !firebase.auth().currentUser) {
                const errorMessage = document.createElement('div');
                errorMessage.className = 'message system error';
                errorMessage.textContent = 'Для добавления транзакций необходимо авторизоваться';
                chatMessages.appendChild(errorMessage);
                return;
            }

            // Сохраняем транзакцию
            this.addTransaction(transaction).then((result) => {
                if (result) {
                    const responseMessage = document.createElement('div');
                    responseMessage.className = 'message system';
                    const paymentTypeText = transaction.paymentType === 'halyk' ? 'Halyk' : 'Kaspi';
                    responseMessage.textContent = `✅ ${type === 'expense' ? 'Расход' : 'Доход'} на сумму ${Math.abs(amount)} ₸ через ${paymentTypeText} успешно добавлен`;
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

                // Существующий код для обычных кнопок
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
                    
                    const pairWord = button.pair;
                    const currentWord = button.value;
                    
                    if (lowerValue.includes(pairWord)) {
                        const newValue = currentValue.replace(new RegExp(pairWord, 'i'), currentWord);
                        input.value = newValue;
                        input.setSelectionRange(cursorPos, cursorPos);
                    } else if (!lowerValue.includes(currentWord)) {
                        const beforeCursor = currentValue.slice(0, cursorPos);
                        const afterCursor = currentValue.slice(cursorPos);
                        
                        const needSpaceBefore = beforeCursor.length > 0 && !beforeCursor.endsWith(' ');
                        const needSpaceAfter = afterCursor.length > 0 && !afterCursor.startsWith(' ');
                        
                        const newValue = beforeCursor + 
                                       (needSpaceBefore ? ' ' : '') + 
                                       currentWord + 
                                       (needSpaceAfter ? ' ' : '') + 
                                       afterCursor;
                        
                        input.value = newValue;
                        const newCursorPos = cursorPos + currentWord.length + 
                                           (needSpaceBefore ? 1 : 0) + 
                                           (needSpaceAfter ? 1 : 0);
                        input.setSelectionRange(newCursorPos, newCursorPos);
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
        return [
            { name: 'Fika People', value: 'fika people' },
            { name: 'Fruitata', value: 'fruitata' },
            { name: 'Абадан Пэй', value: 'абадан пэй' },
            { name: 'RockCity', value: 'rockcity' },
            { name: 'Coffee Man', value: 'coffee man' },
            { name: 'Shygie.kz', value: 'shygie.kz' },
            { name: 'Юзаев Талгат', value: 'юзаев талгат' },
            { name: 'Илахунов', value: 'илахунов' },
            { name: 'Дана Пэй', value: 'дана пэй' }
        ];
    }

    // Добавляем новый метод для добавления одной транзакции
    addTransactionToDOM(transaction) {
        const container = document.getElementById('expensesTableBody');
        if (!container) return;

        const date = new Date(transaction.date);
        const dateKey = date.toLocaleDateString('ru-RU');
        
        // Ищем существующую группу для этой даты
        let dateGroup = Array.from(container.children).find(
            group => group.querySelector('.date-label')?.textContent === dateKey
        );

        // Если группа не найдена, создаем новую
        if (!dateGroup) {
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
            // Вставляем новую группу в начало контейнера
            container.insertBefore(dateGroup, container.firstChild);
        }

        // Создаем карточку транзакции
        const cardWrapper = document.createElement('div');
        cardWrapper.className = 'card-wrapper';
        
        const deleteBackground = document.createElement('div');
        deleteBackground.className = 'delete-background';
        deleteBackground.innerHTML = `
            <div class="delete-text">
                <svg viewBox="0 0 24 24">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </div>
        `;

        const card = document.createElement('div');
        card.className = 'transaction-card';

        const formattedTime = date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit'
        });
        const formattedAmount = this.formatAmount(Math.abs(transaction.amount));
        const paymentTypeText = transaction.paymentType === 'halyk' ? 'Halyk' : 'Kaspi';

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

        // Добавляем обработчики для свайпа
        let startX = 0;
        let currentX = 0;
        let isDragging = false;

        const handleTouchStart = (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            cardWrapper.style.transition = 'none';
        };

        const handleTouchMove = (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
            const diffX = currentX - startX;
            if (diffX > 0) return;
            const swipeX = Math.max(diffX, -100);
            card.style.transform = `translateX(${swipeX}px)`;
            deleteBackground.style.opacity = (Math.abs(swipeX) / 100).toString();
            cardWrapper.classList.toggle('will-delete', Math.abs(swipeX) > 75);
        };

        const handleTouchEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            cardWrapper.style.transition = 'transform 0.3s ease-out';
            const diffX = currentX - startX;
            
            if (diffX < -75) {
                const modal = document.getElementById('confirmDialog');
                const confirmBtn = document.getElementById('confirmDelete');
                const cancelBtn = document.getElementById('cancelDelete');
                
                const modalText = document.querySelector('#confirmDialog .modal-text');
                if (modalText) {
                    modalText.innerHTML = `
                        <div>Вы действительно хотите удалить транзакцию?</div>
                        <div class="transaction-info">
                            <div class="transaction-description">${transaction.description}</div>
                            <div class="transaction-amount ${transaction.amount < 0 ? 'expense' : 'income'}">
                                ${transaction.amount < 0 ? '-' : '+'} ${formattedAmount} ₸
                            </div>
                        </div>
                    `;
                }

                modal.classList.add('show');

                const handleConfirm = () => {
                    this.deleteTransaction(transaction.docId || transaction.id);
                    modal.classList.remove('show');
                    // Удаляем обработчики после использования
                    confirmBtn.removeEventListener('click', handleConfirm);
                    cancelBtn.removeEventListener('click', handleCancel);
                };

                const handleCancel = () => {
                    card.style.transform = '';
                    deleteBackground.style.opacity = '0';
                    modal.classList.remove('show');
                };

                confirmBtn.addEventListener('click', handleConfirm);
                cancelBtn.addEventListener('click', handleCancel);
            } else {
                card.style.transform = '';
                deleteBackground.style.opacity = '0';
            }
        };

        card.addEventListener('touchstart', handleTouchStart);
        card.addEventListener('touchmove', handleTouchMove);
        card.addEventListener('touchend', handleTouchEnd);

        cardWrapper.appendChild(deleteBackground);
        cardWrapper.appendChild(card);

        // Вставляем карточку в начало группы после заголовка
        const header = dateGroup.querySelector('.date-header');
        
        // Получаем все существующие карточки в группе
        const existingCards = Array.from(dateGroup.querySelectorAll('.card-wrapper'));
        
        // Находим позицию для вставки новой карточки
        const transactionTime = date.getHours() * 60 + date.getMinutes(); // Конвертируем время в минуты
        
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
            // Если не нашли позицию или нет карточек, добавляем после заголовка
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

        // Убираем автоматическую прокрутку
        // cardWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Создаем глобальный экземпляр
window.expenseManager = new ExpenseManager();

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
    
    const transactions = expenseManager.getTransactions();
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

// Определяем типы платежей
const PAYMENT_TYPES = {
    'kaspi-gold': 'Каспи Голд',
    'kaspi-pay': 'Каспи Пэй',
    'halyk': 'Халык'
};

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
    // Счет на оплату
    'ип абадан за кофе',
    'fika people поставка',
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