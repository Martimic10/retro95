const KEY = 'retroos_achievements_v1';

const CATALOG = {
    first_boot: { title: 'First Boot', description: 'Open any app' },
    power_user: { title: 'Power User', description: 'Open 5 windows' },
    terminal_wizard: { title: 'Terminal Wizard', description: 'Run 10 terminal commands' },
    hacker: { title: 'Hacker', description: 'Run the hack command' },
    minesweeper_win: { title: 'Minesweeper Win', description: 'Win a minesweeper game' },
    customizer: { title: 'Customizer', description: 'Change wallpaper' },
    sharer: { title: 'Sharer', description: 'Export desktop state' }
};

function loadRaw() {
    try {
        const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
        return {
            unlocked: Array.isArray(parsed.unlocked) ? parsed.unlocked : [],
            counters: parsed.counters || {}
        };
    } catch (_error) {
        return { unlocked: [], counters: {} };
    }
}

function saveRaw(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
}

export function createAchievements({ onUnlock }) {
    const state = loadRaw();

    function isUnlocked(id) {
        return state.unlocked.includes(id);
    }

    function unlock(id) {
        if (!CATALOG[id] || isUnlocked(id)) return false;
        state.unlocked.push(id);
        saveRaw(state);
        if (typeof onUnlock === 'function') {
            onUnlock(CATALOG[id], id);
        }
        return true;
    }

    function incrementCounter(name, by = 1) {
        state.counters[name] = (state.counters[name] || 0) + by;
        saveRaw(state);
        return state.counters[name];
    }

    function getCounter(name) {
        return state.counters[name] || 0;
    }

    return {
        catalog: CATALOG,
        unlock,
        isUnlocked,
        incrementCounter,
        getCounter
    };
}
