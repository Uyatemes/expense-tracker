// Определяем класс для управления расходами
class ExpenseManager {
    constructor() {
        // Ждем загрузки DOM
        document.addEventListener('DOMContentLoaded', () => {
            this.transactions = [];
            this.loadFromLocalStorage();
            this.renderTransactions();
            this.updateTotals();
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
        this.transactions.push(transaction);
        this.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        this.saveToLocalStorage();
        this.renderTransactions();
        this.updateTotals();
        updateCharts();
    }

    deleteTransaction(index) {
        this.transactions.splice(index, 1);
        this.saveToLocalStorage();
        this.renderTransactions();
        this.updateTotals();
        updateCharts();
    }

    setupDateFilter() {
        const applyFilter = document.getElementById('applyDateFilter');
        const resetFilter = document.getElementById('resetDateFilter');
        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');

        applyFilter.onclick = () => {
            this.renderTransactions();
            this.updateTotals();
            updateCharts();
        };

        resetFilter.onclick = () => {
            dateFrom.value = '';
            dateTo.value = '';
            this.renderTransactions();
            this.updateTotals();
            updateCharts();
        };
    }

    getFilteredTransactions() {
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;

        return this.transactions.filter(t => {
            if (dateFrom && t.date < dateFrom) return false;
            if (dateTo && t.date > dateTo) return false;
            return true;
        });
    }

    renderTransactions() {
        const container = document.getElementById('expensesTableBody');
        container.innerHTML = '';

        this.getFilteredTransactions().forEach((t, index) => {
            const div = document.createElement('div');
            div.className = 'transaction';

            const isExpense = t.type === 'расход';
            const sign = isExpense ? '-' : '+';
            const amountClass = isExpense ? 'expense' : 'income';

            div.innerHTML = `
                <div class="transaction-info">
                    <div class="transaction-date">${this.formatDate(t.date)}</div>
                    <div>${t.category || ''}</div>
                    <div>${t.source}</div>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${sign}${t.amount} ₸
                </div>
                <button onclick="expenseManager.deleteTransaction(${index})">×</button>
            `;

            container.appendChild(div);
        });
    }

    updateTotals() {
        const transactions = this.getFilteredTransactions();
        
        const income = transactions
            .filter(t => t.type === 'приход')
            .reduce((sum, t) => sum + t.amount, 0);

        const expense = transactions
            .filter(t => t.type === 'расход')
            .reduce((sum, t) => sum + t.amount, 0);

        document.querySelector('#totalIncome .total-amount').textContent = `${income} ₸`;
        document.querySelector('#totalExpense .total-amount').textContent = `${expense} ₸`;
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU');
    }

    getTransactions() {
        return this.getFilteredTransactions();
    }
}

// Создаем глобальный экземпляр после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    window.expenseManager = new ExpenseManager();
});

// Функция для добавления новой транзакции
function addNewTransaction() {
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const note = document.getElementById('note').value;

    if (amount && category && date) {
        window.expenseManager.addTransaction({
            amount: parseFloat(amount),
            category,
            date,
            note
        });
        
        // Очищаем поля
        document.getElementById('amount').value = '';
        document.getElementById('category').value = '';
        document.getElementById('date').value = '';
        document.getElementById('note').value = '';
        
        // Обновляем таблицу
        renderTransactionsTable();
    }
}

// Функция для отображения таблицы транзакций
function renderTransactionsTable() {
    const transactions = window.expenseManager.getTransactions();
    const tableBody = document.getElementById('transactionsTable');
    
    tableBody.innerHTML = '';
    
    transactions.forEach((transaction, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transaction.date}</td>
            <td>${transaction.amount}</td>
            <td>${transaction.type || ''}</td>
            <td>${transaction.category || ''}</td>
            <td>${transaction.source || ''}</td>
            <td>
                <button onclick="window.expenseManager.deleteTransaction(${index}); renderTransactionsTable();">Удалить</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    console.log('Table element:', document.getElementById('transactionsTable')); // Для отладки
    
    setTimeout(() => {
        renderTransactionsTable();
        if(typeof updateCharts === 'function') {
            updateCharts();
        }
    }, 100);
}); 