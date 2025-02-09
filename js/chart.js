let categoryChart = null;
let monthlyChart = null;

function updateCharts() {
    updateCategoryChart();
    updateMonthlyChart();
}

function updateCategoryChart() {
    const transactions = window.expenseManager.getTransactions();
    const categories = {};
    
    transactions.forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    // Уничтожаем старый график перед созданием нового
    if (categoryChart) {
        categoryChart.destroy();
    }

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
        const month = t.date.substring(0, 7); // YYYY-MM
        monthly[month] = (monthly[month] || 0) + t.amount;
    });

    const ctx = document.getElementById('monthlyChart').getContext('2d');
    
    // Уничтожаем старый график перед созданием нового
    if (monthlyChart) {
        monthlyChart.destroy();
    }

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
document.addEventListener('DOMContentLoaded', updateCharts);

// Делаем функцию updateCharts доступной глобально
window.updateCharts = updateCharts; 