import {
    loadState,
    saveState,
    clearState,
    normalizeState,
    SCHEMA_VERSION,
    loadGameStats,
    updateGameStats as persistGameStats,
    getDesktopSlots,
    saveDesktopSlot,
    loadDesktopSlot,
    setActiveSlot,
    renameDesktopSlot
} from './os/storage.js';
import { createAppRegistry } from './apps/registry.js';
import { createWindowManager } from './os/windowManager.js';
import { createTaskbar } from './os/taskbar.js';
import { createStartMenu } from './os/startMenu.js';
import { createDesktop } from './os/desktop.js';
import { createToastManager } from './os/toast.js';
import { createAchievements } from './os/achievements.js';
import { initializeDaily, markDailyTipShown, getDailyInfo } from './os/daily.js';
import { isPro, showUpgradeModal } from './os/pro.js';

import notesApp from './apps/notes.js';
import internetApp from './apps/internet.js';
import settingsApp from './apps/settings.js';
import terminalApp from './apps/terminal.js';
import runApp from './apps/run.js';
import aboutApp from './apps/about.js';
import shareDesktopApp from './apps/shareDesktop.js';
import gamesHubApp, { snakeApp, pongApp, tetrisApp, game2048App } from './apps/gamesHub.js';

const desktopEl = document.getElementById('desktop');
const windowLayerEl = document.getElementById('window-layer');
const taskbarItemsEl = document.getElementById('taskbar-items');
const startButtonEl = document.getElementById('start-button');
const startMenuEl = document.getElementById('start-menu');
const clockEl = document.getElementById('clock');

const toast = createToastManager();
const achievements = createAchievements({
    onUnlock(achievement) {
        toast.show(`Achievement unlocked: ${achievement.title}`);
    }
});

const registry = createAppRegistry();
const apps = [
    gamesHubApp,
    snakeApp,
    pongApp,
    tetrisApp,
    game2048App,
    notesApp,
    internetApp,
    settingsApp,
    terminalApp,
    runApp,
    aboutApp,
    shareDesktopApp
].map((app) => {
    const desktopApps = new Set(['gamesHub', 'settings', 'terminal']);
    return {
        ...app,
        showOnDesktop: desktopApps.has(app.id)
    };
});
apps.forEach((app) => registry.register(app));

function getInitialStateFromSlot() {
    const slotsData = getDesktopSlots();
    let slotId = slotsData.activeSlotId || 'default';

    if (!isPro() && slotId !== 'default') {
        slotId = 'default';
        setActiveSlot('default');
    }

    const slotState = loadDesktopSlot(slotId);
    if (slotState) return normalizeState(slotState);
    return loadState();
}

const persistedState = getInitialStateFromSlot();
const store = {
    settings: { ...persistedState.settings },
    icons: { ...persistedState.icons },
    windows: [...persistedState.windows],
    nextWindowId: persistedState.nextWindowId || 1,
    focusedWindowId: persistedState.focusedWindowId || null
};

const daily = initializeDaily();

function snapshotState() {
    return {
        version: SCHEMA_VERSION,
        settings: store.settings,
        icons: store.icons,
        windows: store.windows,
        nextWindowId: store.nextWindowId,
        focusedWindowId: store.focusedWindowId
    };
}

function persistNow() {
    saveState(snapshotState());
}

function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    clockEl.textContent = `${hours}:${minutes} ${ampm}`;
}

function showBootOverlay() {
    if (store.settings.bootScreenEnabled === false) return Promise.resolve();

    const overlay = document.createElement('div');
    overlay.className = 'boot-overlay';

    const main = document.createElement('div');
    main.textContent = 'Starting Retro95...';

    const sub = document.createElement('div');
    sub.className = 'boot-overlay-sub';
    sub.textContent = isPro() ? (store.settings.bootText || 'Welcome back.') : 'Loading profile...';

    const dots = document.createElement('div');
    dots.className = 'boot-overlay-dots';
    dots.textContent = '...';

    overlay.append(main, sub, dots);
    document.body.appendChild(overlay);

    return new Promise((resolve) => {
        window.setTimeout(() => {
            overlay.remove();
            resolve();
        }, 1400);
    });
}

const desktop = createDesktop({
    desktopEl,
    getApps: () => registry.list(),
    getIconPositions: () => store.icons,
    onIconMove: (appId, position) => {
        store.icons[appId] = position;
        persistNow();
    },
    onLaunch: (appId) => {
        registry.launch(appId);
        startMenu.close();
    }
});

const windowManager = createWindowManager({
    layerEl: windowLayerEl,
    getApp: (id) => registry.get(id),
    getOsApi: () => ({
        isPro,
        showUpgradeModal,
        hasApp(id) {
            return registry.has(id);
        },
        listApps() {
            return registry.listIds();
        },
        launchApp(id, options = {}) {
            return registry.launch(id, options);
        },
        getSetting(key) {
            return store.settings[key];
        },
        setSetting(key, value) {
            store.settings[key] = value;
            desktop.applyWallpaper(store.settings);
            if (key === 'wallpaper') achievements.unlock('customizer');
            persistNow();
            desktop.renderIcons();
        },
        resetDesktop() {
            clearState();
            window.location.reload();
        },
        showToast(message) {
            toast.show(message);
        },
        unlockAchievement(id) {
            achievements.unlock(id);
        },
        recordTerminalCommand(raw) {
            const total = achievements.incrementCounter('terminal_commands', 1);
            if (total >= 10) achievements.unlock('terminal_wizard');
            if (raw.trim().toLowerCase().startsWith('hack')) achievements.unlock('hacker');
        },
        getDailyInfo() {
            return getDailyInfo();
        },
        getDesktopState() {
            return snapshotState();
        },
        validateDesktopState(candidate) {
            if (!candidate || typeof candidate !== 'object') {
                return { ok: false, error: 'Desktop state must be a JSON object.' };
            }
            if (typeof candidate.version !== 'number') {
                return { ok: false, error: 'State is missing a schema version.' };
            }
            if (candidate.version > SCHEMA_VERSION) {
                return { ok: false, error: `State version ${candidate.version} is newer than supported version ${SCHEMA_VERSION}.` };
            }
            return { ok: true };
        },
        importDesktopState(candidate) {
            const normalized = normalizeState(candidate);
            saveState(normalized);
            window.location.reload();
        },
        getGameStats() {
            return loadGameStats();
        },
        updateGameStats(patch) {
            return persistGameStats(patch);
        },
        getDesktopSlotsData() {
            return getDesktopSlots();
        },
        saveDesktopSlot(slotId) {
            saveDesktopSlot(slotId, snapshotState());
        },
        loadDesktopSlot(slotId) {
            if (!isPro() && slotId !== 'default') {
                showUpgradeModal({ message: 'Slots 2-5 are Pro features.' });
                return;
            }
            const state = loadDesktopSlot(slotId);
            if (!state) {
                toast.show('Selected slot is empty');
                return;
            }
            setActiveSlot(slotId);
            saveState(state);
            toast.show(`Loaded ${slotId === 'default' ? 'Default' : slotId}`);
            window.location.reload();
        },
        renameDesktopSlot(slotId, name) {
            renameDesktopSlot(slotId, name);
        },
        setActiveDesktopSlot(slotId) {
            setActiveSlot(slotId);
        }
    }),
    onChange: ({ windows, focusedWindowId, nextWindowId }) => {
        store.windows = windows;
        store.focusedWindowId = focusedWindowId;
        store.nextWindowId = nextWindowId;
        taskbar.render();
        persistNow();
    }
});

registry.setLauncher((appId, options = {}) => {
    const app = registry.get(appId);
    if (!app) return null;
    if (app.proOnly && !isPro()) {
        showUpgradeModal({ message: `${app.name} is a Pro feature.` });
        return null;
    }

    const id = windowManager.openApp(appId, options);
    if (id) {
        achievements.unlock('first_boot');
        if (windowManager.getWindows().length >= 5) {
            achievements.unlock('power_user');
        }
    }
    return id;
});

const taskbar = createTaskbar({
    taskbarItemsEl,
    windowManager,
    onStartClick: () => startMenu.toggle()
});

function getStartMenuApps() {
    const core = registry.list();
    if (isPro()) {
        core.push({ id: '__pro_active__', name: 'Pro: Active', icon: '★', disabled: true });
    } else {
        core.push({ id: '__upgrade_pro__', name: 'Upgrade to Pro...', icon: '💳' });
    }
    return core;
}

const startMenu = createStartMenu({
    startButtonEl,
    menuEl: startMenuEl,
    getApps: getStartMenuApps,
    onLaunch: (appId) => {
        if (appId === '__upgrade_pro__') {
            showUpgradeModal();
            return;
        }
        registry.launch(appId);
    }
});

window.addEventListener('retro95:proUnlocked', () => {
    startMenu.render();
    toast.show('Retro95 Pro unlocked');
});

function bindGlobalShortcuts() {
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 't') {
            event.preventDefault();
            registry.launch('terminal');
            startMenu.close();
            return;
        }

        if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'm') {
            event.preventDefault();
            registry.launch('gamesHub');
            startMenu.close();
            return;
        }

        if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 's') {
            event.preventDefault();
            registry.launch('shareDesktop');
            startMenu.close();
            return;
        }

        if (event.ctrlKey && event.key === 'Escape') {
            event.preventDefault();
            startMenu.toggle();
            return;
        }

        if (event.key === 'F1') {
            event.preventDefault();
            registry.launch('about');
            startMenu.close();
            return;
        }

        if (event.key === 'Escape') {
            startMenu.close();
        }
    });
}

async function bootstrap() {
    await showBootOverlay();

    desktop.applyWallpaper(store.settings);
    desktop.renderIcons();

    startMenu.render();
    startMenu.handleGlobalEvents();

    taskbar.bindStartButton(startButtonEl);
    taskbar.render();

    windowManager.setCountersFromState({
        nextWindowId: store.nextWindowId,
        windows: store.windows
    });
    windowManager.restoreWindows(store.windows, store.focusedWindowId);

    window.addEventListener('resize', () => {
        windowManager.resizeMaximizedWindows();
    });

    bindGlobalShortcuts();

    updateClock();
    window.setInterval(updateClock, 1000);

    if (store.settings.showDailyTip !== false && !daily.tipShown) {
        toast.show(`Daily Tip: ${daily.command}`, { timeout: 3600 });
        markDailyTipShown();
    }

    if (!store.windows.length) {
        registry.launch('gamesHub');
    }
}

bootstrap();
