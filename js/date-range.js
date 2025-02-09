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
    const customDateFrom = document.getElementById('customDateFrom');
    const customDateTo = document.getElementById('customDateTo');

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
                startDate: new Date(customDateFrom.value),
                endDate: new Date(customDateTo.value)
            };
        }
        
        return { startDate, endDate };
    }

    // Установка начального периода
    const initialRange = getDateRange('week');
    updateDateRangeText(initialRange.startDate, initialRange.endDate);
    window.expenseManager.setDateFilter(initialRange.startDate, initialRange.endDate);

    // Обработчик изменения типа периода
    document.querySelectorAll('input[name="period"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            customDateRange.style.display = e.target.value === 'custom' ? 'block' : 'none';
            
            if (e.target.value !== 'custom') {
                const { startDate, endDate } = getDateRange(e.target.value);
                customDateFrom.value = formatDateForInput(startDate);
                customDateTo.value = formatDateForInput(endDate);
            }
        });
    });

    // Установка текущей даты для кастомного периода
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    customDateFrom.value = formatDateForInput(weekAgo);
    customDateTo.value = formatDateForInput(today);

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
}); 