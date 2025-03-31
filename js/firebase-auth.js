// Проверка авторизации
window.checkAuth = () => {
    return new Promise((resolve, reject) => {
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            unsubscribe(); // Отписываемся от слушателя
            if (user) {
                console.log('Пользователь авторизован:', user.email);
                resolve(user);
            } else {
                console.log('Пользователь не авторизован');
                window.location.href = 'settings.html';
                reject(new Error('Пользователь не авторизован'));
            }
        });
    });
}; 