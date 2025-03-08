// Глобальная функция для добавления транзакций
window.addTransaction = function(transaction) {
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
        
        this.transactions = [];
        this.dateFilters = {
            from: null,
            to: null
        };
        
        // Определяем, используем ли мы Firebase
        this.isProduction = window.location.hostname === 'uyatemes.github.io';
        
        // Привязываем методы к контексту
        this.handleApplyFilter = this.handleApplyFilter.bind(this);
        this.handleResetFilter = this.handleResetFilter.bind(this);
        this.showConfirmDialog = this.showConfirmDialog.bind(this);
        
        // Инициализация при создании экземпляра
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }

        this.currentTransactionToDelete = null;
        this.initializeModal();

        if (this.isProduction) {
            // Только для продакшена: слушаем изменения авторизации
            firebase.auth().onAuthStateChanged(async user => {
                if (user) {
                    await this.migrateLocalDataToFirebase();
                    this.loadFromFirebase();
                } else {
                    this.showSignInPrompt();
                }
            });
        } else {
            // Для локальной версии: загружаем данные из localStorage
            this.loadFromLocalStorage();
        }

        this.lastDoc = null;
        this.hasMore = false;
        this.isLoading = false;

        // Привязываем обработчики событий
        document.getElementById('user-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUserInput();
        });
        
        document.getElementById('send-message').addEventListener('click', () => {
            this.handleUserInput();
        });

        // Добавляем обработчик для кнопки "Загрузить еще"
        document.getElementById('loadMoreButton').addEventListener('click', () => {
            this.loadMoreTransactions();
        });
    }

    async initialize() {
        console.log('ExpenseManager: DOM готов, начинаем инициализацию');
        
        if (this.isProduction) {
            // Проверяем авторизацию только в продакшене
            const user = firebase.auth().currentUser;
            if (!user) {
                await this.showSignInPrompt();
            }
        }
        
        this.renderTransactions();
        this.initializeEventHandlers();
        console.log('ExpenseManager: Инициализация завершена');
    }

    async showSignInPrompt() {
        const result = await signInWithGoogle();
        if (result) {
            this.loadFromFirebase();
        } else {
            console.error('Не удалось авторизоваться');
        }
    }

    async loadFromFirebase() {
        this.transactions = await loadTransactionsFromFirebase();
        this.renderTransactions();
        this.updateTotals(this.transactions);
    }

    loadFromLocalStorage() {
        const savedData = localStorage.getItem('transactions');
        if (savedData) {
            this.transactions = JSON.parse(savedData);
            this.renderTransactions();
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }

    async addTransaction(transaction) {
        console.log('ExpenseManager: Добавление транзакции:', transaction);
        
        const newTransaction = {
            ...transaction,
            id: Date.now(),
            date: new Date().toISOString(),
            amount: transaction.type === 'expense' ? 
                -Math.abs(parseFloat(transaction.amount)) : 
                Math.abs(parseFloat(transaction.amount))
        };
        
        if (this.isProduction) {
            // В продакшене сохраняем в Firebase
            await saveTransactionToFirebase(newTransaction);
        } else {
            // В локальной версии сохраняем в localStorage
            this.transactions.unshift(newTransaction);
            this.saveToLocalStorage();
        }
        
        this.renderTransactions();
        if (typeof window.updateCharts === 'function') {
            window.updateCharts();
        }
        this.updateTotals(this.transactions);
        
        return newTransaction;
    }

    async deleteTransaction(id) {
        if (confirm('Вы уверены, что хотите удалить эту транзакцию?')) {
            if (this.isProduction) {
                // В продакшене удаляем из Firebase
                await deleteTransactionFromFirebase(id);
            } else {
                // В локальной версии удаляем из localStorage
                this.transactions = this.transactions.filter(t => t.id !== id);
                this.saveToLocalStorage();
            }
            
            this.renderTransactions();
            if (typeof window.updateCharts === 'function') {
                window.updateCharts();
            }
            this.updateTotals(this.transactions);
        }
    }

    updateTransaction(id, updatedTransaction) {
        this.transactions = this.transactions.map(transaction => 
            transaction.id === id ? {...updatedTransaction, id} : transaction
        );
        this.renderTransactions();
        if (typeof window.updateCharts === 'function') {
            window.updateCharts();
        }
        this.updateTotals(this.transactions);
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
        if (!this.dateFilters.from && !this.dateFilters.to) {
            return this.transactions;
        }

        return this.transactions.filter(t => {
            const transactionDate = new Date(t.date).getTime();
            const fromDate = this.dateFilters.from ? new Date(this.dateFilters.from).getTime() : null;
            const toDate = this.dateFilters.to ? new Date(this.dateFilters.to).getTime() : null;

            if (fromDate && transactionDate < fromDate) return false;
            if (toDate && transactionDate > toDate) return false;
            return true;
        });
    }

    renderTransactions() {
        console.log('ExpenseManager: Начало renderTransactions');
        
        const transactionsList = document.getElementById('expensesTableBody');
        if (!transactionsList) {
            console.error('ExpenseManager: Не найден элемент expensesTableBody');
            return;
        }
        
        const transactions = this.getTransactions();
        console.log('ExpenseManager: Транзакции для рендеринга:', transactions);
        
        // Очищаем список
        transactionsList.innerHTML = '';
        
        // Добавляем каждую транзакцию
        transactions.forEach((t, index) => {
            const transactionElement = document.createElement('div');
            transactionElement.className = 'transaction-item';
            
            // Если это первая транзакция и она новая (добавлена менее 1 секунды назад)
            if (index === 0 && (Date.now() - new Date(t.date).getTime()) < 1000) {
                transactionElement.classList.add('new');
                // Удаляем класс через 1 секунду
                setTimeout(() => {
                    transactionElement.classList.remove('new');
                    // Плавно меняем фон обратно
                    transactionElement.style.transition = 'background-color 0.5s ease-out';
                    transactionElement.style.background = '';
                }, 1000);
            }
            
            const date = new Date(t.date).toLocaleDateString('ru-RU');
            const amount = Math.abs(t.amount).toLocaleString('ru-RU');
            const sign = t.type === 'income' ? '+' : '-';
            
            transactionElement.innerHTML = `
                <div class="transaction-info">
                    <div class="transaction-date">${date}</div>
                    <div class="transaction-description">${t.description}</div>
                    <div class="transaction-source">${t.source || ''}</div>
                </div>
                <div class="transaction-right">
                    <div class="transaction-amount ${t.type}">
                        ${sign}${amount} ₸
                    </div>
                    <button onclick="window.expenseManager.deleteTransaction(${t.id})" class="delete-btn" title="Удалить">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            `;
            
            transactionsList.appendChild(transactionElement);
        });
        
        console.log('ExpenseManager: Рендеринг завершен');
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
        console.log('ExpenseManager: Получение транзакций, всего:', this.transactions.length);
        return [...this.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
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

    setDateFilter(startDate, endDate) {
        this.dateFilters.from = startDate ? new Date(startDate) : null;
        this.dateFilters.to = endDate ? new Date(endDate) : null;
        this.renderTransactions();
        console.log('Date filter set:', { from: this.dateFilters.from, to: this.dateFilters.to });
    }

    resetDateFilter() {
        this.dateFilters.from = null;
        this.dateFilters.to = null;
        this.renderTransactions();
        console.log('Date filter reset');
    }

    updateTotals(transactions) {
        console.log('ExpenseManager: Начало updateTotals');
        console.log('Транзакции:', transactions);
        
        // Считаем итоги
        const totals = transactions.reduce((acc, t) => {
            const amount = parseFloat(t.amount);
            console.log('Обработка транзакции:', { type: t.type, amount: amount });
            
            if (t.type === 'income') {
                acc.income += amount;
            } else if (t.type === 'expense') {
                acc.expense += Math.abs(amount);
            }
            return acc;
        }, { income: 0, expense: 0 });
        
        console.log('Посчитанные итоги:', totals);
        
        // Обновляем отображение
        const incomeElement = document.querySelector('#totalIncome .total-amount');
        const expenseElement = document.querySelector('#totalExpense .total-amount');
        
        console.log('Найденные элементы:', { 
            incomeElement: incomeElement?.outerHTML, 
            expenseElement: expenseElement?.outerHTML 
        });
        
        if (incomeElement) {
            incomeElement.className = 'total-amount transaction-amount income';
            incomeElement.textContent = `${totals.income.toLocaleString('ru-RU')} ₸`;
        } else {
            console.error('Не найден элемент для доходов #totalIncome .total-amount');
        }
        
        if (expenseElement) {
            expenseElement.className = 'total-amount transaction-amount expense';
            expenseElement.textContent = `${totals.expense.toLocaleString('ru-RU')} ₸`;
        } else {
            console.error('Не найден элемент для расходов #totalExpense .total-amount');
        }
        
        console.log('ExpenseManager: Завершение updateTotals');
    }

    showConfirmDialog(id) {
        const modal = document.getElementById('confirmDialog');
        this.currentTransactionToDelete = id;
        modal.classList.add('show');
    }

    async exportToPDF() {
        const element = document.createElement('div');
        element.innerHTML = this.generatePDFContent();
        
        // Генерируем имя файла с датой и временем
        const now = new Date();
        const dateStr = now.toLocaleDateString('ru-RU').replace(/\./g, '-');
        const timeStr = now.toLocaleTimeString('ru-RU').replace(/:/g, '-');
        const fileName = `expense-report_${dateStr}_${timeStr}.pdf`;
        
        const opt = {
            margin: [15, 15, 15, 15],
            filename: fileName,
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            style: `
                .pdf-container {
                    font-family: Arial, sans-serif;
                    color: #000;
                    padding: 20px;
                    line-height: 1.5;
                }
                h1 {
                    font-size: 24px;
                    font-weight: bold;
                    margin: 0 0 15px 0;
                    color: #000;
                }
                .period {
                    font-size: 14px;
                    margin-bottom: 20px;
                    color: #000;
                }
                .totals {
                    margin-bottom: 30px;
                    font-size: 16px;
                    font-weight: bold;
                }
                .income {
                    color: #188038;
                    margin-bottom: 5px;
                }
                .expense {
                    color: #d93025;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 14px;
                }
                tr {
                    border-bottom: 1px solid #ddd;
                }
                td {
                    padding: 10px 5px;
                    color: #000;
                }
                .header td {
                    font-weight: bold;
                    background: #f5f5f5;
                    border-bottom: 2px solid #ddd;
                }
                td:last-child {
                    text-align: right;
                }
                tr td.income {
                    color: #188038;
                }
                tr td.expense {
                    color: #d93025;
                }
            `
        };

        await html2pdf().set(opt).from(element).save();
    }

    calculateTotals(transactions) {
        return transactions.reduce((totals, t) => {
            if (t.type === 'income') {
                totals.totalIncome += Math.abs(t.amount);
            } else {
                totals.totalExpense += Math.abs(t.amount);
            }
            return totals;
        }, { totalIncome: 0, totalExpense: 0 });
    }

    formatDateRange() {
        const startDate = this.dateFilters.from 
            ? new Date(this.dateFilters.from).toLocaleDateString('ru-RU')
            : 'начало';
        const endDate = this.dateFilters.to
            ? new Date(this.dateFilters.to).toLocaleDateString('ru-RU')
            : 'конец';
        return `${startDate} — ${endDate}`;
    }

    generatePDFContent() {
        const transactions = this.getFilteredTransactions();
        const { totalIncome, totalExpense } = this.calculateTotals(transactions);
        
        // Получаем текущую дату и время
        const now = new Date();
        const exportDateTime = now.toLocaleString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        // Описания категорий
        const categoryDescriptions = {
            'Счет на оплату': 'Fika People, Fruitata, Абадан Пэй, RockCity, Coffee Man, Shygie.kz, ИП и ТОО, базары, магазины',
            'Зарплата': 'Зарплаты, авансы и выплаты сотрудникам',
            'Руководство': 'Ига, Ержан, Альфия, Сека',
            'Долг': 'Долги, кредиты, займы',
            'Прочее': 'Остальные операции'
        };
        
        // Группируем транзакции по категориям
        const summary = {};
        
        // Сначала собираем все транзакции по категориям
        transactions.forEach(t => {
            const category = this.categorizeDescription(t.description);
            if (!summary[category]) {
                summary[category] = { income: 0, expense: 0 };
            }
            if (t.type === 'income') {
                summary[category].income += Math.abs(t.amount);
            } else {
                summary[category].expense += Math.abs(t.amount);
            }
        });

        return `
            <div class="pdf-container" style="color: #000000 !important;">
                <style>
                    @media print {
                        table { page-break-inside: avoid; }
                        tr { page-break-inside: avoid; }
                        thead { display: table-header-group; }
                        tfoot { display: table-footer-group; }
                        .page-break { page-break-before: always; }
                        h2 { page-break-before: always; }
                    }
                </style>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h1 style="color: #000000 !important; margin: 0;">Отчет по операциям</h1>
                    <svg width="80" height="80" viewBox="0 0 685 321" style="color: #DDDDDD !important; fill: #DDDDDD !important;">
                        <g>
                            <path class="cls-1" d="m342.5,0C153.35,0,0,71.86,0,160.5s153.35,160.5,342.5,160.5,342.5-71.86,342.5-160.5S531.66,0,342.5,0Zm212.11,100.57c22.28,4.46,42.22,9.62,59.16,15.29,7.63,14.56,11.48,29.68,11.48,45.11,0,13.74-3.05,27.24-9.1,40.31-16.91,5.79-36.94,11.08-59.4,15.64,8.09-17.42,12.5-36.27,12.5-55.95,0-21.37-5.2-41.76-14.64-60.4Zm69.46,18.93c6.89,2.58,13.18,5.26,18.81,8.01,20.87,10.2,32.37,21.37,32.37,31.46s-11.11,20.88-31.28,30.93c-5.27,2.62-11.15,5.19-17.59,7.66,4.49-11.75,6.87-24,6.87-36.59,0-14.6-3.39-28.52-9.18-41.47Zm-34.58-64.91c27.59,14.24,49.16,30.71,64.13,48.98,9.59,11.7,16.16,23.81,19.66,36.18-10.18-10.71-28.68-20.63-53.73-29.33-10.13-18.41-24.95-34.55-41.26-47.45-20.26-16.03-43.24-27.36-66.88-37.44,26.5,4.6,54.21,16.74,78.08,29.06Zm-118.87-33.76c30.56,7.89,57.95,19.15,81.43,33.48,23.2,14.15,41.35,30.55,53.96,48.74.86,1.24,1.69,2.49,2.49,3.74-17.04-5.29-36.61-10.06-58.26-14.19-18.62-31.69-49.79-57.7-88.37-73.9,2.93.68,5.85,1.38,8.75,2.13Zm-135.58,159.33l-28.81-24.49h67.41c34.17,0,51.27-12.19,51.27-36.58s-17.1-35.14-51.27-35.14h-77.49v174.27h-42.06V56.58h119.55c31.1,0,54.77,5.29,71,15.85,16.23,10.56,24.34,25.83,24.34,45.8s-7.3,33.99-21.89,44.36c-14.6,10.37-36.01,16.13-64.24,17.28l92.47,78.35h-48.4l-91.88-78.06Zm126.83,123.08c40.38-16.96,72.65-44.66,90.9-78.38,21.93-4.28,41.67-9.2,58.75-14.67-1.68,2.93-3.52,5.83-5.51,8.7-12.61,18.19-30.76,34.59-53.96,48.74-23.48,14.33-50.87,25.59-81.43,33.48-2.9.75-5.82,1.45-8.75,2.13Zm191.75-84.87c-14.97,18.27-36.54,34.74-64.13,48.98-23.32,12.04-49.89,21.91-79.17,29.47,53.46-20.57,93.93-52.56,112.2-90.36,24.66-8.83,42.63-18.89,52.1-29.74-2.97,14.28-10,28.23-21,41.65Z"/>
                        </g>
                    </svg>
                </div>
                <div class="period" style="color: #000000 !important;">Период: ${this.formatDateRange()}</div>
                
                <div class="totals" style="page-break-inside: avoid;">
                    <div class="income" style="color: #188038 !important;">Доходы + ${this.formatAmount(totalIncome)} ₸</div>
                    <div class="expense" style="color: #d93025 !important;">Расходы - ${this.formatAmount(totalExpense)} ₸</div>
                </div>

                <div style="page-break-inside: avoid;">
                    <h2 style="margin-top: 20px; color: #000000 !important;">Сводка по категориям</h2>
                    <table cellspacing="0" cellpadding="8" style="width: 100%; border-collapse: collapse; color: #000000 !important;">
                        <thead>
                            <tr style="background: none !important; border-bottom: 2px solid #000000;">
                                <th style="width: 40%; text-align: left; padding: 8px;">Категория</th>
                                <th style="width: 30%; text-align: right; padding: 8px;">Доходы</th>
                                <th style="width: 30%; text-align: right; padding: 8px;">Расходы</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(summary)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([category, amounts]) => `
                                    <tr style="page-break-inside: avoid;">
                                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">
                                            <div style="font-weight: bold;">${category}</div>
                                            <div style="font-size: 12px; color: #666666; margin-top: 4px;">
                                                ${categoryDescriptions[category] || ''}
                                            </div>
                                        </td>
                                        <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd; color: #188038 !important;">
                                            ${amounts.income > 0 ? '+ ' + this.formatAmount(amounts.income) + ' ₸' : ''}
                                        </td>
                                        <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd; color: #d93025 !important;">
                                            ${amounts.expense > 0 ? '- ' + this.formatAmount(amounts.expense) + ' ₸' : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="page-break-inside: avoid;">
                    <h2 style="margin-top: 30px; color: #000000 !important;">Детализация операций</h2>
                    <table cellspacing="0" cellpadding="8" style="width: 100%; border-collapse: collapse; color: #000000 !important;">
                        <thead>
                            <tr style="background: none !important; border-bottom: 2px solid #000000;">
                                <th style="width: 20%; text-align: left; padding: 8px;">Дата</th>
                                <th style="width: 50%; text-align: left; padding: 8px;">Описание</th>
                                <th style="width: 30%; text-align: right; padding: 8px;">Сумма</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactions
                                .map(t => {
                                    const date = new Date(t.date).toLocaleDateString('ru-RU');
                                    const amount = this.formatAmount(t.amount);
                                    const sign = t.type === 'income' ? '+' : '-';
                                    const color = t.type === 'income' ? '#188038' : '#d93025';
                                    return `
                                        <tr style="page-break-inside: avoid;">
                                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${date}</td>
                                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${t.description}</td>
                                            <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd; color: ${color} !important;">
                                                ${sign} ${amount} ₸
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="margin-top: 30px; text-align: right; font-size: 12px; color: #666666; page-break-inside: avoid;">
                    Отчет сформирован: ${exportDateTime}
                </div>
            </div>
        `;
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

    initializeModal() {
        const modal = document.getElementById('confirmDialog');
        const confirmBtn = document.getElementById('confirmDelete');
        const cancelBtn = document.getElementById('cancelDelete');

        confirmBtn.addEventListener('click', () => {
            if (this.currentTransactionToDelete !== null) {
                this.deleteTransaction(this.currentTransactionToDelete);
                this.currentTransactionToDelete = null;
            }
            modal.classList.remove('show');
        });

        cancelBtn.addEventListener('click', () => {
            this.currentTransactionToDelete = null;
            modal.classList.remove('show');
        });
    }

    formatAmount(amount) {
        return new Intl.NumberFormat('ru-RU').format(Math.abs(amount));
    }

    categorizeDescription(description) {
        description = description.toLowerCase();
        
        // Правила категоризации с приоритетами
        const rules = [
            {
                category: 'Счет на оплату',
                test: (desc) => {
                    const suppliers = [
                        'fika people', 'fruitata', 'абадан пэй', 'ип абадан',
                        'rockcity', 'coffee man', 'shygie.kz', 'юзаев талгат',
                        'илахунов', 'дана пэй', 'базар', 'магазин', 'доставка',
                        'полиграфия'
                    ];
                    return suppliers.some(s => desc.includes(s.toLowerCase())) ||
                           (desc.startsWith('ип') && !desc.includes('налог')) ||
                           desc.startsWith('тоо'));
                }
            },
            {
                category: 'Зарплата',
                test: (desc) => {
                    return desc.includes('зарплата') || 
                           desc.includes('на зарплату') || 
                           desc.includes('аванс');
                }
            },
            {
                category: 'Руководство',
                test: (desc) => {
                    const management = ['ига', 'ержан', 'альфия', 'сека'];
                    return management.some(name => {
                        const isManagement = desc.includes(name);
                        const isNotSupplier = !desc.startsWith('ип');
                        const isNotTransport = !desc.includes('такси');
                        return isManagement && isNotSupplier && isNotTransport;
                    });
                }
            },
            {
                category: 'Долг',
                test: (desc) => {
                    return desc.includes('долг') || 
                           desc.includes('кредо') || 
                           desc.includes('займ') ||
                           desc.includes('в долг');
                }
            }
        ];

        // Проверяем каждое правило по порядку
        for (const rule of rules) {
            if (rule.test(description)) {
                return rule.category;
            }
        }
        
        return 'Прочее';
    }

    async migrateLocalDataToFirebase() {
        try {
            // Проверяем, была ли уже выполнена миграция
            if (localStorage.getItem('transactions_migrated')) {
                console.log('Миграция уже была выполнена ранее');
                return;
            }

            // Получаем данные из localStorage
            const localData = localStorage.getItem('transactions');
            if (!localData) {
                console.log('Локальные данные отсутствуют');
                return;
            }

            const transactions = JSON.parse(localData);
            console.log(`Найдено ${transactions.length} локальных транзакций для миграции`);

            // Проверяем авторизацию
            const user = firebase.auth().currentUser;
            if (!user) {
                console.log('Сначала нужно авторизоваться');
                await signInWithGoogle();
            }

            // Создаем копию данных перед миграцией
            const backupData = localStorage.getItem('transactions_backup');
            if (!backupData) {
                localStorage.setItem('transactions_backup', localData);
                console.log('Создана резервная копия данных');
            }

            let migratedCount = 0;
            // Сохраняем каждую транзакцию в Firebase
            for (const transaction of transactions) {
                try {
                    // Проверяем, существует ли уже такая транзакция
                    const existingDocs = await db.collection('users')
                        .doc(firebase.auth().currentUser.uid)
                        .collection('transactions')
                        .where('id', '==', transaction.id)
                        .get();

                    if (!existingDocs.empty) {
                        console.log(`Транзакция ${transaction.id} уже существует, пропускаем`);
                        continue;
                    }

                    const newTransaction = {
                        ...transaction,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        userId: firebase.auth().currentUser.uid,
                        migratedFromLocal: true
                    };
                    
                    await db.collection('users')
                        .doc(firebase.auth().currentUser.uid)
                        .collection('transactions')
                        .add(newTransaction);
                    
                    migratedCount++;
                    console.log(`Мигрировано ${migratedCount} из ${transactions.length} транзакций`);
                } catch (error) {
                    console.error('Ошибка при миграции транзакции:', error);
                }
            }

            if (migratedCount > 0) {
                console.log('Миграция данных завершена успешно');
                // Помечаем, что миграция выполнена
                localStorage.setItem('transactions_migrated', 'true');
                localStorage.removeItem('transactions');
            } else {
                console.warn('Нет новых транзакций для миграции');
            }
            
            // Перезагружаем данные из Firebase
            await this.loadFromFirebase();
            
        } catch (error) {
            console.error('Ошибка при миграции данных:', error);
            // Восстанавливаем данные из бэкапа если что-то пошло не так
            const backupData = localStorage.getItem('transactions_backup');
            if (backupData) {
                localStorage.setItem('transactions', backupData);
                console.log('Данные восстановлены из резервной копии');
            }
        }
    }

    async loadTransactions() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            console.log('ExpenseManager: Загрузка транзакций...');
            
            const result = await loadTransactionsFromFirebase(50, this.lastDoc);
            
            if (result.transactions.length > 0) {
                this.transactions = this.lastDoc ? [...this.transactions, ...result.transactions] : result.transactions;
                this.lastDoc = result.lastDoc;
                this.hasMore = result.hasMore;
                
                // Показываем или скрываем кнопку "Загрузить еще"
                const loadMoreButton = document.getElementById('loadMoreButton');
                loadMoreButton.style.display = this.hasMore ? 'inline-block' : 'none';
            }

            this.renderTransactions();
            
        } catch (error) {
            console.error('Ошибка при загрузке транзакций:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async loadMoreTransactions() {
        if (this.hasMore && !this.isLoading) {
            await this.loadTransactions();
        }
    }

    handleUserInput() {
        // Implementation of handleUserInput method
    }
}

// Создаем глобальный экземпляр
window.expenseManager = new ExpenseManager();

// Глобальная функция удаления
window.deleteTransaction = function(id) {
    if (confirm('Вы уверены, что хотите удалить эту транзакцию?')) {
        window.expenseManager.deleteTransaction(id);
    }
};

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
    const startDate = document.querySelector('#startDate');
    const endDate = document.querySelector('#endDate');
    const applyFilter = document.querySelector('#applyDateFilter');
    const resetFilter = document.querySelector('#resetDateFilter');

    if (!startDate || !endDate) {
        console.error('Элементы календаря не найдены');
        return;
    }

    if (applyFilter) {
        applyFilter.addEventListener('click', () => {
            window.expenseManager.setDateFilter(startDate.value, endDate.value);
        });
    }

    if (resetFilter) {
        resetFilter.addEventListener('click', () => {
            startDate.value = '';
            endDate.value = '';
            window.expenseManager.resetDateFilter();
        });
    }
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

const testDescriptions = [
    // Счет на оплату
    'ип абадан за кофе',
    'fika people поставка',
    'базар продукты',
    'доставка товара',
    'тоо рога и копыта',
    
    // Зарплата
    'зарплата за июнь',
    'аванс сотрудникам',
    'на зарплату персоналу',
    
    // Руководство
    'ига премия',
    'ержан командировка',
    'альфия отчет',
    'сека расходы',
    
    // Долг
    'возврат долга',
    'кредо банк',
    'займ на оборудование',
    'в долг на месяц',
    
    // Должны попасть в Прочее
    'канцтовары',
    'ремонт техники',
    'такси'
];

console.log('Тестирование категоризации:');
testDescriptions.forEach(desc => {
    console.log(`"${desc}" -> ${window.expenseManager.categorizeDescription(desc)}`);
}); 