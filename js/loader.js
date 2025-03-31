class LoaderManager {
    constructor() {
        this.createLoader();
        this.initializePageTransitions();
    }

    createLoader() {
        // Создаем элемент загрузки
        const loader = document.createElement('div');
        loader.className = 'loader-container';
        loader.innerHTML = '<div class="loader"></div>';
        document.body.appendChild(loader);
        
        // Создаем элемент для анимации перехода
        const transition = document.createElement('div');
        transition.className = 'page-transition';
        document.body.appendChild(transition);
        
        this.loaderElement = loader;
        this.transitionElement = transition;
    }

    show() {
        this.loaderElement.classList.remove('hide');
    }

    hide() {
        this.loaderElement.classList.add('hide');
    }

    initializePageTransitions() {
        // Обрабатываем все ссылки на странице
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href && !link.target && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                this.transitionTo(link.href);
            }
        });
    }

    async transitionTo(url) {
        this.transitionElement.classList.add('show');
        
        // Ждем завершения анимации
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Переходим на новую страницу
        window.location.href = url;
    }
}

// Создаем глобальный экземпляр
window.loaderManager = new LoaderManager();

// Показываем загрузку при старте страницы
document.addEventListener('DOMContentLoaded', () => {
    // Скрываем загрузку после загрузки всего контента
    window.addEventListener('load', () => {
        window.loaderManager.hide();
    });
}); 