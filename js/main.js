/**
 * Головний клас для управління кросвордом
 * Координує всі компоненти та управляє станом застосунку
 */
class CrosswordApp {
    constructor() {
        // Конфігурація за замовчуванням
        this.config = {
            defaultGridWidth: 15,
            defaultGridHeight: 15,
            maxGridSize: 25,
            minGridSize: 5,
            animationDuration: 300,
            autoSaveInterval: 30000 // 30 секунд
        };

        // Поточний стан застосунку
        this.state = {
            currentMode: 'editor', // 'editor' або 'game'
            gridSize: { width: 15, height: 15 },
            words: new Map(), // Map<id, wordData>
            grid: [], // двомірний масив
            selectedCell: null,
            selectedWord: null,
            isGridGenerated: false,
            hasUnsavedChanges: false,
            lastSaveTime: null
        };

        // DOM елементи
        this.elements = {};

        // Ініціалізація
        this.init();
    }

    /**
     * Ініціалізація застосунку
     */
    init() {
        this.cacheDOM();
        this.setupEventListeners();
        this.initializeComponents();
        this.loadFromLocalStorage();
        this.setupAutoSave();
        
        console.log('CrosswordApp ініціалізовано');
    }

    /**
     * Кешування DOM елементів
     */
    cacheDOM() {
        // Основні контейнери
        this.elements.gridContainer = document.getElementById('crossword-grid');
        this.elements.horizontalClues = document.getElementById('horizontal-clues');
        this.elements.verticalClues = document.getElementById('vertical-clues');
        this.elements.gameMode = document.querySelector('.game-mode');
        this.elements.workspace = document.querySelector('.workspace');

        // Контроли сітки
        this.elements.gridWidth = document.getElementById('grid-width');
        this.elements.gridHeight = document.getElementById('grid-height');
        this.elements.generateGrid = document.getElementById('generate-grid');

        // Контроли слів
        this.elements.wordInput = document.getElementById('word-input');
        this.elements.clueInput = document.getElementById('clue-input');
        this.elements.directionInputs = document.querySelectorAll('input[name="direction"]');
        this.elements.addWord = document.getElementById('add-word');

        // Кнопки управління
        this.elements.newCrossword = document.getElementById('new-crossword');
        this.elements.saveCrossword = document.getElementById('save-crossword');
        this.elements.loadCrossword = document.getElementById('load-crossword');
        this.elements.startGame = document.getElementById('start-game');
        this.elements.checkAnswers = document.getElementById('check-answers');
        this.elements.showAnswers = document.getElementById('show-answers');
        this.elements.backToEditor = document.getElementById('back-to-editor');

        // Статистика гри
        this.elements.completedWords = document.getElementById('completed-words');
        this.elements.totalWords = document.getElementById('total-words');

        // Модальні вікна
        this.elements.modalOverlay = document.getElementById('modal-overlay');
        this.elements.settingsModal = document.getElementById('settings-modal');
        this.elements.notifications = document.getElementById('notifications');
    }

    /**
     * Налаштування обробників подій
     */
    setupEventListeners() {
        // Генерація сітки
        this.elements.generateGrid?.addEventListener('click', () => this.generateGrid());
        
        // Зміна розмірів сітки
        this.elements.gridWidth?.addEventListener('change', () => this.updateGridSize());
        this.elements.gridHeight?.addEventListener('change', () => this.updateGridSize());

        // Додавання слів
        this.elements.addWord?.addEventListener('click', () => this.addWord());
        this.elements.wordInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addWord();
        });

        // Управління застосунком
        this.elements.newCrossword?.addEventListener('click', () => this.newCrossword());
        this.elements.saveCrossword?.addEventListener('click', () => this.saveCrossword());
        this.elements.loadCrossword?.addEventListener('click', () => this.loadCrossword());

        // Режими гри
        this.elements.startGame?.addEventListener('click', () => this.switchToGameMode());
        this.elements.backToEditor?.addEventListener('click', () => this.switchToEditorMode());
        this.elements.checkAnswers?.addEventListener('click', () => this.checkAnswers());
        this.elements.showAnswers?.addEventListener('click', () => this.showAnswers());

        // Модальні вікна
        this.elements.modalOverlay?.addEventListener('click', (e) => {
            if (e.target === this.elements.modalOverlay) {
                this.closeModal();
            }
        });

        // Закриття модальних вікон
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        // Глобальні клавіші
        document.addEventListener('keydown', (e) => this.handleGlobalKeyPress(e));

        // Попередження при закритті сторінки
        window.addEventListener('beforeunload', (e) => {
            if (this.state.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    /**
     * Ініціалізація компонентів
     */
    initializeComponents() {
        // Ініціалізація буде залежати від наявності інших файлів
        // Поки що базова ініціалізація
        this.updateGridSizeInputs();
        this.updateUI();
    }

    /**
     * Генерація нової сітки
     */
    generateGrid() {
        const width = parseInt(this.elements.gridWidth.value);
        const height = parseInt(this.elements.gridHeight.value);

        if (!this.validateGridSize(width, height)) {
            this.showNotification('Некоректний розмір сітки', 'error');
            return;
        }

        this.state.gridSize = { width, height };
        this.state.grid = this.createEmptyGrid(width, height);
        this.state.words.clear();
        this.state.isGridGenerated = true;
        this.state.hasUnsavedChanges = true;

        this.renderGrid();
        this.updateCluesPanel();
        this.updateUI();

        this.showNotification(`Сітка ${width}×${height} створена`, 'success');
    }

    /**
     * Створення порожньої сітки
     */
    createEmptyGrid(width, height) {
        const grid = [];
        for (let row = 0; row < height; row++) {
            grid[row] = [];
            for (let col = 0; col < width; col++) {
                grid[row][col] = {
                    letter: '',
                    number: null,
                    blocked: false,
                    wordIds: [], // ID слів, що проходять через цю клітинку
                    isStart: false,
                    directions: [] // 'horizontal' та/або 'vertical'
                };
            }
        }
        return grid;
    }

    /**
     * Рендеринг сітки
     */
    renderGrid() {
        if (!this.elements.gridContainer || !this.state.isGridGenerated) return;

        const { width, height } = this.state.gridSize;
        const gridHTML = this.generateGridHTML(width, height);
        
        this.elements.gridContainer.innerHTML = gridHTML;
        this.elements.gridContainer.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
        
        this.setupGridEventListeners();
    }

    /**
     * Генерація HTML для сітки
     */
    generateGridHTML(width, height) {
        let html = '';
        
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const cell = this.state.grid[row][col];
                const cellClasses = this.getCellClasses(cell);
                const cellNumber = cell.number ? `<span class="cell-number">${cell.number}</span>` : '';
                
                html += `
                    <div class="grid-cell ${cellClasses}" 
                         data-row="${row}" 
                         data-col="${col}">
                        ${cellNumber}
                        <input type="text" 
                               maxlength="1" 
                               value="${cell.letter}"
                               ${cell.blocked ? 'disabled' : ''}>
                    </div>
                `;
            }
        }
        
        return html;
    }

    /**
     * Отримання класів для клітинки
     */
    getCellClasses(cell) {
        const classes = [];
        
        if (cell.blocked) classes.push('blocked');
        if (cell.letter) classes.push('filled');
        if (cell.isStart) classes.push('start');
        
        return classes.join(' ');
    }

    /**
     * Налаштування обробників подій для сітки
     */
    setupGridEventListeners() {
        const cells = this.elements.gridContainer.querySelectorAll('.grid-cell');
        
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const input = cell.querySelector('input');

            // Клік по клітинці
            cell.addEventListener('click', () => this.selectCell(row, col));
            
            // Введення тексту
            if (input) {
                input.addEventListener('input', (e) => this.handleCellInput(row, col, e));
                input.addEventListener('keydown', (e) => this.handleCellKeydown(row, col, e));
                input.addEventListener('focus', () => this.selectCell(row, col));
            }

            // Контекстне меню
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(row, col, e.clientX, e.clientY);
            });
        });
    }

    /**
     * Вибір клітинки
     */
    selectCell(row, col) {
        // Зняти виділення з попередньої клітинки
        this.clearCellSelection();
        
        this.state.selectedCell = { row, col };
        
        // Виділити поточну клітинку
        const cell = this.elements.gridContainer.querySelector(
            `[data-row="${row}"][data-col="${col}"]`
        );
        cell?.classList.add('active');
        
        // Фокус на інпут
        const input = cell?.querySelector('input');
        input?.focus();
    }

    /**
     * Очищення виділення клітинок
     */
    clearCellSelection() {
        this.elements.gridContainer.querySelectorAll('.grid-cell.active').forEach(cell => {
            cell.classList.remove('active');
        });
    }

    /**
     * Обробка введення в клітинку
     */
    handleCellInput(row, col, event) {
        const value = event.target.value.toUpperCase();
        
        // Оновити стан
        if (this.state.grid[row] && this.state.grid[row][col]) {
            this.state.grid[row][col].letter = value;
            this.state.hasUnsavedChanges = true;
        }
        
        // Автоматично перейти до наступної клітинки
        if (value && this.state.currentMode === 'game') {
            this.moveToNextCell(row, col);
        }
    }

    /**
     * Обробка натискань клавіш в клітинці
     */
    handleCellKeydown(row, col, event) {
        switch (event.key) {
            case 'ArrowUp':
                event.preventDefault();
                this.moveCell(row - 1, col);
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.moveCell(row + 1, col);
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.moveCell(row, col - 1);
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.moveCell(row, col + 1);
                break;
            case 'Backspace':
                if (!event.target.value) {
                    this.moveToPreviousCell(row, col);
                }
                break;
            case 'Delete':
                event.target.value = '';
                this.handleCellInput(row, col, { target: { value: '' } });
                break;
        }
    }

    /**
     * Переміщення до клітинки
     */
    moveCell(newRow, newCol) {
        const { width, height } = this.state.gridSize;
        
        if (newRow >= 0 && newRow < height && newCol >= 0 && newCol < width) {
            this.selectCell(newRow, newCol);
        }
    }

    /**
     * Додавання нового слова
     */
    addWord() {
        const word = this.elements.wordInput.value.trim().toUpperCase();
        const clue = this.elements.clueInput.value.trim();
        const direction = document.querySelector('input[name="direction"]:checked')?.value;

        // Валідація
        if (!word || !clue || !direction) {
            this.showNotification('Заповніть всі поля', 'error');
            return;
        }

        if (!this.state.selectedCell) {
            this.showNotification('Виберіть початкову клітинку', 'error');
            return;
        }

        // Перевірка можливості розміщення
        if (!this.canPlaceWord(word, this.state.selectedCell.row, this.state.selectedCell.col, direction)) {
            this.showNotification('Неможливо розмістити слово в цьому місці', 'error');
            return;
        }

        // Додати слово
        const wordId = this.generateWordId();
        const wordData = {
            id: wordId,
            word: word,
            clue: clue,
            direction: direction,
            startRow: this.state.selectedCell.row,
            startCol: this.state.selectedCell.col,
            number: this.getNextWordNumber()
        };

        this.state.words.set(wordId, wordData);
        this.placeWordOnGrid(wordData);
        this.state.hasUnsavedChanges = true;

        // Очистити форму
        this.elements.wordInput.value = '';
        this.elements.clueInput.value = '';

        // Оновити UI
        this.renderGrid();
        this.updateCluesPanel();
        this.showNotification(`Слово "${word}" додано`, 'success');
        this.updateUI();
    }

    /**
     * Перевірка можливості розміщення слова
     */
    canPlaceWord(word, startRow, startCol, direction) {
        const { width, height } = this.state.gridSize;
        
        for (let i = 0; i < word.length; i++) {
            const row = direction === 'vertical' ? startRow + i : startRow;
            const col = direction === 'horizontal' ? startCol + i : startCol;
            
            // Перевірка меж
            if (row >= height || col >= width) return false;
            
            // Перевірка на заблоковані клітинки
            if (this.state.grid[row][col].blocked) return false;
            
            // Перевірка на конфлікти літер
            const existingLetter = this.state.grid[row][col].letter;
            if (existingLetter && existingLetter !== word[i]) return false;
        }
        
        return true;
    }

    /**
     * Розміщення слова на сітці
     */
    placeWordOnGrid(wordData) {
        const { word, startRow, startCol, direction, id, number } = wordData;
        
        for (let i = 0; i < word.length; i++) {
            const row = direction === 'vertical' ? startRow + i : startRow;
            const col = direction === 'horizontal' ? startCol + i : startCol;
            
            const cell = this.state.grid[row][col];
            cell.letter = word[i];
            cell.wordIds.push(id);
            cell.directions.push(direction);
            
            // Позначити початкову клітинку
            if (i === 0) {
                cell.isStart = true;
                cell.number = number;
            }
        }
    }

    /**
     * Оновлення панелі підказок
     */
    updateCluesPanel() {
        const horizontalWords = [];
        const verticalWords = [];
        
        this.state.words.forEach(wordData => {
            if (wordData.direction === 'horizontal') {
                horizontalWords.push(wordData);
            } else {
                verticalWords.push(wordData);
            }
        });
        
        // Сортування за номерами
        horizontalWords.sort((a, b) => a.number - b.number);
        verticalWords.sort((a, b) => a.number - b.number);
        
        this.renderClues(this.elements.horizontalClues, horizontalWords);
        this.renderClues(this.elements.verticalClues, verticalWords);
    }

    /**
     * Рендеринг списку підказок
     */
    renderClues(container, words) {
        if (!container) return;
        
        const html = words.map(wordData => 
            `<li data-word-id="${wordData.id}">
                <span class="clue-number">${wordData.number}.</span>
                ${wordData.clue}
            </li>`
        ).join('');
        
        container.innerHTML = html;
    }

    /**
     * Перемикання в режим гри
     */
    switchToGameMode() {
        if (this.state.words.size === 0) {
            this.showNotification('Додайте слова перед початком гри', 'error');
            return;
        }

        this.state.currentMode = 'game';
        this.clearGridLetters();
        this.elements.gameMode.style.display = 'block';
        this.elements.gridContainer.classList.add('game-mode');
        
        this.updateGameStats();
        this.showNotification('Режим гри активовано', 'info');
    }

    /**
     * Перемикання в режим редактора
     */
    switchToEditorMode() {
        this.state.currentMode = 'editor';
        this.restoreGridLetters();
        this.elements.gameMode.style.display = 'none';
        this.elements.gridContainer.classList.remove('game-mode');
        
        this.showNotification('Режим редактора активовано', 'info');
    }

    /**
     * Очищення літер з сітки для режиму гри
     */
    clearGridLetters() {
        this.state.grid.forEach(row => {
            row.forEach(cell => {
                if (cell.wordIds.length > 0) {
                    cell.gameValue = cell.letter; // Зберегти правильну відповідь
                    cell.letter = ''; // Очистити для гри
                }
            });
        });
        this.renderGrid();
    }

    /**
     * Відновлення літер після режиму гри
     */
    restoreGridLetters() {
        this.state.grid.forEach(row => {
            row.forEach(cell => {
                if (cell.gameValue) {
                    cell.letter = cell.gameValue;
                    delete cell.gameValue;
                }
            });
        });
        this.renderGrid();
    }

    /**
     * Перевірка відповідей
     */
    checkAnswers() {
        let correctCells = 0;
        let totalCells = 0;
        
        this.state.grid.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                if (cell.gameValue) { // Клітинка є частиною слова
                    totalCells++;
                    const cellElement = this.elements.gridContainer.querySelector(
                        `[data-row="${rowIndex}"][data-col="${colIndex}"]`
                    );
                    
                    if (cell.letter === cell.gameValue) {
                        correctCells++;
                        cellElement?.classList.add('correct');
                        cellElement?.classList.remove('incorrect');
                    } else {
                        cellElement?.classList.add('incorrect');
                        cellElement?.classList.remove('correct');
                    }
                }
            });
        });
        
        const percentage = Math.round((correctCells / totalCells) * 100);
        this.showNotification(`Правильно: ${correctCells}/${totalCells} (${percentage}%)`, 'info');
        this.updateGameStats();
    }

    /**
     * Показ всіх відповідей
     */
    showAnswers() {
        if (confirm('Показати всі відповіді? Це завершить гру.')) {
            this.restoreGridLetters();
            this.updateGameStats();
            this.showNotification('Всі відповіді показано', 'warning');
        }
    }

    /**
     * Оновлення статистики гри
     */
    updateGameStats() {
        const completedWords = this.getCompletedWordsCount();
        const totalWords = this.state.words.size;
        
        if (this.elements.completedWords) {
            this.elements.completedWords.textContent = `Заповнено: ${completedWords}`;
        }
        if (this.elements.totalWords) {
            this.elements.totalWords.textContent = `Всього слів: ${totalWords}`;
        }
    }

    /**
     * Підрахунок завершених слів
     */
    getCompletedWordsCount() {
        let completed = 0;
        
        this.state.words.forEach(wordData => {
            let wordCompleted = true;
            for (let i = 0; i < wordData.word.length; i++) {
                const row = wordData.direction === 'vertical' ? wordData.startRow + i : wordData.startRow;
                const col = wordData.direction === 'horizontal' ? wordData.startCol + i : wordData.startCol;
                
                if (!this.state.grid[row][col].letter) {
                    wordCompleted = false;
                    break;
                }
            }
            if (wordCompleted) completed++;
        });
        
        return completed;
    }

    /**
     * Створення нового кросворду
     */
    newCrossword() {
        if (this.state.hasUnsavedChanges) {
            if (!confirm('Є незбережені зміни. Створити новий кросворд?')) {
                return;
            }
        }

        this.state.words.clear();
        this.state.grid = [];
        this.state.selectedCell = null;
        this.state.isGridGenerated = false;
        this.state.hasUnsavedChanges = false;
        
        this.elements.gridContainer.innerHTML = '';
        this.updateCluesPanel();
        this.updateUI();
        
        this.showNotification('Новий кросворд створено', 'success');
    }

    /**
     * Збереження кросворду
     */
    saveCrossword() {
        const saveData = {
            gridSize: this.state.gridSize,
            words: Array.from(this.state.words.entries()),
            grid: this.state.grid,
            timestamp: new Date().toISOString()
        };

        try {
            localStorage.setItem('crossword_save', JSON.stringify(saveData));
            this.state.hasUnsavedChanges = false;
            this.state.lastSaveTime = new Date();
            this.showNotification('Кросворд збережено', 'success');
        } catch (error) {
            this.showNotification('Помилка збереження', 'error');
            console.error('Save error:', error);
        }
    }

    /**
     * Завантаження кросворду
     */
    loadCrossword() {
        try {
            const saveData = localStorage.getItem('crossword_save');
            if (!saveData) {
                this.showNotification('Немає збережених даних', 'warning');
                return;
            }

            const data = JSON.parse(saveData);
            
            this.state.gridSize = data.gridSize;
            this.state.words = new Map(data.words);
            this.state.grid = data.grid;
            this.state.isGridGenerated = true;
            this.state.hasUnsavedChanges = false;
            
            this.updateGridSizeInputs();
            this.renderGrid();
            this.updateCluesPanel();
            this.updateUI();
            
            this.showNotification('Кросворд завантажено', 'success');
        } catch (error) {
            this.showNotification('Помилка завантаження', 'error');
            console.error('Load error:', error);
        }
    }

    /**
     * Автоматичне збереження
     */
    setupAutoSave() {
        setInterval(() => {
            if (this.state.hasUnsavedChanges) {
                this.saveCrossword();
            }
        }, this.config.autoSaveInterval);
    }

    /**
     * Завантаження з localStorage при старті
     */
    loadFromLocalStorage() {
        const autoLoad = localStorage.getItem('crossword_autoload');
        if (autoLoad === 'true') {
            this.loadCrossword();
        }
    }

    /**
     * Показ повідомлення
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        this.elements.notifications.appendChild(notification);
        
        // Показати з анімацією
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Приховати через 3 секунди
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Допоміжні методи
     */
    validateGridSize(width, height) {
        return width >= this.config.minGridSize && 
               width <= this.config.maxGridSize && 
               height >= this.config.minGridSize && 
               height <= this.config.maxGridSize;
    }

    updateGridSizeInputs() {
        if (this.elements.gridWidth) this.elements.gridWidth.value = this.state.gridSize.width;
        if (this.elements.gridHeight) this.elements.gridHeight.value = this.state.gridSize.height;
    }

    generateWordId() {
        return 'word_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getNextWordNumber() {
        const numbers = Array.from(this.state.words.values()).map(w => w.number).filter(n => n);
        return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    }

    updateGridSize() {
        const width = parseInt(this.elements.gridWidth.value);
        const height = parseInt(this.elements.gridHeight.value);
        
        if (this.validateGridSize(width, height)) {
            this.state.gridSize = { width, height };
        }
    }

    closeModal() {
        if (this.elements.modalOverlay) {
            this.elements.modalOverlay.style.display = 'none';
        }
    }

    handleGlobalKeyPress(event) {
        // Ctrl+S для збереження
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            this.saveCrossword();
        }
        
        // Ctrl+N для нового кросворду
        if (event.ctrlKey && event.key === 'n') {
            event.preventDefault();
            this.newCrossword();
        }
        
        // Escape для закриття модальних вікон
        if (event.key === 'Escape') {
            this.closeModal();
        }
    }

    updateUI() {
        // Оновлення стану UI елементів
        const hasGrid = this.state.isGridGenerated;
        const hasWords = this.state.words.size > 0;
        
        if (this.elements.addWord) this.elements.addWord.disabled = !hasGrid;
        if (this.elements.startGame) this.elements.startGame.disabled = !hasWords;
    }

    moveToNextCell(currentRow, currentCol) {
        // Логіка для переходу до наступної клітинки слова
        // Буде реалізована детальніше в наступних ітераціях
        this.moveCell(currentRow, currentCol + 1);
    }

    moveToPreviousCell(currentRow, currentCol) {
        // Логіка для переходу до попередньої клітинки слова
        this.moveCell(currentRow, currentCol - 1);
    }

    showContextMenu(row, col, x, y) {
        // Контекстне меню для клітинок
        // Буде реалізовано в наступних ітераціях
        console.log(`Context menu для клітинки [${row}, ${col}] на позиції [${x}, ${y}]`);
    }
}

/**
 * Ініціалізація застосунку після завантаження сторінки
 */
document.addEventListener('DOMContentLoaded', () => {
    window.crosswordApp = new CrosswordApp();
});

/**
 * Глобальні утиліти
 */
window.CrosswordUtils = {
    /**
     * Перевірка чи є символ літерою
     */
    isLetter(char) {
        return /^[А-ЯІЇЄґA-Z]$/i.test(char);
    },

    /**
     * Нормалізація тексту (видалення зайвих пробілів, приведення до верхнього регістру)
     */
    normalizeText(text) {
        return text.trim().toUpperCase().replace(/\s+/g, ' ');
    },

    /**
     * Генерація випадкового ID
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Форматування дати
     */
    formatDate(date) {
        return new Intl.DateTimeFormat('uk-UA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },

    /**
     * Дебаунс функція
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Перевірка чи пересікаються два слова
     */
    wordsIntersect(word1, word2) {
        const { startRow: r1, startCol: c1, direction: d1, word: w1 } = word1;
        const { startRow: r2, startCol: c2, direction: d2, word: w2 } = word2;

        for (let i = 0; i < w1.length; i++) {
            const row1 = d1 === 'vertical' ? r1 + i : r1;
            const col1 = d1 === 'horizontal' ? c1 + i : c1;

            for (let j = 0; j < w2.length; j++) {
                const row2 = d2 === 'vertical' ? r2 + j : r2;
                const col2 = d2 === 'horizontal' ? c2 + j : c2;

                if (row1 === row2 && col1 === col2) {
                    return {
                        intersects: true,
                        letter1: w1[i],
                        letter2: w2[j],
                        position: { row: row1, col: col1 },
                        compatible: w1[i] === w2[j]
                    };
                }
            }
        }

        return { intersects: false };
    },

    /**
     * Експорт кросворду в JSON
     */
    exportToJSON(crosswordData) {
        return JSON.stringify({
            ...crosswordData,
            exportDate: new Date().toISOString(),
            version: '1.0'
        }, null, 2);
    },

    /**
     * Імпорт кросворду з JSON
     */
    importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            // Додаткова валідація структури даних
            if (!data.gridSize || !data.words || !data.grid) {
                throw new Error('Некоректна структура даних');
            }
            return data;
        } catch (error) {
            console.error('Помилка імпорту:', error);
            return null;
        }
    },

    /**
     * Валідація слова (перевірка на коректність)
     */
    validateWord(word) {
        if (!word || typeof word !== 'string') {
            return { valid: false, error: 'Слово має бути рядком' };
        }

        const normalizedWord = this.normalizeText(word);
        
        if (normalizedWord.length < 2) {
            return { valid: false, error: 'Слово занадто коротке (мінімум 2 літери)' };
        }

        if (normalizedWord.length > 20) {
            return { valid: false, error: 'Слово занадто довге (максимум 20 літер)' };
        }

        if (!/^[А-ЯІЇЄґA-Z\s]+$/i.test(normalizedWord)) {
            return { valid: false, error: 'Слово містить некоректні символи' };
        }

        return { valid: true, word: normalizedWord };
    },

    /**
     * Обчислення статистики кросворду
     */
    calculateStats(words, grid) {
        const stats = {
            totalWords: words.size,
            horizontalWords: 0,
            verticalWords: 0,
            totalLetters: 0,
            intersections: 0,
            averageWordLength: 0,
            gridDensity: 0
        };

        let totalLength = 0;
        let filledCells = 0;

        words.forEach(wordData => {
            if (wordData.direction === 'horizontal') {
                stats.horizontalWords++;
            } else {
                stats.verticalWords++;
            }
            totalLength += wordData.word.length;
        });

        // Підрахунок заповнених клітинок
        grid.forEach(row => {
            row.forEach(cell => {
                if (cell.letter) {
                    filledCells++;
                    if (cell.wordIds.length > 1) {
                        stats.intersections++;
                    }
                }
            });
        });

        stats.totalLetters = filledCells;
        stats.averageWordLength = stats.totalWords > 0 ? (totalLength / stats.totalWords).toFixed(1) : 0;
        stats.gridDensity = ((filledCells / (grid.length * grid[0].length)) * 100).toFixed(1);

        return stats;
    }
};

/**
 * Глобальні константи
 */
window.CrosswordConstants = {
    DIRECTIONS: {
        HORIZONTAL: 'horizontal',
        VERTICAL: 'vertical'
    },

    MODES: {
        EDITOR: 'editor',
        GAME: 'game'
    },

    NOTIFICATION_TYPES: {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    },

    GRID_LIMITS: {
        MIN_SIZE: 5,
        MAX_SIZE: 25,
        DEFAULT_WIDTH: 15,
        DEFAULT_HEIGHT: 15
    },

    WORD_LIMITS: {
        MIN_LENGTH: 2,
        MAX_LENGTH: 20
    },

    STORAGE_KEYS: {
        CROSSWORD_SAVE: 'crossword_save',
        AUTO_LOAD: 'crossword_autoload',
        USER_PREFERENCES: 'crossword_preferences'
    }
};