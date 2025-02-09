class AIAssistant {
    constructor() {
        // Ждем загрузки DOM
        document.addEventListener('DOMContentLoaded', () => {
            this.chatBox = document.getElementById('chatBox');
            this.input = document.getElementById('operationInput');
            this.sendButton = document.getElementById('sendButton');
            
            if (this.chatBox && this.input && this.sendButton) {
                this.sendButton.onclick = () => this.processInput();
                this.input.onkeypress = (e) => {
                    if (e.key === 'Enter') this.processInput();
                };
                this.showWelcomeMessage();
            }
        });
    }

    showWelcomeMessage() {
        this.addMessage('Привет! Я помогу записать ваши доходы и расходы. Примеры:', 'assistant');
        this.addMessage('"5000 расход каспий такси"', 'example');
        this.addMessage('"расход 5000 каспий такси"', 'example');
        this.addMessage('"каспий 5000 расход такси"', 'example');
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

        const result = this.parseTransaction(text);
        
        if (result.success) {
            window.expenseManager.addTransaction(result.transaction);
            this.addMessage(
                `✓ ${result.transaction.type} ${result.transaction.amount}₸ через ${result.transaction.source}${result.transaction.category ? ' на ' + result.transaction.category : ''}`, 
                'assistant'
            );
            this.input.value = '';
        } else {
            this.addMessage(result.error, 'assistant');
        }
    }

    parseTransaction(text) {
        const words = text.toLowerCase().split(' ');
        
        // Ищем сумму (любое число в тексте)
        const amount = words.find(word => /^\d+$/.test(word));
        if (!amount) {
            return {
                success: false,
                error: 'Укажите сумму числом, например: 5000'
            };
        }

        // Ищем тип операции
        const type = words.find(word => word === 'расход' || word === 'приход');
        if (!type) {
            return {
                success: false,
                error: 'Укажите тип операции: расход или приход'
            };
        }

        // Ищем источник
        const sources = ['каспий', 'халык', 'наличные', 'kaspi', 'halyk'];
        const source = words.find(word => sources.includes(word));
        if (!source) {
            return {
                success: false,
                error: 'Укажите источник: каспий, халык или наличные'
            };
        }

        // Остальные слова - категория
        const category = words
            .filter(word => 
                word !== amount && 
                word !== type && 
                word !== source && 
                !sources.includes(word))
            .join(' ');

        return {
            success: true,
            transaction: {
                date: new Date().toISOString().split('T')[0],
                amount: parseInt(amount),
                type: type,
                source: source,
                category: category || 'другое'
            }
        };
    }
}

// Создаем экземпляр при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.aiAssistant = new AIAssistant();
}); 