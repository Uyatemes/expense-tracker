// Определяем класс для управления расходами
class ExpenseManager {
    constructor() {
        this.transactions = [];
        this.loadFromLocalStorage();
        this.renderTransactions();
        this.updateSummary();
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
        this.saveToLocalStorage();
        this.renderTransactions();
        this.updateSummary();
        if (typeof updateCharts === 'function') {
            updateCharts();
        }
    }

    deleteTransaction(index) {
        this.transactions.splice(index, 1);
        this.saveToLocalStorage();
        this.renderTransactions();
        this.updateSummary();
        if (typeof updateCharts === 'function') {
            updateCharts();
        }
    }

    renderTransactions() {
        const container = document.querySelector('.transactions');
        container.innerHTML = '';

        this.transactions.forEach((t, index) => {
            const div = document.createElement('div');
            div.className = 'transaction';
            
            const isExpense = t.type === 'расход';
            const sign = isExpense ? '-' : '+';
            const amountClass = isExpense ? 'amount-expense' : 'amount-income';

            div.innerHTML = `
                <div class="transaction-info">
                    <div class="transaction-date">${t.date}</div>
                    <div>${t.type} ${t.category || ''}</div>
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

    updateSummary() {
        const income = this.transactions
            .filter(t => t.type === 'приход')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = this.transactions
            .filter(t => t.type === 'расход')
            .reduce((sum, t) => sum + t.amount, 0);

        document.getElementById('totalIncome').textContent = `${income} ₸`;
        document.getElementById('totalExpenses').textContent = `${expenses} ₸`;
    }

    getTransactions() {
        return this.transactions;
    }
}

// Создаем глобальный экземпляр
window.expenseManager = new ExpenseManager();

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