const aboutApp = {
    id: 'about',
    name: 'About This Computer',
    desktopName: 'About',
    icon: 'ℹ️',
    defaultSize: { w: 460, h: 340 },
    singleInstance: true,
    createWindowContent({ os }) {
        const root = document.createElement('div');
        root.style.display = 'flex';
        root.style.flexDirection = 'column';
        root.style.gap = '10px';

        const title = document.createElement('div');
        title.className = 'label';
        title.textContent = 'RetroOS Web Desktop v1.1';

        const body = document.createElement('div');
        body.style.lineHeight = '1.4';
        body.innerHTML = [
            'A Windows 95-style web desktop built with vanilla HTML, CSS, and JavaScript.',
            os.isPro() ? 'Retro95 Pro: Active' : 'Retro95 Pro: Free',
            '',
            'Shortcuts:',
            '- Ctrl+Alt+T opens Terminal',
            '- Ctrl+Esc toggles Start Menu',
            '- F1 opens About',
            '',
            'Credits: Built in RetroOS with Codex collaboration.'
        ].join('<br>');

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn';
        copyBtn.textContent = 'Copy Share Text';

        copyBtn.addEventListener('click', async () => {
            const shareText = 'Check out my RetroOS desktop: [your-site-url]';
            try {
                await navigator.clipboard.writeText(shareText);
            } catch (_error) {
                const temp = document.createElement('textarea');
                temp.value = shareText;
                document.body.appendChild(temp);
                temp.select();
                document.execCommand('copy');
                temp.remove();
            }
        });

        root.append(title, body, copyBtn);
        return root;
    }
};

export default aboutApp;
