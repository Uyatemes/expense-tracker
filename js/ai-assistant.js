class AIExpenseAssistant {
    constructor() {
        this.chatMessages = document.getElementById('chat-messages');
        this.userInput = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-message');
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.sendButton && this.userInput) {
            this.sendButton.addEventListener('click', () => this.handleUserInput());
            this.userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleUserInput();
                }
            });
        } else {
            console.error('Не найдены элементы ввода или кнопки отправки');
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
        const parsedData = this.parseExpenseInput(text);
        if (parsedData.success) {
            console.log('AI: Данные распознаны:', parsedData);
            
            const transaction = {
                amount: parsedData.amount,
                type: parsedData.type,
                description: parsedData.description,
                date: new Date().toISOString(),
                source: parsedData.category,
                category: parsedData.category
            };
            
            console.log('AI: Создана транзакция:', transaction);

            if (typeof window.addTransaction === 'function') {
                console.log('AI: Вызываем addTransaction');
                window.addTransaction(transaction);
                
                this.addMessage(`Записано: ${parsedData.type === 'income' ? 'доход' : 'расход'} ${parsedData.amount} ₸`, 'system');
            } else {
                console.error('AI: Функция addTransaction не найдена');
                this.addMessage('Извините, не могу сохранить операцию', 'system');
            }
        } else {
            this.addMessage(parsedData.message, 'system');
        }
    }

    parseExpenseInput(text) {
        const words = text.toLowerCase().split(' ');
        const amount = parseFloat(words.find(w => !isNaN(w)));
        
        if (isNaN(amount)) {
            return {
                success: false,
                message: 'Пожалуйста, укажите сумму числом'
            };
        }

        // Определяем тип операции
        const isExpense = words.includes('расход');
        const isIncome = words.includes('приход');

        if (!isExpense && !isIncome) {
            return {
                success: false,
                message: 'Укажите тип операции (расход/приход)'
            };
        }

        // Определяем способ оплаты/категорию
        const category = words.includes('каспий') ? 'kaspi' : 
                        words.includes('халык') ? 'halyk' : 
                        words.includes('наличные') ? 'cash' : 'other';

        // Собираем описание (все слова после суммы и типа операции)
        const description = words
            .filter(w => isNaN(w))
            .filter(w => !['расход', 'приход', 'каспий', 'халык', 'наличные'].includes(w))
            .join(' ');

        return {
            success: true,
            amount: amount,
            type: isExpense ? 'expense' : 'income',
            category: category,
            description: description || 'Без описания'
        };
    }
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    new AIExpenseAssistant();
});