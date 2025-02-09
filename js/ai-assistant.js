class AIExpenseAssistant {
    constructor(expenseManager) {
        this.expenseManager = expenseManager;
        this.initializeUI();
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
            this.expenseManager.addTransaction(transaction);
            renderExpensesTable();
            updateCharts();
            
            const typeText = transaction.type === 'expense' ? 'Расход' : 'Доход';
            this.addMessage(
                `Добавлена операция: ${typeText} на сумму ${Math.abs(transaction.amount).toLocaleString('ru-RU')} ₸\n` +
                `Источник: ${transaction.source}\n` +
                `Детали: ${transaction.description}`, 
                'system'
            );
        } else {
            this.addMessage(
                'Извините, не удалось распознать операцию. Примеры сообщений:\n' +
                '"2000 приход каспий Ержан"\n' +
                '"расход 5000 наличные такси"\n' +
                '"халык 10000 приход зарплата"\n' +
                'Укажите: сумму, тип операции (приход/расход), источник (Каспий/Халык/Наличные/Личный счет) и описание', 
                'system'
            );
        }
    }

    parseExpenseMessage(message) {
        const words = message.trim().split(/\s+/);
        
        if (words.length < 4) { // Теперь минимум 4 слова
            return null;
        }

        const incomeWords = ['доход', 'получил', 'заработал', 'приход', 'поступление', 'прибыль'];
        const sourceWords = {
            'каспий': 'Каспий',
            'kaspi': 'Каспий',
            'каспи': 'Каспий',
            'халык': 'Халык',
            'halyk': 'Халык',
            'налич': 'Наличные',
            'нал': 'Наличные',
            'кэш': 'Наличные',
            'личный': 'Личный счет',
            'лс': 'Личный счет'
        };
        
        let type = 'expense';
        let typeWordIndex = -1;
        let amount = null;
        let amountIndex = -1;
        let source = null;
        let sourceIndex = -1;

        // Ищем тип операции
        for (let i = 0; i < words.length; i++) {
            const word = words[i].toLowerCase();
            if (incomeWords.some(incomeWord => word.includes(incomeWord))) {
                type = 'income';
                typeWordIndex = i;
                break;
            }
        }

        // Ищем сумму
        for (let i = 0; i < words.length; i++) {
            const num = parseFloat(words[i].replace(/[^0-9.]/g, ''));
            if (!isNaN(num)) {
                amount = num;
                amountIndex = i;
                break;
            }
        }

        // Ищем источник
        for (let i = 0; i < words.length; i++) {
            const word = words[i].toLowerCase();
            for (const [key, value] of Object.entries(sourceWords)) {
                if (word.includes(key)) {
                    source = value;
                    sourceIndex = i;
                    break;
                }
            }
            if (source) break;
        }

        if (!amount || !source) return null;

        // Собираем описание из оставшихся слов
        const details = words
            .filter((word, index) => 
                index !== typeWordIndex && 
                index !== amountIndex && 
                index !== sourceIndex)
            .join(' ');

        let date = new Date();
        if (message.toLowerCase().includes('вчера')) {
            date.setDate(date.getDate() - 1);
        }

        // Определяем категорию на основе описания
        let category = 'Другое';
        if (message.toLowerCase().includes('зарплата')) {
            category = 'Зарплата';
        } else if (message.toLowerCase().includes('продукты')) {
            category = 'Продукты';
        } else if (message.toLowerCase().includes('такси') || message.toLowerCase().includes('автобус')) {
            category = 'Транспорт';
        } else if (message.toLowerCase().includes('кафе') || message.toLowerCase().includes('ресторан')) {
            category = 'Рестораны';
        }

        return {
            amount,
            type,
            source,
            date: date.toISOString().split('T')[0],
            description: details,
            category: category
        };
    }

    addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const aiAssistant = new AIExpenseAssistant(expenseManager);
}); 