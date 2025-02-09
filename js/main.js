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
        this.transactions.push({
            ...transaction, 
            id: Date.now(),
            category: transaction.category || 'Другое',
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
                    <div class="transaction-source">${t.source || ''}</div>
                </div>
                <div class="transaction-amount ${t.type}">
                    ${t.type === 'expense' ? '-' : '+'}${Math.abs(t.amount).toLocaleString('ru-RU')} ₸
                </div>
                <button onclick="window.expenseManager.showConfirmDialog(${t.id})" class="delete-btn" title="Удалить">
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