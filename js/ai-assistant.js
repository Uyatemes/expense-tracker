class AIAssistant {
    constructor() {
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

    initializeUI() {
        this.sendButton = document.getElementById('send-message');
        this.userInput = document.getElementById('user-input');
        this.chatMessages = document.getElementById('chat-messages');

        // Добавляем проверку
        if (!this.sendButton || !this.userInput || !this.chatMessages) {
            console.error('Не удалось найти необходимые элементы интерфейса');
            return;
        }

        // Добавляем отладочную информацию
        console.log('AI Assistant initialized');

        this.sendButton.addEventListener('click', () => {
            console.log('Send button clicked');
            this.handleUserMessage();
        });

        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('Enter pressed');
                this.handleUserMessage();
            }
        });
    }

    async handleUserMessage() {
        const userMessage = this.userInput.value.trim();
        if (!userMessage) return;

        // Показываем сообщение пользователя
        this.addMessage(userMessage, 'user');
        this.userInput.value = '';

        // Анализируем сообщение и извлекаем данные
        const transaction = this.parseExpenseMessage(userMessage);
        
        if (transaction) {
            window.expenseManager.addTransaction(transaction);
            this.addMessage(`✓ ${transaction.type === 'расход' ? 'Расход' : 'Доход'} ${transaction.amount}₸ через ${transaction.source}${transaction.category ? ' на ' + transaction.category : ''}`, 'assistant');
            this.input.value = '';
        } else {
            this.addMessage('Не могу распознать операцию. Примеры:\n"5000 расход каспий такси"\n"приход 10000 халык зарплата"', 'assistant');
        }
    }

    parseExpenseMessage(message) {
        const words = message.toLowerCase().split(' ');
        
        // Ищем сумму (первое число)
        const amount = parseFloat(words.find(word => /^\d+$/.test(word)));
        if (!amount) return null;

        // Ищем тип операции
        const type = words.find(word => word === 'расход' || word === 'приход');
        if (!type) return null;

        // Ищем источник
        const sources = ['каспий', 'халык', 'наличные', 'kaspi', 'halyk'];
        const source = words.find(word => sources.includes(word));
        if (!source) return null;

        // Остальные слова - категория
        const category = words
            .filter(word => 
                word !== amount.toString() && 
                word !== type && 
                word !== source)
            .join(' ');

        return {
            amount,
            type,
            source,
            category: category || 'другое',
            date: new Date().toISOString().split('T')[0]
        };
    }

    addMessage(text, type) {
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        this.chatBox.appendChild(message);
        this.chatBox.scrollTop = this.chatBox.scrollHeight;
    }

    showWelcomeMessage() {
        this.addMessage('Добро пожаловать! Я готов помочь с управлением финансами.', 'system');
    }

    processInput() {
        this.handleUserMessage();
    }
}

// Создаем экземпляр
window.aiAssistant = new AIAssistant(); 