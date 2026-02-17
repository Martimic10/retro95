import { WALLPAPER_PRESETS } from '../os/wallpaperPresets.js';

const MAX_WALLPAPER_SIZE = 1.5 * 1024 * 1024;

const PRO_PACKS = [
    {
        id: 'midnight-office',
        name: 'Midnight Office',
        colors: ['#1b2a49', '#23395b', '#203a43', '#2f3e46']
    },
    {
        id: 'neon-arcade',
        name: 'Neon Arcade',
        colors: ['#0f0f1f', '#1f1147', '#2d1b69', '#0b3d3d']
    },
    {
        id: 'terminal-green',
        name: 'Terminal Green',
        colors: ['#0d1f0d', '#123524', '#1f4f2f', '#244d35']
    }
];

function currentWallpaper(os) {
    const wallpaper = os.getSetting('wallpaper');
    if (wallpaper && typeof wallpaper === 'object') return wallpaper;
    return { type: 'preset', presetId: 'teal' };
}

const settingsApp = {
    id: 'settings',
    name: 'Settings',
    desktopName: 'Settings',
    icon: '⚙️',
    defaultSize: { w: 620, h: 620 },
    singleInstance: true,
    createWindowContent({ os }) {
        const wrap = document.createElement('div');
        wrap.className = 'settings-panel';
        const statusLine = document.createElement('div');
        statusLine.className = 'settings-status';
        let statusTimer = null;

        function setPanelStatus(message, isError = false) {
            if (statusTimer) window.clearTimeout(statusTimer);
            statusLine.textContent = message || '';
            statusLine.classList.toggle('error', Boolean(isError));
            if (message) {
                statusTimer = window.setTimeout(() => {
                    statusLine.textContent = '';
                    statusLine.classList.remove('error');
                }, 2600);
            }
        }

        const proLabel = document.createElement('div');
        proLabel.className = 'label';
        proLabel.textContent = os.isPro() ? 'Pro Active' : 'Free Plan';

        const wallpaperHeader = document.createElement('div');
        wallpaperHeader.className = 'settings-section-title';
        wallpaperHeader.textContent = 'Wallpaper';

        const swatches = document.createElement('div');
        swatches.className = 'wallpaper-swatches';

        const wallpaperError = document.createElement('div');
        wallpaperError.className = 'settings-error';

        function setWallpaperError(message) {
            wallpaperError.textContent = message || '';
        }

        function applyPreset(presetId) {
            os.setSetting('wallpaper', { type: 'preset', presetId });
            os.setStatus(`Wallpaper: ${presetId}`);
            setPanelStatus(`Wallpaper set to ${presetId}`);
            renderSwatches();
        }

        function renderSwatches() {
            swatches.innerHTML = '';
            const wallpaper = currentWallpaper(os);

            const freeGroup = document.createElement('div');
            freeGroup.className = 'settings-pack-group';
            const freeTitle = document.createElement('div');
            freeTitle.className = 'settings-pack-title';
            freeTitle.textContent = 'Classic 95';
            const freeRow = document.createElement('div');
            freeRow.className = 'wallpaper-swatches';
            WALLPAPER_PRESETS.forEach((preset) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'wallpaper-swatch';
                btn.style.background = preset.color;
                btn.title = preset.name;
                if (wallpaper.type === 'preset' && wallpaper.presetId === preset.id) {
                    btn.classList.add('selected');
                }
                btn.addEventListener('click', () => applyPreset(preset.id));
                freeRow.appendChild(btn);
            });
            freeGroup.append(freeTitle, freeRow);
            swatches.appendChild(freeGroup);

            PRO_PACKS.forEach((pack) => {
                const group = document.createElement('div');
                group.className = 'settings-pack-group';
                const title = document.createElement('button');
                title.type = 'button';
                title.className = 'settings-pack-title-btn';
                title.textContent = `${pack.name}${os.isPro() ? '' : ' (Pro)'}`;
                const row = document.createElement('div');
                row.className = 'wallpaper-swatches';

                if (!os.isPro()) {
                    title.addEventListener('click', () => os.showUpgradeModal({ message: `${pack.name} is a Pro theme pack.` }));
                    row.classList.add('pro-disabled');
                    row.addEventListener('click', () => os.showUpgradeModal({ message: `${pack.name} is a Pro theme pack.` }));
                }

                pack.colors.forEach((color, index) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'wallpaper-swatch';
                    btn.style.background = color;
                    btn.title = `${pack.name} ${index + 1}`;
                    if (wallpaper.type === 'custom' && wallpaper.color === color) {
                        btn.classList.add('selected');
                    }
                    btn.addEventListener('click', () => {
                        if (!os.isPro()) {
                            os.showUpgradeModal({ message: `${pack.name} is a Pro theme pack.` });
                            return;
                        }
                        os.setSetting('wallpaper', { type: 'custom', color });
                        setPanelStatus(`${pack.name} applied`);
                        renderSwatches();
                    });
                    row.appendChild(btn);
                });

                group.append(title, row);
                swatches.appendChild(group);
            });
        }

        const wallpaperButtons = document.createElement('div');
        wallpaperButtons.className = 'settings-row';

        const randomBtn = document.createElement('button');
        randomBtn.className = 'btn';
        randomBtn.textContent = 'Randomize Preset';
        randomBtn.addEventListener('click', () => {
            const next = WALLPAPER_PRESETS[Math.floor(Math.random() * WALLPAPER_PRESETS.length)];
            applyPreset(next.id);
        });

        const uploadBtn = document.createElement('button');
        uploadBtn.className = 'btn';
        uploadBtn.textContent = 'Upload Wallpaper...';
        const uploadTag = document.createElement('span');
        uploadTag.className = 'pro-tag';
        uploadTag.textContent = '(Pro)';

        const removeImageBtn = document.createElement('button');
        removeImageBtn.className = 'btn';
        removeImageBtn.textContent = 'Remove Custom Wallpaper';
        removeImageBtn.addEventListener('click', () => {
            const wallpaper = currentWallpaper(os);
            if (wallpaper.type === 'preset') return;
            os.setSetting('wallpaper', { type: 'preset', presetId: 'teal' });
            setPanelStatus('Custom wallpaper removed');
            renderSwatches();
        });

        const hiddenFile = document.createElement('input');
        hiddenFile.type = 'file';
        hiddenFile.accept = 'image/*';
        hiddenFile.style.display = 'none';

        uploadBtn.addEventListener('click', () => {
            setWallpaperError('');
            if (!os.isPro()) {
                os.showUpgradeModal({ message: 'Custom wallpaper upload is a Pro feature.' });
                return;
            }
            hiddenFile.click();
        });

        hiddenFile.addEventListener('change', () => {
            const file = hiddenFile.files && hiddenFile.files[0];
            if (!file) return;
            if (file.size > MAX_WALLPAPER_SIZE) {
                setWallpaperError('Image too large. Choose a smaller file (max 1.5MB).');
                setPanelStatus('Wallpaper image too large', true);
                return;
            }
            uploadBtn.disabled = true;
            setPanelStatus('Loading wallpaper...');
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = String(reader.result || '');
                os.setSetting('wallpaper', {
                    type: 'image',
                    dataUrl,
                    name: file.name
                });
                setWallpaperError('');
                setPanelStatus(`Wallpaper uploaded: ${file.name}`);
                renderSwatches();
                uploadBtn.disabled = false;
                hiddenFile.value = '';
            };
            reader.onerror = () => {
                setWallpaperError('Could not read this image file.');
                setPanelStatus('Failed to load wallpaper', true);
                uploadBtn.disabled = false;
                hiddenFile.value = '';
            };
            reader.readAsDataURL(file);
        });

        wallpaperButtons.append(randomBtn, uploadBtn, uploadTag, removeImageBtn, hiddenFile);

        const desktopsHeader = document.createElement('div');
        desktopsHeader.className = 'settings-section-title';
        desktopsHeader.textContent = 'Desktops';

        const desktopHelp = document.createElement('div');
        desktopHelp.className = 'settings-help';
        desktopHelp.textContent = 'Save your desktop layout, open windows, wallpaper, and settings.';

        const slotsWrap = document.createElement('div');
        slotsWrap.className = 'settings-row';

        const listBox = document.createElement('div');
        listBox.className = 'settings-listbox';

        const slotButtons = document.createElement('div');
        slotButtons.className = 'settings-listbox-actions';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn';
        saveBtn.textContent = 'Save';

        const loadBtn = document.createElement('button');
        loadBtn.className = 'btn';
        loadBtn.textContent = 'Load';

        const renameBtn = document.createElement('button');
        renameBtn.className = 'btn';
        renameBtn.textContent = 'Rename';

        slotButtons.append(saveBtn, loadBtn, renameBtn);
        slotsWrap.append(listBox, slotButtons);

        let selectedSlotId = os.getDesktopSlotsData().activeSlotId || 'default';

        function isProSlot(slotId) {
            return slotId !== 'default';
        }

        function ensureSlotAccess(slotId) {
            if (!isProSlot(slotId)) return true;
            if (os.isPro()) return true;
            os.showUpgradeModal({ message: 'Slots 2-5 are Pro features.' });
            return false;
        }

        function renderSlots() {
            const slotData = os.getDesktopSlotsData();
            listBox.innerHTML = '';
            slotData.slots.forEach((slot) => {
                const row = document.createElement('button');
                row.type = 'button';
                row.className = 'settings-listbox-row';
                row.dataset.slotId = slot.id;
                const lock = isProSlot(slot.id) && !os.isPro() ? ' (Pro)' : '';
                row.textContent = `${slot.name}${lock}`;
                if (slot.id === selectedSlotId) row.classList.add('selected');
                row.addEventListener('click', () => {
                    if (!ensureSlotAccess(slot.id)) {
                        selectedSlotId = 'default';
                        renderSlots();
                        return;
                    }
                    selectedSlotId = slot.id;
                    renderSlots();
                });
                listBox.appendChild(row);
            });
        }

        saveBtn.addEventListener('click', () => {
            if (!ensureSlotAccess(selectedSlotId)) return;
            setPanelStatus('Saving desktop slot...');
            os.saveDesktopSlot(selectedSlotId);
            os.setActiveDesktopSlot(selectedSlotId);
            os.showToast(`Saved to ${selectedSlotId === 'default' ? 'Default' : selectedSlotId.replace('slot', 'Slot ')}`);
            setPanelStatus(`Saved ${selectedSlotId === 'default' ? 'Default' : selectedSlotId.replace('slot', 'Slot ')}`);
            renderSlots();
        });

        loadBtn.addEventListener('click', () => {
            if (!ensureSlotAccess(selectedSlotId)) return;
            const ok = window.confirm(`Load ${selectedSlotId === 'default' ? 'Default' : selectedSlotId.replace('slot', 'Slot ')}? Unsaved changes will be lost.`);
            if (!ok) return;
            setPanelStatus(`Loading ${selectedSlotId === 'default' ? 'Default' : selectedSlotId.replace('slot', 'Slot ')}...`);
            window.setTimeout(() => {
                os.loadDesktopSlot(selectedSlotId);
            }, 80);
        });

        renameBtn.addEventListener('click', () => {
            if (!ensureSlotAccess(selectedSlotId)) return;
            const slot = os.getDesktopSlotsData().slots.find((s) => s.id === selectedSlotId);
            const name = window.prompt('Slot name', slot?.name || selectedSlotId);
            if (!name) return;
            os.renameDesktopSlot(selectedSlotId, name);
            setPanelStatus('Slot renamed');
            renderSlots();
        });

        const themeHeader = document.createElement('div');
        themeHeader.className = 'settings-section-title';
        themeHeader.textContent = 'Theme Packs';

        const iconPackRow = document.createElement('div');
        iconPackRow.className = 'settings-row';
        const iconPackLabel = document.createElement('span');
        iconPackLabel.textContent = 'Arcade Icons';
        const iconPackPro = document.createElement('span');
        iconPackPro.className = 'pro-tag';
        iconPackPro.textContent = '(Pro)';
        const iconPackToggle = document.createElement('button');
        iconPackToggle.className = 'btn';
        iconPackToggle.textContent = os.getSetting('iconPack') === 'arcade' ? 'ON' : 'OFF';
        iconPackToggle.addEventListener('click', () => {
            if (!os.isPro()) {
                os.showUpgradeModal({ message: 'Arcade Icon Pack is a Pro feature.' });
                return;
            }
            const next = os.getSetting('iconPack') === 'arcade' ? 'default' : 'arcade';
            os.setSetting('iconPack', next);
            iconPackToggle.textContent = next === 'arcade' ? 'ON' : 'OFF';
            setPanelStatus(`Icon pack: ${next}`);
        });
        iconPackRow.append(iconPackLabel, iconPackPro, iconPackToggle);

        const bootHeader = document.createElement('div');
        bootHeader.className = 'settings-section-title';
        bootHeader.textContent = 'Boot Screen';

        const bootToggleRow = document.createElement('label');
        bootToggleRow.className = 'settings-row';
        const bootToggle = document.createElement('input');
        bootToggle.type = 'checkbox';
        bootToggle.checked = os.getSetting('bootScreenEnabled') !== false;
        bootToggleRow.append(bootToggle, document.createTextNode('Show boot screen on load'));

        const bootTextRow = document.createElement('div');
        bootTextRow.className = 'settings-row';
        const bootInput = document.createElement('input');
        bootInput.className = 'textbox';
        bootInput.maxLength = 40;
        bootInput.value = os.getSetting('bootText') || 'Starting Retro95...';
        const bootTag = document.createElement('span');
        bootTag.className = 'pro-tag';
        bootTag.textContent = '(Pro)';
        const bootSave = document.createElement('button');
        bootSave.className = 'btn';
        bootSave.textContent = 'Save Boot Text';

        function guardBootEdit() {
            if (os.isPro()) return true;
            os.showUpgradeModal({ message: 'Custom boot text is a Pro feature.' });
            bootInput.blur();
            return false;
        }

        bootInput.addEventListener('focus', () => {
            if (!os.isPro()) guardBootEdit();
        });

        bootSave.addEventListener('click', () => {
            if (!guardBootEdit()) return;
            os.setSetting('bootText', (bootInput.value || '').slice(0, 40));
            os.setStatus('Boot text updated');
            setPanelStatus('Boot text updated');
        });

        bootToggle.addEventListener('change', () => {
            os.setSetting('bootScreenEnabled', bootToggle.checked);
        });

        bootTextRow.append(bootInput, bootTag, bootSave);

        const miscHeader = document.createElement('div');
        miscHeader.className = 'settings-section-title';
        miscHeader.textContent = 'Misc';

        const soundRow = document.createElement('label');
        soundRow.className = 'settings-row';
        const soundCheckbox = document.createElement('input');
        soundCheckbox.type = 'checkbox';
        soundCheckbox.checked = Boolean(os.getSetting('soundEnabled'));
        soundRow.append(soundCheckbox, document.createTextNode('Enable sounds'));

        const eggsRow = document.createElement('label');
        eggsRow.className = 'settings-row';
        const eggsCheckbox = document.createElement('input');
        eggsCheckbox.type = 'checkbox';
        eggsCheckbox.checked = os.getSetting('easterEggsEnabled') !== false;
        eggsRow.append(eggsCheckbox, document.createTextNode('Enable easter eggs'));

        const dailyRow = document.createElement('label');
        dailyRow.className = 'settings-row';
        const dailyCheckbox = document.createElement('input');
        dailyCheckbox.type = 'checkbox';
        dailyCheckbox.checked = os.getSetting('showDailyTip') !== false;
        dailyRow.append(dailyCheckbox, document.createTextNode('Show daily tip'));

        const resetBtn = document.createElement('button');
        resetBtn.className = 'btn';
        resetBtn.textContent = 'Reset Desktop';
        const visualResetBtn = document.createElement('button');
        visualResetBtn.className = 'btn';
        visualResetBtn.textContent = 'Restore Visual Defaults';
        const actionsRow = document.createElement('div');
        actionsRow.className = 'settings-row';

        soundCheckbox.addEventListener('change', () => os.setSetting('soundEnabled', soundCheckbox.checked));
        eggsCheckbox.addEventListener('change', () => os.setSetting('easterEggsEnabled', eggsCheckbox.checked));
        dailyCheckbox.addEventListener('change', () => os.setSetting('showDailyTip', dailyCheckbox.checked));
        resetBtn.addEventListener('click', () => {
            const ok = window.confirm('Reset desktop state and reload?');
            if (!ok) return;
            os.resetDesktop();
        });
        visualResetBtn.addEventListener('click', () => {
            os.setSetting('wallpaper', { type: 'preset', presetId: 'teal' });
            os.setSetting('iconPack', 'default');
            os.setSetting('bootScreenEnabled', true);
            os.setSetting('bootText', 'Starting Retro95...');
            bootToggle.checked = true;
            bootInput.value = 'Starting Retro95...';
            iconPackToggle.textContent = 'OFF';
            setWallpaperError('');
            setPanelStatus('Visual settings restored');
            renderSwatches();
        });
        actionsRow.append(visualResetBtn, resetBtn);

        window.addEventListener('retro95:proUnlocked', () => {
            proLabel.textContent = 'Pro Active';
            renderSwatches();
            renderSlots();
        });

        renderSwatches();
        renderSlots();

        wrap.append(
            proLabel,
            wallpaperHeader,
            swatches,
            wallpaperButtons,
            wallpaperError,
            desktopsHeader,
            desktopHelp,
            slotsWrap,
            themeHeader,
            iconPackRow,
            bootHeader,
            bootToggleRow,
            bootTextRow,
            miscHeader,
            soundRow,
            eggsRow,
            dailyRow,
            statusLine,
            actionsRow
        );
        return wrap;
    }
};

export default settingsApp;
