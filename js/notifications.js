function showNotification(message, duration = 2000) {
    // Удаляем существующее уведомление, если оно есть
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    // Показываем уведомление с небольшой задержкой
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });

    // Скрываем и удаляем уведомление
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, duration);
}

// Добавляем обработчик для ссылки на статистику
document.addEventListener('DOMContentLoaded', () => {
    const statsLinks = document.querySelectorAll('.stats-link');
    statsLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showNotification('Статистика будет доступна в следующем обновлении');
        });
    });
}); 