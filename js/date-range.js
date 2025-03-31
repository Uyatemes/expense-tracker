document.addEventListener('DOMContentLoaded', () => {
    // Ждем инициализацию ExpenseManager
    const checkExpenseManager = setInterval(() => {
        if (window.expenseManager) {
            clearInterval(checkExpenseManager);
            initializeDateRange();
        }
    }, 100);
});

function initializeDateRange() {
    // Проверяем текущую страницу
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Получаем все необходимые элементы
    const elements = {
        startDate: document.getElementById('startDate'),
        endDate: document.getElementById('endDate'),
        applyFilter: document.getElementById('applyDateFilter'),
        resetFilter: document.getElementById('resetDateFilter'),
        dateRangeButton: document.getElementById('dateRangeButton'),
        dateRangeText: document.getElementById('dateRangeText')
    };

    // Проверяем наличие элементов перед добавлением обработчиков
    if (elements.dateRangeButton) {
        elements.dateRangeButton.addEventListener('click', () => {
            if (window.exportManager) {
                window.exportManager.showDateRangeModal();
            }
        });
    }

    // Обработчики для страницы index.html
    if (currentPage === 'index.html') {
        if (elements.startDate && elements.endDate) {
            if (elements.applyFilter) {
                elements.applyFilter.addEventListener('click', () => {
                    window.expenseManager.setDateFilter(
                        elements.startDate.value, 
                        elements.endDate.value
                    );
                });
            }

            if (elements.resetFilter) {
                elements.resetFilter.addEventListener('click', () => {
                    elements.startDate.value = '';
                    elements.endDate.value = '';
                    window.expenseManager.resetDateFilter();
                });
            }
        }
    }

    // Обработчики для страницы export.html
    if (currentPage === 'export.html') {
        if (elements.dateRangeText && window.exportManager) {
            const startDate = new Date();
            startDate.setDate(1);
            const endDate = new Date();
            elements.dateRangeText.textContent = 
                `${window.exportManager.formatDate(startDate)} - ${window.exportManager.formatDate(endDate)}`;
        }
    }
}

function initializeDateRangeModal() {
    const elements = {
        dateRangeButton: document.getElementById('dateRangeButton'),
        dateRangeModal: document.getElementById('dateRangeModal'),
        dateRangeText: document.getElementById('dateRangeText'),
        cancelButton: document.getElementById('cancelDateRange'),
        applyButton: document.getElementById('applyDateRange'),
        customDateRange: document.getElementById('customDateRange'),
        startDateInput: document.getElementById('startDate'),
        endDateInput: document.getElementById('endDate')
    };

    // Проверяем, есть ли необходимые элементы на странице
    if (!elements.dateRangeModal) {
        console.log('Модальное окно выбора дат не найдено на этой странице');
        return;
    }

    let customStartDate = new Date();
    let customEndDate = new Date();
    customStartDate.setDate(customEndDate.getDate() - 7);

    // Установка начальных значений для календарей
    if (elements.startDateInput && elements.endDateInput) {
        elements.startDateInput.value = formatDateForInput(customStartDate);
        elements.endDateInput.value = formatDateForInput(customEndDate);
    }

    // Обработчики для радио кнопок
    document.querySelectorAll('input[name="period"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (elements.customDateRange) {
                elements.customDateRange.style.display = e.target.value === 'custom' ? 'block' : 'none';
            }
            
            if (e.target.value !== 'custom' && elements.startDateInput && elements.endDateInput) {
                const { startDate, endDate } = getDateRange(e.target.value);
                elements.startDateInput.value = formatDateForInput(startDate);
                elements.endDateInput.value = formatDateForInput(endDate);
            }
        });
    });

    // Открытие модального окна
    if (elements.dateRangeButton && elements.dateRangeModal) {
        elements.dateRangeButton.addEventListener('click', () => {
            elements.dateRangeModal.classList.add('active');
        });
    }

    // Закрытие по кнопке отмены
    if (elements.cancelButton && elements.dateRangeModal) {
        elements.cancelButton.addEventListener('click', () => {
            elements.dateRangeModal.classList.remove('active');
        });
    }

    // Применение выбранного диапазона
    if (elements.applyButton && elements.dateRangeModal) {
        elements.applyButton.addEventListener('click', () => {
            const selectedPeriod = document.querySelector('input[name="period"]:checked')?.value || 'week';
            const { startDate, endDate } = getDateRange(selectedPeriod);
            
            updateDateRangeText(startDate, endDate);
            if (window.expenseManager) {
                window.expenseManager.setDateFilter(startDate, endDate);
            }
            elements.dateRangeModal.classList.remove('active');
        });
    }

    // Закрытие по клику вне окна
    if (elements.dateRangeModal) {
        elements.dateRangeModal.addEventListener('click', (e) => {
            if (e.target === elements.dateRangeModal) {
                elements.dateRangeModal.classList.remove('active');
            }
        });
    }
}

// Вызываем инициализацию модального окна после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    initializeDateRangeModal();
});

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
    const dateRangeText = document.getElementById('dateRangeText');
    if (!dateRangeText) {
        console.error('Элемент dateRangeText не найден');
        return;
    }
    
    const formatDate = (date) => {
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

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