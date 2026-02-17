const ALIASES = {
    cmd: 'terminal',
    terminal: 'terminal',
    notepad: 'notes',
    notes: 'notes',
    inet: 'internet',
    internet: 'internet',
    settings: 'settings',
    about: 'about',
    run: 'run'
};

const runApp = {
    id: 'run',
    name: 'Run...',
    desktopName: 'Run',
    icon: '🏃',
    defaultSize: { w: 380, h: 180 },
    singleInstance: true,
    createWindowContent({ windowId, os }) {
        const root = document.createElement('div');
        root.style.display = 'flex';
        root.style.flexDirection = 'column';
        root.style.gap = '10px';

        const label = document.createElement('div');
        label.textContent = 'Type the name of a program, folder, document, or Internet resource.';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '6px';

        const input = document.createElement('input');
        input.className = 'textbox';
        input.style.flex = '1';

        const buttonRow = document.createElement('div');
        buttonRow.style.display = 'flex';
        buttonRow.style.justifyContent = 'flex-end';
        buttonRow.style.gap = '6px';

        const okBtn = document.createElement('button');
        okBtn.className = 'btn';
        okBtn.textContent = 'OK';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn';
        cancelBtn.textContent = 'Cancel';

        function runValue() {
            const raw = input.value.trim().toLowerCase();
            if (!raw) return;
            const appId = ALIASES[raw] || raw;
            if (!os.hasApp(appId)) {
                os.setStatus(`Unknown command: ${raw}`);
                return;
            }
            os.launchApp(appId);
            os.closeWindow(windowId);
        }

        okBtn.addEventListener('click', runValue);
        cancelBtn.addEventListener('click', () => os.closeWindow(windowId));
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') runValue();
            if (event.key === 'Escape') os.closeWindow(windowId);
        });

        row.appendChild(input);
        buttonRow.append(okBtn, cancelBtn);
        root.append(label, row, buttonRow);

        window.setTimeout(() => input.focus(), 0);
        return root;
    }
};

export default runApp;
