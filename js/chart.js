document.addEventListener('DOMContentLoaded', () => {
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
        new Chart(ctx, {
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
                responsive: true,
                title: {
                    display: true,
                    text: 'Расходы по категориям'
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
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(monthly),
                datasets: [{
                    label: 'Расходы по месяцам',
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
    updateCharts();

    // Делаем функцию updateCharts доступной глобально
    window.updateCharts = updateCharts;
}); 