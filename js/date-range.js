document.addEventListener('DOMContentLoaded', () => {
    // Принудительно устанавливаем светлую тему
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');

    const dateRangeButton = document.getElementById('dateRangeButton');
    const dateRangeModal = document.getElementById('dateRangeModal');
    const dateRangeText = document.getElementById('dateRangeText');
    const cancelButton = document.getElementById('cancelDateRange');
    const applyButton = document.getElementById('applyDateRange');
    const customDateRange = document.getElementById('customDateRange');
    const customDateButton = document.getElementById('customDateButton');
    const customDateText = document.getElementById('customDateText');

    let customStartDate = new Date();
    let customEndDate = new Date();
    customStartDate.setDate(customEndDate.getDate() - 7);

    // Форматирование даты
    function formatDate(date) {
        const options = { day: 'numeric', month: 'long' };
        return date.toLocaleDateString('ru-RU', options);
    }

    // Обновление текста с датами
    function updateDateRangeText(startDate, endDate) {
        dateRangeText.textContent = `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }

    function updateCustomDateText() {
        customDateText.textContent = `${formatDate(customStartDate)} - ${formatDate(customEndDate)}`;
    }

    // Получение дат для периода
    function getDateRange(period) {
        const endDate = new Date();
        const startDate = new Date();
        
        if (period === 'week') {
            startDate.setDate(endDate.getDate() - 7);
        } else if (period === 'month') {
            startDate.setMonth(endDate.getMonth() - 1);
        } else if (period === 'custom') {
            startDate.setDate(endDate.getDate() - 7); // Пока используем неделю
        }
        
        return { startDate, endDate };
    }

    // Установка начального периода
    const initialRange = getDateRange('week');
    updateDateRangeText(initialRange.startDate, initialRange.endDate);
    window.expenseManager.setDateFilter(initialRange.startDate, initialRange.endDate);
    updateCustomDateText();

    // Обработчики событий
    dateRangeButton.addEventListener('click', () => {
        dateRangeModal.classList.add('active');
    });

    cancelButton.addEventListener('click', () => {
        dateRangeModal.classList.remove('active');
    });

    applyButton.addEventListener('click', () => {
        const selectedPeriod = document.querySelector('input[name="period"]:checked').value;
        const { startDate, endDate } = getDateRange(selectedPeriod);
        
        updateDateRangeText(startDate, endDate);
        window.expenseManager.setDateFilter(startDate, endDate);
        dateRangeModal.classList.remove('active');
    });

    // Закрытие по клику вне модального окна
    dateRangeModal.addEventListener('click', (e) => {
        if (e.target === dateRangeModal) {
            dateRangeModal.classList.remove('active');
        }
    });

    // Обработчик изменения типа периода
    document.querySelectorAll('input[name="period"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const customDateRange = document.getElementById('customDateRange');
            if (customDateRange) {
                customDateRange.style.display = e.target.value === 'custom' ? 'block' : 'none';
            }
        });
    });

    // Обработчик клика по кнопке выбора дат
    customDateButton.addEventListener('click', () => {
        // Создаем input type="date" для начальной даты
        const startInput = document.createElement('input');
        startInput.type = 'date';
        startInput.value = customStartDate.toISOString().split('T')[0];
        
        // Создаем input type="date" для конечной даты
        const endInput = document.createElement('input');
        endInput.type = 'date';
        endInput.value = customEndDate.toISOString().split('T')[0];

        // Последовательно показываем календари
        startInput.showPicker().then(() => {
            startInput.addEventListener('change', () => {
                customStartDate = new Date(startInput.value);
                endInput.showPicker().then(() => {
                    endInput.addEventListener('change', () => {
                        customEndDate = new Date(endInput.value);
                        updateCustomDateText();
                    });
                });
            });
        });
    });
}); 