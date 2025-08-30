/**
 * GridValidator - клас для валідації сітки кросворду
 * Містить методи для перевірки коректності, цілісності та оптимальності сітки
 */
class GridValidator {
    constructor() {
        // Правила валідації
        this.rules = {
            minGridSize: 5,
            maxGridSize: 25,
            minWordLength: 2,
            maxWordLength: 25,
            minWordsCount: 2,
            maxWordsCount: 100,
            minDensity: 0.1,        // Мінімальна щільність заповнення
            maxDensity: 0.8,        // Максимальна щільність заповнення
            minIntersections: 1,    // Мінімальна кількість пересічень на слово
            maxIsolatedCells: 0,    // Максимальна кількість ізольованих клітинок
            symmetryTolerance: 0.2  // Толерантність для перевірки симетрії
        };

        // Рівні строгості валідації
        this.strictnessLevels = {
            RELAXED: 'relaxed',
            NORMAL: 'normal',
            STRICT: 'strict'
        };

        // Поточний рівень строгості
        this.currentStrictness = this.strictnessLevels.NORMAL;

        // Кеш результатів валідації
        this.validationCache = new Map();
    }

    /**
     * Основний метод валідації сітки
     * @param {Array} grid - дані сітки
     * @param {Map} words - карта слів
     * @param {string} strictness - рівень строгості
     * @returns {Object} результат валідації
     */
    validateGrid(grid, words, strictness = this.strictnessLevels.NORMAL) {
        const cacheKey = this.generateCacheKey(grid, words, strictness);
        
        // Перевірити кеш
        if (this.validationCache.has(cacheKey)) {
            return this.validationCache.get(cacheKey);
        }

        this.currentStrictness = strictness;
        
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            score: 0,
            details: {}
        };

        try {
            // Базові перевірки структури
            this.validateGridStructure(grid, result);
            
            // Перевірка розмірів
            this.validateGridSize(grid, result);
            
            // Перевірка слів
            this.validateWords(words, result);
            
            // Перевірка розміщення слів на сітці
            this.validateWordPlacements(grid, words, result);
            
            // Перевірка пересічень
            this.validateIntersections(grid, words, result);
            
            // Перевірка цілісності
            this.validateGridIntegrity(grid, words, result);
            
            // Перевірка щільності
            this.validateDensity(grid, result);
            
            // Перевірка ізольованих елементів
            this.validateIsolation(grid, words, result);
            
            // Аналіз якості
            this.analyzeGridQuality(grid, words, result);
            
            // Обчислення загального балу
            result.score = this.calculateOverallScore(result);
            
            // Загальний висновок
            result.isValid = result.errors.length === 0;

        } catch (error) {
            result.isValid = false;
            result.errors.push(`Критична помилка валідації: ${error.message}`);
            result.score = 0;
        }

        // Зберегти в кеш
        this.validationCache.set(cacheKey, result);
        
        return result;
    }

    /**
     * Валідація структури сітки
     * @param {Array} grid - сітка
     * @param {Object} result - результат валідації
     */
    validateGridStructure(grid, result) {
        // Перевірка на існування
        if (!Array.isArray(grid)) {
            result.errors.push('Сітка має бути масивом');
            return;
        }

        // Перевірка на порожнечу
        if (grid.length === 0) {
            result.errors.push('Сітка не може бути порожньою');
            return;
        }

        // Перевірка прямокутності
        const firstRowLength = grid[0]?.length || 0;
        for (let i = 1; i < grid.length; i++) {
            if (!Array.isArray(grid[i]) || grid[i].length !== firstRowLength) {
                result.errors.push(`Рядок ${i} має некоректну довжину`);
            }
        }

        // Перевірка структури клітинок
        grid.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                if (!this.isValidCellStructure(cell)) {
                    result.errors.push(`Клітинка [${rowIndex}, ${colIndex}] має некоректну структуру`);
                }
            });
        });
    }

    /**
     * Валідація розміру сітки
     * @param {Array} grid - сітка
     * @param {Object} result - результат валідації
     */
    validateGridSize(grid, result) {
        const height = grid.length;
        const width = grid[0]?.length || 0;

        // Перевірка мінімальних розмірів
        if (height < this.rules.minGridSize || width < this.rules.minGridSize) {
            result.errors.push(`Розмір сітки ${width}x${height} занадто малий (мінімум ${this.rules.minGridSize}x${this.rules.minGridSize})`);
        }

        // Перевірка максимальних розмірів
        if (height > this.rules.maxGridSize || width > this.rules.maxGridSize) {
            result.errors.push(`Розмір сітки ${width}x${height} занадто великий (максимум ${this.rules.maxGridSize}x${this.rules.maxGridSize})`);
        }

        // Рекомендації по співвідношенню сторін
        const aspectRatio = Math.max(width, height) / Math.min(width, height);
        if (aspectRatio > 2) {
            result.warnings.push(`Співвідношення сторін ${aspectRatio.toFixed(1)}:1 може бути незручним для вирішення`);
        }

        // Рекомендації по розміру
        if (width * height > 400) {
            result.warnings.push('Велика сітка може бути складною для початківців');
        }

        result.details.gridSize = { width, height, aspectRatio };
    }

    /**
     * Валідація слів
     * @param {Map} words - карта слів
     * @param {Object} result - результат валідації
     */
    validateWords(words, result) {
        const wordsArray = Array.from(words.values());

        // Перевірка кількості слів
        if (wordsArray.length < this.rules.minWordsCount) {
            result.errors.push(`Занадто мало слів: ${wordsArray.length} (мінімум ${this.rules.minWordsCount})`);
        }

        if (wordsArray.length > this.rules.maxWordsCount) {
            result.warnings.push(`Багато слів: ${wordsArray.length} (рекомендуєтьcя до ${this.rules.maxWordsCount})`);
        }

        // Перевірка кожного слова
        const wordTexts = new Set();
        const wordNumbers = new Set();
        let duplicateWords = 0;
        let duplicateNumbers = 0;

        wordsArray.forEach((word, index) => {
            // Перевірка структури слова
            if (!this.isValidWordStructure(word)) {
                result.errors.push(`Слово ${index + 1} має некоректну структуру`);
                return;
            }

            // Перевірка довжини
            if (word.word.length < this.rules.minWordLength) {
                result.errors.push(`Слово "${word.word}" занадто коротке`);
            }

            if (word.word.length > this.rules.maxWordLength) {
                result.errors.push(`Слово "${word.word}" занадто довге`);
            }

            // Перевірка унікальності слів
            if (wordTexts.has(word.word)) {
                duplicateWords++;
            } else {
                wordTexts.add(word.word);
            }

            // Перевірка унікальності номерів
            if (word.number) {
                if (wordNumbers.has(word.number)) {
                    duplicateNumbers++;
                } else {
                    wordNumbers.add(word.number);
                }
            }

            // Перевірка підказки
            if (!word.clue || word.clue.trim().length < 5) {
                result.warnings.push(`Слово "${word.word}" має занадто коротку підказку`);
            }
        });

        // Повідомлення про дублікати
        if (duplicateWords > 0) {
            result.errors.push(`Знайдено ${duplicateWords} повторюваних слів`);
        }

        if (duplicateNumbers > 0) {
            result.warnings.push(`Знайдено ${duplicateNumbers} повторюваних номерів`);
        }

        result.details.wordsCount = wordsArray.length;
        result.details.duplicates = { words: duplicateWords, numbers: duplicateNumbers };
    }

    /**
     * Валідація розміщення слів на сітці
     * @param {Array} grid - сітка
     * @param {Map} words - карта слів
     * @param {Object} result - результат валідації
     */
    validateWordPlacements(grid, words, result) {
        const gridHeight = grid.length;
        const gridWidth = grid[0]?.length || 0;
        let outOfBoundsCount = 0;
        let overlappingCount = 0;

        words.forEach(word => {
            // Перевірка меж сітки
            const endRow = word.direction === 'vertical' ? word.startRow + word.word.length - 1 : word.startRow;
            const endCol = word.direction === 'horizontal' ? word.startCol + word.word.length - 1 : word.startCol;

            if (word.startRow < 0 || word.startCol < 0 || 
                endRow >= gridHeight || endCol >= gridWidth) {
                result.errors.push(`Слово "${word.word}" виходить за межі сітки`);
                outOfBoundsCount++;
                return;
            }

            // Перевірка розміщення літер
            for (let i = 0; i < word.word.length; i++) {
                const row = word.direction === 'vertical' ? word.startRow + i : word.startRow;
                const col = word.direction === 'horizontal' ? word.startCol + i : word.startCol;
                const cell = grid[row][col];
                const expectedLetter = word.word[i];

                // Перевірка заблокованих клітинок
                if (cell.blocked) {
                    result.errors.push(`Слово "${word.word}" проходить через заблоковану клітинку [${row}, ${col}]`);
                    continue;
                }

                // Перевірка відповідності літер
                if (cell.letter && cell.letter !== expectedLetter) {
                    result.errors.push(`Конфлікт літер у клітинці [${row}, ${col}]: очікується "${expectedLetter}", є "${cell.letter}"`);
                    overlappingCount++;
                }

                // Перевірка наявності слова в клітинці
                if (!cell.wordIds.includes(word.id)) {
                    result.warnings.push(`Слово "${word.word}" не зареєстроване у клітинці [${row}, ${col}]`);
                }
            }
        });

        result.details.placementErrors = { outOfBounds: outOfBoundsCount, overlapping: overlappingCount };
    }

    /**
     * Валідація пересічень
     * @param {Array} grid - сітка
     * @param {Map} words - карта слів
     * @param {Object} result - результат валідації
     */
    validateIntersections(grid, words, result) {
        const intersections = new Map();
        const isolatedWords = [];
        let totalIntersections = 0;

        // Знайти всі пересічення
        grid.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                if (cell.wordIds.length > 1) {
                    totalIntersections++;
                    intersections.set(`${rowIndex}-${colIndex}`, {
                        position: { row: rowIndex, col: colIndex },
                        wordIds: [...cell.wordIds],
                        letter: cell.letter
                    });
                }
            });
        });

        // Перевірка ізольованих слів
        words.forEach(word => {
            let hasIntersections = false;
            for (let i = 0; i < word.word.length; i++) {
                const row = word.direction === 'vertical' ? word.startRow + i : word.startRow;
                const col = word.direction === 'horizontal' ? word.startCol + i : word.startCol;
                const cell = grid[row][col];
                
                if (cell.wordIds.length > 1) {
                    hasIntersections = true;
                    break;
                }
            }
            
            if (!hasIntersections && words.size > 1) {
                isolatedWords.push(word.word);
            }
        });

        // Оцінка якості пересічень
        const averageIntersectionsPerWord = words.size > 0 ? totalIntersections / words.size : 0;
        
        if (this.currentStrictness === this.strictnessLevels.STRICT) {
            if (averageIntersectionsPerWord < this.rules.minIntersections) {
                result.warnings.push(`Мало пересічень: ${averageIntersectionsPerWord.toFixed(1)} на слово (рекомендується ${this.rules.minIntersections})`);
            }
        }

        if (isolatedWords.length > 0) {
            result.warnings.push(`Ізольовані слова (без пересічень): ${isolatedWords.join(', ')}`);
        }

        result.details.intersections = {
            total: totalIntersections,
            averagePerWord: averageIntersectionsPerWord,
            isolatedWords: isolatedWords.length,
            details: Array.from(intersections.values())
        };
    }

    /**
     * Валідація цілісності сітки
     * @param {Array} grid - сітка
     * @param {Map} words - карта слів
     * @param {Object} result - результат валідації
     */
    validateGridIntegrity(grid, words, result) {
        const issues = [];

        // Перевірка консистентності номерів
        const numberedCells = [];
        grid.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                if (cell.number) {
                    numberedCells.push({
                        position: { row: rowIndex, col: colIndex },
                        number: cell.number,
                        wordIds: [...cell.wordIds]
                    });
                }
            });
        });

        // Перевірка, чи всі слова мають відповідні номери на сітці
        words.forEach(word => {
            const startCell = grid[word.startRow][word.startCol];
            if (word.number && startCell.number !== word.number) {
                issues.push(`Номер слова "${word.word}" не відповідає номеру на сітці`);
            }
        });

        // Перевірка порожніх клітинок з номерами
        numberedCells.forEach(cell => {
            if (cell.wordIds.length === 0) {
                issues.push(`Клітинка з номером ${cell.number} не містить слів`);
            }
        });

        // Перевірка неіснуючих посилань на слова
        grid.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                cell.wordIds.forEach(wordId => {
                    if (!words.has(wordId)) {
                        issues.push(`Клітинка [${rowIndex}, ${colIndex}] посилається на неіснуюче слово ${wordId}`);
                    }
                });
            });
        });

        if (issues.length > 0) {
            result.warnings.push(...issues);
        }

        result.details.integrityIssues = issues.length;
    }

    /**
     * Валідація щільності сітки
     * @param {Array} grid - сітка
     * @param {Object} result - результат валідації
     */
    validateDensity(grid, result) {
        const totalCells = grid.length * (grid[0]?.length || 0);
        let filledCells = 0;
        let blockedCells = 0;

        grid.forEach(row => {
            row.forEach(cell => {
                if (cell.blocked) {
                    blockedCells++;
                } else if (cell.letter) {
                    filledCells++;
                }
            });
        });

        const density = totalCells > 0 ? filledCells / totalCells : 0;
        const blockedRatio = totalCells > 0 ? blockedCells / totalCells : 0;

        // Перевірка щільності
        if (density < this.rules.minDensity) {
            result.warnings.push(`Низька щільність заповнення: ${(density * 100).toFixed(1)}% (рекомендується мінімум ${(this.rules.minDensity * 100).toFixed(1)}%)`);
        }

        if (density > this.rules.maxDensity) {
            result.warnings.push(`Висока щільність заповнення: ${(density * 100).toFixed(1)}% (рекомендується максимум ${(this.rules.maxDensity * 100).toFixed(1)}%)`);
        }

        // Перевірка кількості заблокованих клітинок
        if (blockedRatio > 0.3) {
            result.warnings.push(`Багато заблокованих клітинок: ${(blockedRatio * 100).toFixed(1)}%`);
        }

        result.details.density = {
            filled: density,
            blocked: blockedRatio,
            filledCells: filledCells,
            blockedCells: blockedCells,
            totalCells: totalCells
        };
    }

    /**
     * Валідація ізоляції
     * @param {Array} grid - сітка
     * @param {Map} words - карта слів
     * @param {Object} result - результат валідації
     */
    validateIsolation(grid, words, result) {
        const connectedComponents = this.findConnectedComponents(grid);
        const isolatedCells = this.findIsolatedCells(grid);

        if (connectedComponents.length > 1) {
            result.warnings.push(`Знайдено ${connectedComponents.length} окремих груп слів. Краще об'єднати їх.`);
        }

        if (isolatedCells.length > this.rules.maxIsolatedCells) {
            result.warnings.push(`Знайдено ${isolatedCells.length} ізольованих клітинок`);
        }

        result.details.connectivity = {
            components: connectedComponents.length,
            isolatedCells: isolatedCells.length,
            largestComponent: Math.max(...connectedComponents.map(c => c.length), 0)
        };
    }

    /**
     * Аналіз якості сітки
     * @param {Array} grid - сітка
     * @param {Map} words - карта слів
     * @param {Object} result - результат валідації
     */
    analyzeGridQuality(grid, words, result) {
        const quality = {
            wordDistribution: this.analyzeWordDistribution(words),
            letterFrequency: this.analyzeLetterFrequency(grid),
            symmetry: this.analyzeSymmetry(grid),
            complexity: this.analyzeComplexity(grid, words),
            aesthetics: this.analyzeAesthetics(grid)
        };

        // Рекомендації на основі аналізу
        this.generateQualityRecommendations(quality, result);

        result.details.quality = quality;
    }

    /**
     * Аналіз розподілу слів
     * @param {Map} words - карта слів
     * @returns {Object} аналіз розподілу
     */
    analyzeWordDistribution(words) {
        const wordsArray = Array.from(words.values());
        const horizontal = wordsArray.filter(w => w.direction === 'horizontal').length;
        const vertical = wordsArray.filter(w => w.direction === 'vertical').length;
        
        const lengths = wordsArray.map(w => w.word.length);
        const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length || 0;
        const minLength = Math.min(...lengths, Infinity);
        const maxLength = Math.max(...lengths, 0);

        return {
            total: wordsArray.length,
            horizontal: horizontal,
            vertical: vertical,
            ratio: horizontal > 0 ? vertical / horizontal : 0,
            averageLength: avgLength,
            lengthRange: { min: minLength === Infinity ? 0 : minLength, max: maxLength }
        };
    }

    /**
     * Аналіз частоти літер
     * @param {Array} grid - сітка
     * @returns {Object} аналіз частоти
     */
    analyzeLetterFrequency(grid) {
        const frequency = {};
        let totalLetters = 0;

        grid.forEach(row => {
            row.forEach(cell => {
                if (cell.letter && !cell.blocked) {
                    frequency[cell.letter] = (frequency[cell.letter] || 0) + 1;
                    totalLetters++;
                }
            });
        });

        // Сортувати за частотою
        const sorted = Object.entries(frequency)
            .sort(([,a], [,b]) => b - a)
            .map(([letter, count]) => ({
                letter,
                count,
                percentage: (count / totalLetters * 100).toFixed(1)
            }));

        return {
            total: totalLetters,
            unique: Object.keys(frequency).length,
            mostCommon: sorted.slice(0, 5),
            distribution: frequency
        };
    }

    /**
     * Аналіз симетрії
     * @param {Array} grid - сітка
     * @returns {Object} аналіз симетрії
     */
    analyzeSymmetry(grid) {
        const height = grid.length;
        const width = grid[0]?.length || 0;
        
        let horizontalSymmetry = 0;
        let verticalSymmetry = 0;
        let totalComparisons = 0;

        // Горизонтальна симетрія
        for (let row = 0; row < Math.floor(height / 2); row++) {
            const mirrorRow = height - 1 - row;
            for (let col = 0; col < width; col++) {
                totalComparisons++;
                if (grid[row][col].blocked === grid[mirrorRow][col].blocked) {
                    horizontalSymmetry++;
                }
            }
        }

        // Вертикальна симетрія
        totalComparisons = 0;
        for (let col = 0; col < Math.floor(width / 2); col++) {
            const mirrorCol = width - 1 - col;
            for (let row = 0; row < height; row++) {
                totalComparisons++;
                if (grid[row][col].blocked === grid[row][mirrorCol].blocked) {
                    verticalSymmetry++;
                }
            }
        }

        return {
            horizontal: totalComparisons > 0 ? horizontalSymmetry / totalComparisons : 0,
            vertical: totalComparisons > 0 ? verticalSymmetry / totalComparisons : 0
        };
    }

    /**
     * Аналіз складності
     * @param {Array} grid - сітка
     * @param {Map} words - карта слів
     * @returns {Object} аналіз складності
     */
    analyzeComplexity(grid, words) {
        const wordsArray = Array.from(words.values());
        
        // Середня складність слів
        const avgDifficulty = wordsArray.reduce((sum, word) => {
            return sum + (word.difficulty || 0);
        }, 0) / wordsArray.length || 0;

        // Складність пересічень
        let intersectionComplexity = 0;
        let intersectionCount = 0;
        
        grid.forEach(row => {
            row.forEach(cell => {
                if (cell.wordIds.length > 1) {
                    intersectionCount++;
                    // Більше пересічень = більша складність
                    intersectionComplexity += cell.wordIds.length - 1;
                }
            });
        });

        const avgIntersectionComplexity = intersectionCount > 0 ? intersectionComplexity / intersectionCount : 0;

        return {
            wordDifficulty: avgDifficulty,
            intersectionDensity: avgIntersectionComplexity,
            overallComplexity: (avgDifficulty + avgIntersectionComplexity) / 2
        };
    }

    /**
     * Аналіз естетики
     * @param {Array} grid - сітка
     * @returns {Object} аналіз естетики
     */
    analyzeAesthetics(grid) {
        const height = grid.length;
        const width = grid[0]?.length || 0;
        
        // Рівномірність розподілу
        const quarters = this.analyzeQuadrantDistribution(grid);
        
        // Центральність
        const centerFilled = this.analyzeCenterFilling(grid);
        
        // Баланс
        const balance = Math.abs(quarters.topLeft + quarters.bottomRight - quarters.topRight - quarters.bottomLeft);
        
        return {
            balance: 1 - (balance / (height * width)), // Нормалізовано до 0-1
            centerFocus: centerFilled,
            quadrantDistribution: quarters
        };
    }

    /**
     * Генерація рекомендацій щодо якості
     * @param {Object} quality - дані якості
     * @param {Object} result - результат валідації
     */
    generateQualityRecommendations(quality, result) {
        const suggestions = [];

        // Рекомендації щодо розподілу слів
        if (Math.abs(quality.wordDistribution.ratio - 1) > 0.3) {
            suggestions.push('Спробуйте збалансувати кількість горизонтальних та вертикальних слів');
        }

        // Рекомендації щодо симетрії
        if (quality.symmetry.horizontal > 0.8 || quality.symmetry.vertical > 0.8) {
            suggestions.push('Гарна симетрія сітки створює привабливий вигляд');
        } else if (quality.symmetry.horizontal < 0.3 && quality.symmetry.vertical < 0.3) {
            suggestions.push('Розгляньте можливість додання елементів симетрії для кращого вигляду');
        }

        // Рекомендації щодо складності
        if (quality.complexity.overallComplexity < 0.3) {
            suggestions.push('Кросворд може бути занадто простим, спробуйте додати складніші слова');
        } else if (quality.complexity.overallComplexity > 0.8) {
            suggestions.push('Кросворд може бути занадто складним для більшості гравців');
        }

        result.suggestions.push(...suggestions);
    }

    /**
     * Допоміжні методи
     */

    /**
     * Перевірка валідності структури клітинки
     * @param {Object} cell - клітинка
     * @returns {boolean} чи валідна структура
     */
    isValidCellStructure(cell) {
        return cell &&
               typeof cell === 'object' &&
               typeof cell.letter === 'string' &&
               Array.isArray(cell.wordIds) &&
               Array.isArray(cell.directions) &&
               typeof cell.blocked === 'boolean';
    }

    /**
     * Перевірка валідності структури слова
     * @param {Object} word - слово
     * @returns {boolean} чи валідна структура
     */
    isValidWordStructure(word) {
        return word &&
               typeof word === 'object' &&
               typeof word.word === 'string' &&
               typeof word.clue === 'string' &&
               ['horizontal', 'vertical'].includes(word.direction) &&
               Number.isInteger(word.startRow) &&
               Number.isInteger(word.startCol);
    }

    /**
     * Знаходження зв'язних компонентів
     * @param {Array} grid - сітка
     * @returns {Array} масив компонентів
     */
    findConnectedComponents(grid) {
        const visited = grid.map(row => row.map(() => false));
        const components = [];
        
        const dfs = (row, col, component) => {
            if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length ||
                visited[row][col] || grid[row][col].blocked || !grid[row][col].letter) {
                return;
            }
            
            visited[row][col] = true;
            component.push({ row, col });
            
            // Перевірити всі 4 напрямки
            dfs(row - 1, col, component);
            dfs(row + 1, col, component);
            dfs(row, col - 1, component);
            dfs(row, col + 1, component);
        };

        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[0].length; col++) {
                if (!visited[row][col] && !grid[row][col].blocked && grid[row][col].letter) {
                    const component = [];
                    dfs(row, col, component);
                    if (component.length > 0) {
                        components.push(component);
                    }
                }
            }
        }
        
        return components;
    }

    /**
     * Знаходження ізольованих клітинок
     * @param {Array} grid - сітка
     * @returns {Array} масив ізольованих клітинок
     */
    findIsolatedCells(grid) {
        const isolated = [];
        
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[0].length; col++) {
                const cell = grid[row][col];
                if (cell.letter && !cell.blocked && cell.wordIds.length === 0) {
                    isolated.push({ row, col, letter: cell.letter });
                }
            }
        }
        
        return isolated;
    }

    /**
     * Аналіз розподілу по квадрантах
     * @param {Array} grid - сітка
     * @returns {Object} розподіл по квадрантах
     */
    analyzeQuadrantDistribution(grid) {
        const height = grid.length;
        const width = grid[0]?.length || 0;
        const midRow = Math.floor(height / 2);
        const midCol = Math.floor(width / 2);
        
        const quadrants = {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
        };
        
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                if (grid[row][col].letter && !grid[row][col].blocked) {
                    if (row < midRow && col < midCol) {
                        quadrants.topLeft++;
                    } else if (row < midRow && col >= midCol) {
                        quadrants.topRight++;
                    } else if (row >= midRow && col < midCol) {
                        quadrants.bottomLeft++;
                    } else {
                        quadrants.bottomRight++;
                    }
                }
            }
        }
        
        return quadrants;
    }

    /**
     * Аналіз заповнення центру
     * @param {Array} grid - сітка
     * @returns {number} коефіцієнт заповнення центру (0-1)
     */
    analyzeCenterFilling(grid) {
        const height = grid.length;
        const width = grid[0]?.length || 0;
        
        const centerRowStart = Math.floor(height * 0.25);
        const centerRowEnd = Math.floor(height * 0.75);
        const centerColStart = Math.floor(width * 0.25);
        const centerColEnd = Math.floor(width * 0.75);
        
        let centerCells = 0;
        let filledCenterCells = 0;
        
        for (let row = centerRowStart; row < centerRowEnd; row++) {
            for (let col = centerColStart; col < centerColEnd; col++) {
                if (row < height && col < width) {
                    centerCells++;
                    if (grid[row][col].letter && !grid[row][col].blocked) {
                        filledCenterCells++;
                    }
                }
            }
        }
        
        return centerCells > 0 ? filledCenterCells / centerCells : 0;
    }

    /**
     * Обчислення загального балу
     * @param {Object} result - результат валідації
     * @returns {number} загальний бал (0-100)
     */
    calculateOverallScore(result) {
        let score = 100;
        
        // Зниження балу за помилки
        score -= result.errors.length * 20;
        
        // Зниження балу за попередження
        score -= result.warnings.length * 5;
        
        // Бонуси за якість (якщо є дані)
        if (result.details.quality) {
            const quality = result.details.quality;
            
            // Бонус за симетрію
            const symmetryBonus = (quality.symmetry.horizontal + quality.symmetry.vertical) * 5;
            score += symmetryBonus;
            
            // Бонус за баланс
            score += quality.aesthetics.balance * 10;
            
            // Штраф за надто низьку або високу щільність
            if (result.details.density) {
                const density = result.details.density.filled;
                if (density < this.rules.minDensity || density > this.rules.maxDensity) {
                    score -= 10;
                }
            }
        }
        
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    /**
     * Генерація ключа кешу
     * @param {Array} grid - сітка
     * @param {Map} words - слова
     * @param {string} strictness - строгість
     * @returns {string} ключ кешу
     */
    generateCacheKey(grid, words, strictness) {
        const gridHash = this.hashGrid(grid);
        const wordsHash = this.hashWords(words);
        return `${gridHash}-${wordsHash}-${strictness}`;
    }

    /**
     * Хешування сітки
     * @param {Array} grid - сітка
     * @returns {string} хеш
     */
    hashGrid(grid) {
        let hash = '';
        grid.forEach(row => {
            row.forEach(cell => {
                hash += `${cell.letter}${cell.blocked ? 'B' : ''}${cell.number || ''}`;
            });
        });
        return this.simpleHash(hash);
    }

    /**
     * Хешування слів
     * @param {Map} words - слова
     * @returns {string} хеш
     */
    hashWords(words) {
        const wordsArray = Array.from(words.values()).sort((a, b) => a.id.localeCompare(b.id));
        const wordsString = wordsArray.map(w => `${w.word}-${w.direction}-${w.startRow}-${w.startCol}`).join('|');
        return this.simpleHash(wordsString);
    }

    /**
     * Простий хеш для рядків
     * @param {string} str - рядок
     * @returns {string} хеш
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Перетворити в 32bit int
        }
        return hash.toString();
    }

    /**
     * Швидка валідація (без детального аналізу)
     * @param {Array} grid - сітка
     * @param {Map} words - слова
     * @returns {boolean} чи валідна сітка
     */
    quickValidate(grid, words) {
        try {
            // Базові перевірки
            if (!Array.isArray(grid) || grid.length === 0 || words.size === 0) {
                return false;
            }

            // Перевірка розмірів
            const height = grid.length;
            const width = grid[0]?.length || 0;
            if (height < this.rules.minGridSize || width < this.rules.minGridSize ||
                height > this.rules.maxGridSize || width > this.rules.maxGridSize) {
                return false;
            }

            // Перевірка кількості слів
            if (words.size < this.rules.minWordsCount || words.size > this.rules.maxWordsCount) {
                return false;
            }

            // Перевірка розміщення слів
            for (const word of words.values()) {
                const endRow = word.direction === 'vertical' ? word.startRow + word.word.length - 1 : word.startRow;
                const endCol = word.direction === 'horizontal' ? word.startCol + word.word.length - 1 : word.startCol;
                
                if (word.startRow < 0 || word.startCol < 0 || endRow >= height || endCol >= width) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Очищення кешу валідації
     */
    clearCache() {
        this.validationCache.clear();
    }

    /**
     * Встановлення правил валідації
     * @param {Object} newRules - нові правила
     */
    setRules(newRules) {
        this.rules = { ...this.rules, ...newRules };
        this.clearCache(); // Очистити кеш при зміні правил
    }

    /**
     * Отримання поточних правил
     * @returns {Object} правила валідації
     */
    getRules() {
        return { ...this.rules };
    }

    /**
     * Встановлення рівня строгості
     * @param {string} strictness - рівень строгості
     */
    setStrictness(strictness) {
        if (Object.values(this.strictnessLevels).includes(strictness)) {
            this.currentStrictness = strictness;
            this.clearCache();
        }
    }

    /**
     * Валідація конкретного слова на сітці
     * @param {Array} grid - сітка
     * @param {Object} word - слово
     * @returns {Object} результат валідації слова
     */
    validateSingleWord(grid, word) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Базова перевірка структури
        if (!this.isValidWordStructure(word)) {
            result.errors.push('Некоректна структура слова');
            result.isValid = false;
            return result;
        }

        // Перевірка меж
        const endRow = word.direction === 'vertical' ? word.startRow + word.word.length - 1 : word.startRow;
        const endCol = word.direction === 'horizontal' ? word.startCol + word.word.length - 1 : word.startCol;
        
        if (word.startRow < 0 || word.startCol < 0 || 
            endRow >= grid.length || endCol >= (grid[0]?.length || 0)) {
            result.errors.push('Слово виходить за межі сітки');
            result.isValid = false;
        }

        // Перевірка конфліктів
        for (let i = 0; i < word.word.length; i++) {
            const row = word.direction === 'vertical' ? word.startRow + i : word.startRow;
            const col = word.direction === 'horizontal' ? word.startCol + i : word.startCol;
            
            if (row >= 0 && row < grid.length && col >= 0 && col < (grid[0]?.length || 0)) {
                const cell = grid[row][col];
                
                if (cell.blocked) {
                    result.errors.push(`Слово проходить через заблоковану клітинку [${row}, ${col}]`);
                    result.isValid = false;
                }
                
                if (cell.letter && cell.letter !== word.word[i]) {
                    result.errors.push(`Конфлікт літер у клітинці [${row}, ${col}]`);
                    result.isValid = false;
                }
            }
        }

        return result;
    }

    /**
     * Генерація звіту валідації
     * @param {Object} validationResult - результат валідації
     * @returns {string} текстовий звіт
     */
    generateValidationReport(validationResult) {
        const lines = [];
        
        lines.push('=== ЗВІТ ВАЛІДАЦІЇ КРОСВОРДУ ===');
        lines.push(`Загальна оцінка: ${validationResult.isValid ? 'ВАЛІДНИЙ' : 'НЕВАЛІДНИЙ'}`);
        lines.push(`Бал якості: ${validationResult.score}/100`);
        lines.push('');

        if (validationResult.errors.length > 0) {
            lines.push('ПОМИЛКИ:');
            validationResult.errors.forEach((error, index) => {
                lines.push(`${index + 1}. ${error}`);
            });
            lines.push('');
        }

        if (validationResult.warnings.length > 0) {
            lines.push('ПОПЕРЕДЖЕННЯ:');
            validationResult.warnings.forEach((warning, index) => {
                lines.push(`${index + 1}. ${warning}`);
            });
            lines.push('');
        }

        if (validationResult.suggestions.length > 0) {
            lines.push('РЕКОМЕНДАЦІЇ:');
            validationResult.suggestions.forEach((suggestion, index) => {
                lines.push(`${index + 1}. ${suggestion}`);
            });
            lines.push('');
        }

        // Детальна статистика
        if (validationResult.details) {
            lines.push('ДЕТАЛЬНА СТАТИСТИКА:');
            const details = validationResult.details;
            
            if (details.gridSize) {
                lines.push(`Розмір сітки: ${details.gridSize.width}×${details.gridSize.height}`);
            }
            
            if (details.wordsCount !== undefined) {
                lines.push(`Кількість слів: ${details.wordsCount}`);
            }
            
            if (details.density) {
                lines.push(`Щільність заповнення: ${(details.density.filled * 100).toFixed(1)}%`);
            }
            
            if (details.intersections) {
                lines.push(`Пересічень: ${details.intersections.total} (${details.intersections.averagePerWord.toFixed(1)} на слово)`);
            }
        }

        return lines.join('\n');
    }
}

// Створення глобального екземпляра
window.GridValidator = new GridValidator();

// Експорт для використання в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GridValidator;
}