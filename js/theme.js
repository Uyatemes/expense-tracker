document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    
    // Функция для применения темы
    function applyTheme(theme) {
        console.log('Applying theme:', theme);
        console.log('Previous theme was:', document.documentElement.getAttribute('data-theme'));
        
        // Принудительно применяем тему, игнорируя системные настройки
        document.documentElement.style.colorScheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        console.log('New theme applied:', document.documentElement.getAttribute('data-theme'));
        console.log('LocalStorage theme:', localStorage.getItem('theme'));
    }
    
    // Проверяем начальное состояние
    console.log('Initial localStorage theme:', localStorage.getItem('theme'));
    
    // Всегда начинаем со светлой темы, если нет сохраненной
    const savedTheme = localStorage.getItem('theme');
    const initialTheme = savedTheme || 'light';
    
    console.log('Setting initial theme to:', initialTheme);
    
    // Применяем начальную тему
    applyTheme(initialTheme);
    
    // Находим кнопку переключения темы
    const themeToggleFab = document.querySelector('.fab');
    console.log('Found FAB button:', themeToggleFab);
    
    // Обработчик клика по FAB
    if (themeToggleFab) {
        console.log('Adding click listener to FAB');
        // Устанавливаем начальное состояние класса
        themeToggleFab.classList.toggle('dark', initialTheme === 'dark');
        
        themeToggleFab.addEventListener('click', () => {
            console.log('FAB clicked!');
            const currentTheme = document.documentElement.getAttribute('data-theme');
            console.log('Current theme before toggle:', currentTheme);
            
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            applyTheme(newTheme);
            
            // Добавляем класс для анимации
            themeToggleFab.classList.toggle('dark', newTheme === 'dark');
            console.log('Theme toggled to:', newTheme);
        });
    }
}); 