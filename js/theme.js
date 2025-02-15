document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    
    // Функция для применения темы
    function applyTheme(theme) {
        // Принудительно применяем тему, игнорируя системные настройки
        document.documentElement.style.colorScheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        console.log('Theme applied:', theme);
    }
    
    // Всегда начинаем со светлой темы, если нет сохраненной
    const savedTheme = localStorage.getItem('theme');
    const initialTheme = savedTheme || 'light';
    
    // Применяем начальную тему
    applyTheme(initialTheme);
    
    // Находим кнопку переключения темы
    const themeToggleFab = document.querySelector('.fab');
    console.log('Found FAB button:', themeToggleFab); // Проверяем, нашлась ли кнопка
    
    // Обработчик клика по FAB
    if (themeToggleFab) {
        console.log('Adding click listener to FAB'); // Проверяем, добавляется ли обработчик
        // Устанавливаем начальное состояние класса
        themeToggleFab.classList.toggle('dark', initialTheme === 'dark');
        
        themeToggleFab.addEventListener('click', () => {
            console.log('FAB clicked!'); // Проверяем, срабатывает ли клик
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            applyTheme(newTheme);
            // Добавляем класс для анимации
            themeToggleFab.classList.toggle('dark', newTheme === 'dark');
            console.log('Theme toggled to:', newTheme);
        });
    }
}); 