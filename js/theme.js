document.addEventListener('DOMContentLoaded', () => {
    const themeToggleFab = document.querySelector('.fab');
    
    // Функция применения темы
    function applyTheme(theme) {
        document.documentElement.style.colorScheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        console.log('Theme applied:', theme);
    }
    
    // Получаем сохраненную тему или используем светлую по умолчанию
    const savedTheme = localStorage.getItem('theme');
    const initialTheme = savedTheme || 'light';
    applyTheme(initialTheme);
    
    // Обработчик клика по FAB
    if (themeToggleFab) {
        // Устанавливаем начальное состояние класса
        themeToggleFab.classList.toggle('dark', initialTheme === 'dark');
        
        themeToggleFab.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            applyTheme(newTheme);
            // Добавляем класс для анимации
            themeToggleFab.classList.toggle('dark', newTheme === 'dark');
            console.log('Theme toggled to:', newTheme);
        });
    }
}); 