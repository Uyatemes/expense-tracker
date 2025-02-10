class AIExpenseAssistant {
    constructor() {
        this.inputElement = document.querySelector('#chat-input');
        this.sendButton = document.querySelector('#send-button');
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (!this.inputElement || !this.sendButton) {
            console.error('AI Assistant: Required elements not found');
            return;
        }

        this.sendButton.addEventListener('click', () => this.handleUserMessage());
        this.inputElement.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleUserMessage();
            }
        });
    }

    async handleUserMessage() {
        const userInput = this.inputElement.value.trim();
        if (!userInput) return;

        try {
            // Парсим ввод пользователя
            const expenseData = this.parseUserInput(userInput);
            if (expenseData) {
                // Добавляем транзакцию
                window.addExpense(
                    expenseData.amount,
                    expenseData.description,
                    expenseData.paymentType
                );
                
                // Очищаем поле ввода
                this.inputElement.value = '';
            } else {
                console.log('Не удалось распознать формат ввода');
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    }

    parseUserInput(input) {
        // Паттерны для распознавания ввода
        const incomePattern = /приход (\d+) (халык|каспий|каспи|kaspi|halyk) ?(.*)?/i;
        const expensePattern = /(\d+) (халык|каспий|каспи|kaspi|halyk) ?(.*)?/i;
        
        let match;
        
        // Проверяем, является ли это доходом
        if ((match = input.match(incomePattern))) {
            const [, amount, paymentSystem, description = ''] = match;
            return {
                amount: parseFloat(amount),
                description: description.trim() || 'Доход',
                paymentType: this.normalizePaymentType(paymentSystem),
                isIncome: true
            };
        }
        
        // Проверяем, является ли это расходом
        if ((match = input.match(expensePattern))) {
            const [, amount, paymentSystem, description = ''] = match;
            return {
                amount: -parseFloat(amount), // Отрицательное значение для расхода
                description: description.trim() || 'Расход',
                paymentType: this.normalizePaymentType(paymentSystem),
                isIncome: false
            };
        }

        return null;
    }

    normalizePaymentType(type) {
        type = type.toLowerCase();
        switch (type) {
            case 'каспий':
            case 'каспи':
            case 'kaspi':
                return 'kaspi-gold'; // По умолчанию используем Kaspi Gold
            case 'халык':
            case 'halyk':
                return 'halyk';
            default:
                return 'kaspi-gold';
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.aiAssistant = new AIExpenseAssistant();
    console.log('AI Assistant initialized');
}); 