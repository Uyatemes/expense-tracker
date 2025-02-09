// Глобальная функция для добавления транзакций
window.addTransaction = function(transaction) {
    console.log('Global addTransaction вызван с:', transaction);
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
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.dateFilters = {
            from: null,
            to: null
        };
        
        // Привязываем методы к контексту
        this.handleApplyFilter = this.handleApplyFilter.bind(this);
        this.handleResetFilter = this.handleResetFilter.bind(this);
        this.showConfirmDialog = this.showConfirmDialog.bind(this);
        
        // Инициализация при создании экземпляра
        window.onload = () => {
            this.renderTransactions();
            this.initializeEventHandlers();
        };
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

    loadFromLocalStorage() {
        const saved = localStorage.getItem('transactions');
        this.transactions = saved ? JSON.parse(saved) : [];
    }

    saveToLocalStorage() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }

    addTransaction(transaction) {
        console.log('ExpenseManager: Добавление транзакции:', transaction);
        
        this.transactions.push({
            ...transaction,
            id: Date.now(),
            category: transaction.category || 'Другое',
            amount: transaction.type === 'expense' ? 
                -Math.abs(parseFloat(transaction.amount)) : 
                Math.abs(parseFloat(transaction.amount))
        });
        
        console.log('ExpenseManager: Сохранение в localStorage');
        this.saveToLocalStorage();
        
        console.log('ExpenseManager: Вызов renderTransactions');
        this.renderTransactions();
        
        if (typeof window.updateCharts === 'function') {
            window.updateCharts();
        }
    }

    deleteTransaction(id) {
        this.transactions = this.transactions.filter(transaction => transaction.id !== id);
        this.saveToLocalStorage();
        this.renderTransactions();
        if (typeof window.updateCharts === 'function') {
            window.updateCharts();
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
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        return this.transactions.filter(t => {
            if (startDate && t.date < startDate) return false;
            if (endDate && t.date > endDate) return false;
            return true;
        });
    }

    renderTransactions() {
        console.log('ExpenseManager: Начало renderTransactions');
        
        const transactionsList = document.getElementById('expensesTableBody');
        if (!transactionsList) {
            console.error('ExpenseManager: Не найден элемент expensesTableBody');
            console.log('DOM элементы:', {
                body: document.body.innerHTML,
                expensesTableBody: document.getElementById('expensesTableBody')
            });
            return;
        }
        
        const transactions = this.getTransactions();
        console.log('ExpenseManager: Транзакции для рендеринга:', transactions);
        
        // Создаем временный контейнер
        const tempContainer = document.createDocumentFragment();
        
        // Добавляем транзакции во временный контейнер
        transactions.forEach(t => {
            const transactionElement = document.createElement('div');
            transactionElement.className = 'transaction-item';
            
            transactionElement.innerHTML = `
                <div class="transaction-info">
                    <div class="transaction-date">${new Date(t.date).toLocaleDateString('ru-RU')}</div>
                    <div class="transaction-description">${t.description}</div>
                    <div class="transaction-source">${t.source || ''}</div>
                </div>
                <div class="transaction-right">
                    <div class="transaction-amount ${t.type}">
                        ${t.type === 'expense' ? '-' : '+'}${Math.abs(t.amount).toLocaleString('ru-RU')} ₸
                    </div>
                    <button onclick="window.expenseManager.showConfirmDialog(${t.id})" class="delete-btn" title="Удалить">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            `;
            
            tempContainer.appendChild(transactionElement);
        });
        
        // Очищаем текущий список
        while (transactionsList.firstChild) {
            transactionsList.removeChild(transactionsList.firstChild);
        }
        
        // Добавляем все транзакции одним действием
        transactionsList.appendChild(tempContainer);
        
        console.log('ExpenseManager: Рендеринг завершен');
        
        // Принудительно вызываем перерисовку
        requestAnimationFrame(() => {
            transactionsList.style.display = 'none';
            transactionsList.offsetHeight; // trigger reflow
            transactionsList.style.display = '';
        });
        
        this.updateTotals(transactions);
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
        let filtered = [...this.transactions];
        
        if (this.dateFilters.from) {
            filtered = filtered.filter(t => 
                new Date(t.date) >= new Date(this.dateFilters.from)
            );
        }
        if (this.dateFilters.to) {
            filtered = filtered.filter(t => 
                new Date(t.date) <= new Date(this.dateFilters.to)
            );
        }
        
        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
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

    setDateFilter(from, to) {
        this.dateFilters.from = from || null;
        this.dateFilters.to = to || null;
        this.renderTransactions();
        if (typeof window.updateCharts === 'function') {
            window.updateCharts();
        }
    }

    resetDateFilter() {
        this.dateFilters.from = null;
        this.dateFilters.to = null;
        this.renderTransactions();
        if (typeof window.updateCharts === 'function') {
            window.updateCharts();
        }
    }

    updateTotals(transactions) {
        const totalIncome = document.getElementById('totalIncome');
        const totalExpense = document.getElementById('totalExpense');

        if (totalIncome && totalExpense) {
            const income = transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                
            const expense = transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            totalIncome.querySelector('.total-amount').textContent = 
                `${income.toLocaleString('ru-RU')} ₸`;
            totalExpense.querySelector('.total-amount').textContent = 
                `${expense.toLocaleString('ru-RU')} ₸`;
        }
    }

    showConfirmDialog(id) {
        const dialog = document.getElementById('confirmDialog');
        if (!dialog) {
            // Если диалог не найден, создаем его
            const dialogHTML = `
                <div id="confirmDialog" class="confirm-dialog">
                    <div class="confirm-dialog-content">
                        <h3>Подтверждение удаления</h3>
                        <p>Вы действительно хотите удалить эту запись?</p>
                        <div class="confirm-dialog-buttons">
                            <button id="confirmCancel" class="btn-cancel">Отмена</button>
                            <button id="confirmDelete" class="btn-delete">Удалить</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', dialogHTML);
        }

        const confirmDialog = document.getElementById('confirmDialog');
        const confirmBtn = document.getElementById('confirmDelete');
        const cancelBtn = document.getElementById('confirmCancel');

        const handleDelete = () => {
            this.deleteTransaction(id);
            confirmDialog.classList.remove('active');
            cleanup();
        };
        
        const handleCancel = () => {
            confirmDialog.classList.remove('active');
            cleanup();
        };
        
        const cleanup = () => {
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
        };

        confirmBtn.onclick = handleDelete;
        cancelBtn.onclick = handleCancel;
        confirmDialog.classList.add('active');
    }

    async exportToPDF() {
        const dateFrom = document.getElementById('dateFrom')?.value;
        const dateTo = document.getElementById('dateTo')?.value;
        
        // Создаем временный контейнер для PDF
        const container = document.createElement('div');
        container.className = 'pdf-container';
        
        // Добавляем заголовок и период
        container.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #333; margin-bottom: 10px;">Отчет по операциям</h1>
                <p style="color: #666;">
                    Период: ${dateFrom ? new Date(dateFrom).toLocaleDateString() : 'начало'} — 
                    ${dateTo ? new Date(dateTo).toLocaleDateString() : 'конец'}
                </p>
            </div>
        `;

        // Получаем отфильтрованные транзакции
        const transactions = this.getTransactions();
        
        // Добавляем итоги
        const totals = transactions.reduce((acc, t) => {
            if (t.type === 'income') {
                acc.income += Math.abs(t.amount);
            } else {
                acc.expense += Math.abs(t.amount);
            }
            return acc;
        }, { income: 0, expense: 0 });

        container.innerHTML += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <div style="text-align: center; flex: 1;">
                    <h3 style="color: #00A76D; margin-bottom: 5px;">Доходы</h3>
                    <p style="font-size: 1.2em;">${totals.income.toLocaleString('ru-RU')} ₸</p>
                </div>
                <div style="text-align: center; flex: 1;">
                    <h3 style="color: #F14635; margin-bottom: 5px;">Расходы</h3>
                    <p style="font-size: 1.2em;">${totals.expense.toLocaleString('ru-RU')} ₸</p>
                </div>
            </div>
        `;

        // Добавляем таблицу транзакций
        container.innerHTML += `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f5f5f5;">
                        <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Дата</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Описание</th>
                        <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Сумма</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(t => `
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                                ${new Date(t.date).toLocaleDateString()}
                            </td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                                ${t.description}
                            </td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; color: ${t.type === 'income' ? '#00A76D' : '#F14635'};">
                                ${t.type === 'expense' ? '-' : '+'}${Math.abs(t.amount).toLocaleString('ru-RU')} ₸
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Конфигурация PDF
        const opt = {
            margin: 1,
            filename: 'операции.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' }
        };

        // Генерируем PDF
        try {
            document.body.appendChild(container);
            await html2pdf().set(opt).from(container).save();
            document.body.removeChild(container);
        } catch (error) {
            console.error('Ошибка при создании PDF:', error);
            alert('Произошла ошибка при создании PDF');
        }
    }
}

// Создаем глобальный экземпляр менеджера
window.expenseManager = new ExpenseManager();

// Глобальная функция удаления
window.deleteTransaction = function(id) {
    if (confirm('Вы уверены, что хотите удалить эту запись?')) {
        window.expenseManager.deleteTransaction(id);
    }
};

// Фильтрация
document.getElementById('typeFilter').addEventListener('change', window.expenseManager.renderTransactions);
document.getElementById('categoryFilter').addEventListener('change', window.expenseManager.renderTransactions);

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
    const dateFrom = document.querySelector('#dateFrom');
    const dateTo = document.querySelector('#dateTo');
    const applyFilter = document.querySelector('#applyDateFilter');
    const resetFilter = document.querySelector('#resetDateFilter');

    // Проверяем наличие всех элементов
    if (!dateFrom || !dateTo || !applyFilter || !resetFilter) {
        console.log('Элементы фильтров не найдены');
        return;
    }

    // Добавляем обработчики
    applyFilter.addEventListener('click', () => {
        window.expenseManager.setDateFilter(dateFrom.value, dateTo.value);
    });

    resetFilter.addEventListener('click', () => {
        dateFrom.value = '';
        dateTo.value = '';
        window.expenseManager.resetDateFilter();
    });
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

// Ждем полной загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
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