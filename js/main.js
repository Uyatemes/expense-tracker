// Класс для управления данными
class ExpenseManager {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.dateFilters = {
            from: null,
            to: null
        };
        
        // Привязываем методы к контексту
        this.handleApplyFilter = this.handleApplyFilter.bind(this);
        this.handleResetFilter = this.handleResetFilter.bind(this);
        
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
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('transactions');
        this.transactions = saved ? JSON.parse(saved) : [];
    }

    saveToLocalStorage() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }

    addTransaction(transaction) {
        this.transactions.push({
            ...transaction, 
            id: Date.now(),
            amount: transaction.type === 'expense' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount)
        });
        this.saveToLocalStorage();
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
        const transactionsList = document.getElementById('expensesTableBody');
        if (!transactionsList) return;
        
        const transactions = this.getTransactions();

        transactionsList.innerHTML = transactions.map(t => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-date">${new Date(t.date).toLocaleDateString()}</div>
                    <div class="transaction-description">${t.description}</div>
                    <div class="transaction-source">${t.source}</div>
                </div>
                <div class="transaction-amount ${t.type}">
                    ${t.type === 'expense' ? '-' : '+'}${Math.abs(t.amount).toLocaleString('ru-RU')} ₸
                </div>
                <button onclick="window.expenseManager.deleteTransaction(${t.id})" class="delete-btn" title="Удалить">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                    </svg>
                </button>
            </div>
        `).join('');

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
}

// Создаем глобальный экземпляр менеджера
window.expenseManager = new ExpenseManager();

// Глобальная функция удаления для использования в onclick
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