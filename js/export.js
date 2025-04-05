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
        const { totalIncome, totalExpense } = this.calculateTotals(transactions);
        const dateRange = this.formatDateRange();
        const [startStr, endStr] = dateRange.split(' - ');

        // Сортируем транзакции по дате (от новых к старым)
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        return `
            <div class="pdf-container" style="font-family: Arial, sans-serif; padding: 20px; color: #000;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                    <div>
                        <h1 style="font-size: 24px; margin: 0 0 10px 0; color: #000;">ВЫПИСКА</h1>
                        <div style="font-size: 14px; color: #666;">по счету за период ${startStr}</div>
                    </div>
                    <div style="text-align: right;">
                        <svg class="app-logo" width="64" height="64" viewBox="0 0 685 321" style="fill: #808080;">
                            <g>
                                <path class="cls-1" d="m342.5,0C153.35,0,0,71.86,0,160.5s153.35,160.5,342.5,160.5,342.5-71.86,342.5-160.5S531.66,0,342.5,0Zm212.11,100.57c22.28,4.46,42.22,9.62,59.16,15.29,7.63,14.56,11.48,29.68,11.48,45.11,0,13.74-3.05,27.24-9.1,40.31-16.91,5.79-36.94,11.08-59.4,15.64,8.09-17.42,12.5-36.27,12.5-55.95,0-21.37-5.2-41.76-14.64-60.4Zm69.46,18.93c6.89,2.58,13.18,5.26,18.81,8.01,20.87,10.2,32.37,21.37,32.37,31.46s-11.11,20.88-31.28,30.93c-5.27,2.62-11.15,5.19-17.59,7.66,4.49-11.75,6.87-24,6.87-36.59,0-14.6-3.39-28.52-9.18-41.47Zm-34.58-64.91c27.59,14.24,49.16,30.71,64.13,48.98,9.59,11.7,16.16,23.81,19.66,36.18-10.18-10.71-28.68-20.63-53.73-29.33-10.13-18.41-24.95-34.55-41.26-47.45-20.26-16.03-43.24-27.36-66.88-37.44,26.5,4.6,54.21,16.74,78.08,29.06Zm-118.87-33.76c30.56,7.89,57.95,19.15,81.43,33.48,23.2,14.15,41.35,30.55,53.96,48.74.86,1.24,1.69,2.49,2.49,3.74-17.04-5.29-36.61-10.06-58.26-14.19-18.62-31.69-49.79-57.7-88.37-73.9,2.93.68,5.85,1.38,8.75,2.13Zm-135.58,159.33l-28.81-24.49h67.41c34.17,0,51.27-12.19,51.27-36.58s-17.1-35.14-51.27-35.14h-77.49v174.27h-42.06V56.58h119.55c31.1,0,54.77,5.29,71,15.85,16.23,10.56,24.34,25.83,24.34,45.8s-7.3,33.99-21.89,44.36c-14.6,10.37-36.01,16.13-64.24,17.28l92.47,78.35h-48.4l-91.88-78.06Zm126.83,123.08c40.38-16.96,72.65-44.66,90.9-78.38,21.93-4.28,41.67-9.2,58.75-14.67-1.68,2.93-3.52,5.83-5.51,8.7-12.61,18.19-30.76,34.59-53.96,48.74-23.48,14.33-50.87,25.59-81.43,33.48-2.9.75-5.82,1.45-8.75,2.13Zm191.75-84.87c-14.97,18.27-36.54,34.74-64.13,48.98-23.32,12.04-49.89,21.91-79.17,29.47,53.46-20.57,93.93-52.56,112.2-90.36,24.66-8.83,42.63-18.89,52.1-29.74-2.97,14.28-10,28.23-21,41.65Z"/>
                            </g>
                        </svg>
                    </div>
                </div>

                <div style="margin-bottom: 30px; background-color: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <div style="font-size: 14px; display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>Поступления:</span>
                        <span style="color: #188038;">+${this.formatAmount(totalIncome)} ₸</span>
                    </div>
                    <div style="font-size: 14px; display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>Расходы:</span>
                        <span style="color: #d93025;">-${this.formatAmount(totalExpense)} ₸</span>
                    </div>
                </div>

                <div style="margin-bottom: 30px;">
                    <div style="font-size: 16px; font-weight: 500; margin-bottom: 15px; color: #202124;">Сводка по категориям:</div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="border-bottom: 2px solid #e0e0e0;">
                                <th style="text-align: left; padding: 12px 8px; color: #5f6368; font-weight: 500;">Категория</th>
                                <th style="text-align: right; padding: 12px 8px; color: #5f6368; font-weight: 500;">Сумма</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateCategorySummary(transactions)}
                        </tbody>
                    </table>
                </div>

                <div style="margin-bottom: 20px;">
                    <div style="font-size: 16px; font-weight: 500; margin-bottom: 15px; color: #202124;">История операций по карте:</div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="border-bottom: 2px solid #e0e0e0;">
                                <th style="text-align: left; padding: 12px 8px; color: #5f6368; font-weight: 500;">Дата</th>
                                <th style="text-align: left; padding: 12px 8px; color: #5f6368; font-weight: 500;">Операция</th>
                                <th style="text-align: left; padding: 12px 8px; color: #5f6368; font-weight: 500;">Детали</th>
                                <th style="text-align: right; padding: 12px 8px; color: #5f6368; font-weight: 500;">Сумма</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactions.map(t => {
                                const date = new Date(t.date).toLocaleDateString('ru-RU');
                                const amount = this.formatAmount(Math.abs(t.amount));
                                const operation = t.type === 'income' ? 'Пополнение' : 'Покупка';
                                const category = this.categorizeDescription(t.description);
                                return `
                                    <tr style="border-bottom: 1px solid #e0e0e0;">
                                        <td style="padding: 12px 8px; color: #202124;">${date}</td>
                                        <td style="padding: 12px 8px; color: #202124;">${operation}</td>
                                        <td style="padding: 12px 8px;">
                                            <div style="color: #202124;">${t.description}</div>
                                            <div style="font-size: 12px; color: #5f6368; margin-top: 4px;">${category}</div>
                                        </td>
                                        <td style="text-align: right; padding: 12px 8px; color: ${t.type === 'income' ? '#188038' : '#d93025'};">
                                            ${t.type === 'income' ? '+' : '-'} ${amount} ₸
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="margin-top: 30px; text-align: right; font-size: 12px; color: #5f6368;">
                    Отчет сформирован: ${new Date().toLocaleString('ru-RU')}
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

        return sortedCategories.map(([category, data]) => `
            <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px 8px; color: #202124;">
                    <div style="font-weight: 500;">${category}</div>
                    <div style="font-size: 12px; color: #5f6368; margin-top: 4px;">
                        ${[...new Set(data.transactions)].join(', ')}
                    </div>
                </td>
                <td style="text-align: right; padding: 12px 8px; color: #202124; font-weight: 500; white-space: nowrap;">
                    ${this.formatAmount(data.total)} ₸
                </td>
            </tr>
        `).join('');
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
            ? new Date(this.dateFilters.from).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            })
            : '';
        return startDate;
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