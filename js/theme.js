document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;
    
    if (themeToggle) {
        // Устанавливаем начальное состояние переключателя
        const currentTheme = localStorage.getItem('theme') || 'light';
        html.setAttribute('data-theme', currentTheme);
        themeToggle.checked = currentTheme === 'dark';
        
        // Обработчик изменения темы
        themeToggle.addEventListener('change', function() {
            const newTheme = this.checked ? 'dark' : 'light';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            // Обновляем текст и описание
            const title = this.closest('.settings-item').querySelector('.settings-title');
            const subtitle = this.closest('.settings-item').querySelector('.settings-subtitle');
            
            if (title) {
                title.textContent = newTheme === 'dark' ? 'Тёмная тема' : 'Светлая тема';
            }
            if (subtitle) {
                subtitle.textContent = newTheme === 'dark' ? 
                    'Тёмное оформление включено' : 
                    'Светлое оформление включено';
            }
        });
    }
}); 