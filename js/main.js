// Определяем класс для управления расходами
class ExpenseManager {
    constructor() {
        this.transactions = [];
        this.loadFromLocalStorage();
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('expenses');
        this.transactions = saved ? JSON.parse(saved) : [];
    }

    saveToLocalStorage() {
        localStorage.setItem('expenses', JSON.stringify(this.transactions));
    }

    addTransaction(transaction) {
        this.transactions.push(transaction);
        this.saveToLocalStorage();
        if(typeof updateCharts === 'function') {
            updateCharts();
        }
    }

    deleteTransaction(index) {
        this.transactions.splice(index, 1);
        this.saveToLocalStorage();
        if(typeof updateCharts === 'function') {
            updateCharts();
        }
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
            <td>${transaction.category}</td>
            <td>${transaction.amount}</td>
            <td>${transaction.note || ''}</td>
            <td>
                <button onclick="window.expenseManager.deleteTransaction(${index}); renderTransactionsTable();">Удалить</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    renderTransactionsTable();
    if(typeof updateCharts === 'function') {
        updateCharts();
    }
}); 