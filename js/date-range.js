document.addEventListener('DOMContentLoaded', () => {
    const dateRangeButton = document.getElementById('dateRangeButton');
    const dateRangeModal = document.getElementById('dateRangeModal');
    const dateRangeText = document.getElementById('dateRangeText');
    const cancelButton = document.getElementById('cancelDateRange');
    const applyButton = document.getElementById('applyDateRange');

    // Форматирование даты
    function formatDate(date) {
        const options = { day: 'numeric', month: 'long' };
        return date.toLocaleDateString('ru-RU', options);
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
        }
        
        return { startDate, endDate };
    }

    // Установка начального периода
    const initialRange = getDateRange('week');
    updateDateRangeText(initialRange.startDate, initialRange.endDate);
    window.expenseManager.setDateFilter(initialRange.startDate, initialRange.endDate);

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