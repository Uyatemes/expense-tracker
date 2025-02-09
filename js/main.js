// Класс для управления данными
class ExpenseManager {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.dateFilters = {
            from: null,
            to: null
        };
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

// Создаем глобальный экземпляр менеджера
window.expenseManager = new ExpenseManager();

// Дожидаемся полной загрузки страницы
window.addEventListener('load', () => {
    console.log('Страница полностью загружена');
    
    // Инициализация менеджера
    const expenseManager = window.expenseManager;
    expenseManager.renderTransactions();

    // Находим элементы фильтров
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    const applyFilter = document.getElementById('applyDateFilter');
    const resetFilter = document.getElementById('resetDateFilter');

    console.log('Элементы фильтров:', { dateFrom, dateTo, applyFilter, resetFilter });

    // Добавляем обработчики только если все элементы найдены
    if (dateFrom && dateTo && applyFilter && resetFilter) {
        console.log('Добавляем обработчики фильтров');
        
        applyFilter.onclick = () => {
            expenseManager.setDateFilter(dateFrom.value, dateTo.value);
        };

        resetFilter.onclick = () => {
            dateFrom.value = '';
            dateTo.value = '';
            expenseManager.resetDateFilter();
        };
    } else {
        console.warn('Не все элементы фильтров найдены');
    }
});

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