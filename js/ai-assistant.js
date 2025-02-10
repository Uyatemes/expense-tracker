class AIExpenseAssistant {
    constructor() {
        this.chatMessages = document.getElementById('chat-messages');
        this.userInput = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-message');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Проверяем, что элементы найдены перед добавлением обработчиков
        if (this.sendButton && this.userInput) {
            this.sendButton.addEventListener('click', () => this.handleUserInput());
            this.userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleUserInput();
                }
            });
        } else {
            console.error('Не найдены элементы ввода или кнопка отправки');
        }
    }

    handleUserInput() {
        const text = this.userInput.value.trim();
        if (text) {
            this.addMessage(text, 'user');
            this.processUserInput(text);
            this.userInput.value = '';
        }
    }

    addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    processUserInput(text) {
        // Здесь логика обработки ввода пользователя
        const response = this.parseExpenseInput(text);
        if (response) {
            this.addMessage(response, 'system');
        }
    }

    parseExpenseInput(text) {
        // Простой парсер для распознавания команд
        const words = text.toLowerCase().split(' ');
        const amount = parseFloat(words.find(w => !isNaN(w)));
        
        if (isNaN(amount)) {
            return 'Пожалуйста, укажите сумму числом';
        }

        if (words.includes('расход')) {
            // Обработка расхода
            return `Записан расход: ${amount} ₸`;
        } else if (words.includes('приход')) {
            // Обработка дохода
            return `Записан доход: ${amount} ₸`;
        }

        return 'Не могу распознать операцию. Используйте слова "расход" или "приход"';
    }
}

// Ждем загрузки DOM перед инициализацией
document.addEventListener('DOMContentLoaded', () => {
    new AIExpenseAssistant();
});