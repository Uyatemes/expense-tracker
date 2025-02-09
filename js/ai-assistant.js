class AIAssistant {
    constructor() {
        // Ждем загрузку DOM
        document.addEventListener('DOMContentLoaded', () => {
            this.chatBox = document.getElementById('chat-messages');
            this.input = document.getElementById('user-input');
            this.sendButton = document.getElementById('send-message');
            
            if (this.sendButton && this.input) {
                this.sendButton.onclick = () => this.processInput();
                this.input.onkeypress = (e) => {
                    if (e.key === 'Enter') this.processInput();
                };
            }

            this.showWelcomeMessage();
        });
    }

    showWelcomeMessage() {
        this.addMessage('Привет! Я помогу записать ваши доходы и расходы. Примеры:', 'assistant');
        this.addMessage('"5000 расход каспий такси"', 'example');
        this.addMessage('"10000 приход халык зарплата"', 'example');
    }

    addMessage(text, type) {
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        this.chatBox.appendChild(message);
        this.chatBox.scrollTop = this.chatBox.scrollHeight;
    }

    processInput() {
        const text = this.input.value.trim();
        if (!text) return;

        this.addMessage(text, 'user');

        // Анализ текста
        const result = this.analyzeText(text);

        if (result.success) {
            window.expenseManager.addTransaction({
                date: new Date().toISOString().split('T')[0],
                type: result.type,
                amount: result.amount,
                source: result.source,
                category: result.category
            });

            this.addMessage(`✓ ${result.type} ${result.amount}₸ через ${result.source}${result.category ? ' на ' + result.category : ''}`, 'assistant');
            this.input.value = '';
        } else {
            this.addMessage(result.error, 'assistant');
        }
    }

    analyzeText(text) {
        const words = text.toLowerCase().split(' ');
        
        // Поиск суммы (первое число)
        const amountStr = words.find(word => /^\d+$/.test(word));
        if (!amountStr) {
            return {
                success: false,
                error: 'Не могу найти сумму. Напишите сумму числом, например: "5000 расход"'
            };
        }
        const amount = parseInt(amountStr);

        // Поиск типа операции
        const type = words.find(word => word === 'расход' || word === 'приход');
        if (!type) {
            return {
                success: false,
                error: 'Укажите тип операции: расход или приход'
            };
        }

        // Поиск источника
        const sources = ['каспий', 'халык', 'наличные', 'kaspi', 'halyk'];
        const source = words.find(word => sources.includes(word));
        if (!source) {
            return {
                success: false,
                error: 'Укажите источник: каспий, халык или наличные'
            };
        }

        // Все оставшиеся слова (кроме суммы, типа и источника) считаем категорией
        const category = words
            .filter(word => 
                word !== amountStr && 
                word !== type && 
                word !== source)
            .join(' ')
            .trim();

        return {
            success: true,
            amount: amount,
            type: type,
            source: source,
            category: category || 'другое'
        };
    }
}

// Создаем экземпляр
window.aiAssistant = new AIAssistant();