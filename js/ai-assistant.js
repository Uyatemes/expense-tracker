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

        // Разбиваем текст на части и анализируем
        const parts = text.toLowerCase().split(' ');
        
        // Ищем сумму (любое число в тексте)
        const amount = parts.find(word => /^\d+$/.test(word));
        if (!amount) {
            this.addMessage('Не могу найти сумму. Укажите сумму числом, например: "5000"', 'assistant');
            return;
        }

        // Ищем тип операции в любом месте текста
        const type = parts.find(word => word === 'расход' || word === 'приход');
        if (!type) {
            this.addMessage('Укажите тип операции: расход или приход', 'assistant');
            return;
        }

        // Ищем источник в любом месте текста
        const sources = ['каспий', 'халык', 'наличные', 'kaspi', 'halyk'];
        const source = parts.find(word => sources.includes(word));
        if (!source) {
            this.addMessage('Укажите источник: каспий, халык или наличные', 'assistant');
            return;
        }

        // Все остальные слова считаем категорией
        const category = parts
            .filter(word => 
                word !== amount && 
                word !== type && 
                word !== source &&
                !sources.includes(word))
            .join(' ');

        // Добавляем транзакцию
        window.expenseManager.addTransaction({
            date: new Date().toISOString().split('T')[0],
            amount: parseInt(amount),
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