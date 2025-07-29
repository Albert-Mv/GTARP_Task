const SIZE = 10 // размерность двумерного массива
const MIN = -100 // минимальная граница
const MAX = 100 // максимальная граница
const MAX_REPEATS = 3 // максимальное количество повторов чисел с одинаковым знаком

var validators = {
    finite: (value, name) => {
        if (!Number.isFinite(value)) throw new Error(`${name}: значение должно быть конечным числом`);
    },
    positiveInteger: (value, name) => {
        validators.finite(value, name);
        if (!Number.isInteger(value)) throw new Error(`${name}: значение должно быть целым числом`);
        if (value <= 0) throw new Error(`${name}: значение должно быть больше 0`);
        if (value > Number.MAX_SAFE_INTEGER) throw new Error(`${name}: значение превышает максимально допустимое`);
    },
    range: (min, max) => {
        validators.finite(min, "Минимальное число");
        validators.finite(max, "Максимальное число");
        if (min >= max) throw new Error("Минимальное значение должно быть меньше максимального");
        const range = max - min + 1;
        if (range > Number.MAX_SAFE_INTEGER) throw new Error(`Диапазон значений [${min}, ${max}] превышает максимально допустимый`);
    }
};

const getRandomNumber = (min, max) => {
    validators.range(min, max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const getRandomizedArray = (length, min, max) => {
    if (arguments.length < 3) throw new Error("Необходимо передать 3 аргумента: length, min, max");
    
    validators.positiveInteger(length, "Длина массива");
    validators.range(min, max);
    
    return Array.from({length}, () => getRandomNumber(min, max));
}

const arr = Array.from({length: SIZE}, () => getRandomizedArray(SIZE, MIN, MAX));

// Высчитываем ширину каждого столбца(поригодится для форматирования
// результирующей строки) и попутно ищем строку с минимальным числом
const colWidths = Array(SIZE).fill(0);
let minRowIndexes = new Set();
let minValue = Infinity;

for (let i = 0; i < arr.length; i++) {
    const row = arr[i];
    for (let col = 0; col < row.length; col++) {
        const value = row[col]
        const len = row[col].toString().length

        if (len > colWidths[col]) colWidths[col] = len;

        if (value < minValue) {
            minRowIndexes = new Set([i]);
            minValue = value
        } else if (value === minValue) {
            minRowIndexes.add(i)
        }
    }
}

// Ищем минимальное положительное число в строке
function minPositive(row) {
    let minValue = Infinity;
    for(x of row) {
        if (x > 0 && x < minValue) {
            if (x == 1) {
                return x;
            }
            minValue = x;
        }
    }

    return minValue === Infinity ? "-" : minValue; 
}

// Рекурсивное вычисление минимального количества чисел для замены, чтобы
// не встречалось 3 положительных или отрицательных числа подряд
function minReplacements(row) {
    const memo = new Map();

    function check(index, posCount, negCount) {
        if (posCount == MAX_REPEATS || negCount == MAX_REPEATS) {
            // Ветка вычислений невалидна, возвращаем бесконечность,
            // чтобы в рекурсии выбор пал на ветку, где меньше замен
            // пример: Math.min(minChanges, Infinity)
            return Infinity;
        }

        // Конец строки и счетчики не достигли максимума,
        // значит возвращаем 0, т.к. он не повлияет на результат
        if (index === row.length) return 0;

        // Проверим: нет ли закэшированного количества замен
        // для текущего индекса (точки вычислений)
        const key = `${index}-${posCount}-${negCount}`;
        if (memo.has(key)) return memo.get(key);

        const val = row[index];
        let minChanges = Infinity;

        // Пробуем вычислить ветку от текущей точки, сохранив тенденцию
        if (val > 0) {
            minChanges = check(index + 1, posCount + 1, 0);
        } else if (val < 0) {
            minChanges = check(index + 1, 0, negCount + 1);
        } else {
            minChanges = check(index + 1, 0, 0);
        }

        // Если текущее число меньше или равно 0
        if (val <= 0) {
            // То вычисляем ветку, подставив положительное число и выбираем ту,
            // где в итоге получилось меньше замен
            minChanges = Math.min(minChanges, 1 + check(index + 1, posCount + 1, 0));
        }

        // И наоборот
        if (val >= 0) {
            minChanges = Math.min(minChanges, 1 + check(index + 1, 0, negCount + 1));
        }

        // Запоминаем количество замен для текущего индекса
        memo.set(key, minChanges);
        return minChanges;
    }

    return check(0, 0, 0);
}


const getHeader = (minPositiveTitle, replacementsTitle) => {
    const header = `| ${formatRow(Array(SIZE).fill(''), colWidths, minPositiveTitle, replacementsTitle, true)}`
    const top = Array(header.length).fill("").join(" ")
    return top + '\r\n' + header
}

// Форматируем результирующую строку
function formatRow(row, colWidths, minPositiveTitle, replacementsTitle, isHeader = false) {
    const numbersContent = row.map((value, i) => value.toString().padStart(colWidths[i], " ")).join(" | ");

    let minPos = minPositive(row);
    const minPositiveContent = isHeader ? minPositiveTitle : minPos.toString().padStart(minPositiveTitle.length, " ");

    let replacements = minReplacements(row);
    const replacementsContent = isHeader ? replacementsTitle : replacements.toString().padStart(replacementsTitle.length, " ")

    return `| ${numbersContent} | ${minPositiveContent} | ${replacementsContent} |`
}

const underline = (str) => `\x1b[4m${str}\x1b[0m`

const renderTable = () => {
    const minPositiveTitle = "минимальное положительное"
    const replacementsTitle = "замен"
    const header = getHeader(minPositiveTitle, replacementsTitle);

    console.log(underline(header))

    for (let i = 0; i < SIZE; i++) {
        let mark = (minRowIndexes.has(i)) ? "|*" : "| ";
        let rowStr = formatRow(arr[i], colWidths, minPositiveTitle, replacementsTitle);
        const result = mark + rowStr

        console.log(i == SIZE - 1 ? underline(result) : result);
    }
}

renderTable()