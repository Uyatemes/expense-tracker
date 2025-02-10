class AIExpenseAssistant {
    constructor() {
        this.chatInput = document.getElementById('chat-input');
        this.sendButton = document.getElementById('send-button');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', () => {
            const message = this.chatInput.value.trim();
            if (message) {
                this.handleUserMessage(message);
                this.chatInput.value = '';
            }
        });

        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const message = this.chatInput.value.trim();
                if (message) {
                    this.handleUserMessage(message);
                    this.chatInput.value = '';
                }
            }
        });
    }

    handleUserMessage(message) {
        // Простая логика распознавания операций
        const words = message.toLowerCase().split(' ');
        
        // Проверяем, является ли первое слово числом (суммой)
        const amount = parseFloat(words[0]);
        if (!isNaN(amount)) {
            // Это расход
            const description = words.slice(1).join(' ');
            addExpense(-amount, description, 'kaspi-gold'); // По умолчанию Kaspi Gold
        } else if (words[0] === 'приход' && !isNaN(parseFloat(words[1]))) {
            // Это доход
            const amount = parseFloat(words[1]);
            const description = words.slice(2).join(' ');
            addExpense(amount, description, 'kaspi-gold'); // По умолчанию Kaspi Gold
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.aiAssistant = new AIExpenseAssistant();
    console.log('AI Assistant initialized');
});