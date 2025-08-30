/**
 * GridHelper - клас для роботи з сіткою кросворду
 * Містить методи для створення, маніпуляції та аналізу сітки
 */
class GridHelper {
    constructor() {
        // Налаштування за замовчуванням
        this.config = {
            minSize: 5,
            maxSize: 25,
            defaultCellSize: 32,
            borderWidth: 1
        };
    }

    /**
     * Створення порожньої сітки
     * @param {number} width - ширина сітки
     * @param {number} height - висота сітки
     * @returns {Array} двомірний масив клітинок
     */
    createEmptyGrid(width, height) {
        if (!this.isValidSize(width, height)) {
            throw new Error(`Некоректний розмір сітки: ${width}x${height}`);
        }

        const grid = [];
        for (let row = 0; row < height; row++) {
            grid[row] = [];
            for (let col = 0; col < width; col++) {
                grid[row][col] = this.createEmptyCell(row, col);
            }
        }
        return grid;
    }

    /**
     * Створення порожньої клітинки
     * @param {number} row - рядок
     * @param {number} col - стовпець
     * @returns {Object} об'єкт клітинки
     */
    createEmptyCell(row, col) {
        return {
            row: row,
            col: col,
            letter: '',
            number: null,
            blocked: false,
            wordIds: [],
            directions: [],
            isStart: false,
            isEnd: false,
            isIntersection: false,
            gameValue: null, // для режиму гри
            userInput: '', // введення користувача
            isCorrect: null, // результат перевірки
            highlighted: false,
            selected: false,
            metadata: {} // додаткові дані
        };
    }

    /**
     * Перевірка валідності розміру сітки
     * @param {number} width - ширина
     * @param {number} height - висота
     * @returns {boolean}
     */
    isValidSize(width, height) {
        return Number.isInteger(width) && 
               Number.isInteger(height) &&
               width >= this.config.minSize && 
               width <= this.config.maxSize &&
               height >= this.config.minSize && 
               height <= this.config.maxSize;
    }

    /**
     * Перевірка чи знаходиться координата в межах сітки
     * @param {Array} grid - сітка
     * @param {number} row - рядок
     * @param {number} col - стовпець
     * @returns {boolean}
     */
    isValidPosition(grid, row, col) {
        return row >= 0 && 
               row < grid.length && 
               col >= 0 && 
               col < grid[0].length;
    }

    /**
     * Отримання клітинки за координатами
     * @param {Array} grid - сітка
     * @param {number} row - рядок
     * @param {number} col - стовпець
     * @returns {Object|null} клітинка або null
     */
    getCell(grid, row, col) {
        if (!this.isValidPosition(grid, row, col)) {
            return null;
        }
        return grid[row][col];
    }

    /**
     * Встановлення значення клітинки
     * @param {Array} grid - сітка
     * @param {number} row - рядок
     * @param {number} col - стовпець
     * @param {string} letter - літера
     * @returns {boolean} успішність операції
     */
    setCell(grid, row, col, letter) {
        const cell = this.getCell(grid, row, col);
        if (!cell || cell.blocked) {
            return false;
        }
        
        cell.letter = letter.toUpperCase();
        cell.userInput = letter.toUpperCase();
        return true;
    }

    /**
     * Блокування клітинки
     * @param {Array} grid - сітка
     * @param {number} row - рядок
     * @param {number} col - стовпець
     * @returns {boolean} успішність операції
     */
    blockCell(grid, row, col) {
        const cell = this.getCell(grid, row, col);
        if (!cell) return false;

        cell.blocked = true;
        cell.letter = '';
        cell.number = null;
        cell.wordIds = [];
        cell.directions = [];
        cell.isStart = false;
        cell.isEnd = false;
        
        return true;
    }

    /**
     * Розблокування клітинки
     * @param {Array} grid - сітка
     * @param {number} row - рядок
     * @param {number} col - стовпець
     * @returns {boolean} успішність операції
     */
    unblockCell(grid, row, col) {
        const cell = this.getCell(grid, row, col);
        if (!cell) return false;

        cell.blocked = false;
        return true;
    }

    /**
     * Очищення всіх літер з сітки
     * @param {Array} grid - сітка
     * @param {boolean} keepAnswers - зберегти правильні відповіді
     */
    clearGrid(grid, keepAnswers = false) {
        grid.forEach(row => {
            row.forEach(cell => {
                if (!cell.blocked) {
                    if (keepAnswers) {
                        cell.gameValue = cell.letter;
                    }
                    cell.letter = '';
                    cell.userInput = '';
                    cell.isCorrect = null;
                    cell.highlighted = false;
                    cell.selected = false;
                }
            });
        });
    }

    /**
     * Перевірка можливості розміщення слова
     * @param {Array} grid - сітка
     * @param {string} word - слово
     * @param {number} startRow - початковий рядок
     * @param {number} startCol - початковий стовпець
     * @param {string} direction - напрямок ('horizontal' або 'vertical')
     * @returns {Object} результат перевірки
     */
    canPlaceWord(grid, word, startRow, startCol, direction) {
        const result = {
            canPlace: false,
            conflicts: [],
            intersections: [],
            reason: ''
        };

        // Перевірка довжини слова
        if (!word || word.length < 2) {
            result.reason = 'Слово занадто коротке';
            return result;
        }

        // Перевірка напрямку
        if (!['horizontal', 'vertical'].includes(direction)) {
            result.reason = 'Некоректний напрямок';
            return result;
        }

        // Перевірка початкової позиції
        if (!this.isValidPosition(grid, startRow, startCol)) {
            result.reason = 'Початкова позиція поза межами сітки';
            return result;
        }

        // Перевірка кожної літери слова
        for (let i = 0; i < word.length; i++) {
            const row = direction === 'vertical' ? startRow + i : startRow;
            const col = direction === 'horizontal' ? startCol + i : startCol;

            // Перевірка меж сітки
            if (!this.isValidPosition(grid, row, col)) {
                result.reason = `Слово виходить за межі сітки на позиції ${i}`;
                return result;
            }

            const cell = this.getCell(grid, row, col);

            // Перевірка на заблоковані клітинки
            if (cell.blocked) {
                result.reason = `Клітинка [${row}, ${col}] заблокована`;
                return result;
            }

            // Перевірка на конфлікти літер
            if (cell.letter && cell.letter !== word[i]) {
                result.conflicts.push({
                    position: { row, col },
                    existing: cell.letter,
                    required: word[i]
                });
            }

            // Знайдення пересічень
            if (cell.letter && cell.letter === word[i]) {
                result.intersections.push({
                    position: { row, col },
                    letter: word[i]
                });
            }
        }

        // Перевірка на надмірні пересічення (слово не може повністю збігатися з існуючим)
        if (result.intersections.length === word.length) {
            result.reason = 'Слово повністю збігається з існуючим';
            return result;
        }

        // Якщо є конфлікти, слово не можна розмістити
        if (result.conflicts.length > 0) {
            result.reason = `Конфлікти літер: ${result.conflicts.length}`;
            return result;
        }

        // Перевірка на ізольованість (слово повинно мати хоча б одне пересічення, якщо це не перше слово)
        const hasWordsOnGrid = this.hasWordsOnGrid(grid);
        if (hasWordsOnGrid && result.intersections.length === 0) {
            result.reason = 'Слово повинно пересікатися з існуючими словами';
            return result;
        }

        result.canPlace = true;
        return result;
    }

    /**
     * Розміщення слова на сітці
     * @param {Array} grid - сітка
     * @param {Object} wordData - дані слова
     * @returns {boolean} успішність операції
     */
    placeWord(grid, wordData) {
        const { word, startRow, startCol, direction, id, number } = wordData;

        // Додаткова перевірка
        const canPlace = this.canPlaceWord(grid, word, startRow, startCol, direction);
        if (!canPlace.canPlace) {
            console.warn('Не вдалось розмістити слово:', canPlace.reason);
            return false;
        }

        // Розміщення літер
        for (let i = 0; i < word.length; i++) {
            const row = direction === 'vertical' ? startRow + i : startRow;
            const col = direction === 'horizontal' ? startCol + i : startCol;
            const cell = this.getCell(grid, row, col);

            cell.letter = word[i];
            
            // Додати ID слова до клітинки
            if (!cell.wordIds.includes(id)) {
                cell.wordIds.push(id);
            }

            // Додати напрямок
            if (!cell.directions.includes(direction)) {
                cell.directions.push(direction);
            }

            // Позначити пересічення
            if (cell.wordIds.length > 1) {
                cell.isIntersection = true;
            }

            // Позначити початок та кінець слова
            if (i === 0) {
                cell.isStart = true;
                cell.number = number;
            }
            if (i === word.length - 1) {
                cell.isEnd = true;
            }
        }

        return true;
    }

    /**
     * Видалення слова з сітки
     * @param {Array} grid - сітка
     * @param {string} wordId - ID слова
     * @returns {boolean} успішність операції
     */
    removeWord(grid, wordId) {
        let removed = false;

        grid.forEach(row => {
            row.forEach(cell => {
                const wordIndex = cell.wordIds.indexOf(wordId);
                if (wordIndex !== -1) {
                    // Видалити ID слова з клітинки
                    cell.wordIds.splice(wordIndex, 1);
                    
                    // Якщо це була остання літера в клітинці
                    if (cell.wordIds.length === 0) {
                        cell.letter = '';
                        cell.number = null;
                        cell.directions = [];
                        cell.isStart = false;
                        cell.isEnd = false;
                        cell.isIntersection = false;
                    } else {
                        // Оновити статус пересічення
                        cell.isIntersection = cell.wordIds.length > 1;
                    }
                    
                    removed = true;
                }
            });
        });

        return removed;
    }

    /**
     * Перевірка чи є слова на сітці
     * @param {Array} grid - сітка
     * @returns {boolean}
     */
    hasWordsOnGrid(grid) {
        return grid.some(row => 
            row.some(cell => 
                cell.letter && cell.wordIds.length > 0
            )
        );
    }

    /**
     * Отримання всіх заповнених клітинок
     * @param {Array} grid - сітка
     * @returns {Array} масив заповнених клітинок
     */
    getFilledCells(grid) {
        const filledCells = [];
        
        grid.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                if (cell.letter && !cell.blocked) {
                    filledCells.push({
                        ...cell,
                        row: rowIndex,
                        col: colIndex
                    });
                }
            });
        });

        return filledCells;
    }

    /**
     * Отримання клітинок слова
     * @param {Array} grid - сітка
     * @param {Object} wordData - дані слова
     * @returns {Array} масив клітинок слова
     */
    getWordCells(grid, wordData) {
        const { word, startRow, startCol, direction } = wordData;
        const cells = [];

        for (let i = 0; i < word.length; i++) {
            const row = direction === 'vertical' ? startRow + i : startRow;
            const col = direction === 'horizontal' ? startCol + i : startCol;
            const cell = this.getCell(grid, row, col);
            
            if (cell) {
                cells.push({
                    ...cell,
                    row: row,
                    col: col,
                    letterIndex: i
                });
            }
        }

        return cells;
    }

    /**
     * Виділення слова на сітці
     * @param {Array} grid - сітка
     * @param {Object} wordData - дані слова
     * @param {boolean} highlight - виділити чи зняти виділення
     */
    highlightWord(grid, wordData, highlight = true) {
        const cells = this.getWordCells(grid, wordData);
        
        cells.forEach(cell => {
            const gridCell = this.getCell(grid, cell.row, cell.col);
            if (gridCell) {
                gridCell.highlighted = highlight;
            }
        });
    }

    /**
     * Очищення всіх виділень
     * @param {Array} grid - сітка
     */
    clearHighlights(grid) {
        grid.forEach(row => {
            row.forEach(cell => {
                cell.highlighted = false;
                cell.selected = false;
            });
        });
    }

    /**
     * Автоматичне розміщення слів (простий алгоритм)
     * @param {Array} grid - сітка
     * @param {Array} words - масив слів для розміщення
     * @returns {Array} масив успішно розміщених слів
     */
    autoPlaceWords(grid, words) {
        const placedWords = [];
        const sortedWords = words.sort((a, b) => b.word.length - a.word.length);

        // Розмістити перше (найдовше) слово по центру
        if (sortedWords.length > 0) {
            const firstWord = sortedWords[0];
            const centerRow = Math.floor(grid.length / 2);
            const centerCol = Math.floor((grid[0].length - firstWord.word.length) / 2);
            
            firstWord.startRow = centerRow;
            firstWord.startCol = centerCol;
            firstWord.direction = 'horizontal';
            
            if (this.placeWord(grid, firstWord)) {
                placedWords.push(firstWord);
            }
        }

        // Спробувати розмістити інші слова
        for (let i = 1; i < sortedWords.length; i++) {
            const word = sortedWords[i];
            let placed = false;

            // Спробувати знайти місце для пересічення
            for (const placedWord of placedWords) {
                if (placed) break;

                const intersections = this.findPossibleIntersections(word.word, placedWord);
                
                for (const intersection of intersections) {
                    const newWordData = {
                        ...word,
                        startRow: intersection.startRow,
                        startCol: intersection.startCol,
                        direction: intersection.direction
                    };

                    if (this.canPlaceWord(grid, word.word, intersection.startRow, intersection.startCol, intersection.direction).canPlace) {
                        if (this.placeWord(grid, newWordData)) {
                            placedWords.push(newWordData);
                            placed = true;
                            break;
                        }
                    }
                }
            }
        }

        return placedWords;
    }

    /**
     * Знаходження можливих пересічень між словами
     * @param {string} newWord - нове слово
     * @param {Object} existingWord - існуюче слово
     * @returns {Array} масив можливих пересічень
     */
    findPossibleIntersections(newWord, existingWord) {
        const intersections = [];
        
        for (let i = 0; i < newWord.length; i++) {
            for (let j = 0; j < existingWord.word.length; j++) {
                if (newWord[i] === existingWord.word[j]) {
                    // Перпендикулярне розміщення
                    const newDirection = existingWord.direction === 'horizontal' ? 'vertical' : 'horizontal';
                    
                    let startRow, startCol;
                    
                    if (existingWord.direction === 'horizontal') {
                        // Існуюче слово горизонтальне, нове вертикальне
                        startRow = existingWord.startRow - i;
                        startCol = existingWord.startCol + j;
                    } else {
                        // Існуюче слово вертикальне, нове горизонтальне
                        startRow = existingWord.startRow + j;
                        startCol = existingWord.startCol - i;
                    }

                    intersections.push({
                        startRow: startRow,
                        startCol: startCol,
                        direction: newDirection,
                        intersectionLetter: newWord[i],
                        intersectionPos: { i, j }
                    });
                }
            }
        }

        return intersections;
    }

    /**
     * Обчислення статистики сітки
     * @param {Array} grid - сітка
     * @returns {Object} статистика
     */
    calculateGridStats(grid) {
        const stats = {
            totalCells: grid.length * grid[0].length,
            filledCells: 0,
            blockedCells: 0,
            intersections: 0,
            startCells: 0,
            density: 0
        };

        grid.forEach(row => {
            row.forEach(cell => {
                if (cell.blocked) {
                    stats.blockedCells++;
                } else if (cell.letter) {
                    stats.filledCells++;
                    
                    if (cell.isIntersection) {
                        stats.intersections++;
                    }
                    
                    if (cell.isStart) {
                        stats.startCells++;
                    }
                }
            });
        });

        stats.density = ((stats.filledCells / stats.totalCells) * 100).toFixed(1);
        
        return stats;
    }

    /**
     * Експорт сітки в різні формати
     * @param {Array} grid - сітка
     * @param {string} format - формат ('text', 'json', 'csv')
     * @returns {string} експортовані дані
     */
    exportGrid(grid, format = 'text') {
        switch (format) {
            case 'text':
                return this.exportGridAsText(grid);
            case 'json':
                return JSON.stringify(grid, null, 2);
            case 'csv':
                return this.exportGridAsCSV(grid);
            default:
                throw new Error(`Невідомий формат: ${format}`);
        }
    }

    /**
     * Експорт сітки як текст
     * @param {Array} grid - сітка
     * @returns {string} текстове представлення
     */
    exportGridAsText(grid) {
        return grid.map(row => 
            row.map(cell => {
                if (cell.blocked) return '█';
                if (cell.letter) return cell.letter;
                return '·';
            }).join(' ')
        ).join('\n');
    }

    /**
     * Експорт сітки як CSV
     * @param {Array} grid - сітка
     * @returns {string} CSV представлення
     */
    exportGridAsCSV(grid) {
        const headers = ['row', 'col', 'letter', 'number', 'blocked', 'wordIds'];
        const rows = [headers.join(',')];

        grid.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                const csvRow = [
                    rowIndex,
                    colIndex,
                    `"${cell.letter}"`,
                    cell.number || '',
                    cell.blocked,
                    `"${cell.wordIds.join(';')}"`
                ];
                rows.push(csvRow.join(','));
            });
        });

        return rows.join('\n');
    }

    /**
     * Клонування сітки
     * @param {Array} grid - сітка для клонування
     * @returns {Array} клон сітки
     */
    cloneGrid(grid) {
        return grid.map(row => 
            row.map(cell => ({...cell, wordIds: [...cell.wordIds], directions: [...cell.directions]}))
        );
    }
}

// Створення глобального екземпляра
window.GridHelper = new GridHelper();

// Експорт для використання в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GridHelper;
}