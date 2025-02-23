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
        
        // Загружаем данные при создании
        this.loadFromLocalStorage();
        
        this.dateFilters = {
            from: null,
            to: null
        };
        
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
    }

    initialize() {
        console.log('ExpenseManager: DOM готов, начинаем инициализацию');
        this.renderTransactions();
        this.initializeEventHandlers();
        console.log('ExpenseManager: Инициализация завершена');
        this.updateTotals(this.transactions);
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('transactions');
        this.transactions = saved ? JSON.parse(saved) : [];
        console.log('ExpenseManager: Загружено транзакций:', this.transactions.length);
    }

    saveToLocalStorage() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
        console.log('ExpenseManager: Сохранено транзакций:', this.transactions.length);
    }

    addTransaction(transaction) {
        console.log('ExpenseManager: Добавление транзакции:', transaction);
        
        // Создаем новую транзакцию
        const newTransaction = {
            ...transaction,
            id: Date.now(),
            date: new Date().toISOString(),
            amount: transaction.type === 'expense' ? 
                -Math.abs(parseFloat(transaction.amount)) : 
                Math.abs(parseFloat(transaction.amount))
        };
        
        // Добавляем в начало массива
        this.transactions.unshift(newTransaction);
        
        console.log('ExpenseManager: Сохранение в localStorage');
        this.saveToLocalStorage();
        
        console.log('ExpenseManager: Вызов renderTransactions');
        this.renderTransactions();
        
        // Обновляем графики если они есть
        if (typeof window.updateCharts === 'function') {
            window.updateCharts();
        }
        
        this.updateTotals(this.transactions);
        
        return newTransaction;
    }

    deleteTransaction(id) {
        if (confirm('Вы уверены, что хотите удалить эту транзакцию?')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveToLocalStorage();
            this.renderTransactions();
            if (typeof window.updateCharts === 'function') {
                window.updateCharts();
            }
            this.updateTotals(this.transactions);
        }
    }

    updateTransaction(id, updatedTransaction) {
        this.transactions = this.transactions.map(transaction => 
            transaction.id === id ? {...updatedTransaction, id} : transaction
        );
        this.saveToLocalStorage();
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
        console.log('ExpenseManager: Начало renderTransactions');
        
        const transactionsList = document.getElementById('expensesTableBody');
        if (!transactionsList) {
            console.error('ExpenseManager: Не найден элемент expensesTableBody');
            return;
        }
        
        const transactions = this.getTransactions();
        console.log('ExpenseManager: Транзакции для рендеринга:', transactions);
        
        // Очищаем список
        transactionsList.innerHTML = '';
        
        // Добавляем каждую транзакцию
        transactions.forEach((t, index) => {
            const transactionElement = document.createElement('div');
            transactionElement.className = 'transaction-item';
            
            // Если это первая транзакция и она новая (добавлена менее 1 секунды назад)
            if (index === 0 && (Date.now() - new Date(t.date).getTime()) < 1000) {
                transactionElement.classList.add('new');
                // Удаляем класс через 1 секунду
                setTimeout(() => {
                    transactionElement.classList.remove('new');
                    // Плавно меняем фон обратно
                    transactionElement.style.transition = 'background-color 0.5s ease-out';
                    transactionElement.style.background = '';
                }, 1000);
            }
            
            const date = new Date(t.date).toLocaleDateString('ru-RU');
            const amount = Math.abs(t.amount).toLocaleString('ru-RU');
            const sign = t.type === 'income' ? '+' : '-';
            
            transactionElement.innerHTML = `
                <div class="transaction-info">
                    <div class="transaction-date">${date}</div>
                    <div class="transaction-description">${t.description}</div>
                    <div class="transaction-source">${t.source || ''}</div>
                </div>
                <div class="transaction-right">
                    <div class="transaction-amount ${t.type}">
                        ${sign}${amount} ₸
                    </div>
                    <button onclick="window.expenseManager.deleteTransaction(${t.id})" class="delete-btn" title="Удалить">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            `;
            
            transactionsList.appendChild(transactionElement);
        });
        
        console.log('ExpenseManager: Рендеринг завершен');
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
        console.log('ExpenseManager: Получение транзакций, всего:', this.transactions.length);
        return [...this.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
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
        console.log('Транзакции:', transactions);
        
        // Считаем итоги
        const totals = transactions.reduce((acc, t) => {
            const amount = parseFloat(t.amount);
            console.log('Обработка транзакции:', { type: t.type, amount: amount });
            
            if (t.type === 'income') {
                acc.income += amount;
            } else if (t.type === 'expense') {
                acc.expense += Math.abs(amount);
            }
            return acc;
        }, { income: 0, expense: 0 });
        
        console.log('Посчитанные итоги:', totals);
        
        // Обновляем отображение
        const incomeElement = document.querySelector('#totalIncome .total-amount');
        const expenseElement = document.querySelector('#totalExpense .total-amount');
        
        console.log('Найденные элементы:', { 
            incomeElement: incomeElement?.outerHTML, 
            expenseElement: expenseElement?.outerHTML 
        });
        
        if (incomeElement) {
            incomeElement.className = 'total-amount transaction-amount income';
            incomeElement.textContent = `${totals.income.toLocaleString('ru-RU')} ₸`;
        } else {
            console.error('Не найден элемент для доходов #totalIncome .total-amount');
        }
        
        if (expenseElement) {
            expenseElement.className = 'total-amount transaction-amount expense';
            expenseElement.textContent = `${totals.expense.toLocaleString('ru-RU')} ₸`;
        } else {
            console.error('Не найден элемент для расходов #totalExpense .total-amount');
        }
        
        console.log('ExpenseManager: Завершение updateTotals');
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
            margin: [20, 20, 20, 20],
            filename: fileName,
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all'] },
            style: `
                .pdf-container {
                    font-family: 'Roboto', sans-serif;
                    color: #202124;
                    padding: 20px;
                }
                .pdf-title {
                    font-size: 28px;
                    font-weight: 500;
                    margin-bottom: 8px;
                    text-align: center;
                }
                .pdf-period {
                    font-size: 14px;
                    color: #5F6368;
                    margin-bottom: 24px;
                    text-align: center;
                }
                .pdf-summary {
                    display: flex;
                    gap: 24px;
                    margin-bottom: 32px;
                }
                .summary-block {
                    flex: 1;
                    padding: 16px;
                    border-radius: 8px;
                    background: #F8F9FA;
                }
                .summary-block h2 {
                    font-size: 16px;
                    font-weight: 500;
                    margin-bottom: 8px;
                }
                .summary-block .amount {
                    font-size: 24px;
                    font-weight: 500;
                }
                .income-block h2, .income-block .amount {
                    color: #188038;
                }
                .expense-block h2, .expense-block .amount {
                    color: #D93025;
                }
                .pdf-transactions {
                    margin-top: 32px;
                }
                .pdf-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 14px;
                }
                .pdf-table th {
                    background: #F8F9FA;
                    padding: 12px;
                    font-weight: 500;
                    text-align: left;
                    color: #5F6368;
                    border-bottom: 2px solid #DADCE0;
                }
                .pdf-table td {
                    padding: 12px;
                    border-bottom: 1px solid #DADCE0;
                }
                .pdf-table tr.even {
                    background: #FFFFFF;
                }
                .pdf-table tr.odd {
                    background: #F8F9FA;
                }
                .pdf-table .income {
                    color: #188038;
                }
                .pdf-table .expense {
                    color: #D93025;
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
        const transactions = this.getFilteredTransactions();
        const { totalIncome, totalExpense } = this.calculateTotals(transactions);
        
        return `
            <div class="pdf-container">
                <h1 class="pdf-title">Отчет по операциям</h1>
                <p class="pdf-period">Период: ${this.formatDateRange()}</p>
                
                <div class="pdf-summary">
                    <div class="summary-block income-block">
                        <h2>Доходы</h2>
                        <div class="amount">${this.formatAmount(totalIncome)} ₸</div>
                    </div>
                    <div class="summary-block expense-block">
                        <h2>Расходы</h2>
                        <div class="amount">${this.formatAmount(totalExpense)} ₸</div>
                    </div>
                </div>

                <div class="pdf-transactions">
                    <table class="pdf-table">
                        <thead>
                            <tr>
                                <th style="width: 20%">Дата</th>
                                <th style="width: 50%">Описание</th>
                                <th style="width: 30%; text-align: right">Сумма</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactions.map((t, index) => `
                                <tr class="${index % 2 === 0 ? 'even' : 'odd'}">
                                    <td>${new Date(t.date).toLocaleDateString('ru-RU')}</td>
                                    <td>${t.description}</td>
                                    <td style="text-align: right" class="${t.type === 'income' ? 'income' : 'expense'}">${this.formatAmount(t.amount)} ₸</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
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
            <path d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z"/>
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