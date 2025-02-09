class AIAssistant {
    constructor() {
        this.chatBox = document.getElementById('chatBox');
        this.input = document.getElementById('operationInput');
        this.sendButton = document.getElementById('sendButton');
        
        this.sendButton.onclick = () => this.processInput();
        this.input.onkeypress = (e) => {
            if (e.key === 'Enter') this.processInput();
        };

        this.showWelcomeMessage();
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

        // Разбиваем текст на части
        const parts = text.toLowerCase().split(' ');
        
        // Ищем сумму (первое число)
        const amount = parseFloat(parts[0]);
        if (isNaN(amount)) {
            this.addMessage('Не могу найти сумму. Напишите сумму первым числом.', 'assistant');
            return;
        }

        // Ищем тип операции
        const type = parts.find(word => word === 'расход' || word === 'приход');
        if (!type) {
            this.addMessage('Укажите тип операции: расход или приход', 'assistant');
            return;
        }

        // Ищем источник
        const sources = ['каспий', 'халык', 'наличные', 'kaspi', 'halyk'];
        const source = parts.find(word => sources.includes(word));
        if (!source) {
            this.addMessage('Укажите источник: каспий, халык или наличные', 'assistant');
            return;
        }

        // Все оставшиеся слова считаем категорией
        const category = parts
            .filter(word => 
                word !== amount.toString() && 
                word !== type && 
                word !== source)
            .join(' ');

        // Добавляем транзакцию
        window.expenseManager.addTransaction({
            date: new Date().toISOString().split('T')[0],
            amount: amount,
            type: type,
            category: category || 'другое',
            source: source
        });

        this.addMessage(`✓ ${type} ${amount}₸ через ${source}${category ? ' на ' + category : ''}`, 'assistant');
        this.input.value = '';
    }
}

// Создаем экземпляр при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.aiAssistant = new AIAssistant();
});