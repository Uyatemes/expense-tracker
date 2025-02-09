document.addEventListener('DOMContentLoaded', () => {
    // Принудительно устанавливаем светлую тему
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');

    const dateRangeButton = document.getElementById('dateRangeButton');
    const dateRangeModal = document.getElementById('dateRangeModal');
    const dateRangeText = document.getElementById('dateRangeText');
    const cancelButton = document.getElementById('cancelDateRange');
    const applyButton = document.getElementById('applyDateRange');

    let customStartDate = new Date();
    let customEndDate = new Date();

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
        } else if (period === 'custom') {
            return {
                startDate: customStartDate,
                endDate: customEndDate
            };
        }
        
        return { startDate, endDate };
    }

    // Показ календаря для выбора даты
    async function showDatePicker(isStartDate) {
        const input = document.createElement('input');
        input.type = 'date';
        input.style.position = 'absolute';
        input.style.opacity = '0';
        document.body.appendChild(input);

        try {
            await input.showPicker();
            
            return new Promise((resolve) => {
                input.addEventListener('change', () => {
                    const selectedDate = new Date(input.value);
                    document.body.removeChild(input);
                    resolve(selectedDate);
                });

                input.addEventListener('cancel', () => {
                    document.body.removeChild(input);
                    resolve(null);
                });
            });
        } catch (e) {
            document.body.removeChild(input);
            return null;
        }
    }

    // Установка начального периода
    const initialRange = getDateRange('week');
    updateDateRangeText(initialRange.startDate, initialRange.endDate);
    window.expenseManager.setDateFilter(initialRange.startDate, initialRange.endDate);

    // Обработчик изменения типа периода
    document.querySelectorAll('input[name="period"]').forEach(radio => {
        radio.addEventListener('change', async (e) => {
            if (e.target.value === 'custom') {
                // Показываем календарь для начальной даты
                const startDate = await showDatePicker(true);
                if (startDate) {
                    customStartDate = startDate;
                    // Показываем календарь для конечной даты
                    const endDate = await showDatePicker(false);
                    if (endDate) {
                        customEndDate = endDate;
                    }
                }
            }
        });
    });

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