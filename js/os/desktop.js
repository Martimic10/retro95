const GRID_X = 80;
const GRID_Y = 90;
const ICON_START_X = 6;
const ICON_START_Y = 10;
import { getPresetById } from './wallpaperPresets.js';

function snapToGrid(value, grid, offset = 0) {
    return Math.max(offset, Math.round((value - offset) / grid) * grid + offset);
}

function autoPositionByIndex(index) {
    const row = index;
    return {
        x: ICON_START_X,
        y: ICON_START_Y + row * GRID_Y
    };
}

export function createDesktop({ desktopEl, getApps, getIconPositions, onIconMove, onLaunch }) {
    const isTouchLike = () => window.matchMedia('(pointer: coarse)').matches;

    function renderIcons() {
        const apps = getApps().filter((app) => app.showOnDesktop !== false);
        const saved = getIconPositions();
        desktopEl.innerHTML = '';

        apps.forEach((app, index) => {
            const icon = document.createElement('button');
            icon.type = 'button';
            icon.className = 'icon';
            icon.dataset.appId = app.id;
            const iconPack = (document.documentElement.dataset.iconPack || 'default');
            const iconValue = iconPack === 'arcade' ? (app.arcadeIcon || app.icon || '📦') : (app.icon || '📦');
            icon.innerHTML = `
                <div class="icon-img">${iconValue}</div>
                <div class="icon-label">${app.desktopName || app.name}</div>
            `;

            const defaultPos = autoPositionByIndex(index);
            const position = saved[app.id] || defaultPos;
            icon.style.left = `${position.x}px`;
            icon.style.top = `${position.y}px`;

            icon.addEventListener('dblclick', () => {
                onLaunch(app.id);
            });

            if (isTouchLike()) {
                icon.addEventListener('click', () => {
                    if (icon.dataset.dragged === '1') return;
                    onLaunch(app.id);
                });
            }

            makeDraggable(icon, app.id);
            desktopEl.appendChild(icon);
        });
    }

    function makeDraggable(icon, appId) {
        icon.addEventListener('pointerdown', (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            event.preventDefault();

            const desktopRect = desktopEl.getBoundingClientRect();
            const startX = event.clientX;
            const startY = event.clientY;
            const startLeft = parseInt(icon.style.left, 10) || 0;
            const startTop = parseInt(icon.style.top, 10) || 0;
            const pointerId = event.pointerId;
            let moved = false;

            function onMove(moveEvent) {
                if (moveEvent.pointerId !== pointerId) return;
                moved = true;
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;

                const maxLeft = Math.max(0, desktopRect.width - icon.offsetWidth);
                const maxTop = Math.max(0, desktopRect.height - icon.offsetHeight);

                const nextLeft = Math.max(0, Math.min(maxLeft, startLeft + dx));
                const nextTop = Math.max(0, Math.min(maxTop, startTop + dy));

                icon.style.left = `${nextLeft}px`;
                icon.style.top = `${nextTop}px`;
            }

            function onUp() {
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                document.removeEventListener('pointercancel', onUp);

                if (!moved) return;

                const snappedX = snapToGrid(parseInt(icon.style.left, 10), GRID_X, ICON_START_X);
                const snappedY = snapToGrid(parseInt(icon.style.top, 10), GRID_Y, ICON_START_Y);

                icon.style.left = `${snappedX}px`;
                icon.style.top = `${snappedY}px`;
                onIconMove(appId, { x: snappedX, y: snappedY });
                icon.dataset.dragged = '1';
                window.setTimeout(() => {
                    if (icon.dataset.dragged === '1') icon.dataset.dragged = '0';
                }, 50);
            }

            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
            document.addEventListener('pointercancel', onUp);
        });
    }

    function applyWallpaper(settings) {
        const wallpaper = settings?.wallpaper || { type: 'preset', presetId: 'teal' };
        const presetColor = getPresetById(wallpaper.presetId || 'teal').color;
        const color = wallpaper.type === 'custom' ? (wallpaper.color || presetColor) : presetColor;

        document.documentElement.style.setProperty('--wallpaper-color', color);
        document.documentElement.dataset.iconPack = settings?.iconPack || 'default';

        if (wallpaper.type === 'image' && wallpaper.dataUrl) {
            document.body.style.backgroundImage = `url(${wallpaper.dataUrl})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center center';
            document.body.style.backgroundRepeat = 'no-repeat';
            const testImg = new Image();
            testImg.onerror = () => {
                document.body.style.backgroundImage = 'none';
                document.documentElement.style.setProperty('--wallpaper-color', getPresetById('teal').color);
            };
            testImg.src = wallpaper.dataUrl;
        } else {
            document.body.style.backgroundImage = 'none';
        }
    }

    return {
        renderIcons,
        applyWallpaper
    };
}
