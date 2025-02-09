// Класс для управления данными
class ExpenseManager {
    constructor() {
        document.addEventListener('DOMContentLoaded', () => {
            this.transactions = [];
            this.loadFromLocalStorage();
            this.renderTransactions();
            this.updateTotals();
            this.setupDateFilter();
        });
        this.dateFilters = {
            from: null,
            to: null
        };
    }

    addTransaction(transaction) {
        this.transactions.push({
            ...transaction, 
            id: Date.now(),
            amount: transaction.type === 'расход' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount)
        });
        this.saveToLocalStorage();
        this.renderTransactions();
        updateCharts();
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

    loadFromLocalStorage() {
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
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
                <button onclick="deleteTransaction(${t.id})" class="delete-btn" title="Удалить">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                    </svg>
                </button>
            </div>
        `).join('');

        this.updateTotals();
    }

    updateTotals() {
        const totalIncome = document.getElementById('totalIncome');
        const totalExpense = document.getElementById('totalExpense');

        if (totalIncome && totalExpense) {
            const income = this.transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
            
            const expense = this.transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

            totalIncome.querySelector('.total-amount').textContent = 
                `${income.toLocaleString('ru-RU')} ₸`;
            totalExpense.querySelector('.total-amount').textContent = 
                `${expense.toLocaleString('ru-RU')} ₸`;
        }
    }

    setupDateFilter() {
        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');
        const applyFilter = document.getElementById('applyDateFilter');
        const resetFilter = document.getElementById('resetDateFilter');

        if (applyFilter) {
            applyFilter.addEventListener('click', () => {
                this.setDateFilter(dateFrom.value, dateTo.value);
                this.renderTransactions();
            });
        }

        if (resetFilter) {
            resetFilter.addEventListener('click', () => {
                dateFrom.value = '';
                dateTo.value = '';
                this.resetDateFilter();
                this.renderTransactions();
            });
        }
    }
}

// Создаем глобальный экземпляр
document.addEventListener('DOMContentLoaded', () => {
    window.expenseManager = new ExpenseManager();
});

function getTransactionType(type) {
    return type === 'expense' ? 'Расход' : 'Доход';
}

// Обновляем обработчик удаления
window.deleteTransaction = function(id) {
    if (confirm('Вы уверены, что хотите удалить эту запись?')) {
        window.expenseManager.transactions = window.expenseManager.transactions.filter(t => t.id !== id);
        window.expenseManager.saveToLocalStorage();
        window.expenseManager.renderTransactions();
    }
};

// Фильтрация
document.getElementById('typeFilter').addEventListener('change', window.expenseManager.renderTransactions);
document.getElementById('categoryFilter').addEventListener('change', window.expenseManager.renderTransactions); 