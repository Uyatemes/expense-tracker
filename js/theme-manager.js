class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'light';
        this.applyTheme();
        this.initializeListener();
    }

    applyTheme() {
        if (!document.documentElement) {
            console.warn('DOM не готов для применения темы');
            return;
        }
        
        document.documentElement.setAttribute('data-theme', this.theme);
        localStorage.setItem('theme', this.theme);
        console.log('Применена тема:', this.theme);
    }

    initializeListener() {
        // Слушаем изменения темы в localStorage
        window.addEventListener('storage', (e) => {
            if (e.key === 'theme') {
                this.theme = e.newValue;
                this.applyTheme();
            }
        });
    }
}

// Создаем глобальный экземпляр
window.themeManager = new ThemeManager(); 