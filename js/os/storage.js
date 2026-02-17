const STORAGE_KEY = 'retroos_state';
const GAME_STATS_KEY = 'retro95_stats';
const DESKTOP_SLOTS_KEY = 'retro95_desktop_slots';
const SCHEMA_VERSION = 5;

const DEFAULT_STATE = {
    version: SCHEMA_VERSION,
    settings: {
        soundEnabled: false,
        easterEggsEnabled: true,
        showDailyTip: true,
        iconPack: 'default',
        bootScreenEnabled: true,
        bootText: 'Starting Retro95...',
        wallpaper: {
            type: 'preset',
            presetId: 'teal'
        }
    },
    icons: {},
    windows: [],
    nextWindowId: 1,
    focusedWindowId: null
};

function cloneDefaultState() {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function cloneDefaultGameStats() {
    return {
        gamesPlayed: 0,
        snakeHighScore: 0,
        pongWins: 0,
        game2048BestScore: 0
    };
}

function cloneDefaultSlots() {
    return {
        schemaVersion: 1,
        activeSlotId: 'default',
        slots: [
            { id: 'default', name: 'Default', state: null, updatedAt: null },
            { id: 'slot2', name: 'Slot 2', state: null, updatedAt: null },
            { id: 'slot3', name: 'Slot 3', state: null, updatedAt: null },
            { id: 'slot4', name: 'Slot 4', state: null, updatedAt: null },
            { id: 'slot5', name: 'Slot 5', state: null, updatedAt: null }
        ]
    };
}

function toWallpaperObject(settings = {}) {
    if (settings.wallpaper && typeof settings.wallpaper === 'object') {
        const type = settings.wallpaper.type;
        if (type === 'image' && settings.wallpaper.dataUrl) {
            return {
                type: 'image',
                dataUrl: settings.wallpaper.dataUrl,
                name: settings.wallpaper.name || 'uploaded-image'
            };
        }
        if (type === 'custom' && settings.wallpaper.color) {
            return { type: 'custom', color: settings.wallpaper.color };
        }
        if (type === 'preset' && settings.wallpaper.presetId) {
            return { type: 'preset', presetId: settings.wallpaper.presetId };
        }
    }

    if (settings.wallpaperImageDataUrl) {
        return {
            type: 'image',
            dataUrl: settings.wallpaperImageDataUrl,
            name: settings.wallpaperImageName || 'uploaded-image'
        };
    }

    if (settings.wallpaperCustom) {
        return { type: 'custom', color: settings.wallpaperCustom };
    }

    if (settings.wallpaperPreset || settings.wallpaper) {
        return { type: 'preset', presetId: settings.wallpaperPreset || settings.wallpaper };
    }

    return { type: 'preset', presetId: 'teal' };
}

function migrateState(raw) {
    if (!raw || typeof raw !== 'object') {
        return cloneDefaultState();
    }

    const base = cloneDefaultState();
    const merged = {
        ...base,
        ...raw,
        settings: {
            ...base.settings,
            ...(raw.settings || {})
        },
        icons: raw.icons || {},
        windows: Array.isArray(raw.windows) ? raw.windows : []
    };

    merged.settings.wallpaper = toWallpaperObject(merged.settings);
    merged.settings.iconPack = merged.settings.iconPack || 'default';
    merged.settings.bootScreenEnabled = merged.settings.bootScreenEnabled !== false;
    merged.settings.bootText = (merged.settings.bootText || 'Starting Retro95...').slice(0, 40);

    return merged;
}

export function normalizeState(raw) {
    return migrateState(raw);
}

export function loadState() {
    try {
        const serialized = localStorage.getItem(STORAGE_KEY);
        if (!serialized) return cloneDefaultState();
        const parsed = JSON.parse(serialized);
        return normalizeState(parsed);
    } catch (_error) {
        return cloneDefaultState();
    }
}

export function saveState(state) {
    const normalized = normalizeState(state);
    const payload = {
        ...normalized,
        version: SCHEMA_VERSION
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearState() {
    localStorage.removeItem(STORAGE_KEY);
}

export function loadGameStats() {
    try {
        const raw = JSON.parse(localStorage.getItem(GAME_STATS_KEY) || '{}');
        return {
            ...cloneDefaultGameStats(),
            ...raw
        };
    } catch (_error) {
        return cloneDefaultGameStats();
    }
}

export function saveGameStats(stats) {
    const payload = {
        ...cloneDefaultGameStats(),
        ...(stats || {})
    };
    localStorage.setItem(GAME_STATS_KEY, JSON.stringify(payload));
}

export function updateGameStats(patch) {
    const current = loadGameStats();
    const next = {
        ...current,
        ...(patch || {})
    };
    saveGameStats(next);
    return next;
}

export function getDesktopSlots() {
    const defaults = cloneDefaultSlots();
    try {
        const parsed = JSON.parse(localStorage.getItem(DESKTOP_SLOTS_KEY) || 'null');
        if (!parsed || typeof parsed !== 'object') {
            return defaults;
        }

        const incoming = Array.isArray(parsed.slots) ? parsed.slots : [];
        const slots = defaults.slots.map((slot, index) => {
            const raw = incoming[index] || {};
            return {
                id: slot.id,
                name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : slot.name,
                state: raw.state && typeof raw.state === 'object' ? normalizeState(raw.state) : null,
                updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null
            };
        });

        const activeSlotId = slots.some((slot) => slot.id === parsed.activeSlotId)
            ? parsed.activeSlotId
            : 'default';

        return {
            schemaVersion: 1,
            activeSlotId,
            slots
        };
    } catch (_error) {
        return defaults;
    }
}

function writeDesktopSlots(payload) {
    localStorage.setItem(DESKTOP_SLOTS_KEY, JSON.stringify(payload));
    return payload;
}

export function saveDesktopSlot(slotId, stateSnapshot) {
    const data = getDesktopSlots();
    const next = {
        ...data,
        slots: data.slots.map((slot) => (
            slot.id === slotId
                ? { ...slot, state: normalizeState(stateSnapshot), updatedAt: new Date().toISOString() }
                : slot
        ))
    };
    return writeDesktopSlots(next);
}

export function loadDesktopSlot(slotId) {
    const data = getDesktopSlots();
    const slot = data.slots.find((s) => s.id === slotId);
    return slot?.state || null;
}

export function setActiveSlot(slotId) {
    const data = getDesktopSlots();
    if (!data.slots.some((slot) => slot.id === slotId)) return data;
    return writeDesktopSlots({ ...data, activeSlotId: slotId });
}

export function renameDesktopSlot(slotId, name) {
    const data = getDesktopSlots();
    const next = {
        ...data,
        slots: data.slots.map((slot) => (
            slot.id === slotId
                ? { ...slot, name: (name || slot.name).slice(0, 20) }
                : slot
        ))
    };
    return writeDesktopSlots(next);
}

export function resetDesktopSlots() {
    return writeDesktopSlots(cloneDefaultSlots());
}

export { SCHEMA_VERSION, STORAGE_KEY, DEFAULT_STATE, GAME_STATS_KEY, DESKTOP_SLOTS_KEY };
