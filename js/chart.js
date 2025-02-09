// Глобальные переменные для хранения экземпляров графиков
let categoryChart = null;
let monthlyChart = null;

function destroyCharts() {
    if (categoryChart) {
        categoryChart.destroy();
        categoryChart = null;
    }
    if (monthlyChart) {
        monthlyChart.destroy();
        monthlyChart = null;
    }
}

function updateCharts() {
    destroyCharts();
    updateCategoryChart();
    updateMonthlyChart();
}

function updateCategoryChart() {
    const transactions = window.expenseManager.getTransactions();
    const categories = {};
    
    transactions.forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    categoryChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: [
                    '#3E2005',
                    '#5E3B1C',
                    '#7E5633',
                    '#9E714A',
                    '#BE8C61'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Расходы по категориям'
                }
            }
        }
    });
}

function updateMonthlyChart() {
    const transactions = window.expenseManager.getTransactions();
    const monthly = {};
    
    transactions.forEach(t => {
        const month = t.date.substring(0, 7);
        monthly[month] = (monthly[month] || 0) + t.amount;
    });

    const ctx = document.getElementById('monthlyChart');
    if (!ctx) return;

    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(monthly),
            datasets: [{
                label: 'Расходы по месяцам',
                data: Object.values(monthly),
                backgroundColor: '#3E2005'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(updateCharts, 100);
}); 