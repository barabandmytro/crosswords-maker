/**
 * WordHelper - клас для роботи зі словами в кросворді
 * Містить методи для валідації, маніпуляції та аналізу слів
 */
class WordHelper {
    constructor() {
        // Налаштування за замовчуванням
        this.config = {
            minLength: 2,
            maxLength: 25,
            allowedChars: /^[А-ЯІЇЄґA-Z\s\-']+$/i,
            ukrainianChars: /[А-ЯІЇЄґ]/,
            englishChars: /[A-Z]/,
            autoNumbering: true
        };

        // Кеш для швидкого доступу
        this.cache = new Map();
        
        // Лічильник для генерації ID
        this.wordCounter = 0;
    }

    /**
     * Створення нового об'єкта слова
     * @param {string} word - слово
     * @param {string} clue - підказка
     * @param {string} direction - напрямок ('horizontal' або 'vertical')
     * @param {number} startRow - початковий рядок
     * @param {number} startCol - початковий стовпець
     * @param {number} number - номер слова
     * @returns {Object} об'єкт слова
     */
    createWord(word, clue, direction, startRow, startCol, number = null) {
        const normalizedWord = this.normalizeWord(word);
        
        const wordData = {
            id: this.generateWordId(),
            word: normalizedWord,
            originalWord: word,
            clue: clue.trim(),
            direction: direction,
            startRow: startRow,
            startCol: startCol,
            number: number,
            length: normalizedWord.length,
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            difficulty: this.calculateWordDifficulty(normalizedWord),
            category: '',
            tags: [],
            metadata: {}
        };

        return wordData;
    }

    /**
     * Валідація слова
     * @param {string} word - слово для валідації
     * @returns {Object} результат валідації
     */
    validateWord(word) {
        const result = {
            isValid: false,
            errors: [],
            warnings: [],
            normalizedWord: ''
        };

        // Перевірка на існування
        if (!word || typeof word !== 'string') {
            result.errors.push('Слово має бути рядком');
            return result;
        }

        // Нормалізація
        const normalized = this.normalizeWord(word);
        result.normalizedWord = normalized;

        // Перевірка довжини
        if (normalized.length < this.config.minLength) {
            result.errors.push(`Слово занадто коротке (мінімум ${this.config.minLength} літери)`);
        }

        if (normalized.length > this.config.maxLength) {
            result.errors.push(`Слово занадто довге (максимум ${this.config.maxLength} літер)`);
        }

        // Перевірка символів
        if (!this.config.allowedChars.test(normalized)) {
            result.errors.push('Слово містить недопустимі символи');
        }

        // Перевірка на змішування мов
        if (this.isMixedLanguage(normalized)) {
            result.warnings.push('Слово містить літери різних алфавітів');
        }

        // Перевірка на повторювані літери
        if (this.hasRepeatingPattern(normalized)) {
            result.warnings.push('Слово містить повторювані послідовності');
        }

        // Перевірка на складність
        const difficulty = this.calculateWordDifficulty(normalized);
        if (difficulty < 0.3) {
            result.warnings.push('Слово може бути занадто простим');
        } else if (difficulty > 0.8) {
            result.warnings.push('Слово може бути занадто складним');
        }

        result.isValid = result.errors.length === 0;
        return result;
    }

    /**
     * Валідація підказки
     * @param {string} clue - підказка
     * @param {string} word - відповідне слово
     * @returns {Object} результат валідації
     */
    validateClue(clue, word = '') {
        const result = {
            isValid: false,
            errors: [],
            warnings: [],
            suggestions: []
        };

        // Перевірка на існування
        if (!clue || typeof clue !== 'string') {
            result.errors.push('Підказка має бути рядком');
            return result;
        }

        const trimmedClue = clue.trim();

        // Перевірка довжини
        if (trimmedClue.length < 5) {
            result.errors.push('Підказка занадто коротка (мінімум 5 символів)');
        }

        if (trimmedClue.length > 200) {
            result.warnings.push('Підказка досить довга, розгляньте скорочення');
        }

        // Перевірка на очевидність (якщо слово надано)
        if (word && this.isObviousClue(trimmedClue, word)) {
            result.warnings.push('Підказка може бути занадто очевидною');
        }

        // Перевірка на граматику
        if (!this.hasProperGrammar(trimmedClue)) {
            result.warnings.push('Перевірте граматику підказки');
        }

        // Пропозиції для покращення
        if (word) {
            const suggestions = this.generateClueSuggestions(word);
            result.suggestions = suggestions;
        }

        result.isValid = result.errors.length === 0;
        return result;
    }

    /**
     * Нормалізація слова
     * @param {string} word - слово
     * @returns {string} нормалізоване слово
     */
    normalizeWord(word) {
        return word
            .trim()
            .toUpperCase()
            .replace(/\s+/g, '')
            .replace(/[''`]/g, "'")
            .replace(/[–—]/g, '-');
    }

    /**
     * Генерація унікального ID для слова
     * @returns {string} унікальний ID
     */
    generateWordId() {
        this.wordCounter++;
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 5);
        return `word_${this.wordCounter}_${timestamp}_${random}`;
    }

    /**
     * Обчислення складності слова
     * @param {string} word - слово
     * @returns {number} коефіцієнт складності (0-1)
     */
    calculateWordDifficulty(word) {
        let difficulty = 0;

        // Базова складність за довжиною
        difficulty += Math.min(word.length / 15, 0.4);

        // Рідкісні літери
        const rareLetters = ['Ї', 'Є', 'Ґ', 'Ь', 'X', 'Z', 'Q'];
        const rareCount = word.split('').filter(char => rareLetters.includes(char)).length;
        difficulty += (rareCount / word.length) * 0.3;

        // Консонантні кластери
        const consonantClusters = word.match(/[БВГДЖЗЙКЛМНПРСТФХЦЧШЩ]{3,}/g) || [];
        difficulty += (consonantClusters.length * 0.1);

        // Рідкісні сполучення
        const rareCombinations = ['ЯЄ', 'ЮЯ', 'ЩЯ', 'ЬЯ'];
        const rareComboCount = rareCombinations.reduce((count, combo) => {
            return count + (word.includes(combo) ? 1 : 0);
        }, 0);
        difficulty += (rareComboCount * 0.1);

        return Math.min(difficulty, 1);
    }

    /**
     * Перевірка на змішування мов
     * @param {string} word - слово
     * @returns {boolean} true якщо слово містить літери різних алфавітів
     */
    isMixedLanguage(word) {
        const hasUkrainian = this.config.ukrainianChars.test(word);
        const hasEnglish = this.config.englishChars.test(word);
        return hasUkrainian && hasEnglish;
    }

    /**
     * Перевірка на повторювані патерни
     * @param {string} word - слово
     * @returns {boolean} true якщо є повторювані послідовності
     */
    hasRepeatingPattern(word) {
        // Перевірка на послідовні однакові літери
        if (/(.)\1{2,}/.test(word)) return true;

        // Перевірка на повторювані послідовності довжиною 2-3 символи
        for (let len = 2; len <= 3; len++) {
            for (let i = 0; i <= word.length - len * 2; i++) {
                const pattern = word.substr(i, len);
                const next = word.substr(i + len, len);
                if (pattern === next) return true;
            }
        }

        return false;
    }

    /**
     * Перевірка чи підказка занадто очевидна
     * @param {string} clue - підказка
     * @param {string} word - слово
     * @returns {boolean} true якщо підказка очевидна
     */
    isObviousClue(clue, word) {
        const normalizedClue = clue.toUpperCase();
        const normalizedWord = word.toUpperCase();

        // Підказка містить саме слово
        if (normalizedClue.includes(normalizedWord)) return true;

        // Підказка містить більшу частину слова
        if (normalizedWord.length > 4) {
            const substring = normalizedWord.substr(0, normalizedWord.length - 1);
            if (normalizedClue.includes(substring)) return true;
        }

        // Перевірка на анаграми
        if (this.areAnagrams(normalizedClue.replace(/[^А-ЯІЇЄґA-Z]/g, ''), normalizedWord)) {
            return true;
        }

        return false;
    }

    /**
     * Перевірка граматики підказки
     * @param {string} clue - підказка
     * @returns {boolean} true якщо граматика коректна
     */
    hasProperGrammar(clue) {
        // Базові перевірки граматики
        
        // Починається з великої літери (якщо це не питання)
        if (!/^[А-ЯІЇЄґA-Z]/.test(clue) && !clue.includes('?')) {
            return false;
        }

        // Закінчується розділовим знаком
        if (!/[.!?]$/.test(clue)) {
            return false;
        }

        // Немає подвійних пробілів
        if (/\s{2,}/.test(clue)) {
            return false;
        }

        // Немає пробілів перед розділовими знаками
        if (/\s[.!?,:;]/.test(clue)) {
            return false;
        }

        return true;
    }

    /**
     * Генерація пропозицій для покращення підказки
     * @param {string} word - слово
     * @returns {Array} масив пропозицій
     */
    generateClueSuggestions(word) {
        const suggestions = [];
        
        // Категорії підказок
        const categories = this.getWordCategories(word);
        
        categories.forEach(category => {
            suggestions.push(`Розгляньте підказку в категорії: ${category}`);
        });

        // Типи підказок
        suggestions.push('Спробуйте визначення');
        suggestions.push('Спробуйте синонім');
        suggestions.push('Спробуйте асоціацію');
        suggestions.push('Спробуйте історичний контекст');

        return suggestions.slice(0, 3); // Обмежити до 3 пропозицій
    }

    /**
     * Визначення категорій слова
     * @param {string} word - слово
     * @returns {Array} масив категорій
     */
    getWordCategories(word) {
        const categories = [];

        // Простий аналіз на основі закінчень та патернів
        if (word.endsWith('НІСТЬ') || word.endsWith('СТВО')) {
            categories.push('абстрактне поняття');
        }

        if (word.endsWith('ИЙ') || word.endsWith('НА') || word.endsWith('НЕ')) {
            categories.push('прикметник');
        }

        if (word.endsWith('АТИ') || word.endsWith('ИТИ')) {
            categories.push('дієслово');
        }

        if (word.length <= 4) {
            categories.push('коротке слово');
        }

        if (word.length > 10) {
            categories.push('довге слово');
        }

        // Якщо категорії не знайдені, додати загальні
        if (categories.length === 0) {
            categories.push('іменник', 'загальне поняття');
        }

        return categories;
    }

    /**
     * Перевірка чи є два слова анаграмами
     * @param {string} word1 - перше слово
     * @param {string} word2 - друге слово
     * @returns {boolean} true якщо анаграми
     */
    areAnagrams(word1, word2) {
        if (word1.length !== word2.length) return false;
        
        const sorted1 = word1.split('').sort().join('');
        const sorted2 = word2.split('').sort().join('');
        
        return sorted1 === sorted2;
    }

    /**
     * Пошук пересічень між словами
     * @param {string} word1 - перше слово
     * @param {string} word2 - друге слово
     * @returns {Array} масив можливих пересічень
     */
    findIntersections(word1, word2) {
        const intersections = [];

        for (let i = 0; i < word1.length; i++) {
            for (let j = 0; j < word2.length; j++) {
                if (word1[i] === word2[j]) {
                    intersections.push({
                        letter: word1[i],
                        word1Index: i,
                        word2Index: j,
                        quality: this.calculateIntersectionQuality(word1, word2, i, j)
                    });
                }
            }
        }

        // Сортувати за якістю пересічення
        return intersections.sort((a, b) => b.quality - a.quality);
    }

    /**
     * Обчислення якості пересічення
     * @param {string} word1 - перше слово
     * @param {string} word2 - друге слово
     * @param {number} index1 - індекс у першому слові
     * @param {number} index2 - індекс у другому слові
     * @returns {number} оцінка якості (0-1)
     */
    calculateIntersectionQuality(word1, word2, index1, index2) {
        let quality = 0.5; // базова оцінка

        // Пересічення ближче до центру слова краще
        const centerDistance1 = Math.abs(index1 - word1.length / 2);
        const centerDistance2 = Math.abs(index2 - word2.length / 2);
        const avgCenterDistance = (centerDistance1 + centerDistance2) / 2;
        quality += (1 - avgCenterDistance / Math.max(word1.length, word2.length)) * 0.3;

        // Рідкісні літери дають кращі пересічення
        const letter = word1[index1];
        const rareLetters = ['Ї', 'Є', 'Ґ', 'Ь', 'X', 'Z', 'Q'];
        if (rareLetters.includes(letter)) {
            quality += 0.2;
        }

        return Math.min(quality, 1);
    }

    /**
     * Генерація варіантів розміщення слова
     * @param {Object} wordData - дані слова
     * @param {Array} existingWords - існуючі слова
     * @param {Object} gridSize - розмір сітки
     * @returns {Array} масив варіантів розміщення
     */
    generatePlacementOptions(wordData, existingWords, gridSize) {
        const options = [];

        // Якщо це перше слово, розмістити по центру
        if (existingWords.length === 0) {
            const centerRow = Math.floor(gridSize.height / 2);
            const centerCol = Math.floor((gridSize.width - wordData.word.length) / 2);
            
            options.push({
                startRow: centerRow,
                startCol: centerCol,
                direction: 'horizontal',
                quality: 1.0,
                intersections: []
            });
            
            return options;
        }

        // Знайти пересічення з існуючими словами
        existingWords.forEach(existingWord => {
            const intersections = this.findIntersections(wordData.word, existingWord.word);
            
            intersections.forEach(intersection => {
                const placement = this.calculatePlacementFromIntersection(
                    wordData, existingWord, intersection, gridSize
                );
                
                if (placement) {
                    options.push(placement);
                }
            });
        });

        // Сортувати за якістю
        return options.sort((a, b) => b.quality - a.quality);
    }

    /**
     * Обчислення розміщення на основі пересічення
     * @param {Object} newWord - нове слово
     * @param {Object} existingWord - існуюче слово
     * @param {Object} intersection - дані пересічення
     * @param {Object} gridSize - розмір сітки
     * @returns {Object|null} дані розміщення або null
     */
    calculatePlacementFromIntersection(newWord, existingWord, intersection, gridSize) {
        const newDirection = existingWord.direction === 'horizontal' ? 'vertical' : 'horizontal';
        
        let startRow, startCol;

        if (existingWord.direction === 'horizontal') {
            // Існуюче слово горизонтальне, нове вертикальне
            startRow = existingWord.startRow - intersection.word1Index;
            startCol = existingWord.startCol + intersection.word2Index;
        } else {
            // Існуюче слово вертикальне, нове горизонтальне
            startRow = existingWord.startRow + intersection.word2Index;
            startCol = existingWord.startCol - intersection.word1Index;
        }

        // Перевірка меж сітки
        const endRow = newDirection === 'vertical' ? startRow + newWord.word.length - 1 : startRow;
        const endCol = newDirection === 'horizontal' ? startCol + newWord.word.length - 1 : startCol;

        if (startRow < 0 || startCol < 0 || endRow >= gridSize.height || endCol >= gridSize.width) {
            return null;
        }

        return {
            startRow: startRow,
            startCol: startCol,
            direction: newDirection,
            quality: intersection.quality,
            intersections: [intersection]
        };
    }

    /**
     * Сортування слів для оптимального розміщення
     * @param {Array} words - масив слів
     * @returns {Array} відсортований масив
     */
    sortWordsForPlacement(words) {
        return words.sort((a, b) => {
            // Спочатку довші слова
            if (a.word.length !== b.word.length) {
                return b.word.length - a.word.length;
            }

            // Потім слова з рідкісними літерами
            const aRarity = this.calculateWordRarity(a.word);
            const bRarity = this.calculateWordRarity(b.word);
            if (aRarity !== bRarity) {
                return bRarity - aRarity;
            }

            // В кінці за алфавітом
            return a.word.localeCompare(b.word);
        });
    }

    /**
     * Обчислення рідкісності слова
     * @param {string} word - слово
     * @returns {number} оцінка рідкісності
     */
    calculateWordRarity(word) {
        const commonLetters = ['А', 'О', 'І', 'Е', 'Н', 'Т', 'Р', 'С'];
        const rareLetters = ['Ї', 'Є', 'Ґ', 'Ь', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ'];
        
        let rarity = 0;
        
        for (const char of word) {
            if (rareLetters.includes(char)) {
                rarity += 2;
            } else if (!commonLetters.includes(char)) {
                rarity += 1;
            }
        }
        
        return rarity / word.length;
    }

    /**
     * Експорт слів у різних форматах
     * @param {Array} words - масив слів
     * @param {string} format - формат ('json', 'csv', 'txt')
     * @returns {string} експортовані дані
     */
    exportWords(words, format = 'json') {
        switch (format) {
            case 'json':
                return JSON.stringify(words, null, 2);
            
            case 'csv':
                const headers = ['word', 'clue', 'direction', 'startRow', 'startCol', 'number'];
                const csvData = [headers.join(',')];
                
                words.forEach(word => {
                    const row = [
                        `"${word.word}"`,
                        `"${word.clue}"`,
                        word.direction,
                        word.startRow,
                        word.startCol,
                        word.number
                    ];
                    csvData.push(row.join(','));
                });
                
                return csvData.join('\n');
            
            case 'txt':
                return words.map(word => 
                    `${word.number}. ${word.clue} (${word.word})`
                ).join('\n');
            
            default:
                throw new Error(`Невідомий формат: ${format}`);
        }
    }

    /**
     * Статистика слів
     * @param {Array} words - масив слів
     * @returns {Object} статистика
     */
    calculateWordsStatistics(words) {
        const stats = {
            total: words.length,
            horizontal: 0,
            vertical: 0,
            averageLength: 0,
            minLength: Infinity,
            maxLength: 0,
            totalLetters: 0,
            averageDifficulty: 0,
            languageDistribution: { ukrainian: 0, english: 0, mixed: 0 },
            letterFrequency: {},
            categories: {}
        };

        if (words.length === 0) {
            stats.minLength = 0;
            return stats;
        }

        words.forEach(wordData => {
            const word = wordData.word;
            
            // Підрахунок напрямків
            if (wordData.direction === 'horizontal') {
                stats.horizontal++;
            } else {
                stats.vertical++;
            }

            // Довжина
            stats.totalLetters += word.length;
            stats.minLength = Math.min(stats.minLength, word.length);
            stats.maxLength = Math.max(stats.maxLength, word.length);

            // Складність
            stats.averageDifficulty += this.calculateWordDifficulty(word);

            // Розподіл мов
            if (this.config.ukrainianChars.test(word) && this.config.englishChars.test(word)) {
                stats.languageDistribution.mixed++;
            } else if (this.config.ukrainianChars.test(word)) {
                stats.languageDistribution.ukrainian++;
            } else {
                stats.languageDistribution.english++;
            }

            // Частота літер
            for (const letter of word) {
                stats.letterFrequency[letter] = (stats.letterFrequency[letter] || 0) + 1;
            }

            // Категорії
            const categories = this.getWordCategories(word);
            categories.forEach(category => {
                stats.categories[category] = (stats.categories[category] || 0) + 1;
            });
        });

        // Обчислення середніх значень
        stats.averageLength = (stats.totalLetters / words.length).toFixed(1);
        stats.averageDifficulty = (stats.averageDifficulty / words.length).toFixed(2);

        return stats;
    }

    /**
     * Очищення кешу
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Отримання з кешу
     * @param {string} key - ключ
     * @returns {any} значення з кешу
     */
    getFromCache(key) {
        return this.cache.get(key);
    }

    /**
     * Збереження в кеш
     * @param {string} key - ключ
     * @param {any} value - значення
     */
    setCache(key, value) {
        this.cache.set(key, value);
    }
}

// Створення глобального екземпляра
window.WordHelper = new WordHelper();

// Експорт для використання в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WordHelper;
}