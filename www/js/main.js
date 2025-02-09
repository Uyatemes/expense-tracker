// Класс для управления данными
class ExpenseManager {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.dateFilters = {
            from: null,
            to: null
        };
    }

    addTransaction(transaction) {
        this.transactions.push({
            ...transaction, 
            id: Date.now(),
            amount: transaction.type === 'expense' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount)
        });
        this.saveToLocalStorage();
    }

    deleteTransaction(id) {
        this.transactions = this.transactions.filter(transaction => transaction.id !== id);
        this.saveToLocalStorage();
    }

    updateTransaction(id, updatedTransaction) {
        this.transactions = this.transactions.map(transaction => 
            transaction.id === id ? {...updatedTransaction, id} : transaction
        );
        this.saveToLocalStorage();
    }

    saveToLocalStorage() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }

    getTransactions(filters = {}) {
        let filtered = [...this.transactions];
        
        if (filters.type && filters.type !== 'all') {
            filtered = filtered.filter(t => t.type === filters.type);
        }
        
        if (filters.category && filters.category !== 'all') {
            filtered = filtered.filter(t => t.category === filters.category);
        }
        
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

    getBalance() {
        return this.transactions.reduce((sum, t) => sum + t.amount, 0);
    }

    setDateFilter(from, to) {
        this.dateFilters.from = from;
        this.dateFilters.to = to;
    }

    resetDateFilter() {
        this.dateFilters.from = null;
        this.dateFilters.to = null;
    }
}

// Создаем глобальный экземпляр менеджера
const expenseManager = new ExpenseManager();

// Оборачиваем инициализацию в DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Обработчик формы
    const addExpenseForm = document.getElementById('addExpenseForm');
    if (addExpenseForm) {
        addExpenseForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const transaction = {
                type: document.getElementById('type').value,
                amount: parseFloat(document.getElementById('amount').value),
                category: document.getElementById('category').value,
                date: document.getElementById('date').value,
                description: document.getElementById('description').value
            };

            expenseManager.addTransaction(transaction);
            renderExpensesTable();
            updateCharts();
            e.target.reset();
        });
    }

    // Инициализация при загрузке страницы
    renderExpensesTable();

    // Инициализация обработчиков фильтров
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    const applyFilter = document.getElementById('applyDateFilter');
    const resetFilter = document.getElementById('resetDateFilter');

    if (applyFilter) {
        applyFilter.addEventListener('click', () => {
            expenseManager.setDateFilter(dateFrom.value, dateTo.value);
            renderExpensesTable();
            updateCharts();
        });
    }

    if (resetFilter) {
        resetFilter.addEventListener('click', () => {
            dateFrom.value = '';
            dateTo.value = '';
            expenseManager.resetDateFilter();
            renderExpensesTable();
            updateCharts();
        });
    }
});

function getTransactionType(type) {
    return type === 'expense' ? 'Расход' : 'Доход';
}

function updateTotals(transactions) {
    const totalIncome = document.getElementById('totalIncome');
    const totalExpense = document.getElementById('totalExpense');

    if (totalIncome && totalExpense) {
        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const expense = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        totalIncome.querySelector('.total-amount').textContent = 
            `${income.toLocaleString('ru-RU')} ₸`;
        totalExpense.querySelector('.total-amount').textContent = 
            `${expense.toLocaleString('ru-RU')} ₸`;
    }
}

function renderExpensesTable() {
    const transactionsList = document.getElementById('expensesTableBody');
    if (!transactionsList) return;
    
    const transactions = expenseManager.getTransactions();

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
            <button onclick="deleteTransaction(${t.id})" class="delete-btn" title="Удалить">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                </svg>
            </button>
        </div>
    `).join('');

    updateTotals(transactions);
}

// Обновляем обработчик удаления
window.deleteTransaction = function(id) {
    if (confirm('Вы уверены, что хотите удалить эту запись?')) {
        expenseManager.transactions = expenseManager.transactions.filter(t => t.id !== id);
        expenseManager.saveToLocalStorage();
        renderExpensesTable();
        updateCharts();
    }
};

// Фильтрация
document.getElementById('typeFilter').addEventListener('change', renderExpensesTable);
document.getElementById('categoryFilter').addEventListener('change', renderExpensesTable);

// Инициализация при загрузке страницы
renderExpensesTable(); 