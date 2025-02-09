document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleFab = document.getElementById('themeToggleFab');
    
    // Проверяем сохраненную тему
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    console.log('Initial theme set to:', savedTheme);
    
    // Функция применения темы
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        console.log('Theme applied:', theme);
    }
    
    // Устанавливаем правильное состояние переключателя
    if (themeToggle) {
        themeToggle.checked = savedTheme === 'dark';
        
        themeToggle.addEventListener('change', () => {
            const newTheme = themeToggle.checked ? 'dark' : 'light';
            applyTheme(newTheme);
            console.log('Theme toggled to:', newTheme);
        });
    }

    // Слушаем изменения системной темы
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });

    // Обработчик клика по FAB
    if (themeToggleFab) {
        themeToggleFab.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            applyTheme(newTheme);
            console.log('Theme toggled to:', newTheme);
        });
    }
}); 