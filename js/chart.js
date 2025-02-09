document.addEventListener('DOMContentLoaded', () => {
    let categoryChart = null;
    let monthlyChart = null;

    window.updateCharts = function() {
        updateCategoryChart();
        updateMonthlyChart();
    }

    function updateCategoryChart() {
        const ctx = document.getElementById('categoryChart')?.getContext('2d');
        if (!ctx) return;

        // Уничтожаем предыдущий график если он существует
        if (categoryChart) {
            categoryChart.destroy();
        }

        const transactions = window.expenseManager?.getTransactions() || [];
        
        // Группируем транзакции по типу (доход/расход)
        const data = transactions.reduce((acc, t) => {
            const type = t.type === 'income' ? 'Доходы' : 'Расходы';
            acc[type] = (acc[type] || 0) + Math.abs(t.amount);
            return acc;
        }, {});

        categoryChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    data: Object.values(data),
                    backgroundColor: [
                        '#2ecc71', // зеленый для доходов
                        '#e74c3c'  // красный для расходов
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Соотношение доходов и расходов'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw;
                                return `${label}: ${value.toLocaleString('ru-RU')} ₸`;
                            }
                        }
                    }
                }
            }
        });
    }

    function updateMonthlyChart() {
        const ctx = document.getElementById('monthlyChart')?.getContext('2d');
        if (!ctx) return;

        // Уничтожаем предыдущий график если он существует
        if (monthlyChart) {
            monthlyChart.destroy();
        }

        const transactions = window.expenseManager?.getTransactions() || [];

        // Группировка операций по месяцам
        const monthlyData = transactions.reduce((acc, t) => {
            const month = t.date.substring(0, 7);
            acc[month] = (acc[month] || 0) + t.amount;
            return acc;
        }, {});

        monthlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(monthlyData),
                datasets: [{
                    label: 'Баланс по месяцам',
                    data: Object.values(monthlyData),
                    borderColor: '#3498db',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Динамика баланса'
                    }
                }
            }
        });
    }

    // Инициализация графиков после загрузки страницы
    setTimeout(updateCharts, 100);
}); 