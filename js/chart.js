// Глобальные переменные для хранения экземпляров графиков
let categoryChart = null;
let balanceChart = null;

function updateCharts() {
    updateCategoryChart();
    updateBalanceChart();
}

function updateCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (categoryChart) {
        categoryChart.destroy();
    }

    const transactions = window.expenseManager.getTransactions();
    const categories = {};
    
    transactions.forEach(t => {
        if (t.type === 'расход') {
            const category = t.category || 'Другое';
            categories[category] = (categories[category] || 0) + t.amount;
        }
    });

    categoryChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF'
                ]
            }]
        },
        options: {
            responsive: true
        }
    });
}

function updateBalanceChart() {
    const ctx = document.getElementById('balanceChart');
    if (balanceChart) {
        balanceChart.destroy();
    }

    const transactions = window.expenseManager.getTransactions();
    const monthly = {};
    
    transactions.forEach(t => {
        const month = t.date.substring(0, 7);
        const amount = t.type === 'расход' ? -t.amount : t.amount;
        monthly[month] = (monthly[month] || 0) + amount;
    });

    balanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(monthly),
            datasets: [{
                label: 'Баланс по месяцам',
                data: Object.values(monthly),
                backgroundColor: '#36A2EB'
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