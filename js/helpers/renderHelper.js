/**
 * RenderHelper - клас для рендерингу елементів кросворду
 * Містить методи для створення HTML та управління відображенням
 */
class RenderHelper {
    constructor() {
        // Налаштування рендерингу
        this.config = {
            cellSize: 32,
            cellBorderWidth: 1,
            numberFontSize: 10,
            letterFontSize: 14,
            animationDuration: 300,
            highlightDuration: 150,
            themes: {
                light: {
                    cellBg: '#ffffff',
                    cellBorder: '#e2e8f0',
                    blockedBg: '#374151',
                    activeBg: '#dbeafe',
                    numberColor: '#64748b',
                    letterColor: '#1e293b'
                },
                dark: {
                    cellBg: '#1e293b',
                    cellBorder: '#475569',
                    blockedBg: '#0f172a',
                    activeBg: '#1e40af',
                    numberColor: '#94a3b8',
                    letterColor: '#f1f5f9'
                }
            }
        };

        // Поточна тема
        this.currentTheme = 'light';

        // Кеш для елементів
        this.elementCache = new Map();

        // Обробники анімацій
        this.animationQueue = [];
        this.isAnimating = false;
    }

    /**
     * Рендеринг сітки кросворду
     * @param {Array} grid - дані сітки
     * @param {HTMLElement} container - контейнер для сітки
     * @param {Object} options - опції рендерингу
     * @returns {HTMLElement} створена сітка
     */
    renderGrid(grid, container, options = {}) {
        const defaultOptions = {
            interactive: true,
            showNumbers: true,
            showLetters: true,
            editable: true,
            className: 'crossword-grid'
        };

        const config = { ...defaultOptions, ...options };
        
        // Очистити контейнер
        container.innerHTML = '';

        // Створити сітку
        const gridElement = this.createGridElement(grid, config);
        container.appendChild(gridElement);

        // Налаштувати CSS Grid
        const { width, height } = this.getGridDimensions(grid);
        gridElement.style.gridTemplateColumns = `repeat(${width}, ${this.config.cellSize}px)`;
        gridElement.style.gridTemplateRows = `repeat(${height}, ${this.config.cellSize}px)`;

        // Додати обробники подій, якщо інтерактивна
        if (config.interactive) {
            this.attachGridEventListeners(gridElement, grid);
        }

        return gridElement;
    }

    /**
     * Створення HTML елемента сітки
     * @param {Array} grid - дані сітки
     * @param {Object} config - конфігурація
     * @returns {HTMLElement} елемент сітки
     */
    createGridElement(grid, config) {
        const gridElement = document.createElement('div');
        gridElement.className = config.className;
        
        grid.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                const cellElement = this.createCellElement(cell, rowIndex, colIndex, config);
                gridElement.appendChild(cellElement);
            });
        });

        return gridElement;
    }

    /**
     * Створення HTML елемента клітинки
     * @param {Object} cell - дані клітинки
     * @param {number} row - індекс рядка
     * @param {number} col - індекс стовпця
     * @param {Object} config - конфігурація
     * @returns {HTMLElement} елемент клітинки
     */
    createCellElement(cell, row, col, config) {
        const cellDiv = document.createElement('div');
        cellDiv.className = this.getCellClassName(cell);
        cellDiv.dataset.row = row;
        cellDiv.dataset.col = col;

        // Додати номер клітинки
        if (config.showNumbers && cell.number) {
            const numberSpan = document.createElement('span');
            numberSpan.className = 'cell-number';
            numberSpan.textContent = cell.number;
            cellDiv.appendChild(numberSpan);
        }

        // Додати поле введення
        if (!cell.blocked && config.editable) {
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.value = config.showLetters ? cell.letter : '';
            input.className = 'cell-input';
            
            if (!config.showLetters && cell.letter) {
                input.placeholder = '•';
            }

            cellDiv.appendChild(input);
        } else if (!cell.blocked && config.showLetters && cell.letter) {
            // Для неедітованих клітинок показати літеру як текст
            const letterSpan = document.createElement('span');
            letterSpan.className = 'cell-letter';
            letterSpan.textContent = cell.letter;
            cellDiv.appendChild(letterSpan);
        }

        // Додати індикатори прогресу
        if (cell.wordIds && cell.wordIds.length > 0) {
            const progressDiv = document.createElement('div');
            progressDiv.className = 'progress-indicator';
            cellDiv.appendChild(progressDiv);
        }

        return cellDiv;
    }

    /**
     * Отримання класів CSS для клітинки
     * @param {Object} cell - дані клітинки
     * @returns {string} рядок класів
     */
    getCellClassName(cell) {
        const classes = ['grid-cell'];

        if (cell.blocked) classes.push('blocked');
        if (cell.selected) classes.push('active');
        if (cell.highlighted) classes.push('highlighted');
        if (cell.letter) classes.push('filled');
        if (cell.isStart) classes.push('start');
        if (cell.isEnd) classes.push('end');
        if (cell.isIntersection) classes.push('intersection');
        if (cell.isCorrect === true) classes.push('correct');
        if (cell.isCorrect === false) classes.push('incorrect');

        // Додати класи для напрямків
        if (cell.directions) {
            cell.directions.forEach(direction => {
                classes.push(`word-${direction}`);
            });
        }

        return classes.join(' ');
    }

    /**
     * Оновлення клітинки
     * @param {HTMLElement} gridElement - елемент сітки
     * @param {number} row - рядок
     * @param {number} col - стовпець
     * @param {Object} cellData - нові дані клітинки
     * @param {boolean} animate - чи застосувати анімацію
     */
    updateCell(gridElement, row, col, cellData, animate = false) {
        const cellElement = gridElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (!cellElement) return;

        // Оновити класи
        cellElement.className = this.getCellClassName(cellData);
        cellElement.classList.add('grid-cell'); // Завжди зберігати базовий клас

        // Оновити літеру
        const input = cellElement.querySelector('.cell-input');
        const letterSpan = cellElement.querySelector('.cell-letter');
        
        if (input) {
            input.value = cellData.letter || '';
        } else if (letterSpan) {
            letterSpan.textContent = cellData.letter || '';
        }

        // Оновити номер
        const numberSpan = cellElement.querySelector('.cell-number');
        if (numberSpan) {
            numberSpan.textContent = cellData.number || '';
            numberSpan.style.display = cellData.number ? 'block' : 'none';
        }

        // Анімація оновлення
        if (animate) {
            this.animateCellUpdate(cellElement);
        }
    }

    /**
     * Рендеринг списку підказок
     * @param {Array} words - масив слів
     * @param {HTMLElement} container - контейнер
     * @param {string} direction - напрямок ('horizontal' або 'vertical')
     * @param {Object} options - опції рендерингу
     */
    renderCluesList(words, container, direction, options = {}) {
        const defaultOptions = {
            interactive: true,
            showAnswers: false,
            numbered: true
        };

        const config = { ...defaultOptions, ...options };
        
        // Фільтрувати слова за напрямком
        const filteredWords = words.filter(word => word.direction === direction);
        
        // Сортувати за номерами
        filteredWords.sort((a, b) => (a.number || 0) - (b.number || 0));

        // Очистити контейнер
        container.innerHTML = '';

        if (filteredWords.length === 0) {
            container.innerHTML = '<li class="no-clues">Підказок немає</li>';
            return;
        }

        // Створити список
        const listHTML = filteredWords.map(word => 
            this.createClueItemHTML(word, config)
        ).join('');

        container.innerHTML = listHTML;

        // Додати обробники подій
        if (config.interactive) {
            this.attachCluesEventListeners(container, filteredWords);
        }
    }

    /**
     * Створення HTML для елемента підказки
     * @param {Object} word - дані слова
     * @param {Object} config - конфігурація
     * @returns {string} HTML рядок
     */
    createClueItemHTML(word, config) {
        const number = config.numbered && word.number ? `${word.number}.` : '';
        const answer = config.showAnswers ? ` <span class="clue-answer">(${word.word})</span>` : '';
        const difficulty = word.difficulty ? `data-difficulty="${word.difficulty}"` : '';
        
        return `
            <li class="clue-item" 
                data-word-id="${word.id}" 
                data-direction="${word.direction}"
                ${difficulty}>
                <span class="clue-number">${number}</span>
                <span class="clue-text">${word.clue}</span>
                ${answer}
                <div class="clue-progress"></div>
            </li>
        `;
    }

    /**
     * Оновлення прогресу підказки
     * @param {HTMLElement} container - контейнер підказок
     * @param {string} wordId - ID слова
     * @param {number} progress - прогрес (0-1)
     */
    updateClueProgress(container, wordId, progress) {
        const clueItem = container.querySelector(`[data-word-id="${wordId}"]`);
        if (!clueItem) return;

        const progressBar = clueItem.querySelector('.clue-progress');
        if (progressBar) {
            progressBar.style.width = `${progress * 100}%`;
            
            // Додати класи стану
            clueItem.classList.toggle('completed', progress === 1);
            clueItem.classList.toggle('in-progress', progress > 0 && progress < 1);
        }
    }

    /**
     * Виділення слова на сітці
     * @param {HTMLElement} gridElement - елемент сітки
     * @param {Object} wordData - дані слова
     * @param {boolean} highlight - виділити чи зняти виділення
     * @param {boolean} animate - чи застосувати анімацію
     */
    highlightWord(gridElement, wordData, highlight = true, animate = false) {
        const { word, startRow, startCol, direction } = wordData;
        
        for (let i = 0; i < word.length; i++) {
            const row = direction === 'vertical' ? startRow + i : startRow;
            const col = direction === 'horizontal' ? startCol + i : startCol;
            
            const cellElement = gridElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cellElement) {
                if (highlight) {
                    cellElement.classList.add('word-highlight');
                    if (animate) {
                        this.animateCellHighlight(cellElement, i * 50); // Затримка для послідовної анімації
                    }
                } else {
                    cellElement.classList.remove('word-highlight');
                }
            }
        }
    }

    /**
     * Очищення всіх виділень
     * @param {HTMLElement} gridElement - елемент сітки
     */
    clearHighlights(gridElement) {
        gridElement.querySelectorAll('.word-highlight, .highlighted, .active').forEach(cell => {
            cell.classList.remove('word-highlight', 'highlighted', 'active');
        });
    }

    /**
     * Рендеринг статистики
     * @param {Object} stats - статистичні дані
     * @param {HTMLElement} container - контейнер
     */
    renderStatistics(stats, container) {
        const statsHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${stats.totalWords || 0}</div>
                    <div class="stat-label">Всього слів</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.filledCells || 0}</div>
                    <div class="stat-label">Заповнених клітинок</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.intersections || 0}</div>
                    <div class="stat-label">Пересічень</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.density || 0}%</div>
                    <div class="stat-label">Щільність</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.averageLength || 0}</div>
                    <div class="stat-label">Середня довжина</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.averageDifficulty || 0}</div>
                    <div class="stat-label">Складність</div>
                </div>
            </div>
        `;
        
        container.innerHTML = statsHTML;
    }

    /**
     * Створення контекстного меню
     * @param {Array} menuItems - елементи меню
     * @param {number} x - координата X
     * @param {number} y - координата Y
     * @returns {HTMLElement} елемент меню
     */
    createContextMenu(menuItems, x, y) {
        // Видалити існуюче меню
        this.removeContextMenu();

        const menu = document.createElement('div');
        menu.className = 'context-menu show';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        const menuHTML = menuItems.map(item => {
            if (item.divider) {
                return '<div class="context-menu-divider"></div>';
            }
            
            const disabled = item.disabled ? 'disabled' : '';
            const icon = item.icon ? `<i class="${item.icon}"></i>` : '';
            
            return `
                <div class="context-menu-item ${disabled}" data-action="${item.action}">
                    ${icon}
                    ${item.label}
                </div>
            `;
        }).join('');

        menu.innerHTML = menuHTML;
        document.body.appendChild(menu);

        // Додати обробник для закриття меню
        setTimeout(() => {
            document.addEventListener('click', this.handleContextMenuClick.bind(this));
        }, 10);

        return menu;
    }

    /**
     * Видалення контекстного меню
     */
    removeContextMenu() {
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
            document.removeEventListener('click', this.handleContextMenuClick);
        }
    }

    /**
     * Обробка кліків по контекстному меню
     * @param {Event} event - подія кліку
     */
    handleContextMenuClick(event) {
        const menu = event.target.closest('.context-menu');
        if (!menu) {
            this.removeContextMenu();
            return;
        }

        const menuItem = event.target.closest('.context-menu-item');
        if (menuItem && !menuItem.classList.contains('disabled')) {
            const action = menuItem.dataset.action;
            this.removeContextMenu();
            
            // Відправити подію з дією
            document.dispatchEvent(new CustomEvent('contextMenuAction', {
                detail: { action: action }
            }));
        }
    }

    /**
     * Показ сповіщення
     * @param {string} message - повідомлення
     * @param {string} type - тип ('success', 'error', 'warning', 'info')
     * @param {number} duration - тривалість показу (мс)
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Знайти контейнер або створити його
        let container = document.querySelector('.notifications-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notifications-container';
            document.body.appendChild(container);
        }

        container.appendChild(notification);

        // Показати з анімацією
        setTimeout(() => notification.classList.add('show'), 10);

        // Приховати через заданий час
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    /**
     * Створення лоадера
     * @param {HTMLElement} container - контейнер
     * @param {string} message - повідомлення
     * @returns {HTMLElement} елемент лоадера
     */
    showLoader(container, message = 'Завантаження...') {
        const loader = document.createElement('div');
        loader.className = 'loading-overlay show';
        loader.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            </div>
        `;

        container.appendChild(loader);
        return loader;
    }

    /**
     * Приховування лоадера
     * @param {HTMLElement} loader - елемент лоадера
     */
    hideLoader(loader) {
        if (loader) {
            loader.classList.remove('show');
            setTimeout(() => loader.remove(), 300);
        }
    }

    /**
     * Анімація оновлення клітинки
     * @param {HTMLElement} cellElement - елемент клітинки
     */
    animateCellUpdate(cellElement) {
        cellElement.classList.add('pulse');
        setTimeout(() => cellElement.classList.remove('pulse'), this.config.animationDuration);
    }

    /**
     * Анімація виділення клітинки
     * @param {HTMLElement} cellElement - елемент клітинки
     * @param {number} delay - затримка анімації
     */
    animateCellHighlight(cellElement, delay = 0) {
        setTimeout(() => {
            cellElement.style.transform = 'scale(1.1)';
            setTimeout(() => {
                cellElement.style.transform = 'scale(1)';
            }, this.config.highlightDuration);
        }, delay);
    }

    /**
     * Анімація правильної відповіді
     * @param {HTMLElement} cellElement - елемент клітинки
     */
    animateCorrectAnswer(cellElement) {
        cellElement.classList.add('correct-animation');
        setTimeout(() => {
            cellElement.classList.remove('correct-animation');
        }, 600);
    }

    /**
     * Анімація неправильної відповіді
     * @param {HTMLElement} cellElement - елемент клітинки
     */
    animateIncorrectAnswer(cellElement) {
        cellElement.classList.add('shake');
        setTimeout(() => {
            cellElement.classList.remove('shake');
        }, 500);
    }

    /**
     * Отримання розмірів сітки
     * @param {Array} grid - дані сітки
     * @returns {Object} розміри {width, height}
     */
    getGridDimensions(grid) {
        return {
            height: grid.length,
            width: grid.length > 0 ? grid[0].length : 0
        };
    }

    /**
     * Налаштування обробників подій для сітки
     * @param {HTMLElement} gridElement - елемент сітки
     * @param {Array} grid - дані сітки
     */
    attachGridEventListeners(gridElement, grid) {
        gridElement.addEventListener('click', (event) => {
            const cell = event.target.closest('.grid-cell');
            if (cell) {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                
                document.dispatchEvent(new CustomEvent('cellClick', {
                    detail: { row, col, element: cell }
                }));
            }
        });

        gridElement.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            const cell = event.target.closest('.grid-cell');
            if (cell) {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                
                document.dispatchEvent(new CustomEvent('cellRightClick', {
                    detail: { 
                        row, 
                        col, 
                        element: cell,
                        x: event.clientX,
                        y: event.clientY
                    }
                }));
            }
        });

        // Обробник введення тексту
        gridElement.addEventListener('input', (event) => {
            if (event.target.classList.contains('cell-input')) {
                const cell = event.target.closest('.grid-cell');
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                const value = event.target.value.toUpperCase();
                
                document.dispatchEvent(new CustomEvent('cellInput', {
                    detail: { row, col, value, element: cell }
                }));
            }
        });
    }

    /**
     * Налаштування обробників подій для підказок
     * @param {HTMLElement} container - контейнер підказок
     * @param {Array} words - масив слів
     */
    attachCluesEventListeners(container, words) {
        container.addEventListener('click', (event) => {
            const clueItem = event.target.closest('.clue-item');
            if (clueItem) {
                const wordId = clueItem.dataset.wordId;
                const word = words.find(w => w.id === wordId);
                
                if (word) {
                    document.dispatchEvent(new CustomEvent('clueClick', {
                        detail: { word, element: clueItem }
                    }));
                }
            }
        });
    }

    /**
     * Зміна теми
     * @param {string} theme - назва теми ('light' або 'dark')
     */
    setTheme(theme) {
        if (this.config.themes[theme]) {
            this.currentTheme = theme;
            document.body.dataset.theme = theme;
            
            // Оновити CSS змінні
            const themeConfig = this.config.themes[theme];
            const root = document.documentElement;
            
            Object.entries(themeConfig).forEach(([key, value]) => {
                root.style.setProperty(`--theme-${key}`, value);
            });
        }
    }

    /**
     * Експорт сітки як зображення
     * @param {HTMLElement} gridElement - елемент сітки
     * @param {string} format - формат ('png', 'jpeg')
     * @returns {Promise<Blob>} зображення у вигляді Blob
     */
    async exportAsImage(gridElement, format = 'png') {
        // Використовуємо html2canvas для конвертації DOM в зображення
        // Це потребує підключення додаткової бібліотеки
        try {
            const canvas = await html2canvas(gridElement);
            return new Promise(resolve => {
                canvas.toBlob(resolve, `image/${format}`);
            });
        } catch (error) {
            console.error('Помилка експорту зображення:', error);
            throw error;
        }
    }

    /**
     * Очищення кешу елементів
     */
    clearCache() {
        this.elementCache.clear();
    }

    /**
     * Знищення рендерера та очищення ресурсів
     */
    destroy() {
        this.clearCache();
        this.removeContextMenu();
        this.animationQueue = [];
        this.isAnimating = false;
    }
}

// Створення глобального екземпляра
window.RenderHelper = new RenderHelper();

// Експорт для використання в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RenderHelper;
}