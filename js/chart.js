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
        const data = {
            'Доходы': transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0),
            'Расходы': transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0)
        };

        categoryChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Доходы', 'Расходы'],
                datasets: [{
                    data: [data['Доходы'], data['Расходы']],
                    backgroundColor: [
                        '#00A76D',  // зеленый для доходов
                        '#F14635'   // красный для расходов
                    ],
                    borderWidth: 0  // убираем границы
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#333'  // цвет текста легенды
                        }
                    },
                    title: {
                        display: true,
                        text: 'Соотношение доходов и расходов',
                        color: '#333'  // цвет заголовка
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

class ChartManager {
    constructor() {
        this.pieChart = null;
        this.barChart = null;
        Chart.defaults.font.family = "'Google Sans', 'Roboto', sans-serif";
        Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-on-surface');
    }

    updateCharts(transactions) {
        const ctx1 = document.getElementById('pieChart');
        const ctx2 = document.getElementById('barChart');
        
        if (!ctx1 || !ctx2) return;

        // Получаем цвета из CSS переменных
        const style = getComputedStyle(document.documentElement);
        const colors = {
            primary: style.getPropertyValue('--md-sys-color-primary-container'),
            onPrimary: style.getPropertyValue('--md-sys-color-on-primary-container'),
            error: style.getPropertyValue('--md-sys-color-error-container'),
            onError: style.getPropertyValue('--md-sys-color-on-error-container'),
            surface: style.getPropertyValue('--md-sys-color-surface-container'),
            onSurface: style.getPropertyValue('--md-sys-color-on-surface')
        };

        // Группировка транзакций
        const incomeTotal = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const expenseTotal = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        // Настройки для круговой диаграммы
        const pieData = {
            labels: ['Доходы', 'Расходы'],
            datasets: [{
                data: [incomeTotal, expenseTotal],
                backgroundColor: [colors.primary, colors.error],
                borderColor: [colors.onPrimary, colors.onError],
                borderWidth: 2,
                borderRadius: 8,
                spacing: 4,
                hoverOffset: 4
            }]
        };

        const pieOptions = {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            cutout: '60%',
            animation: {
                animateScale: true,
                animateRotate: true
            }
        };

        // Группировка по датам для столбчатой диаграммы
        const dailyData = {};
        transactions.forEach(t => {
            const date = new Date(t.date).toLocaleDateString();
            if (!dailyData[date]) {
                dailyData[date] = { income: 0, expense: 0 };
            }
            if (t.type === 'income') {
                dailyData[date].income += t.amount;
            } else {
                dailyData[date].expense += Math.abs(t.amount);
            }
        });

        const barData = {
            labels: Object.keys(dailyData),
            datasets: [
                {
                    label: 'Доходы',
                    data: Object.values(dailyData).map(d => d.income),
                    backgroundColor: colors.primary,
                    borderColor: colors.onPrimary,
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
                },
                {
                    label: 'Расходы',
                    data: Object.values(dailyData).map(d => d.expense),
                    backgroundColor: colors.error,
                    borderColor: colors.onError,
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
                }
            ]
        };

        const barOptions = {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 0
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: colors.onSurface + '20' // 20% opacity
                    }
                }
            },
            animation: {
                duration: 500
            }
        };

        // Обновление диаграмм
        if (this.pieChart) {
            this.pieChart.destroy();
        }
        if (this.barChart) {
            this.barChart.destroy();
        }

        this.pieChart = new Chart(ctx1, {
            type: 'doughnut',
            data: pieData,
            options: pieOptions
        });

        this.barChart = new Chart(ctx2, {
            type: 'bar',
            data: barData,
            options: barOptions
        });
    }
}

window.chartManager = new ChartManager(); 