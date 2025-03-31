// Инициализация меню
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Применяем сохраненную тему
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);

        // Проверяем авторизацию
        const user = await window.checkAuth();
        
        // Создаем менеджер только после успешной авторизации
        window.suppliersManager = new SuppliersManager(user);

        // Добавляем очистку при уходе со страницы
        window.addEventListener('beforeunload', () => {
            if (window.suppliersManager) {
                window.suppliersManager.cleanup();
            }
        });
    } catch (error) {
        console.error('Ошибка при инициализации:', error);
    }
});

class SuppliersManager {
    constructor(user) {
        if (!user) {
            throw new Error('Пользователь не определен');
        }
        
        this.user = user;
        this.suppliers = [];
        this.form = document.getElementById('supplierForm');
        this.suppliersList = document.getElementById('suppliersList');
        
        if (!this.form || !this.suppliersList) {
            throw new Error('Не найдены необходимые элементы на странице');
        }
        
        this.unsubscribe = null; // Добавляем переменную для отписки от слушателя
        this.initializeEventListeners();
        this.loadSuppliers();
    }

    initializeEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', this.handleSubmit.bind(this));
        }
    }


    async saveToFirebase(suppliers) {
        try {
            const db = firebase.firestore();
            const suppliersRef = db
                .collection('users')
                .doc(this.user.uid)
                .collection('suppliers');

            // Удаляем старые документы
            const snapshot = await suppliersRef.get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Добавляем новые
            suppliers.forEach(supplier => {
                const docRef = suppliersRef.doc();
                batch.set(docRef, {
                    ...supplier,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit();
            console.log('Поставщики успешно обновлены в Firebase');
        } catch (error) {
            console.error('Ошибка при сохранении в Firebase:', error);
            throw error;
        }
    }

    // Добавляем начальный список поставщиков
    getInitialSuppliers() {
        return [
            { name: 'Fika People', value: 'fika people' },
            { name: 'Fruitata', value: 'fruitata' },
            { name: 'ИП АБАДАН', value: 'ИП АБАДАН' },
            { name: 'RockCity', value: 'rockcity' },
            { name: 'Coffee Man', value: 'coffee man' },
            { name: 'Shygie.kz', value: 'shygie.kz' },
            { name: 'Юзаев Талгат', value: 'юзаев талгат' },
            { name: 'Илахунов', value: 'илахунов' },
            { name: 'Sandi Group', value: 'Sandi Group' },
            { name: 'ИП Дана', value: 'ип дана' }
        ];
    }

    async loadSuppliers() {
        try {
            console.log('Загрузка поставщиков для пользователя:', this.user.uid);
            
            const db = firebase.firestore();
            const suppliersRef = db
                .collection('users')
                .doc(this.user.uid)
                .collection('suppliers');

            // Проверяем, есть ли уже поставщики
            const snapshot = await suppliersRef.get();
            
            // Если поставщиков нет, добавляем начальный список
            if (snapshot.empty) {
                console.log('Список поставщиков пуст, добавляем начальный список');
                const batch = db.batch();
                const initialSuppliers = this.getInitialSuppliers();
                
                for (const supplier of initialSuppliers) {
                    const docRef = suppliersRef.doc();
                    batch.set(docRef, {
                        ...supplier,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                
                await batch.commit();
                console.log('Начальный список поставщиков добавлен');
            }

            // Устанавливаем слушатель изменений
            this.unsubscribe = suppliersRef
                .orderBy('createdAt', 'desc')
                .onSnapshot((snapshot) => {
                    this.suppliers = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    console.log('Обновление списка поставщиков:', this.suppliers.length);
                    
                    // Обновляем отображение
                    this.renderSuppliers();
                    
                    // Сохраняем в localStorage для синхронизации
                    localStorage.setItem('suppliersList', JSON.stringify(this.suppliers));
                    
                    // Создаем событие для синхронизации между вкладками
                    const event = new StorageEvent('storage', {
                        key: 'suppliersList',
                        newValue: JSON.stringify(this.suppliers),
                        url: window.location.href
                    });
                    window.dispatchEvent(event);
                });

        } catch (error) {
            console.error('Ошибка при загрузке поставщиков:', error);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const nameInput = document.getElementById('supplierName');
        const valueInput = document.getElementById('supplierValue');
        
        const name = nameInput.value.trim();
        const value = valueInput.value.trim().toLowerCase();

        try {
            // Проверяем на дубликаты
            const isDuplicate = this.suppliers.some(s => 
                s.value.toLowerCase() === value || 
                s.name.toLowerCase() === name.toLowerCase()
            );

            if (isDuplicate) {
                alert('Такой поставщик уже существует');
                return;
            }

            // Добавляем в Firebase
            await firebase.firestore()
                .collection('users')
                .doc(this.user.uid)
                .collection('suppliers')
                .add({
                    name,
                    value,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            // Очищаем форму
            nameInput.value = '';
            valueInput.value = '';

            // onSnapshot автоматически обновит список

            // После успешного добавления/изменения поставщика
            localStorage.removeItem('cachedSuppliers');

        } catch (error) {
            console.error('Ошибка при добавлении поставщика:', error);
            alert('Не удалось добавить поставщика. Попробуйте еще раз.');
        }
    }

    async deleteSupplier(id) {
        if (!confirm('Вы уверены, что хотите удалить этого поставщика?')) return;

        try {
            // Удаляем из Firebase
            await firebase.firestore()
                .collection('users')
                .doc(this.user.uid)
                .collection('suppliers')
                .doc(id)
                .delete();

            // onSnapshot автоматически обновит список

        } catch (error) {
            console.error('Ошибка при удалении поставщика:', error);
            alert('Не удалось удалить поставщика. Попробуйте еще раз.');
        }
    }

    showSupplierModal(supplier) {
        const modal = document.createElement('div');
        modal.className = 'supplier-modal';
        
        modal.innerHTML = `
            <div class="supplier-modal-header">
                <h3 class="supplier-modal-title">Редактирование поставщика</h3>
                <button class="supplier-modal-close">
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
            <div class="supplier-modal-content">
                <div class="form-group">
                    <input type="text" class="md-input supplier-name-input" 
                           value="${supplier.name}" 
                           placeholder="Название поставщика">
                </div>
                <div class="form-group">
                    <input type="text" class="md-input supplier-value-input" 
                           value="${supplier.value}" 
                           placeholder="Значение для поиска">
                </div>
                <div class="supplier-modal-actions">
                    <button class="modal-button delete">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                        Удалить
                    </button>
                    <button class="modal-button save">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                        </svg>
                        Сохранить
                    </button>
                </div>
            </div>
        `;

        // Создаем оверлей
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);

        document.body.appendChild(modal);
        
        // Показываем модальное окно и оверлей
        requestAnimationFrame(() => {
            modal.classList.add('show');
            overlay.classList.add('show');
        });

        // Обработчики событий
        const closeModal = () => {
            modal.classList.remove('show');
            overlay.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                overlay.remove();
            }, 300);
        };

        modal.querySelector('.supplier-modal-close').addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        // Обработчик удаления
        modal.querySelector('.modal-button.delete').addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите удалить этого поставщика?')) {
                this.deleteSupplier(supplier.id);
                closeModal();
            }
        });

        // Обработчик сохранения
        modal.querySelector('.modal-button.save').addEventListener('click', async () => {
            const nameInput = modal.querySelector('.supplier-name-input');
            const valueInput = modal.querySelector('.supplier-value-input');
            
            const updatedSupplier = {
                ...supplier,
                name: nameInput.value.trim(),
                value: valueInput.value.trim().toLowerCase()
            };

            if (!updatedSupplier.name || !updatedSupplier.value) {
                alert('Заполните все поля');
                return;
            }

            try {
                await firebase.firestore()
                    .collection('users')
                    .doc(this.user.uid)
                    .collection('suppliers')
                    .doc(supplier.id)
                    .update(updatedSupplier);

                closeModal();
            } catch (error) {
                console.error('Ошибка при обновлении поставщика:', error);
                alert('Не удалось обновить поставщика');
            }
        });
    }

    renderSuppliers() {
        if (!this.suppliersList) return;
        
        this.suppliersList.innerHTML = '';
        
        if (this.suppliers.length === 0) {
            this.suppliersList.innerHTML = `
                <div class="supplier-item" style="justify-content: center; color: var(--md-sys-color-on-surface-variant);">
                    Список поставщиков пуст
                </div>
            `;
            return;
        }

        this.suppliers.forEach(supplier => {
            const item = document.createElement('div');
            item.className = 'supplier-item';
            item.innerHTML = `
                <div class="supplier-info">
                    <div class="supplier-name">${supplier.name}</div>
                    <div class="supplier-value">${supplier.value}</div>
                </div>
            `;

            // Добавляем обработчик клика на элемент
            item.addEventListener('click', () => this.showSupplierModal(supplier));

            this.suppliersList.appendChild(item);
        });
    }

    // Добавляем метод для очистки слушателя при уходе со страницы
    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
} 