document.addEventListener('DOMContentLoaded', () => {
    const themeToggleFab = document.querySelector('.fab');
    
    // Функция применения темы
    function applyTheme(theme) {
        // Принудительно устанавливаем цветовую схему
        document.documentElement.style.colorScheme = theme;
        // Устанавливаем data-theme атрибут
        document.documentElement.setAttribute('data-theme', theme);
        // Сохраняем в localStorage
        localStorage.setItem('theme', theme);
        // Обновляем класс для FAB
        themeToggleFab?.classList.toggle('dark', theme === 'dark');
        console.log('Theme applied:', theme);
    }
    
    // Получаем сохраненную тему или используем светлую по умолчанию
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    
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