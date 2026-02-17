const COMMANDS = [
    'help', 'cls', 'echo', 'date', 'time', 'ver', 'whoami', 'color', 'theme', 'open', 'calc',
    'fortune', 'joke', 'ascii', 'hack', 'matrix', 'bsod', 'secret', 'exit', 'reboot', 'daily',
    'dir', 'ls', 'cd', 'sudo', 'coffee'
];

const COLOR_MAP = {
    '1': '#ffffff',
    '2': '#66ff66',
    '3': '#66ffff',
    '4': '#ffff66',
    '5': '#ff9966',
    '6': '#ff66ff',
    '7': '#99ccff',
    '8': '#ff6666',
    '9': '#c0c0c0'
};

const TERMINAL_THEMES = {
    default: { fg: '#66ff66', bg: '#000000', pro: false },
    amber: { fg: '#ffbf66', bg: '#1a1200', pro: true },
    green: { fg: '#66ff66', bg: '#000000', pro: true },
    gray: { fg: '#d6d6d6', bg: '#202020', pro: true }
};

const JOKES = [
    'I would tell you a UDP joke, but you might not get it.',
    'There are 10 types of people: those who understand binary and those who do not.',
    'My code does not have bugs. It develops random features.',
    '404 joke not found.',
    'The cloud is just someone else\'s computer.'
];

const FORTUNES = [
    'A fresh reboot is in your future.',
    'Great software comes from small iterations.',
    'Beware of off-by-one errors this afternoon.',
    'You will discover a hidden shortcut soon.',
    'A new wallpaper will improve your luck.'
];

const ASCII_ART = [
    '  _____\\n / ____|\\n| |  __\\n| | |_ |\\n| |__| |\\n \\\\_____|',
    "  .----.\\n / .--. \\\\\\n| |    | |\\n| |.-\\\"\\\"-.|\\n| |\\\\::::/|\\n| | \\\\__/ |\\n \\\\ \'::::\' /\\n  `-....-`",
    "[=======]\\n| DOS 95|\\n| READY |\\n'-------'"
];

function randomFrom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function evaluateExpression(input) {
    const expression = input.trim();
    if (!expression) throw new Error('Expression required');
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
        throw new Error('Only numbers and + - * / ( ) . are allowed');
    }

    let i = 0;

    function skipSpaces() {
        while (i < expression.length && expression[i] === ' ') i += 1;
    }

    function parseNumber() {
        skipSpaces();
        const start = i;
        let hasDot = false;
        while (i < expression.length) {
            const ch = expression[i];
            if (ch >= '0' && ch <= '9') {
                i += 1;
                continue;
            }
            if (ch === '.' && !hasDot) {
                hasDot = true;
                i += 1;
                continue;
            }
            break;
        }
        if (start === i) throw new Error('Expected number');
        return Number(expression.slice(start, i));
    }

    function parseFactor() {
        skipSpaces();
        if (expression[i] === '(') {
            i += 1;
            const value = parseExpression();
            skipSpaces();
            if (expression[i] !== ')') throw new Error('Missing closing parenthesis');
            i += 1;
            return value;
        }
        if (expression[i] === '-') {
            i += 1;
            return -parseFactor();
        }
        return parseNumber();
    }

    function parseTerm() {
        let value = parseFactor();
        while (true) {
            skipSpaces();
            const op = expression[i];
            if (op !== '*' && op !== '/') break;
            i += 1;
            const right = parseFactor();
            value = op === '*' ? value * right : value / right;
        }
        return value;
    }

    function parseExpression() {
        let value = parseTerm();
        while (true) {
            skipSpaces();
            const op = expression[i];
            if (op !== '+' && op !== '-') break;
            i += 1;
            const right = parseTerm();
            value = op === '+' ? value + right : value - right;
        }
        return value;
    }

    const result = parseExpression();
    skipSpaces();
    if (i !== expression.length) throw new Error('Unexpected token');
    if (!Number.isFinite(result)) throw new Error('Invalid result');
    return result;
}

function ensureOverlay() {
    let overlay = document.getElementById('retro-bsod-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'retro-bsod-overlay';
    overlay.className = 'bsod-overlay';
    overlay.innerHTML = `
        <div>
            <div style="font-weight: bold; margin-bottom: 8px;">Windows</div>
            <div>A fatal exception 0E has occurred at 0028:C0011E36</div>
            <div style="margin-top: 8px;">Press any key to continue...</div>
        </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

const terminalApp = {
    id: 'terminal',
    name: 'MS-DOS Prompt',
    desktopName: 'Terminal',
    icon: '⌨️',
    defaultSize: { w: 720, h: 440 },
    singleInstance: false,
    createWindowContent({ windowId, state, setState, os }) {
        const terminalState = {
            lines: Array.isArray(state.lines) ? state.lines.slice(-200) : [],
            commandHistory: Array.isArray(state.commandHistory) ? state.commandHistory.slice(-60) : [],
            prompt: state.prompt || 'C:\\>',
            color: state.color || '2',
            terminalTheme: state.terminalTheme || 'default'
        };

        const root = document.createElement('div');
        root.className = 'terminal-shell';
        root.style.setProperty('--terminal-color', COLOR_MAP[terminalState.color] || COLOR_MAP['2']);

        const output = document.createElement('div');
        output.className = 'terminal-output';

        const matrixLayer = document.createElement('div');
        matrixLayer.className = 'terminal-matrix';
        matrixLayer.style.display = 'none';

        const inputRow = document.createElement('div');
        inputRow.className = 'terminal-input-row';

        const promptLabel = document.createElement('span');
        promptLabel.className = 'terminal-prompt';

        const input = document.createElement('input');
        input.className = 'terminal-input';
        input.type = 'text';
        input.autocomplete = 'off';
        input.spellcheck = false;

        inputRow.append(promptLabel, input);
        root.append(output, matrixLayer, inputRow);

        let historyIndex = terminalState.commandHistory.length;
        let busy = false;

        function persist() {
            setState({
                lines: terminalState.lines.slice(-200),
                commandHistory: terminalState.commandHistory.slice(-60),
                prompt: terminalState.prompt,
                color: terminalState.color,
                terminalTheme: terminalState.terminalTheme
            });
        }

        function applyTerminalTheme(name) {
            const selected = TERMINAL_THEMES[name] || TERMINAL_THEMES.default;
            root.style.background = selected.bg;
            input.style.background = selected.bg;
            input.style.color = selected.fg;
            root.style.setProperty('--terminal-color', selected.fg);
            terminalState.terminalTheme = name;
        }

        function renderPrompt() {
            promptLabel.textContent = `${terminalState.prompt} `;
        }

        function appendLine(text, kind = 'output') {
            terminalState.lines.push({ text: String(text), kind });
            if (terminalState.lines.length > 200) terminalState.lines = terminalState.lines.slice(-200);

            const line = document.createElement('div');
            line.className = `terminal-line terminal-line-${kind}`;
            line.textContent = String(text);
            output.appendChild(line);
            output.scrollTop = output.scrollHeight;
            persist();
        }

        function repaintAll() {
            output.innerHTML = '';
            terminalState.lines.forEach((line) => {
                const row = document.createElement('div');
                row.className = `terminal-line terminal-line-${line.kind || 'output'}`;
                row.textContent = line.text;
                output.appendChild(row);
            });
            output.scrollTop = output.scrollHeight;
        }

        function autocompleteCurrent() {
            const raw = input.value.trim().toLowerCase();
            if (!raw || raw.includes(' ')) return;
            const matches = COMMANDS.filter((cmd) => cmd.startsWith(raw));
            if (matches.length === 1) input.value = matches[0];
            else if (matches.length > 1) appendLine(matches.join('  '));
        }

        async function runHackSequence() {
            if (!os.getSetting('easterEggsEnabled')) {
                appendLine('Easter eggs are disabled in Settings.');
                return;
            }
            const steps = [
                'Initializing modem... [#####.....] 45%',
                'Bypassing mainframe... [#######...] 70%',
                'Decrypting sectors... [#########.] 92%',
                'ACCESS GRANTED'
            ];
            for (const step of steps) {
                appendLine(step, 'system');
                await sleep(320);
            }
            os.unlockAchievement('hacker');
        }

        async function runMatrix() {
            if (!os.getSetting('easterEggsEnabled')) {
                appendLine('Easter eggs are disabled in Settings.');
                return;
            }

            matrixLayer.style.display = 'block';
            matrixLayer.innerHTML = '';
            const columns = 18;
            for (let i = 0; i < columns; i += 1) {
                const col = document.createElement('div');
                col.className = 'matrix-col';
                col.style.left = `${(i / columns) * 100}%`;
                col.style.animationDelay = `${Math.random() * 1.5}s`;
                col.textContent = Array.from({ length: 18 }, () => (Math.random() > 0.5 ? '1' : '0')).join('');
                matrixLayer.appendChild(col);
            }
            appendLine('Entering matrix mode...', 'system');
            await sleep(os.isPro() ? 5200 : 3000);
            matrixLayer.style.display = 'none';
            appendLine('Matrix mode complete.', 'system');
        }

        async function runBsod() {
            if (!os.getSetting('easterEggsEnabled')) {
                appendLine('Easter eggs are disabled in Settings.');
                return;
            }
            const overlay = ensureOverlay();
            overlay.style.display = 'flex';
            await sleep(1500);
            overlay.style.display = 'none';
            appendLine('Recovered from fake fatal exception.', 'system');
        }

        async function execute(inputText) {
            const raw = inputText.trim();
            if (!raw) return;

            appendLine(`${terminalState.prompt} ${raw}`, 'input');
            terminalState.commandHistory.push(raw);
            if (terminalState.commandHistory.length > 60) {
                terminalState.commandHistory = terminalState.commandHistory.slice(-60);
            }
            historyIndex = terminalState.commandHistory.length;

            os.recordTerminalCommand(raw);

            const [baseRaw, ...args] = raw.split(' ');
            const command = baseRaw.toLowerCase();
            const argText = args.join(' ').trim();

            if (command === 'hack' && args[0]?.toLowerCase() === 'nasa') {
                await runHackSequence();
                persist();
                return;
            }

            switch (command) {
                case 'help':
                    [
                        'help cls echo date time ver whoami color theme open calc daily',
                        'fortune joke ascii hack matrix bsod secret reboot exit',
                        'aliases: hack nasa, sudo, dir, ls, cd, coffee'
                    ].forEach((line) => appendLine(line));
                    break;
                case 'cls':
                    terminalState.lines = [];
                    repaintAll();
                    break;
                case 'echo':
                    appendLine(argText);
                    break;
                case 'date':
                    appendLine(new Date().toLocaleDateString());
                    break;
                case 'time':
                    appendLine(new Date().toLocaleTimeString());
                    break;
                case 'ver':
                    appendLine('Windows 95 [Version 4.00.950]');
                    break;
                case 'whoami':
                    appendLine('retro-user');
                    break;
                case 'color': {
                    const code = args[0] || '';
                    if (!COLOR_MAP[code]) {
                        appendLine('Usage: color <1-9>');
                        break;
                    }
                    terminalState.color = code;
                    root.style.setProperty('--terminal-color', COLOR_MAP[code]);
                    appendLine(`Color changed to ${code}`);
                    break;
                }
                case 'theme': {
                    const name = (args[0] || '').toLowerCase();
                    if (!name) {
                        appendLine(`Current terminal theme: ${terminalState.terminalTheme}`);
                        appendLine('Available: default (free), amber (pro), green (pro), gray (pro)');
                        break;
                    }
                    const target = TERMINAL_THEMES[name];
                    if (!target) {
                        appendLine('Unknown terminal theme.');
                        break;
                    }
                    if (target.pro && !os.isPro()) {
                        appendLine('Pro required.');
                        os.showUpgradeModal({ message: `Terminal theme "${name}" is a Pro feature.` });
                        break;
                    }
                    applyTerminalTheme(name);
                    appendLine(`Theme changed to ${name}`);
                    break;
                }
                case 'open': {
                    const appId = (args[0] || '').trim();
                    if (!appId) {
                        appendLine('Usage: open <appId>');
                        break;
                    }
                    if (!os.hasApp(appId)) {
                        appendLine(`Unknown app: ${appId}`);
                        break;
                    }
                    const opened = os.launchApp(appId);
                    if (opened === null && (appId === 'tetris' || appId === '2048')) {
                        appendLine('Pro required.');
                        break;
                    }
                    appendLine(`Launching ${appId}...`, 'system');
                    break;
                }
                case 'calc':
                    try {
                        appendLine(String(evaluateExpression(argText)));
                    } catch (error) {
                        appendLine(`calc error: ${error.message}`);
                    }
                    break;
                case 'fortune':
                    appendLine(randomFrom(FORTUNES));
                    break;
                case 'joke':
                    appendLine(randomFrom(JOKES));
                    break;
                case 'ascii':
                    randomFrom(ASCII_ART).split('\\n').forEach((line) => appendLine(line));
                    break;
                case 'hack':
                    await runHackSequence();
                    break;
                case 'matrix':
                    await runMatrix();
                    break;
                case 'bsod':
                    await runBsod();
                    break;
                case 'secret':
                    appendLine('Hint: Right-click in Minesweeper to flag cells.');
                    break;
                case 'daily': {
                    const daily = os.getDailyInfo();
                    appendLine(`Daily Tip: ${daily.command}`);
                    appendLine(`Daily Fortune: ${daily.fortune}`);
                    break;
                }
                case 'reboot': {
                    const ok = window.confirm('Restart RetroOS now?');
                    if (!ok) {
                        appendLine('Reboot canceled.');
                        break;
                    }
                    appendLine('Restarting...', 'system');
                    await sleep(1200);
                    window.location.reload();
                    break;
                }
                case 'exit':
                    os.closeWindow(windowId);
                    break;
                case 'sudo':
                    appendLine('Permission denied.');
                    break;
                case 'dir':
                case 'ls':
                    os.listApps().forEach((id) => appendLine(`<DIR>   ${id}`));
                    break;
                case 'cd':
                    appendLine(`Cannot CD into ${argText || 'that location'} in this universe.`);
                    break;
                case 'coffee':
                    appendLine('☕ brewing...');
                    await sleep(500);
                    appendLine(randomFrom(JOKES));
                    break;
                default:
                    appendLine(`Bad command or file name: ${command}`);
                    appendLine('Type HELP for a list of commands.');
                    break;
            }
            persist();
        }

        input.addEventListener('keydown', async (event) => {
            if (busy && event.key !== 'Tab') return;

            if (event.key === 'Enter') {
                event.preventDefault();
                const value = input.value;
                input.value = '';
                busy = true;
                try {
                    await execute(value);
                } finally {
                    busy = false;
                    input.focus();
                }
                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (!terminalState.commandHistory.length) return;
                historyIndex = Math.max(0, historyIndex - 1);
                input.value = terminalState.commandHistory[historyIndex] || '';
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (!terminalState.commandHistory.length) return;
                historyIndex = Math.min(terminalState.commandHistory.length, historyIndex + 1);
                input.value = terminalState.commandHistory[historyIndex] || '';
                return;
            }

            if (event.key === 'Tab') {
                event.preventDefault();
                autocompleteCurrent();
            }
        });

        root.addEventListener('mousedown', () => {
            window.setTimeout(() => input.focus(), 0);
        });

        if (!terminalState.lines.length) {
            appendLine('Microsoft(R) MS-DOS(R) Prompt');
            appendLine('Type HELP for available commands.', 'system');
        } else {
            repaintAll();
        }

        applyTerminalTheme(terminalState.terminalTheme);
        renderPrompt();
        window.setTimeout(() => input.focus(), 0);
        return root;
    }
};

export default terminalApp;
