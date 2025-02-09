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
        this.addMessage('"1600 расход полиграфия каспий"', 'example');
        this.addMessage('"5000 расход такси каспий"', 'example');
    }

    addMessage(text, type) {
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        this.chatBox.appendChild(message);
    }

    processInput() {
        const text = this.input.value.trim();
        if (!text) return;

        this.addMessage(text, 'user');

        // Разбиваем текст на части
        const parts = text.toLowerCase().split(' ');
        
        // Если меньше 4 частей, значит формат неверный
        if (parts.length < 4) {
            this.addMessage('Неверный формат. Напишите: "сумма тип категория источник"', 'assistant');
            return;
        }

        // Парсим части
        const amount = parseFloat(parts[0]);
        const type = parts[1];
        const category = parts[2];
        const source = parts[3];

        // Проверяем корректность
        if (isNaN(amount)) {
            this.addMessage('Первым должна быть сумма', 'assistant');
            return;
        }

        if (type !== 'расход' && type !== 'приход') {
            this.addMessage('Вторым должен быть тип: расход или приход', 'assistant');
            return;
        }

        // Добавляем транзакцию
        window.expenseManager.addTransaction({
            date: new Date().toISOString().split('T')[0],
            amount: amount,
            type: type,
            category: category,
            source: source
        });

        this.addMessage(`Добавлена операция: ${type} ${amount}₸ (${category}) через ${source}`, 'assistant');
        this.input.value = '';
    }
}

// Создаем экземпляр при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.aiAssistant = new AIAssistant();
});