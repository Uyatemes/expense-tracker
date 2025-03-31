class ExportManager {
    constructor() {
        this.isExporting = false;
        this.transactions = [];
        
        // Устанавливаем начальные даты за последнюю неделю
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7); // Устанавливаем дату на неделю назад

        this.dateFilters = {
            from: startDate,
            to: endDate
        };

        // Инициализируем после загрузки DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        console.log('Инициализация ExportManager...');
        
        // Ждем инициализации ExpenseManager
        await this.waitForExpenseManager();
        
        // Получаем начальные транзакции
        if (window.expenseManager) {
            this.transactions = window.expenseManager.transactions || [];
            console.log('Получено транзакций:', this.transactions.length);
        }

        // Инициализируем UI
        this.initializeUI();
        this.initializeExportHandlers();
        
        // Обновляем текст периода
        const dateRangeText = document.getElementById('dateRangeText');
        if (dateRangeText) {
            dateRangeText.textContent = `${this.formatDate(this.dateFilters.from)} - ${this.formatDate(this.dateFilters.to)}`;
        }
        
        this.updateTransactionsList();
    }

    async waitForExpenseManager() {
        console.log('Ожидание инициализации ExpenseManager...');
        
        for (let i = 0; i < 20; i++) {
            if (window.expenseManager && window.expenseManager.transactions) {
                console.log('ExpenseManager найден');
                return true;
            }
            console.log('Попытка:', i + 1);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.warn('ExpenseManager не найден после всех попыток');
        return false;
    }

    initializeUI() {
        // Добавляем контейнер для информации о транзакциях
        const container = document.querySelector('.export-page-container');
        if (container) {
            const transactionsContainer = document.createElement('div');
            transactionsContainer.className = 'transactions-preview';
            transactionsContainer.innerHTML = `
                <div class="transactions-list" style="display: none;">
                    <h3>Информация о транзакциях</h3>
                    <div class="transactions-summary"></div>
                </div>
            `;
            container.appendChild(transactionsContainer);
        }
    }

    initializeExportHandlers() {
        const dateRangeButton = document.getElementById('dateRangeButton');
        const exportButton = document.getElementById('exportPDF');
        const dateRangeText = document.getElementById('dateRangeText');

        // Удаляем старые обработчики перед добавлением новых
        if (exportButton) {
            exportButton.replaceWith(exportButton.cloneNode(true));
            const newExportButton = document.getElementById('exportPDF');
            newExportButton.addEventListener('click', () => {
                this.exportToPDF();
            });
        }

        if (dateRangeButton) {
            dateRangeButton.replaceWith(dateRangeButton.cloneNode(true));
            const newDateRangeButton = document.getElementById('dateRangeButton');
            newDateRangeButton.addEventListener('click', () => {
                this.showDateRangeModal();
            });
        }

        // Устанавливаем начальный текст для диапазона дат
        if (dateRangeText) {
            const startDate = new Date();
            startDate.setDate(1);
            const endDate = new Date();
            dateRangeText.textContent = `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
        }
    }

    async exportToPDF() {
        // Проверяем, идет ли уже экспорт
        if (this.isExporting) {
            console.log('Экспорт уже выполняется, пропускаем...');
            return;
        }

        try {
            // Устанавливаем флаг экспорта
            this.isExporting = true;
            
            // Отключаем кнопку экспорта
            const exportButton = document.getElementById('exportPDF');
            if (exportButton) {
                exportButton.disabled = true;
                exportButton.style.opacity = '0.5';
            }

            const transactions = this.getFilteredTransactions();
            if (transactions.length === 0) {
                this.showNotification('Нет транзакций за выбранный период', 'warning');
                return;
            }

            // Показываем индикатор загрузки
            this.showNotification('Формирование PDF...', 'info');

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
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Создаем PDF с помощью html2pdf
            await html2pdf()
                .set(opt)
                .from(element)
                .save()
                .then(() => {
                    this.showNotification('PDF успешно создан', 'success');
                })
                .catch(error => {
                    console.error('Ошибка при создании PDF:', error);
                    this.showNotification('Ошибка при создании PDF', 'error');
                });

        } catch (error) {
            console.error('Ошибка при экспорте:', error);
            this.showNotification('Ошибка при создании PDF', 'error');
        } finally {
            // Сбрасываем флаг экспорта и возвращаем кнопку в активное состояние
            this.isExporting = false;
            const exportButton = document.getElementById('exportPDF');
            if (exportButton) {
                exportButton.disabled = false;
                exportButton.style.opacity = '1';
            }
        }
    }

    generatePDFContent() {
        const transactions = this.getFilteredTransactions();
        const totals = this.calculateTotals(transactions);

        const { totalIncome, totalExpense } = totals;
        const exportDateTime = new Date().toLocaleString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        return `
            <div class="pdf-container">
                <h1>Отчет по операциям</h1>
                <div class="period">Период: ${this.formatDateRange()}</div>

                <div class="totals">
                    <div class="income">Приход: +${this.formatAmount(totalIncome)} ₸</div>
                    <div class="expense">Расход: -${this.formatAmount(totalExpense)} ₸</div>
                </div>

                <h1>Сводка по категориям</h1>
                ${this.generateCategorySummary(transactions)}

                <h1>Детализация операций</h1>
                <table>
                    <tr>
                        <th>Дата</th>
                        <th>Описание</th>
                        <th>Сумма</th>
                    </tr>
                    ${this.generateTransactionDetails(transactions)}
                </table>

                <div style="text-align: right; font-size: 12px; color: #666;">
                    Отчет сформирован: ${exportDateTime}
                </div>
            </div>
        `;
    }

    generateCategorySummary(transactions) {
        // Группируем транзакции по категориям
        const categories = {};
        
        transactions.forEach(t => {
            const category = this.categorizeDescription(t.description);
            if (!categories[category]) {
                categories[category] = {
                    total: 0,
                    transactions: [] // Массив для хранения описаний транзакций
                };
            }
            categories[category].total += Math.abs(t.amount);
            categories[category].transactions.push(t.description);
        });

        // Сортируем категории по сумме
        const sortedCategories = Object.entries(categories)
            .sort(([, a], [, b]) => b.total - a.total);

        return `
            <table>
                <tr>
                    <th>Категория</th>
                    <th>Сумма</th>
                </tr>
                ${sortedCategories.map(([category, data]) => `
                    <tr>
                        <td>
                            <div class="category-name">${category}</div>
                            <div class="category-details">
                                ${[...new Set(data.transactions)].join(', ')}
                            </div>
                        </td>
                        <td class="amount">${this.formatAmount(data.total)} ₸</td>
                    </tr>
                `).join('')}
            </table>
        `;
    }

    generateTransactionDetails(transactions) {
        return transactions
            .map(t => {
                const date = new Date(t.date).toLocaleDateString('ru-RU');
                const amount = this.formatAmount(Math.abs(t.amount));
                const sign = t.amount > 0 ? '+' : '-';
                const colorClass = t.amount > 0 ? 'income' : 'expense';
                const category = this.categorizeDescription(t.description);
                
                return `
                    <tr>
                        <td>${date}</td>
                        <td>
                            <div class="transaction-description">
                                <div>${t.description}</div>
                                <div class="transaction-category">
                                    ${category}
                                </div>
                            </div>
                        </td>
                        <td class="amount ${colorClass}">${sign} ${amount} ₸</td>
                    </tr>
                `;
            })
            .join('');
    }

    calculateTotals(transactions) {
        return transactions.reduce(
            (totals, t) => {
                if (t.amount > 0) {
                    totals.totalIncome += Math.abs(t.amount);
                } else {
                    totals.totalExpense += Math.abs(t.amount);
                }
                return totals;
            },
            { totalIncome: 0, totalExpense: 0 }
        );
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

    formatAmount(amount) {
        return new Intl.NumberFormat('ru-RU').format(Math.abs(amount));
    }

    showDateRangeModal() {
        // Проверяем, нет ли уже открытой модалки
        const existingModal = document.querySelector('.date-range-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const dateRangeText = document.getElementById('dateRangeText');
        const startDate = new Date();
        startDate.setDate(1);
        const endDate = new Date();

        // Создаем модальное окно для выбора дат
        const modal = document.createElement('div');
        modal.className = 'date-range-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Выберите период</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="period-options">
                    <button class="period-option" data-period="week">
                        <span class="period-icon">📅</span>
                        <span class="period-text">За неделю</span>
                    </button>
                    <button class="period-option" data-period="month">
                        <span class="period-icon">📆</span>
                        <span class="period-text">За месяц</span>
                    </button>
                    <button class="period-option" data-period="custom">
                        <span class="period-icon">📊</span>
                        <span class="period-text">Произвольный период</span>
                    </button>
                </div>
                <div class="custom-date-inputs" style="display: none;">
                    <div class="input-group">
                        <label for="modalStartDate">Начальная дата</label>
                        <input type="date" id="modalStartDate" value="${startDate.toISOString().split('T')[0]}">
                    </div>
                    <div class="input-group">
                        <label for="modalEndDate">Конечная дата</label>
                        <input type="date" id="modalEndDate" value="${endDate.toISOString().split('T')[0]}">
                    </div>
                    <div class="modal-buttons">
                        <button class="cancel-btn">Отмена</button>
                        <button class="apply-btn">Применить</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Обработчики для кнопок периода
        const periodOptions = modal.querySelectorAll('.period-option');
        const customDateInputs = modal.querySelector('.custom-date-inputs');
        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = modal.querySelector('.cancel-btn');
        const applyBtn = modal.querySelector('.apply-btn');

        // Сохраняем this в переменную для использования внутри обработчиков
        const self = this;

        periodOptions.forEach(option => {
            option.addEventListener('click', () => {
                const period = option.dataset.period;
                let newStartDate, newEndDate;

                switch(period) {
                    case 'week':
                        newEndDate = new Date();
                        newStartDate = new Date();
                        newStartDate.setDate(newEndDate.getDate() - 7);
                        break;
                    case 'month':
                        newEndDate = new Date();
                        newStartDate = new Date();
                        newStartDate.setDate(1);
                        break;
                    case 'custom':
                        customDateInputs.style.display = 'block';
                        return;
                }

                if (newStartDate && newEndDate) {
                    self.dateFilters.from = newStartDate;
                    self.dateFilters.to = newEndDate;
                    dateRangeText.textContent = `${self.formatDate(newStartDate)} - ${self.formatDate(newEndDate)}`;
                    modal.remove();
                    
                    // Обновляем список транзакций после выбора периода
                    self.updateTransactionsList();
                }
            });
        });

        // Обновляем обработчик для произвольного периода
        applyBtn.addEventListener('click', () => {
            const modalStartDate = modal.querySelector('#modalStartDate');
            const modalEndDate = modal.querySelector('#modalEndDate');
            const newStartDate = new Date(modalStartDate.value);
            const newEndDate = new Date(modalEndDate.value);
            
            if (newStartDate > newEndDate) {
                self.showNotification('Начальная дата не может быть позже конечной', 'error');
                return;
            }

            self.dateFilters.from = newStartDate;
            self.dateFilters.to = newEndDate;
            dateRangeText.textContent = `${self.formatDate(newStartDate)} - ${self.formatDate(newEndDate)}`;
            modal.remove();
            // Обновляем список транзакций
            self.updateTransactionsList();
        });

        // Закрытие модального окна
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Показываем модальное окно с анимацией
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    formatDate(date) {
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(20px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    getFilteredTransactions() {
        console.log('Получение отфильтрованных транзакций...');
        
        // Используем локальную копию транзакций
        let transactions = this.transactions;
        
        // Пробуем получить свежие данные из ExpenseManager
        if (window.expenseManager && window.expenseManager.transactions) {
            transactions = window.expenseManager.transactions;
            this.transactions = transactions; // Обновляем локальную копию
        }

        if (!Array.isArray(transactions)) {
            console.warn('Транзакции не являются массивом');
            return [];
        }

        console.log('Всего транзакций до фильтрации:', transactions.length);

        // Фильтруем по датам
        const filtered = transactions.filter(t => {
            if (!t || !t.date) return false;

            const transactionDate = new Date(t.date);
            const startDate = this.dateFilters.from;
            const endDate = this.dateFilters.to;

            if (startDate && endDate) {
                const startDateTime = new Date(startDate);
                startDateTime.setHours(0, 0, 0, 0);
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                return transactionDate >= startDateTime && transactionDate <= endDateTime;
            }
            return true;
        });

        console.log('Отфильтрованных транзакций:', filtered.length);
        return filtered;
    }

    categorizeDescription(description) {
        // Используем метод категоризации из основного ExpenseManager
        if (window.expenseManager && window.expenseManager.categorizeDescription) {
            return window.expenseManager.categorizeDescription(description);
        }

        // Резервная категоризация, если метод недоступен
        const categories = {
            'продукты': ['продукты', 'еда', 'продуктовый', 'супермаркет'],
            'транспорт': ['транспорт', 'такси', 'метро', 'автобус'],
            'развлечения': ['развлечения', 'кино', 'театр', 'ресторан'],
            'коммунальные': ['коммунальные', 'квартплата', 'электричество', 'газ'],
            'здоровье': ['здоровье', 'лекарства', 'врач', 'аптека'],
            'образование': ['образование', 'курсы', 'учеба', 'школа'],
            'одежда': ['одежда', 'магазин', 'обувь'],
            'прочее': []
        };

        description = description.toLowerCase();
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => description.includes(keyword))) {
                return category;
            }
        }
        return 'прочее';
    }

    // Обновляем метод updateTransactionsList
    updateTransactionsList() {
        const transactions = this.getFilteredTransactions();
        const previewContainer = document.querySelector('.transactions-preview');
        
        if (!previewContainer) {
            console.error('Не найден контейнер .transactions-preview');
            return;
        }

        // Очищаем контейнер
        previewContainer.innerHTML = '';

        // Считаем общие суммы
        const totals = this.calculateTotals(transactions);

        // Добавляем только информацию о количестве и суммах
        previewContainer.innerHTML = `
            <div class="preview-content">
                <div class="transactions-summary">
                    <div class="summary-row">
                        <span>Всего транзакций:</span>
                        <span>${transactions.length}</span>
                    </div>
                    <div class="summary-row">
                        <span>Общий приход:</span>
                        <span class="income">+${this.formatAmount(totals.totalIncome)} ₸</span>
                    </div>
                    <div class="summary-row">
                        <span>Общий расход:</span>
                        <span class="expense">-${this.formatAmount(totals.totalExpense)} ₸</span>
                    </div>
                </div>
            </div>
        `;
    }
}

// Создаем экземпляр ExportManager только после загрузки скриптов
window.addEventListener('load', () => {
    console.log('Создание ExportManager...');
    window.exportManager = new ExportManager();
});