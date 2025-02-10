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
        const words = message.toLowerCase().split(' ');
        const isIncome = words[0] === 'приход';
        const amountIndex = isIncome ? 1 : 0;
        const amount = parseFloat(words[amountIndex]);

        if (!isNaN(amount)) {
            const description = words.slice(amountIndex + 1).join(' ');
            const finalAmount = isIncome ? amount : -amount;
            addExpense(finalAmount, description);
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.aiAssistant = new AIExpenseAssistant();
    console.log('AI Assistant initialized');
});