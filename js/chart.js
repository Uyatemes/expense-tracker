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
            categories[t.category] = (categories[t.category] || 0) + t.amount;
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
                    '#9966FF',
                    '#FF9F40'
                ]
            }]
        }
    });
}

function updateBalanceChart() {
    const ctx = document.getElementById('balanceChart');
    if (balanceChart) {
        balanceChart.destroy();
    }

    const transactions = window.expenseManager.getTransactions();
    const monthlyData = {};
    
    transactions.forEach(t => {
        const month = t.date.substring(0, 7);
        const amount = t.type === 'расход' ? -t.amount : t.amount;
        monthlyData[month] = (monthlyData[month] || 0) + amount;
    });

    const months = Object.keys(monthlyData).sort();
    const data = months.map(m => monthlyData[m]);

    balanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Баланс',
                data: data,
                backgroundColor: '#36A2EB'
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', updateCharts); 