const TITLEBAR_HEIGHT = 20;
const STATUSBAR_HEIGHT = 18;
const BORDER_SIZE = 4;
const MIN_WIDTH = 260;
const MIN_HEIGHT = 180;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function createResizeHandle(dir) {
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.dataset.dir = dir;
    return handle;
}

export function createWindowManager({ layerEl, getApp, onChange, getOsApi }) {
    const windows = new Map();
    let zCounter = 100;
    let idCounter = 1;
    
    function isMobileLayout() {
        return window.matchMedia('(max-width: 900px)').matches || window.matchMedia('(pointer: coarse)').matches;
    }

    function getDesktopBounds() {
        return {
            width: layerEl.clientWidth,
            height: layerEl.clientHeight
        };
    }

    function getSnapshots() {
        return Array.from(windows.values()).map((entry) => ({ ...entry.meta }));
    }

    function notifyChange() {
        onChange({
            windows: getSnapshots(),
            focusedWindowId: getFocusedWindowId(),
            nextWindowId: idCounter
        });
    }

    function setCountersFromState({ nextWindowId, windows: persistedWindows }) {
        idCounter = nextWindowId || 1;
        zCounter = 100;
        for (const win of persistedWindows || []) {
            zCounter = Math.max(zCounter, Number(win.zIndex) || 100);
        }
    }

    function nextWindowId() {
        const id = `w${idCounter}`;
        idCounter += 1;
        return id;
    }

    function getFocusedWindowId() {
        let focused = null;
        let topZ = -1;
        for (const entry of windows.values()) {
            if (!entry.meta.minimized && entry.meta.zIndex > topZ) {
                topZ = entry.meta.zIndex;
                focused = entry.meta.id;
            }
        }
        return focused;
    }

    function applyWindowBounds(meta, el) {
        el.style.left = `${meta.x}px`;
        el.style.top = `${meta.y}px`;
        el.style.width = `${meta.w}px`;
        el.style.height = `${meta.h}px`;
        el.style.zIndex = String(meta.zIndex);
    }

    function updateFocusStyles() {
        const focusedId = getFocusedWindowId();
        for (const entry of windows.values()) {
            entry.el.classList.toggle('focused', entry.meta.id === focusedId && !entry.meta.minimized);
        }
    }

    function focusWindow(id) {
        const entry = windows.get(id);
        if (!entry || entry.meta.minimized) return;

        zCounter += 1;
        entry.meta.zIndex = zCounter;
        entry.el.style.zIndex = String(entry.meta.zIndex);
        updateFocusStyles();

        const app = getApp(entry.meta.appId);
        if (app && typeof app.onFocus === 'function') {
            app.onFocus({ windowId: id, state: entry.meta.appState });
        }

        notifyChange();
    }

    function closeWindow(id) {
        const entry = windows.get(id);
        if (!entry) return;

        const app = getApp(entry.meta.appId);
        if (app && typeof app.onClose === 'function') {
            app.onClose({ windowId: id, state: entry.meta.appState });
        }

        entry.el.remove();
        windows.delete(id);
        updateFocusStyles();
        notifyChange();
    }

    function minimizeWindow(id) {
        const entry = windows.get(id);
        if (!entry || entry.meta.minimized) return;

        entry.meta.minimized = true;
        entry.el.style.display = 'none';

        const app = getApp(entry.meta.appId);
        if (app && typeof app.onMinimize === 'function') {
            app.onMinimize({ windowId: id, state: entry.meta.appState });
        }

        updateFocusStyles();
        notifyChange();
    }

    function restoreWindow(id) {
        const entry = windows.get(id);
        if (!entry) return;

        entry.meta.minimized = false;
        entry.el.style.display = 'flex';
        focusWindow(id);
    }

    function toggleMaximizeWindow(id) {
        const entry = windows.get(id);
        if (!entry) return;

        const { meta, el } = entry;
        const bounds = getDesktopBounds();

        if (meta.maximized) {
            if (meta.restoreBounds) {
                meta.x = meta.restoreBounds.x;
                meta.y = meta.restoreBounds.y;
                meta.w = meta.restoreBounds.w;
                meta.h = meta.restoreBounds.h;
            }
            meta.maximized = false;
            meta.restoreBounds = null;
        } else {
            meta.restoreBounds = { x: meta.x, y: meta.y, w: meta.w, h: meta.h };
            meta.x = 0;
            meta.y = 0;
            meta.w = bounds.width;
            meta.h = bounds.height;
            meta.maximized = true;
        }

        applyWindowBounds(meta, el);
        focusWindow(id);
        notifyChange();
    }

    function setWindowAppState(id, nextState) {
        const entry = windows.get(id);
        if (!entry) return;

        entry.meta.appState = {
            ...(entry.meta.appState || {}),
            ...nextState
        };
        notifyChange();
    }

    function attachDragBehavior(el, titleBar, meta) {
        titleBar.addEventListener('mousedown', (event) => {
            if (event.button !== 0) return;
            if (meta.maximized) return;
            if (event.target.closest('.window-btn')) return;

            focusWindow(meta.id);
            event.preventDefault();

            const startX = event.clientX;
            const startY = event.clientY;
            const startLeft = meta.x;
            const startTop = meta.y;

            function onMove(moveEvent) {
                const bounds = getDesktopBounds();
                const nextLeft = clamp(startLeft + (moveEvent.clientX - startX), 0, Math.max(0, bounds.width - meta.w));
                const nextTop = clamp(startTop + (moveEvent.clientY - startY), 0, Math.max(0, bounds.height - TITLEBAR_HEIGHT));

                meta.x = nextLeft;
                meta.y = nextTop;
                applyWindowBounds(meta, el);
            }

            function onUp() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                notifyChange();
            }

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    function attachResizeBehavior(el, meta) {
        const dirs = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
        dirs.forEach((dir) => {
            const handle = createResizeHandle(dir);
            handle.addEventListener('mousedown', (event) => {
                if (event.button !== 0) return;
                if (meta.maximized) return;

                focusWindow(meta.id);
                event.preventDefault();
                event.stopPropagation();

                const startX = event.clientX;
                const startY = event.clientY;
                const start = { x: meta.x, y: meta.y, w: meta.w, h: meta.h };

                function onMove(moveEvent) {
                    const bounds = getDesktopBounds();
                    let x = start.x;
                    let y = start.y;
                    let w = start.w;
                    let h = start.h;

                    const dx = moveEvent.clientX - startX;
                    const dy = moveEvent.clientY - startY;

                    if (dir.includes('e')) w = start.w + dx;
                    if (dir.includes('s')) h = start.h + dy;
                    if (dir.includes('w')) {
                        w = start.w - dx;
                        x = start.x + dx;
                    }
                    if (dir.includes('n')) {
                        h = start.h - dy;
                        y = start.y + dy;
                    }

                    if (w < MIN_WIDTH) {
                        if (dir.includes('w')) x -= MIN_WIDTH - w;
                        w = MIN_WIDTH;
                    }
                    if (h < MIN_HEIGHT) {
                        if (dir.includes('n')) y -= MIN_HEIGHT - h;
                        h = MIN_HEIGHT;
                    }

                    x = clamp(x, 0, Math.max(0, bounds.width - MIN_WIDTH));
                    y = clamp(y, 0, Math.max(0, bounds.height - TITLEBAR_HEIGHT));
                    w = clamp(w, MIN_WIDTH, bounds.width - x);
                    h = clamp(h, MIN_HEIGHT, bounds.height - y);

                    meta.x = x;
                    meta.y = y;
                    meta.w = w;
                    meta.h = h;
                    applyWindowBounds(meta, el);
                }

                function onUp() {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    notifyChange();
                }

                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
            el.appendChild(handle);
        });
    }

    function createWindowElement(meta, app) {
        const el = document.createElement('div');
        el.className = 'window';
        el.dataset.windowId = meta.id;
        el.dataset.appId = meta.appId;

        const title = document.createElement('div');
        title.className = 'window-title';

        const titleText = document.createElement('div');
        titleText.className = 'window-title-text';
        titleText.textContent = app.name;

        const buttons = document.createElement('div');
        buttons.className = 'window-buttons';

        const minimizeBtn = document.createElement('button');
        minimizeBtn.className = 'window-btn';
        minimizeBtn.textContent = '_';
        minimizeBtn.title = 'Minimize';
        minimizeBtn.addEventListener('click', () => minimizeWindow(meta.id));

        const maximizeBtn = document.createElement('button');
        maximizeBtn.className = 'window-btn';
        maximizeBtn.textContent = '□';
        maximizeBtn.title = 'Maximize';
        maximizeBtn.addEventListener('click', () => toggleMaximizeWindow(meta.id));

        const closeBtn = document.createElement('button');
        closeBtn.className = 'window-btn';
        closeBtn.textContent = '✕';
        closeBtn.title = 'Close';
        closeBtn.addEventListener('click', () => closeWindow(meta.id));

        buttons.append(minimizeBtn, maximizeBtn, closeBtn);
        title.append(titleText, buttons);

        const content = document.createElement('div');
        content.className = 'window-content';

        const status = document.createElement('div');
        status.className = 'window-status-bar';
        status.textContent = 'Ready';

        el.append(title, content, status);
        applyWindowBounds(meta, el);

        const baseOsApi = getOsApi ? getOsApi() : {};

        const appContent = app.createWindowContent({
            windowId: meta.id,
            state: meta.appState || {},
            setState: (nextState) => setWindowAppState(meta.id, nextState),
            os: {
                ...baseOsApi,
                focusWindow,
                closeWindow,
                minimizeWindow,
                restoreWindow,
                setStatus(message) {
                    status.textContent = message || 'Ready';
                }
            }
        });

        if (appContent) {
            content.appendChild(appContent);
        }

        el.addEventListener('mousedown', () => focusWindow(meta.id));

        attachDragBehavior(el, title, meta);
        attachResizeBehavior(el, meta);

        return el;
    }

    function openApp(appId, options = {}) {
        const app = getApp(appId);
        if (!app) return null;

        if (app.singleInstance) {
            const existing = Array.from(windows.values()).find((entry) => entry.meta.appId === appId);
            if (existing) {
                restoreWindow(existing.meta.id);
                focusWindow(existing.meta.id);
                return existing.meta.id;
            }
        }

        const bounds = getDesktopBounds();
        const defaultSize = app.defaultSize || { w: 480, h: 360 };
        const id = options.id || nextWindowId();

        zCounter += 1;
        const meta = {
            id,
            appId,
            title: app.name,
            x: options.x ?? clamp(80 + windows.size * 22, 0, Math.max(0, bounds.width - defaultSize.w)),
            y: options.y ?? clamp(60 + windows.size * 18, 0, Math.max(0, bounds.height - defaultSize.h)),
            w: clamp(options.w ?? defaultSize.w, MIN_WIDTH, bounds.width),
            h: clamp(options.h ?? defaultSize.h, MIN_HEIGHT, bounds.height),
            zIndex: options.zIndex ?? zCounter,
            minimized: Boolean(options.minimized),
            maximized: Boolean(options.maximized),
            restoreBounds: options.restoreBounds || null,
            appState: options.appState || {}
        };

        if (isMobileLayout() && !options.preserveLayout) {
            meta.x = 0;
            meta.y = 0;
            meta.w = bounds.width;
            meta.h = bounds.height;
            meta.maximized = true;
            meta.restoreBounds = null;
        }

        const el = createWindowElement(meta, app);
        windows.set(id, { meta, el });
        layerEl.appendChild(el);

        if (meta.maximized) {
            meta.restoreBounds = meta.restoreBounds || { x: meta.x, y: meta.y, w: meta.w, h: meta.h };
            meta.x = 0;
            meta.y = 0;
            meta.w = bounds.width;
            meta.h = bounds.height;
            applyWindowBounds(meta, el);
        }

        if (meta.minimized) {
            el.style.display = 'none';
        } else if (!options.skipAutoFocus) {
            focusWindow(id);
        }

        if (app && typeof app.onOpen === 'function') {
            app.onOpen({ windowId: id, state: meta.appState });
        }

        updateFocusStyles();
        notifyChange();
        return id;
    }

    function restoreWindows(savedWindows, focusedWindowId = null) {
        const mobile = isMobileLayout();
        (savedWindows || []).forEach((saved) => {
            const app = getApp(saved.appId);
            if (!app) return;
            openApp(saved.appId, { ...saved, skipAutoFocus: true, preserveLayout: !mobile });
        });
        const highest = Array.from(windows.values()).reduce((max, entry) => Math.max(max, entry.meta.zIndex), zCounter);
        zCounter = highest;
        if (focusedWindowId && windows.has(focusedWindowId)) {
            const focused = windows.get(focusedWindowId);
            if (focused && !focused.meta.minimized) {
                focusWindow(focusedWindowId);
            } else {
                updateFocusStyles();
                notifyChange();
            }
        } else {
            updateFocusStyles();
            notifyChange();
        }
    }

    function getWindows() {
        return Array.from(windows.values()).map((entry) => ({ ...entry.meta }));
    }

    function resizeMaximizedWindows() {
        const bounds = getDesktopBounds();
        for (const entry of windows.values()) {
            if (!entry.meta.maximized) continue;
            entry.meta.x = 0;
            entry.meta.y = 0;
            entry.meta.w = bounds.width;
            entry.meta.h = bounds.height;
            applyWindowBounds(entry.meta, entry.el);
        }
        notifyChange();
    }

    return {
        setCountersFromState,
        openApp,
        closeWindow,
        minimizeWindow,
        restoreWindow,
        focusWindow,
        toggleMaximizeWindow,
        getWindows,
        getSnapshots,
        restoreWindows,
        resizeMaximizedWindows
    };
}
