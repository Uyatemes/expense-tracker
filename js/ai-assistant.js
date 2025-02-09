class AIAssistant {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'ai-assistant';
        this.setupUI();
    }

    setupUI() {
        // Стили для контейнера
        this.container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 300px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 15px;
            z-index: 1000;
        `;

        // Создаем чат
        const chatBox = document.createElement('div');
        chatBox.style.cssText = `
            height: 200px;
            overflow-y: auto;
            margin-bottom: 10px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
        `;
        this.chatBox = chatBox;

        // Поле ввода
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Опишите транзакцию...';
        input.style.cssText = `
            width: calc(100% - 20px);
            padding: 8px;
            margin-bottom: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        `;
        this.input = input;

        // Кнопка отправки
        const button = document.createElement('button');
        button.textContent = 'Отправить';
        button.style.cssText = `
            background: #3E2005;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
        `;

        // Добавляем элементы в контейнер
        this.container.appendChild(chatBox);
        this.container.appendChild(input);
        this.container.appendChild(button);

        // Обработчики событий
        button.onclick = () => this.processInput();
        input.onkeypress = (e) => {
            if (e.key === 'Enter') this.processInput();
        };

        // Добавляем в документ
        document.body.appendChild(this.container);
    }

    processInput() {
        const text = this.input.value.trim();
        if (!text) return;

        this.addMessage('Вы: ' + text, 'user');

        // Анализ текста
        const result = this.analyzeText(text);

        if (result.amount && result.category) {
            window.expenseManager.addTransaction({
                amount: result.amount,
                category: result.category,
                date: new Date().toISOString().split('T')[0],
                note: result.note || text
            });

            this.addMessage(`Добавлена транзакция:
                Сумма: ${result.amount}₸
                Категория: ${result.category}
                ${result.note ? 'Примечание: ' + result.note : ''}`, 'assistant');
            
            this.input.value = '';
            renderTransactionsTable();
        } else {
            this.addMessage('Не удалось распознать транзакцию. Попробуйте написать например: "1600 полиграфия расход каспий"', 'assistant');
        }
    }

    analyzeText(text) {
        const result = {
            amount: null,
            category: null,
            note: null
        };

        // Поиск суммы (число)
        const amountMatch = text.match(/\d+(\.\d+)?/);
        if (amountMatch) {
            result.amount = parseFloat(amountMatch[0]);
        }

        // Поиск категории
        const categories = [
            'полиграфия',
            'каспий',
            'продукты',
            'транспорт',
            'развлечения',
            'кафе',
            'одежда',
            'такси',
            'аренда',
            'связь',
            'интернет',
            'коммуналка'
        ];

        for (let category of categories) {
            if (text.toLowerCase().includes(category.toLowerCase())) {
                result.category = category;
                break;
            }
        }

        // Поиск примечания
        const noteKeywords = ['за', 'на', 'для', 'примечание:', 'note:'];
        for (let keyword of noteKeywords) {
            const index = text.toLowerCase().indexOf(keyword.toLowerCase());
            if (index !== -1) {
                result.note = text.slice(index + keyword.length).trim();
                break;
            }
        }

        // Если примечание не найдено, но есть категория
        if (!result.note && result.category) {
            const categoryIndex = text.toLowerCase().indexOf(result.category.toLowerCase());
            if (categoryIndex !== -1) {
                const beforeCategory = text.slice(0, categoryIndex).trim();
                const afterCategory = text.slice(categoryIndex + result.category.length).trim();
                result.note = (beforeCategory + ' ' + afterCategory).trim();
            }
        }

        return result;
    }

    addMessage(text, type) {
        const message = document.createElement('div');
        message.style.cssText = `
            margin-bottom: 8px;
            padding: 5px;
            border-radius: 4px;
            ${type === 'user' ? 'background: #f0f0f0;' : 'background: #e8f4ff;'}
        `;
        message.textContent = text;
        this.chatBox.appendChild(message);
        this.chatBox.scrollTop = this.chatBox.scrollHeight;
    }
}

// Создаем экземпляр при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.aiAssistant = new AIAssistant();
});