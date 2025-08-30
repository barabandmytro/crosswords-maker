/**
 * WordValidator - клас для валідації слів та підказок кросворду
 * Містить методи для перевірки коректності, унікальності та якості слів
 */
class WordValidator {
    constructor() {
        // Правила валідації
        this.rules = {
            // Основні обмеження
            minWordLength: 2,
            maxWordLength: 25,
            minClueLength: 5,
            maxClueLength: 200,
            
            // Символи та мови
            allowedWordChars: /^[А-ЯІЇЄґA-Z\s\-']+$/i,
            ukrainianChars: /[А-ЯІЇЄґ]/,
            englishChars: /[A-Z]/,
            forbiddenChars: /[0-9!@#$%^&*()+={}[\]|\\:";'<>?,./`~]/,
            
            // Якість
            maxRepeatingChars: 3,
            minUniqueChars: 0.4,
            maxCommonWordsRatio: 0.3,
            
            // Підказки
            obviousClueThreshold: 0.8,
            grammarCheckEnabled: true,
            profanityCheckEnabled: true,
            
            // Складність
            difficultyLevels: {
                EASY: { min: 0, max: 0.3 },
                MEDIUM: { min: 0.3, max: 0.7 },
                HARD: { min: 0.7, max: 1.0 }
            }
        };

        // Словники
        this.dictionaries = {
            common: new Set(), // Часто вживані слова
            profanity: new Set(), // Небажані слова
            abbreviations: new Set(), // Абревіатури
            properNouns: new Set() // Власні назви
        };

        // Кеш валідації
        this.validationCache = new Map();
        
        // Статистика використання
        this.usageStats = {
            totalValidations: 0,
            cacheHits: 0,
            averageValidationTime: 0
        };

        // Ініціалізація базових словників
        this.initializeBaseDictionaries();
    }

    /**
     * Основний метод валідації слова
     * @param {string} word - слово для валідації
     * @param {string} clue - підказка до слова
     * @param {Object} context - контекст (інші слова, тема тощо)
     * @param {Object} options - додаткові опції валідації
     * @returns {Object} результат валідації
     */
    validateWord(word, clue = '', context = {}, options = {}) {
        const startTime = Date.now();
        this.usageStats.totalValidations++;

        // Перевірити кеш
        const cacheKey = this.generateCacheKey(word, clue, context, options);
        if (this.validationCache.has(cacheKey)) {
            this.usageStats.cacheHits++;
            return this.validationCache.get(cacheKey);
        }

        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            score: 0,
            metrics: {},
            metadata: {}
        };

        try {
            // Базова валідація слова
            this.validateWordStructure(word, result);
            this.validateWordLength(word, result);
            this.validateWordCharacters(word, result);
            
            // Лінгвістична валідація
            this.validateWordLanguage(word, result);
            this.validateWordPattern(word, result);
            this.validateWordComplexity(word, result);
            
            // Контекстуальна валідація
            this.validateWordUniqueness(word, context, result);
            this.validateWordRelevance(word, context, result);
            
            // Валідація підказки
            if (clue) {
                this.validateClueStructure(clue, result);
                this.validateClueLength(clue, result);
                this.validateClueQuality(word, clue, result);
                this.validateClueGrammar(clue, result);
            }
            
            // Семантична валідація
            this.validateWordMeaning(word, clue, result);
            this.validateDifficulty(word, clue, context, result);
            
            // Обчислення метрик
            this.calculateWordMetrics(word, clue, result);
            
            // Генерація рекомендацій
            this.generateRecommendations(word, clue, result);
            
            // Загальна оцінка
            result.score = this.calculateWordScore(result);
            result.isValid = result.errors.length === 0;

        } catch (error) {
            result.isValid = false;
            result.errors.push(`Критична помилка валідації: ${error.message}`);
            result.score = 0;
        }

        // Зберегти в кеш та оновити статистику
        this.validationCache.set(cacheKey, result);
        this.updateValidationStats(startTime);

        return result;
    }

    /**
     * Валідація структури слова
     * @param {string} word - слово
     * @param {Object} result - результат валідації
     */
    validateWordStructure(word, result) {
        // Перевірка типу
        if (typeof word !== 'string') {
            result.errors.push('Слово має бути рядком');
            return;
        }

        // Перевірка на порожність
        if (!word || !word.trim()) {
            result.errors.push('Слово не може бути порожнім');
            return;
        }

        // Нормалізація та основні перевірки
        const normalizedWord = word.trim().toUpperCase();
        result.metadata.originalWord = word;
        result.metadata.normalizedWord = normalizedWord;

        // Перевірка на пробіли всередині слова
        if (normalizedWord.includes('  ')) {
            result.warnings.push('Слово містить подвійні пробіли');
        }

        // Перевірка на спеціальні символи на початку/кінці
        if (/^[-'\s]|[-'\s]$/.test(normalizedWord)) {
            result.warnings.push('Слово починається або закінчується спеціальним символом');
        }
    }

    /**
     * Валідація довжини слова
     * @param {string} word - слово
     * @param {Object} result - результат валідації
     */
    validateWordLength(word, result) {
        const normalizedWord = result.metadata.normalizedWord || word.trim().toUpperCase();
        const length = normalizedWord.replace(/\s/g, '').length; // Без пробілів

        result.metadata.letterCount = length;

        if (length < this.rules.minWordLength) {
            result.errors.push(`Слово занадто коротке: ${length} літер (мінімум ${this.rules.minWordLength})`);
        }

        if (length > this.rules.maxWordLength) {
            result.errors.push(`Слово занадто довге: ${length} літер (максимум ${this.rules.maxWordLength})`);
        }

        // Рекомендації по довжині
        if (length >= 3 && length <= 5) {
            result.suggestions.push('Коротке слово - добре для початківців');
        } else if (length >= 8 && length <= 12) {
            result.suggestions.push('Середнє слово - оптимальна довжина');
        } else if (length > 15) {
            result.warnings.push('Довге слово може ускладнити розміщення');
        }
    }

    /**
     * Валідація символів слова
     * @param {string} word - слово
     * @param {Object} result - результат валідації
     */
    validateWordCharacters(word, result) {
        const normalizedWord = result.metadata.normalizedWord || word.trim().toUpperCase();

        // Перевірка дозволених символів
        if (!this.rules.allowedWordChars.test(normalizedWord)) {
            result.errors.push('Слово містить недозволені символи');
        }

        // Перевірка заборонених символів
        if (this.rules.forbiddenChars.test(normalizedWord)) {
            result.errors.push('Слово містить заборонені символи (цифри, спеціальні знаки)');
        }

        // Аналіз символів
        const chars = normalizedWord.split('');
        const uniqueChars = new Set(chars.filter(c => c !== ' '));
        const uniqueRatio = uniqueChars.size / chars.filter(c => c !== ' ').length;

        result.metadata.uniqueCharsRatio = uniqueRatio;

        if (uniqueRatio < this.rules.minUniqueChars) {
            result.warnings.push(`Мало унікальних літер: ${(uniqueRatio * 100).toFixed(1)}%`);
        }

        // Перевірка повторюваних символів
        const repeatingPattern = normalizedWord.match(/(.)\1{2,}/g);
        if (repeatingPattern) {
            const maxRepeating = Math.max(...repeatingPattern.map(p => p.length));
            if (maxRepeating > this.rules.maxRepeatingChars) {
                result.warnings.push(`Занадто багато повторюваних літер підряд: ${maxRepeating}`);
            }
        }
    }

    /**
     * Валідація мови слова
     * @param {string} word - слово
     * @param {Object} result - результат валідації
     */
    validateWordLanguage(word, result) {
        const normalizedWord = result.metadata.normalizedWord || word.trim().toUpperCase();
        
        const hasUkrainian = this.rules.ukrainianChars.test(normalizedWord);
        const hasEnglish = this.rules.englishChars.test(normalizedWord);

        result.metadata.language = {
            hasUkrainian,
            hasEnglish,
            mixed: hasUkrainian && hasEnglish
        };

        // Змішування мов
        if (hasUkrainian && hasEnglish) {
            result.warnings.push('Слово містить літери різних алфавітів (української та англійської)');
        }

        // Визначення основної мови
        if (hasUkrainian && !hasEnglish) {
            result.metadata.primaryLanguage = 'ukrainian';
        } else if (hasEnglish && !hasUkrainian) {
            result.metadata.primaryLanguage = 'english';
        } else if (hasUkrainian && hasEnglish) {
            result.metadata.primaryLanguage = 'mixed';
        } else {
            result.metadata.primaryLanguage = 'unknown';
            result.warnings.push('Не вдалося визначити мову слова');
        }
    }

    /**
     * Валідація патернів слова
     * @param {string} word - слово
     * @param {Object} result - результат валідації
     */
    validateWordPattern(word, result) {
        const normalizedWord = result.metadata.normalizedWord || word.trim().toUpperCase();
        
        // Перевірка на палиндроми
        const cleanWord = normalizedWord.replace(/[\s\-']/g, '');
        const isPalindrome = cleanWord === cleanWord.split('').reverse().join('');
        
        if (isPalindrome && cleanWord.length > 3) {
            result.suggestions.push('Слово є паліндромом - це може бути цікавою особливістю кросворду');
        }

        // Перевірка на анаграми з іншими словами (якщо є контекст)
        result.metadata.isPalindrome = isPalindrome;

        // Аналіз голосних та приголосних
        const vowels = (normalizedWord.match(/[АЕЄИІЇОУЮЯ]/g) || []).length;
        const consonants = (normalizedWord.match(/[БВГҐДЖЗЙКЛМНПРСТФХЦЧШЩЬ]/g) || []).length;
        const vowelRatio = vowels / (vowels + consonants) || 0;

        result.metadata.phonetics = {
            vowels,
            consonants,
            vowelRatio
        };

        // Рекомендації по фонетиці
        if (vowelRatio < 0.2) {
            result.warnings.push('Слово містить багато приголосних підряд, може бути складним для введення');
        } else if (vowelRatio > 0.6) {
            result.suggestions.push('Слово має багато голосних, може бути легким для запам\'ятовування');
        }
    }

    /**
     * Валідація складності слова
     * @param {string} word - слово
     * @param {Object} result - результат валідації
     */
    validateWordComplexity(word, result) {
        const normalizedWord = result.metadata.normalizedWord || word.trim().toUpperCase();
        
        let complexity = 0;

        // Базова складність на основі довжини
        complexity += Math.min(normalizedWord.length / 20, 0.4);

        // Складність на основі рідкісних літер
        const rareLetters = ['Ї', 'Є', 'Ґ', 'Ь', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ'];
        const rareCount = normalizedWord.split('').filter(char => rareLetters.includes(char)).length;
        complexity += (rareCount / normalizedWord.length) * 0.3;

        // Складність на основі консонантних кластерів
        const consonantClusters = normalizedWord.match(/[БВГҐДЖЗЙКЛМНПРСТФХЦЧШЩЬ]{3,}/g) || [];
        complexity += consonantClusters.length * 0.1;

        // Складність на основі рідкісних сполучень
        const rareCombinations = ['ЬЯ', 'ЮЯ', 'ЩЯ', 'ЇЄ'];
        const rareComboCount = rareCombinations.reduce((count, combo) => {
            return count + (normalizedWord.includes(combo) ? 1 : 0);
        }, 0);
        complexity += rareComboCount * 0.15;

        // Нормалізація складності
        complexity = Math.min(complexity, 1);

        result.metadata.complexity = complexity;
        result.metadata.difficultyLevel = this.getDifficultyLevel(complexity);

        // Рекомендації по складності
        if (complexity < 0.2) {
            result.suggestions.push('Просте слово - підходить для початківців');
        } else if (complexity > 0.8) {
            result.warnings.push('Складне слово - може бути важким для більшості гравців');
        }
    }

    /**
     * Валідація унікальності слова
     * @param {string} word - слово
     * @param {Object} context - контекст
     * @param {Object} result - результат валідації
     */
    validateWordUniqueness(word, context, result) {
        const normalizedWord = result.metadata.normalizedWord || word.trim().toUpperCase();
        
        if (context.existingWords && Array.isArray(context.existingWords)) {
            const duplicates = context.existingWords.filter(existingWord => 
                (existingWord.word || existingWord).toUpperCase() === normalizedWord
            );

            if (duplicates.length > 0) {
                result.errors.push(`Слово "${normalizedWord}" вже використовується в кросворді`);
            }

            // Перевірка на близькі слова (анаграми, однокореневі)
            const similarWords = this.findSimilarWords(normalizedWord, context.existingWords);
            if (similarWords.length > 0) {
                result.warnings.push(`Знайдено схожі слова: ${similarWords.join(', ')}`);
            }
        }

        // Перевірка в словниках
        if (this.dictionaries.common.has(normalizedWord.toLowerCase())) {
            result.suggestions.push('Часто вживане слово - буде зрозумілим для гравців');
        }

        if (this.dictionaries.profanity.has(normalizedWord.toLowerCase())) {
            result.errors.push('Слово містить неприйнятний контент');
        }

        if (this.dictionaries.abbreviations.has(normalizedWord)) {
            result.warnings.push('Слово є абревіатурою - переконайтеся, що це доречно');
        }
    }

    /**
     * Валідація релевантності слова
     * @param {string} word - слово
     * @param {Object} context - контекст
     * @param {Object} result - результат валідації
     */
    validateWordRelevance(word, context, result) {
        if (context.theme) {
            // Перевірка відповідності темі
            const themeRelevance = this.calculateThemeRelevance(word, context.theme);
            result.metadata.themeRelevance = themeRelevance;

            if (themeRelevance < 0.3) {
                result.suggestions.push(`Слово слабо пов'язане з темою "${context.theme}"`);
            } else if (themeRelevance > 0.8) {
                result.suggestions.push(`Слово відмінно підходить для теми "${context.theme}"`);
            }
        }

        if (context.difficulty) {
            // Перевірка відповідності рівню складності
            const wordComplexity = result.metadata.complexity || 0;
            const targetRange = this.rules.difficultyLevels[context.difficulty.toUpperCase()];
            
            if (targetRange && (wordComplexity < targetRange.min || wordComplexity > targetRange.max)) {
                result.warnings.push(`Складність слова не відповідає цільовому рівню "${context.difficulty}"`);
            }
        }
    }

    /**
     * Валідація структури підказки
     * @param {string} clue - підказка
     * @param {Object} result - результат валідації
     */
    validateClueStructure(clue, result) {
        if (typeof clue !== 'string') {
            result.errors.push('Підказка має бути рядком');
            return;
        }

        const trimmedClue = clue.trim();
        result.metadata.originalClue = clue;
        result.metadata.normalizedClue = trimmedClue;

        if (!trimmedClue) {
            result.warnings.push('Підказка порожня');
            return;
        }

        // Перевірка базової структури
        if (!/^[А-ЯІЇЄґA-ZА-я]/.test(trimmedClue)) {
            result.warnings.push('Підказка не починається з літери');
        }

        if (!/[.!?]$/.test(trimmedClue)) {
            result.warnings.push('Підказка не закінчується розділовим знаком');
        }
    }

    /**
     * Валідація довжини підказки
     * @param {string} clue - підказка
     * @param {Object} result - результат валідації
     */
    validateClueLength(clue, result) {
        const trimmedClue = result.metadata.normalizedClue || clue.trim();
        const length = trimmedClue.length;

        result.metadata.clueLength = length;

        if (length < this.rules.minClueLength) {
            result.warnings.push(`Підказка занадто коротка: ${length} символів (рекомендується мінімум ${this.rules.minClueLength})`);
        }

        if (length > this.rules.maxClueLength) {
            result.warnings.push(`Підказка занадто довга: ${length} символів (рекомендується максимум ${this.rules.maxClueLength})`);
        }

        // Рекомендації по довжині
        if (length >= 10 && length <= 50) {
            result.suggestions.push('Оптимальна довжина підказки');
        } else if (length > 100) {
            result.suggestions.push('Розгляньте скорочення підказки для кращого сприйняття');
        }
    }

    /**
     * Валідація якості підказки
     * @param {string} word - слово
     * @param {string} clue - підказка
     * @param {Object} result - результат валідації
     */
    validateClueQuality(word, clue, result) {
        const normalizedWord = result.metadata.normalizedWord || word.trim().toUpperCase();
        const normalizedClue = result.metadata.normalizedClue || clue.trim();

        // Перевірка на очевидність
        const obviousness = this.calculateClueObviousness(normalizedWord, normalizedClue);
        result.metadata.clueObviousness = obviousness;

        if (obviousness > this.rules.obviousClueThreshold) {
            result.warnings.push('Підказка може бути занадто очевидною');
        } else if (obviousness < 0.1) {
            result.warnings.push('Підказка може бути занадто складною або незрозумілою');
        }

        // Перевірка на пряме вказування слова
        if (normalizedClue.toUpperCase().includes(normalizedWord)) {
            result.errors.push('Підказка містить саме слово-відповідь');
        }

        // Перевірка на часткове збігання
        const wordParts = this.getWordParts(normalizedWord);
        const foundParts = wordParts.filter(part => 
            part.length > 3 && normalizedClue.toUpperCase().includes(part)
        );

        if (foundParts.length > 0) {
            result.warnings.push(`Підказка містить частини слова: ${foundParts.join(', ')}`);
        }

        // Аналіз типу підказки
        const clueType = this.identifyClueType(normalizedClue);
        result.metadata.clueType = clueType;
    }

    /**
     * Валідація граматики підказки
     * @param {string} clue - підказка
     * @param {Object} result - результат валідації
     */
    validateClueGrammar(clue, result) {
        if (!this.rules.grammarCheckEnabled) return;

        const normalizedClue = result.metadata.normalizedClue || clue.trim();
        const grammarIssues = [];

        // Перевірка подвійних пробілів
        if (/\s{2,}/.test(normalizedClue)) {
            grammarIssues.push('Подвійні пробіли');
        }

        // Перевірка пробілів перед розділовими знаками
        if (/\s[.!?,:;]/.test(normalizedClue)) {
            grammarIssues.push('Пробіли перед розділовими знаками');
        }

        // Перевірка відсутності пробілів після розділових знаків
        if (/[.!?,:;][А-ЯІЇЄґA-Zа-я]/i.test(normalizedClue)) {
            grammarIssues.push('Відсутні пробіли після розділових знаків');
        }

        // Перевірка великих літер після крапки
        const sentences = normalizedClue.split(/[.!?]+/);
        sentences.forEach((sentence, index) => {
            if (index > 0 && sentence.trim() && !/^[А-ЯІЇЄґA-Z]/.test(sentence.trim())) {
                grammarIssues.push('Речення не починається з великої літери');
            }
        });

        if (grammarIssues.length > 0) {
            result.warnings.push(`Граматичні помилки: ${grammarIssues.join(', ')}`);
        }
    }

    /**
     * Валідація значення слова
     * @param {string} word - слово
     * @param {string} clue - підказка
     * @param {Object} result - результат валідації
     */
    validateWordMeaning(word, clue, result) {
        // Перевірка семантичного зв'язку між словом та підказкою
        if (clue) {
            const semanticScore = this.calculateSemanticRelevance(word, clue);
            result.metadata.semanticRelevance = semanticScore;

            if (semanticScore < 0.3) {
                result.warnings.push('Слабкий семантичний зв\'язок між словом та підказкою');
            } else if (semanticScore > 0.8) {
                result.suggestions.push('Відмінний зв\'язок між словом та підказкою');
            }
        }

        // Перевірка на багатозначність
        const isAmbiguous = this.checkWordAmbiguity(word);
        if (isAmbiguous && !clue) {
            result.warnings.push('Слово може мати декілька значень - додайте уточнюючу підказку');
        }

        result.metadata.isAmbiguous = isAmbiguous;
    }

    /**
     * Валідація складності
     * @param {string} word - слово
     * @param {string} clue - підказка
     * @param {Object} context - контекст
     * @param {Object} result - результат валідації
     */
    validateDifficulty(word, clue, context, result) {
        const wordComplexity = result.metadata.complexity || 0;
        const clueComplexity = clue ? this.calculateClueComplexity(clue) : 0;
        
        // Загальна складність
        const overallDifficulty = (wordComplexity + clueComplexity) / 2;
        result.metadata.overallDifficulty = overallDifficulty;
        result.metadata.difficultyLevel = this.getDifficultyLevel(overallDifficulty);

        // Перевірка збалансованості
        const difficultyDifference = Math.abs(wordComplexity - clueComplexity);
        if (difficultyDifference > 0.4) {
            result.warnings.push('Складність слова та підказки сильно відрізняється');
        }

        // Рекомендації
        if (overallDifficulty < 0.3) {
            result.suggestions.push('Легке завдання - підходить для початківців');
        } else if (overallDifficulty > 0.7) {
            result.suggestions.push('Складне завдання - підходить для досвідчених гравців');
        } else {
            result.suggestions.push('Середня складність - універсальне завдання');
        }
    }

    /**
     * Обчислення метрик слова
     * @param {string} word - слово
     * @param {string} clue - підказка
     * @param {Object} result - результат валідації
     */
    calculateWordMetrics(word, clue, result) {
        const metrics = result.metrics;

        // Базові метрики
        metrics.wordLength = (result.metadata.normalizedWord || word).replace(/\s/g, '').length;
        metrics.clueLength = clue ? clue.trim().length : 0;
        metrics.uniqueCharsCount = new Set((result.metadata.normalizedWord || word).replace(/\s/g, '').split('')).size;
        metrics.complexity = result.metadata.complexity || 0;
        
        // Якісні метрики
        metrics.readabilityScore = this.calculateReadabilityScore(word, clue);
        metrics.memorabilityScore = this.calculateMemorabilityScore(word);
        metrics.accessibilityScore = this.calculateAccessibilityScore(word, clue);
        
        // Технічні метрики
        metrics.crosswordFriendliness = this.calculateCrosswordFriendliness(word);
        metrics.intersectionPotential = this.calculateIntersectionPotential(word);
    }

    /**
     * Генерація рекомендацій
     * @param {string} word - слово
     * @param {string} clue - підказка
     * @param {Object} result - результат валідації
     */
    generateRecommendations(word, clue, result) {
        const suggestions = result.suggestions;

        // Рекомендації по слову
        if (result.metadata.complexity < 0.2) {
            suggestions.push('Розгляньте додання більш складного слова для балансу');
        }

        if (result.metadata.uniqueCharsRatio < 0.5) {
            suggestions.push('Слово з більшою кількістю різних літер краще для пересічень');
        }

        // Рекомендації по підказці
        if (clue) {
            const clueType = result.metadata.clueType;
            if (clueType === 'definition') {
                suggestions.push('Визначення - класичний тип підказки');
            } else if (clueType === 'synonym') {
                suggestions.push('Синонім - добре для швидкого розгадування');
            } else if (clueType === 'cryptic') {
                suggestions.push('Криптична підказка - для досвідчених гравців');
            }

            if (!result.metadata.clueObviousness || result.metadata.clueObviousness < 0.3) {
                suggestions.push('Підказка може потребувати спрощення для кращого розуміння');
            }
        }

        // Рекомендації по темі
        if (result.metadata.themeRelevance && result.metadata.themeRelevance > 0.7) {
            suggestions.push('Відмінна відповідність темі кросворду');
        }

        // Рекомендації по складності
        const difficulty = result.metadata.difficultyLevel;
        if (difficulty === 'EASY') {
            suggestions.push('Підходить для дитячих або навчальних кросвордів');
        } else if (difficulty === 'HARD') {
            suggestions.push('Підходить для турнірів або професійних кросвордів');
        }
    }

    /**
     * Обчислення загального балу слова
     * @param {Object} result - результат валідації
     * @returns {number} бал від 0 до 100
     */
    calculateWordScore(result) {
        let score = 100;

        // Штрафи за помилки
        score -= result.errors.length * 30;

        // Штрафи за попередження
        score -= result.warnings.length * 10;

        // Бонуси за якість
        if (result.metadata.complexity >= 0.3 && result.metadata.complexity <= 0.7) {
            score += 10; // Оптимальна складність
        }

        if (result.metadata.uniqueCharsRatio > 0.6) {
            score += 5; // Багато унікальних літер
        }

        if (result.metadata.semanticRelevance > 0.6) {
            score += 10; // Хороший зв'язок зі значенням
        }

        // Бонуси за метрики
        if (result.metrics) {
            score += (result.metrics.crosswordFriendliness || 0) * 15;
            score += (result.metrics.readabilityScore || 0) * 10;
        }

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    /**
     * Допоміжні методи
     */

    /**
     * Ініціалізація базових словників
     */
    initializeBaseDictionaries() {
        // Найпоширеніші українські слова
        const commonUkrainianWords = [
            'ВОДА', 'ДОМА', 'МАМА', 'ТАТО', 'ХЛІБ', 'МОЛОКО', 'РУКА', 'НОГА',
            'ГОЛОВА', 'СЕРЦЕ', 'ЛЮБОВ', 'ЖИТТЯ', 'СВІТ', 'ДЕНЬ', 'НІЧ'
        ];

        commonUkrainianWords.forEach(word => {
            this.dictionaries.common.add(word.toLowerCase());
        });

        // Абревіатури
        const abbreviations = ['США', 'ЄС', 'НАТО', 'ООН', 'UNESCO'];
        abbreviations.forEach(abbr => {
            this.dictionaries.abbreviations.add(abbr);
        });
    }

    /**
     * Знаходження схожих слів
     * @param {string} word - слово
     * @param {Array} existingWords - існуючі слова
     * @returns {Array} схожі слова
     */
    findSimilarWords(word, existingWords) {
        const similar = [];
        const normalizedWord = word.toUpperCase();

        existingWords.forEach(existingWord => {
            const normalized = (existingWord.word || existingWord).toUpperCase();
            
            // Перевірка на анаграми
            if (this.areAnagrams(normalizedWord, normalized)) {
                similar.push(normalized);
            }
            
            // Перевірка на однокореневі слова (спрощено)
            if (this.shareRoot(normalizedWord, normalized)) {
                similar.push(normalized);
            }
        });

        return similar;
    }

    /**
     * Перевірка на анаграми
     * @param {string} word1 - перше слово
     * @param {string} word2 - друге слово
     * @returns {boolean} чи є анаграми
     */
    areAnagrams(word1, word2) {
        if (word1.length !== word2.length) return false;
        
        const sorted1 = word1.replace(/\s/g, '').split('').sort().join('');
        const sorted2 = word2.replace(/\s/g, '').split('').sort().join('');
        
        return sorted1 === sorted2;
    }

    /**
     * Перевірка спільного кореня (спрощено)
     * @param {string} word1 - перше слово
     * @param {string} word2 - друге слово
     * @returns {boolean} чи мають спільний корінь
     */
    shareRoot(word1, word2) {
        if (word1.length < 4 || word2.length < 4) return false;
        
        const root1 = word1.substring(0, Math.min(4, word1.length - 2));
        const root2 = word2.substring(0, Math.min(4, word2.length - 2));
        
        return root1 === root2;
    }

    /**
     * Обчислення релевантності темі
     * @param {string} word - слово
     * @param {string} theme - тема
     * @returns {number} релевантність (0-1)
     */
    calculateThemeRelevance(word, theme) {
        // Спрощена логіка - в реальному додатку тут би був ML алгоритм
        const themeWords = this.getThemeWords(theme);
        const wordLower = word.toLowerCase();
        
        if (themeWords.includes(wordLower)) return 1.0;
        
        // Перевірка часткового збігу
        const partialMatches = themeWords.filter(tw => 
            wordLower.includes(tw) || tw.includes(wordLower)
        ).length;
        
        return Math.min(partialMatches / themeWords.length, 1.0);
    }

    /**
     * Отримання слів теми
     * @param {string} theme - тема
     * @returns {Array} слова теми
     */
    getThemeWords(theme) {
        const themeDict = {
            'природа': ['дерево', 'квітка', 'ліс', 'річка', 'гора'],
            'спорт': ['футбол', 'теніс', 'плавання', 'біг', 'гімнастика'],
            'їжа': ['хліб', 'молоко', 'м\'ясо', 'овочі', 'фрукти'],
            'тварини': ['кіт', 'собака', 'миша', 'птах', 'риба']
        };
        
        return themeDict[theme.toLowerCase()] || [];
    }

    /**
     * Рівень складності за числовим значенням
     * @param {number} complexity - складність (0-1)
     * @returns {string} рівень складності
     */
    getDifficultyLevel(complexity) {
        if (complexity <= 0.3) return 'EASY';
        if (complexity <= 0.7) return 'MEDIUM';
        return 'HARD';
    }

    /**
     * Обчислення очевидності підказки
     * @param {string} word - слово
     * @param {string} clue - підказка
     * @returns {number} очевидність (0-1)
     */
    calculateClueObviousness(word, clue) {
        let obviousness = 0;

        // Пряме включення слова
        if (clue.toUpperCase().includes(word.toUpperCase())) {
            obviousness += 0.8;
        }

        // Включення частин слова
        const wordParts = this.getWordParts(word);
        const foundParts = wordParts.filter(part => 
            clue.toUpperCase().includes(part.toUpperCase())
        );
        obviousness += (foundParts.length / wordParts.length) * 0.6;

        // Довжина підказки (коротші = більш очевидні)
        const lengthFactor = Math.max(0, 1 - (clue.length / 50));
        obviousness += lengthFactor * 0.3;

        return Math.min(obviousness, 1);
    }

    /**
     * Отримання частин слова
     * @param {string} word - слово
     * @returns {Array} частини слова
     */
    getWordParts(word) {
        const parts = [];
        const cleanWord = word.replace(/\s/g, '');
        
        // Генерація підрядків довжиною 3+ символи
        for (let i = 0; i < cleanWord.length - 2; i++) {
            for (let j = i + 3; j <= cleanWord.length; j++) {
                parts.push(cleanWord.substring(i, j));
            }
        }
        
        return parts;
    }

    /**
     * Визначення типу підказки
     * @param {string} clue - підказка
     * @returns {string} тип підказки
     */
    identifyClueType(clue) {
        const clueLower = clue.toLowerCase();
        
        if (clueLower.includes('це') || clueLower.includes('той') || clueLower.includes('який')) {
            return 'definition';
        }
        
        if (clueLower.includes('синонім') || clueLower.includes('інше слово')) {
            return 'synonym';
        }
        
        if (clueLower.includes('?') && clueLower.includes('(') && clueLower.includes(')')) {
            return 'cryptic';
        }
        
        return 'general';
    }

    /**
     * Обчислення складності підказки
     * @param {string} clue - підказка
     * @returns {number} складність (0-1)
     */
    calculateClueComplexity(clue) {
        let complexity = 0;

        // Довжина підказки
        complexity += Math.min(clue.length / 100, 0.3);

        // Складні слова у підказці
        const words = clue.split(/\s+/);
        const complexWords = words.filter(word => word.length > 8).length;
        complexity += (complexWords / words.length) * 0.4;

        // Спеціальні символи та структури
        if (/[()[\]{}]/.test(clue)) complexity += 0.2;
        if (/[?!]/.test(clue)) complexity += 0.1;

        return Math.min(complexity, 1);
    }

    /**
     * Семантична релевантність
     * @param {string} word - слово
     * @param {string} clue - підказка
     * @returns {number} релевантність (0-1)
     */
    calculateSemanticRelevance(word, clue) {
        // Спрощена логіка - в реальному додатку використовувався би NLP
        const wordLower = word.toLowerCase();
        const clueLower = clue.toLowerCase();
        
        // Базова перевірка на ключові слова
        const keywordMatches = this.getKeywords(wordLower).filter(keyword =>
            clueLower.includes(keyword)
        ).length;
        
        // Тематичні категорії
        const wordCategory = this.getWordCategory(wordLower);
        const clueCategory = this.getClueCategory(clueLower);
        
        let relevance = keywordMatches * 0.3;
        if (wordCategory === clueCategory) {
            relevance += 0.5;
        }
        
        return Math.min(relevance, 1);
    }

    /**
     * Перевірка багатозначності слова
     * @param {string} word - слово
     * @returns {boolean} чи багатозначне
     */
    checkWordAmbiguity(word) {
        // Список відомих багатозначних слів
        const ambiguousWords = [
            'КЛЮЧ', 'БАНК', 'ЛІРА', 'КОСА', 'НОРКА', 'МИША', 'ОЧКО'
        ];
        
        return ambiguousWords.includes(word.toUpperCase());
    }

    /**
     * Обчислення читабельності
     * @param {string} word - слово
     * @param {string} clue - підказка
     * @returns {number} читабельність (0-1)
     */
    calculateReadabilityScore(word, clue) {
        let score = 0.5;

        // Простота слова
        const wordLength = word.replace(/\s/g, '').length;
        if (wordLength <= 6) score += 0.2;
        else if (wordLength > 12) score -= 0.2;

        // Простота підказки
        if (clue) {
            const avgWordLength = clue.split(/\s+/).reduce((sum, w) => sum + w.length, 0) / clue.split(/\s+/).length;
            if (avgWordLength <= 5) score += 0.2;
            else if (avgWordLength > 8) score -= 0.2;
        }

        return Math.max(0, Math.min(1, score));
    }

    /**
     * Обчислення запам'ятовуваності
     * @param {string} word - слово
     * @returns {number} запам'ятовуваність (0-1)
     */
    calculateMemorabilityScore(word) {
        let score = 0.5;
        const cleanWord = word.replace(/\s/g, '').toUpperCase();

        // Ритм та звучання
        const vowelCount = (cleanWord.match(/[АЕЄИІЇОУЮЯ]/g) || []).length;
        const consonantCount = cleanWord.length - vowelCount;
        const vowelRatio = vowelCount / cleanWord.length;
        
        // Оптимальне співвідношення голосних
        if (vowelRatio >= 0.3 && vowelRatio <= 0.5) score += 0.3;

        // Повторювані звуки
        const letterFreq = {};
        cleanWord.split('').forEach(char => {
            letterFreq[char] = (letterFreq[char] || 0) + 1;
        });
        const repeatingChars = Object.values(letterFreq).filter(count => count > 1).length;
        if (repeatingChars > 0 && repeatingChars <= 2) score += 0.2;

        return Math.max(0, Math.min(1, score));
    }

    /**
     * Обчислення доступності
     * @param {string} word - слово
     * @param {string} clue - підказка
     * @returns {number} доступність (0-1)
     */
    calculateAccessibilityScore(word, clue) {
        let score = 0.5;

        // Простота вимови
        const hardToPronounceCombos = ['ЩЯ', 'ЗШ', 'ШЧ', 'ТСЯ'];
        const hasHardCombo = hardToPronounceCombos.some(combo => word.includes(combo));
        if (!hasHardCombo) score += 0.3;

        // Знайомість слова
        if (this.dictionaries.common.has(word.toLowerCase())) score += 0.2;

        return Math.max(0, Math.min(1, score));
    }

    /**
     * Придатність для кросворду
     * @param {string} word - слово
     * @returns {number} придатність (0-1)
     */
    calculateCrosswordFriendliness(word) {
        let score = 0.5;
        const cleanWord = word.replace(/\s/g, '').toUpperCase();

        // Різноманітність літер
        const uniqueChars = new Set(cleanWord.split(''));
        const diversityRatio = uniqueChars.size / cleanWord.length;
        score += diversityRatio * 0.4;

        // Поширеність літер
        const commonLetters = ['А', 'О', 'І', 'Е', 'Н', 'Т', 'Р', 'С'];
        const commonLetterCount = cleanWord.split('').filter(char => 
            commonLetters.includes(char)
        ).length;
        score += (commonLetterCount / cleanWord.length) * 0.3;

        return Math.max(0, Math.min(1, score));
    }

    /**
     * Потенціал для пересічень
     * @param {string} word - слово
     * @returns {number} потенціал (0-1)
     */
    calculateIntersectionPotential(word) {
        const cleanWord = word.replace(/\s/g, '').toUpperCase();
        const letterFreq = {};
        
        cleanWord.split('').forEach(char => {
            letterFreq[char] = (letterFreq[char] || 0) + 1;
        });

        // Більше унікальних літер = вищий потенціал
        const uniqueLetters = Object.keys(letterFreq).length;
        return Math.min(uniqueLetters / 8, 1); // Нормалізовано до 8 унікальних літер
    }

    /**
     * Допоміжні методи для категоризації
     */
    getKeywords(word) {
        // Спрощена логіка отримання ключових слів
        return [word.substring(0, 3), word.substring(word.length - 3)];
    }

    getWordCategory(word) {
        // Спрощена категоризація слів
        if (['кіт', 'собака', 'миша'].includes(word)) return 'animals';
        if (['хліб', 'молоко', 'м\'ясо'].includes(word)) return 'food';
        return 'general';
    }

    getClueCategory(clue) {
        if (clue.includes('тварина') || clue.includes('звір')) return 'animals';
        if (clue.includes('їжа') || clue.includes('продукт')) return 'food';
        return 'general';
    }

    /**
     * Утиліти кешу та статистики
     */

    /**
     * Генерація ключа кешу
     */
    generateCacheKey(word, clue, context, options) {
        const contextHash = JSON.stringify(context || {}).substring(0, 50);
        const optionsHash = JSON.stringify(options || {}).substring(0, 50);
        return `${word}-${clue}-${contextHash}-${optionsHash}`;
    }

    /**
     * Оновлення статистики валідації
     */
    updateValidationStats(startTime) {
        const duration = Date.now() - startTime;
        this.usageStats.averageValidationTime = 
            (this.usageStats.averageValidationTime + duration) / 2;
    }

    /**
     * Очищення кешу
     */
    clearCache() {
        this.validationCache.clear();
    }

    /**
     * Отримання статистики
     */
    getStats() {
        return {
            ...this.usageStats,
            cacheSize: this.validationCache.size,
            dictionarySize: Object.keys(this.dictionaries).reduce((sum, key) => 
                sum + this.dictionaries[key].size, 0
            )
        };
    }

    /**
     * Batch валідація слів
     * @param {Array} wordsData - масив об'єктів {word, clue, context}
     * @returns {Array} результати валідації
     */
    validateBatch(wordsData) {
        return wordsData.map(data => 
            this.validateWord(data.word, data.clue, data.context, data.options)
        );
    }

    /**
     * Швидка валідація (тільки критичні помилки)
     * @param {string} word - слово
     * @param {string} clue - підказка
     * @returns {boolean} чи пройшла базова валідація
     */
    quickValidate(word, clue) {
        if (!word || typeof word !== 'string') return false;
        
        const normalized = word.trim().toUpperCase();
        const length = normalized.replace(/\s/g, '').length;
        
        if (length < this.rules.minWordLength || length > this.rules.maxWordLength) return false;
        if (!this.rules.allowedWordChars.test(normalized)) return false;
        if (this.rules.forbiddenChars.test(normalized)) return false;
        
        return true;
    }
}

// Створення глобального екземпляра
window.WordValidator = new WordValidator();

// Експорт для використання в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WordValidator;
}