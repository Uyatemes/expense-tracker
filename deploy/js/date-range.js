document.addEventListener('DOMContentLoaded', () => {
    // Проверяем инициализацию ExpenseManager
    if (!window.expenseManager) {
        console.error('ExpenseManager not initialized!');
        return;
    }
    
    const dateRangeButton = document.getElementById('dateRangeButton');
    const dateRangeModal = document.getElementById('dateRangeModal');
    const dateRangeText = document.getElementById('dateRangeText');
    const cancelButton = document.getElementById('cancelDateRange');
    const applyButton = document.getElementById('applyDateRange');
    const customDateRange = document.getElementById('customDateRange');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    let customStartDate = new Date();
    let customEndDate = new Date();
    customStartDate.setDate(customEndDate.getDate() - 7);

    // Форматирование даты
    function formatDate(date) {
        const options = { day: 'numeric', month: 'long' };
        return date.toLocaleDateString('ru-RU', options);
    }

    // Форматирование даты для input type="date"
    function formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }

    // Обновление текста с датами
    function updateDateRangeText(startDate, endDate) {
        dateRangeText.textContent = `${formatDate(startDate)} - ${formatDate(endDate)}`;
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
            return {
                startDate: new Date(startDateInput.value),
                endDate: new Date(endDateInput.value)
            };
        }
        
        return { startDate, endDate };
    }

    // Установка начального периода
    const initialRange = getDateRange('week');
    updateDateRangeText(initialRange.startDate, initialRange.endDate);
    window.expenseManager.setDateFilter(initialRange.startDate, initialRange.endDate);

    // Установка начальных значений для календарей
    startDateInput.value = formatDateForInput(customStartDate);
    endDateInput.value = formatDateForInput(customEndDate);

    // Обработчик изменения типа периода
    document.querySelectorAll('input[name="period"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            customDateRange.style.display = e.target.value === 'custom' ? 'block' : 'none';
            
            if (e.target.value !== 'custom') {
                const { startDate, endDate } = getDateRange(e.target.value);
                startDateInput.value = formatDateForInput(startDate);
                endDateInput.value = formatDateForInput(endDate);
            }
        });
    });

    // Открытие модального окна
    dateRangeButton.addEventListener('click', () => {
        dateRangeModal.classList.add('active');
        console.log('Modal opened');
    });

    // Закрытие по кнопке отмены
    cancelButton.addEventListener('click', () => {
        dateRangeModal.classList.remove('active');
        console.log('Modal closed by cancel');
    });

    applyButton.addEventListener('click', () => {
        const selectedPeriod = document.querySelector('input[name="period"]:checked').value;
        const { startDate, endDate } = getDateRange(selectedPeriod);
        
        updateDateRangeText(startDate, endDate);
        window.expenseManager.setDateFilter(startDate, endDate);
        dateRangeModal.classList.remove('active');
    });

    // Закрытие по клику вне окна
    dateRangeModal.addEventListener('click', (e) => {
        if (e.target === dateRangeModal) {
            dateRangeModal.classList.remove('active');
            console.log('Modal closed by outside click');
        }
    });
}); 