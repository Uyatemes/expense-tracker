// Класс для управления статистикой
class StatsManager {
    constructor() {
        this.transactions = [];
        this.currentPeriod = 'month';
        // Единый список всех, кто может быть связан с долгом
        this.debtPeople = ['ерлан', 'ержан', 'нурсик', 'альфия', 'seka', 'aym'];
        this.initializeEventHandlers();
        this.loadData();
    }

    normalize(str) {
        return str.toLowerCase().replace(/[^a-zа-я0-9ё\s]/gi, '').replace(/\s+/g, ' ').trim();
    }

    // Инициализация обработчиков событий
    initializeEventHandlers() {
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentPeriod = btn.dataset.period;
                if (this.currentPeriod === 'custom') {
                    document.querySelector('.custom-period').style.display = 'flex';
                } else {
                    document.querySelector('.custom-period').style.display = 'none';
                    this.updateStats();
                }
            });
        });
        document.getElementById('applyCustomPeriod').addEventListener('click', () => {
            // Получаем значения из Material Web Components
            const startDateField = document.getElementById('startDate');
            const endDateField = document.getElementById('endDate');
            // Для md-outlined-text-field значение лежит в .value
            const startDate = startDateField && startDateField.value ? startDateField.value : '';
            const endDate = endDateField && endDateField.value ? endDateField.value : '';
            if (startDate && endDate) {
                this.updateStats(startDate, endDate);
            }
        });
    }

    // Загрузка данных
    async loadData() {
        try {
            if (window.expenseManager) {
                // Приводим все транзакции к единому виду
                this.transactions = window.expenseManager.transactions.map(t => {
                    if (!t.type) {
                        return {
                            ...t,
                            type: t.amount < 0 ? 'expense' : 'income'
                        };
                    }
                    return t;
                });
                this.updateStats();
            } else {
                console.error('ExpenseManager не инициализирован');
            }
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
        }
    }

    // Обновление статистики
    updateStats(startDate, endDate) {
        const filteredTransactions = this.filterTransactionsByPeriod(startDate, endDate);
        this.updateSummary(filteredTransactions);
        this.updateTopExpenses(filteredTransactions);
    }

    // Фильтрация транзакций по периоду
    filterTransactionsByPeriod(startDate, endDate) {
        let filtered = [...this.transactions];
        if (startDate && endDate) {
            filtered = filtered.filter(t => {
                const date = new Date(t.date);
                return date >= new Date(startDate) && date <= new Date(endDate);
            });
        } else {
            const now = new Date();
            let start = new Date();
            switch (this.currentPeriod) {
                case 'month':
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'quarter':
                    const quarter = Math.floor(now.getMonth() / 3);
                    start = new Date(now.getFullYear(), quarter * 3, 1);
                    break;
                case 'year':
                    start = new Date(now.getFullYear(), 0, 1);
                    break;
            }
            filtered = filtered.filter(t => {
                const date = new Date(t.date);
                return date >= start && date <= now;
            });
        }
        return filtered;
    }

    // Обновление сводки
    updateSummary(transactions) {
        const summary = this.calculateSummary(transactions);

        // Обновляем только если элементы существуют
        const incomeEl = document.getElementById('totalIncome');
        const expenseEl = document.getElementById('totalExpense');
        const balanceEl = document.getElementById('totalBalance');
        const incomeTrendEl = document.getElementById('incomeTrend');
        const expenseTrendEl = document.getElementById('expenseTrend');
        const balanceTrendEl = document.getElementById('balanceTrend');

        if (incomeEl) incomeEl.textContent = '+' + this.formatAmount(Math.abs(summary.income));
        if (expenseEl) expenseEl.textContent = '-' + this.formatAmount(Math.abs(summary.expense));
        if (balanceEl) balanceEl.textContent = this.formatAmount(summary.balance);

        const previousPeriodTransactions = this.getPreviousPeriodTransactions();
        const previousSummary = this.calculateSummary(previousPeriodTransactions);

        if (incomeTrendEl) this.updateTrend('incomeTrend', this.calculateTrend(summary.income, previousSummary.income));
        if (expenseTrendEl) this.updateTrend('expenseTrend', this.calculateTrend(summary.expense, previousSummary.expense));
        if (balanceTrendEl) this.updateTrend('balanceTrend', this.calculateTrend(summary.balance, previousSummary.balance));
    }

    // Расчет сводки
    calculateSummary(transactions) {
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = income - expense;
        const previousPeriodTransactions = this.getPreviousPeriodTransactions();
        const previousIncome = previousPeriodTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const previousExpense = previousPeriodTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const previousBalance = previousIncome - previousExpense;
        return {
            income,
            expense,
            balance,
            incomeTrend: this.calculateTrend(income, previousIncome),
            expenseTrend: this.calculateTrend(expense, previousExpense),
            balanceTrend: this.calculateTrend(balance, previousBalance)
        };
    }

    // Получение транзакций за предыдущий период
    getPreviousPeriodTransactions() {
        const now = new Date();
        let start = new Date();
        let end = new Date();
        switch (this.currentPeriod) {
            case 'month':
                start.setMonth(now.getMonth() - 2);
                end.setMonth(now.getMonth() - 1);
                break;
            case 'quarter':
                start.setMonth(now.getMonth() - 6);
                end.setMonth(now.getMonth() - 3);
                break;
            case 'year':
                start.setFullYear(now.getFullYear() - 2);
                end.setFullYear(now.getFullYear() - 1);
                break;
        }
        return this.transactions.filter(t => {
            const date = new Date(t.date);
            return date >= start && date <= end;
        });
    }

    // Расчет тренда
    calculateTrend(current, previous) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    }

    // Обновление тренда в DOM
    updateTrend(elementId, trend) {
        const element = document.getElementById(elementId);
        const trendValue = Math.abs(trend).toFixed(1);
        if (trend > 0) {
            element.innerHTML = `<span style="color: #4CAF50">↑ ${trendValue}%</span>`;
        } else if (trend < 0) {
            element.innerHTML = `<span style="color: #F44336">↓ ${trendValue}%</span>`;
        } else {
            element.innerHTML = '0%';
        }
    }

    // Обновление списка топ расходов (оставляем только группировку и вывод)
    updateTopExpenses(transactions) {
        const expensesList = document.getElementById('topExpensesList');
        expensesList.innerHTML = '';
        const expensesByCategory = {};
        
        transactions.forEach(t => {
            const category = this.getCategory(t.description);
            if (!expensesByCategory[category]) {
                expensesByCategory[category] = {
                    total: 0,
                    income: 0,
                    expense: 0,
                    transactions: []
                };
            }
            expensesByCategory[category].transactions.push(t);
            if (t.type === 'income') {
                expensesByCategory[category].income += t.amount;
            } else {
                expensesByCategory[category].expense += t.amount;
            }
        });

        // Список всех ключевых категорий, которые должны отображаться всегда
        const allCategories = [
            'Зарплата',
            'Прочее',
            'Счет на оплату',
            'Смена',
            'Долг'
        ];

        // Обеспечиваем наличие всех категорий
        allCategories.forEach(cat => {
            if (!expensesByCategory[cat]) {
                expensesByCategory[cat] = {
                    total: 0,
                    income: 0,
                    expense: 0,
                    transactions: []
                };
            }
        });

        const sortedCategories = allCategories
            .map(cat => [cat, expensesByCategory[cat]])
            .filter(([cat, data]) => data) // только существующие
            ;

        sortedCategories.forEach(([category, data]) => {
            // Расчет total по правилам для каждой категории
            if (category === 'Долг') {
                data.total = data.income - data.expense;
                if (Math.abs(data.total) < 1e-6) data.total = 0;
            } else if (category === 'Смена') {
                data.total = data.income;
            } else if (category === 'Счет на оплату' || category === 'Зарплата') {
                data.total = -data.expense; // всегда минус
            } else {
                data.total = data.income - data.expense;
            }

            let namesHtml = '';
            let isCollapsible = false;

            if (category === 'Долг') {
                isCollapsible = true;
                const byName = {};

                data.transactions.forEach(t => {
                    const descNorm = this.normalize(t.description);
                    const nameFound = this.debtPeople.find(person => descNorm.includes(person));
                    
                    let name;
                    if (nameFound) {
                        name = nameFound.charAt(0).toUpperCase() + nameFound.slice(1);
                        if (['Seka', 'Alfiya', 'Aym'].includes(name)) {
                            name = 'Руководство';
                        }
                    } else {
                        // Если имя не найдено в транзакции с долгом, это "Общий долг"
                        name = 'Общий долг';
                    }
                    
                    if (!byName[name]) byName[name] = { income: 0, expense: 0, transactions: [] };
                    
                    // Добавляем транзакцию в список для проверки дублирования
                    byName[name].transactions.push(t);
                    
                    // Правильно учитываем типы транзакций
                    if (t.type === 'income') {
                        byName[name].income += Math.abs(t.amount);
                    } else if (t.type === 'expense') {
                        byName[name].expense += Math.abs(t.amount);
                    }
                });

                // Проверяем на дублирование и выводим отладочную информацию
                Object.entries(byName).forEach(([name, data]) => {
                    console.log(`📊 ${name}:`);
                    console.log(`  Транзакций: ${data.transactions.length}`);
                    console.log(`  Доход: ${this.formatAmount(data.income)}`);
                    console.log(`  Расход: ${this.formatAmount(data.expense)}`);
                    console.log(`  Итог: ${this.formatAmount(data.income - data.expense)}`);
                    data.transactions.forEach(t => {
                        console.log(`    - "${t.description}" (${t.type}, ${t.amount})`);
                    });
                });

                const sortedNames = Object.entries(byName)
                    .sort(([, a], [, b]) => Math.abs(b.income - b.expense) - Math.abs(a.income - a.expense));
                
                sortedNames.forEach(([name, totals]) => {
                    let total = totals.income - totals.expense;
                    if (Math.abs(total) < 1e-6) {
                        total = 0;
                    }
                    if (total === 0) return; 

                    namesHtml += `
                        <div class="detail-item">
                            <span class="detail-name">${name}</span>
                            <div class="detail-data-column">
                                <span class="detail-amount ${total > 0 ? 'positive' : 'negative'}">
                                    ${this.formatAmount(total)}
                                </span>
                                <div class="debt-breakdown">
                                    ${totals.income > 0 ? `<span class="positive">Вернул: ${this.formatAmount(totals.income)}</span>` : ''}
                                    ${totals.expense > 0 ? `<span class="negative">Взял: ${this.formatAmount(totals.expense)}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                });

            } else if (category === 'Счет на оплату') {
                isCollapsible = true;
                const bySupplier = this.groupExpensesBySupplier(data.transactions);

                let prevMonthSupplierExpenses = {};
                if (this.currentPeriod === 'month') {
                    const prevMonthTransactions = this.getPreviousMonthTransactions();
                    prevMonthSupplierExpenses = this.groupExpensesBySupplier(prevMonthTransactions);
                }

                const sortedSuppliers = Object.entries(bySupplier).sort(([, a], [, b]) => b.total - a.total);

                sortedSuppliers.forEach(([supplierName, supplierData]) => {
                    let trendHtml = '';
                    if (this.currentPeriod === 'month') {
                        const previousAmount = (prevMonthSupplierExpenses[supplierName] || {}).total || 0;
                        const trend = this.calculateTrend(supplierData.total, previousAmount);
                        trendHtml = this.getTrendHtml(trend);
                    }
                    namesHtml += `
                        <div class="detail-item">
                            <span class="detail-name">${supplierData.displayName}</span>
                            <div class="detail-data-column">
                                <span class="detail-amount">${this.formatAmount(-supplierData.total)}</span>
                                ${trendHtml}
                            </div>
                        </div>
                    `;
                });
            } else if (category === 'Смена') {
                namesHtml = '';
            } else {
                namesHtml = '';
            }

            const categoryElement = document.createElement('div');
            categoryElement.className = 'expense-category';

            // Детали всегда скрыты по умолчанию
            const detailsHtml = namesHtml ? `
                <div class="details-list" style="display: none;">
                    ${namesHtml}
                </div>
            ` : '';

            categoryElement.innerHTML = `
                <div class="stat-card-header">
                    <div class="stat-card-title">${category}</div>
                    <div class="stat-card-amount ${this.getCategoryColor(category, data.total)}">
                        ${this.getCategorySign(category, data.total)}${this.formatAmount(Math.abs(data.total))}
                    </div>
                </div>
                ${detailsHtml}
            `;
            expensesList.appendChild(categoryElement);

            // Логика раскрытия/сворачивания для collapsible
            if (isCollapsible) {
                const details = categoryElement.querySelector('.details-list');
                categoryElement.addEventListener('click', (e) => {
                    if (!details) return;
                    const isVisible = details.style.display === 'block';
                    details.style.display = isVisible ? 'none' : 'block';
                    categoryElement.classList.toggle('expanded', !isVisible);
                });
            }
        });
    }

    getTrendHtml(trend) {
        if (Math.abs(trend) < 0.1 || !isFinite(trend)) return '';
        const trendValue = Math.abs(trend).toFixed(0);
        // Для расходов, рост - это плохо (красный), снижение - хорошо (зеленый)
        if (trend > 0) {
            return `<span class="trend-indicator increase">↑ ${trendValue}%</span>`;
        } else if (trend < 0) {
            return `<span class="trend-indicator decrease">↓ ${trendValue}%</span>`;
        }
        return '';
    }

    groupExpensesBySupplier(transactions) {
        const bySupplier = {};
        const billPaymentTransactions = transactions.filter(t =>
            t.type === 'expense' && this.getCategory(t.description) === 'Счет на оплату'
        );

        billPaymentTransactions.forEach(t => {
            const supplierInfo = this.getSupplierInfo(t.description);
            const supplierKey = supplierInfo.fullName; // Используем полное имя как ключ

            if (!bySupplier[supplierKey]) {
                bySupplier[supplierKey] = {
                    total: 0,
                    displayName: supplierInfo.displayName
                };
            }
            bySupplier[supplierKey].total += t.amount;
        });
        return bySupplier;
    }

    getSupplierInfo(description) {
        const normalize = str => str.toLowerCase().replace(/[^a-zа-я0-9ё\s]/gi, '').replace(/\s+/g, ' ').trim();
        const descNorm = normalize(description);
        const suppliersList = localStorage.getItem('suppliersList');
        const suppliers = suppliersList ? JSON.parse(suppliersList) : [];
        
        const foundSupplier = suppliers.find(supplier => {
            const val = normalize(supplier.value || '');
            const name = normalize(supplier.name || '');
            return (val && descNorm.includes(val)) || (name && descNorm.includes(name));
        });

        if (foundSupplier) {
            return {
                fullName: foundSupplier.name,
                displayName: foundSupplier.value || foundSupplier.name
            };
        }
        return { fullName: 'Прочие поставщики', displayName: 'Прочие' };
    }

    getPreviousMonthTransactions() {
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfLastMonth = new Date(startOfThisMonth.getTime() - 1);
        const startOfLastMonth = new Date(endOfLastMonth.getFullYear(), endOfLastMonth.getMonth(), 1);

        return this.transactions.filter(t => {
            const date = new Date(t.date);
            return date >= startOfLastMonth && date <= endOfLastMonth;
        });
    }

    // Вспомогательные методы
    formatAmount(amount) {
        return new Intl.NumberFormat('ru-RU').format(amount) + ' ₸';
    }

    getSupplierName(description) {
        const supplierInfo = this.getSupplierInfo(description);
        return supplierInfo.fullName;
    }

    getCategory(description) {
        const descNorm = this.normalize(description);

        // Проверка по списку поставщиков
        const suppliersList = localStorage.getItem('suppliersList');
        const suppliers = suppliersList ? JSON.parse(suppliersList) : [];
        const isSupplier = suppliers.some(supplier => {
            const val = this.normalize(supplier.value || '');
            const name = this.normalize(supplier.name || '');
            return (val && descNorm.includes(val)) || (name && descNorm.includes(name));
        });
        if (isSupplier) {
            return 'Счет на оплату';
        }

        // ПРОВЕРКА НА ЕРЛАН - ВСЕ РАСХОДЫ С ЕРЛАН = ДОЛГ
        if (descNorm.includes('ерлан')) {
            return 'Долг';
        }

        // Проверка на долг (включая Ига)
        if (descNorm.includes('долг') || 
            descNorm.includes('кредо') || 
            descNorm.includes('займ') || 
            descNorm.includes('в долг') ||
            descNorm.includes('талгат') ||
            descNorm.includes('д талгат') ||
            descNorm.includes('ерзат') ||
            descNorm.includes('гульназ') ||
            descNorm.includes('енлик') ||
            (descNorm.includes('ига') && (descNorm.includes('долг') || descNorm.includes('кредо') || descNorm.includes('займ')))) {
            return 'Долг';
        }

        if (/(зарплата|аванс)/.test(descNorm)) {
            return 'Зарплата';
        }
        if (/(смена|выручка)/.test(descNorm)) {
            return 'Смена';
        }
        if (/(счет|оплата|базар|магазин|доставка|полиграфия)/.test(descNorm)) {
            return 'Счет на оплату';
        }
        return 'Прочее';
    }

    getCategoryColor(category, total) {
        if (category === 'Зарплата' || category === 'Счет на оплату' || category === 'Долг' || category === 'Прочее') {
            return 'negative';
        } else if (category === 'Смена') {
            return 'positive';
        }
        return total > 0 ? 'positive' : 'negative';
    }

    getCategorySign(category, total) {
        if (category === 'Зарплата' || category === 'Счет на оплату' || category === 'Долг' || category === 'Прочее') {
            return '-';
        } else if (category === 'Смена') {
            return '+';
        }
        return total > 0 ? '+' : '-';
    }
}

// Инициализация при загрузке страницы
// и автоматическое обновление при изменении списка поставщиков

document.addEventListener('DOMContentLoaded', () => {
    window.statsManager = new StatsManager();

    // Автоматическое обновление статистики при изменении списка поставщиков
    window.addEventListener('storage', (event) => {
        if (event.key === 'suppliersList') {
            // Перезагружаем данные и обновляем статистику
            if (window.statsManager) {
                window.statsManager.loadData();
            }
        }
    });

    setTimeout(() => {
        document.querySelectorAll('.expense-category').forEach(card => {
            card.style.background = '';
        });
    }, 200);
}); 

// flatpickr для выбора дат
window.addEventListener('DOMContentLoaded', function() {
    if (window.flatpickr) {
        flatpickr('#startDate', {
            dateFormat: 'Y-m-d',
            allowInput: true,
            locale: 'ru',
            disableMobile: true
        });
        flatpickr('#endDate', {
            dateFormat: 'Y-m-d',
            allowInput: true,
            locale: 'ru',
            disableMobile: true
        });
    }
}); 