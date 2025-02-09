// Класс для управления данными
class ExpenseManager {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.dateFilters = {
            from: null,
            to: null
        };

        // Ждем загрузки DOM
        document.addEventListener('DOMContentLoaded', () => {
            this.loadFromLocalStorage();
            this.renderTransactions();
            this.updateSummary();
            this.setupDateFilter();
        });
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
        const container = document.querySelector('.transactions');
        container.innerHTML = '';

        this.getFilteredTransactions().forEach((t, index) => {
            const div = document.createElement('div');
            div.className = 'transaction';

            const isExpense = t.type === 'расход';
            const sign = isExpense ? '-' : '+';
            const amountClass = isExpense ? 'amount-expense' : 'amount-income';

            div.innerHTML = `
                <div class="transaction-info">
                    <div class="transaction-date">${this.formatDate(t.date)}</div>
                    <div>${t.category}</div>
                    <div>${t.source}</div>
                </div>
                <div class="${amountClass}">
                    ${sign}${t.amount} ₸
                </div>
                <button onclick="expenseManager.deleteTransaction(${t.id})">×</button>
            `;

            container.appendChild(div);
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
        let filtered = [...this.transactions];
        
        // Применяем фильтры по дате
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
}

// Создаем глобальный экземпляр
window.expenseManager = new ExpenseManager();

function getTransactionType(type) {
    return type === 'expense' ? 'Расход' : 'Доход';
}

// Обновляем обработчик удаления
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

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const expenseManager = window.expenseManager;
    
    // Сначала рендерим транзакции
    expenseManager.renderTransactions();

    // Находим все необходимые элементы
    const elements = {
        dateFrom: document.getElementById('dateFrom'),
        dateTo: document.getElementById('dateTo'),
        applyFilter: document.getElementById('applyDateFilter'),
        resetFilter: document.getElementById('resetDateFilter')
    };

    // Проверяем наличие всех необходимых элементов перед добавлением обработчиков
    if (elements.applyFilter && elements.dateFrom && elements.dateTo) {
        elements.applyFilter.addEventListener('click', () => {
            expenseManager.setDateFilter(elements.dateFrom.value, elements.dateTo.value);
        });
    }

    if (elements.resetFilter && elements.dateFrom && elements.dateTo) {
        elements.resetFilter.addEventListener('click', () => {
            elements.dateFrom.value = '';
            elements.dateTo.value = '';
            expenseManager.resetDateFilter();
        });
    }
}); 