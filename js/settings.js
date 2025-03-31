document.addEventListener('DOMContentLoaded', function() {
    // Инициализация Firebase Auth
    const auth = firebase.auth();
    const authButton = document.getElementById('authButton');
    const authButtonText = document.getElementById('authButtonText');

    // Показываем загрузку при авторизации
    auth.onAuthStateChanged(function(user) {
        window.loaderManager.show();
        try {
            if (user) {
                authButtonText.textContent = 'Выйти';
                authButton.onclick = () => auth.signOut();
            } else {
                authButtonText.textContent = 'Войти';
                authButton.onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
            }
        } finally {
            window.loaderManager.hide();
        }
    });

    // Обработка переключения темы
    const themeToggle = document.querySelector('.theme-toggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = localStorage.getItem('theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        // Сохраняем новую тему
        localStorage.setItem('theme', newTheme);
        
        // Создаем событие storage для синхронизации
        const event = new StorageEvent('storage', {
            key: 'theme',
            newValue: newTheme,
            url: window.location.href
        });
        window.dispatchEvent(event);
    });
}); 