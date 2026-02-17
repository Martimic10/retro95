const KEY = 'retroos_daily_v1';

const DAILY_COMMANDS = [
    "Try typing 'hack' in Terminal",
    "Find the hidden easter egg command",
    "Beat Minesweeper under 60 seconds",
    "Use Share Desktop to export your setup",
    "Try 'matrix' in Terminal"
];

const DAILY_FORTUNES = [
    'Your pixels align in your favor today.',
    'A shortcut key will save you time.',
    'A clean desktop leads to clean thinking.',
    'Curiosity unlocks hidden features.',
    'Today is good for tinkering.'
];

function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function randomFrom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function loadRaw() {
    try {
        return JSON.parse(localStorage.getItem(KEY) || '{}');
    } catch (_error) {
        return {};
    }
}

function saveRaw(raw) {
    localStorage.setItem(KEY, JSON.stringify(raw));
}

export function initializeDaily() {
    const key = todayKey();
    const raw = loadRaw();

    if (raw.date !== key || !raw.command || !raw.fortune) {
        raw.date = key;
        raw.command = randomFrom(DAILY_COMMANDS);
        raw.fortune = randomFrom(DAILY_FORTUNES);
        raw.tipShown = false;
        saveRaw(raw);
    }

    return {
        date: raw.date,
        command: raw.command,
        fortune: raw.fortune,
        tipShown: Boolean(raw.tipShown)
    };
}

export function markDailyTipShown() {
    const raw = loadRaw();
    raw.tipShown = true;
    saveRaw(raw);
}

export function getDailyInfo() {
    const current = initializeDaily();
    return {
        command: current.command,
        fortune: current.fortune
    };
}
