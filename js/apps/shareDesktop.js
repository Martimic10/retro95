const SITE_URL_PLACEHOLDER = '<SITE_URL_PLACEHOLDER>';

function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }

    return new Promise((resolve, reject) => {
        try {
            const temp = document.createElement('textarea');
            temp.value = text;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            temp.remove();
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

const shareDesktopApp = {
    id: 'shareDesktop',
    name: 'Share Desktop',
    desktopName: 'Share Desktop',
    icon: '📤',
    defaultSize: { w: 520, h: 420 },
    singleInstance: true,
    createWindowContent({ os }) {
        const root = document.createElement('div');
        root.className = 'share-desktop';

        const exportRow = document.createElement('div');
        exportRow.className = 'share-row';

        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn';
        exportBtn.textContent = 'Export Desktop';

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn';
        downloadBtn.textContent = 'Download .desk.json';

        exportRow.append(exportBtn, downloadBtn);

        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = 'Import Desktop JSON';

        const textarea = document.createElement('textarea');
        textarea.className = 'textbox share-textarea';
        textarea.placeholder = 'Paste exported desktop JSON here...';

        const actionRow = document.createElement('div');
        actionRow.className = 'share-row';

        const importBtn = document.createElement('button');
        importBtn.className = 'btn';
        importBtn.textContent = 'Import Desktop';

        const copyShareBtn = document.createElement('button');
        copyShareBtn.className = 'btn';
        copyShareBtn.textContent = 'Copy Share Text';

        actionRow.append(importBtn, copyShareBtn);

        const errorBox = document.createElement('div');
        errorBox.className = 'share-error';

        function clearError() {
            errorBox.textContent = '';
        }

        function setError(message) {
            errorBox.textContent = message;
        }

        function getExportJson() {
            return JSON.stringify(os.getDesktopState(), null, 2);
        }

        exportBtn.addEventListener('click', async () => {
            clearError();
            try {
                await copyText(getExportJson());
                os.showToast('Desktop JSON copied to clipboard');
                os.unlockAchievement('sharer');
            } catch (_error) {
                setError('Unable to copy to clipboard.');
            }
        });

        downloadBtn.addEventListener('click', () => {
            clearError();
            const blob = new Blob([getExportJson()], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'retro-desktop.desk.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            os.showToast('Desktop export downloaded');
            os.unlockAchievement('sharer');
        });

        importBtn.addEventListener('click', () => {
            clearError();
            let parsed;
            try {
                parsed = JSON.parse(textarea.value);
            } catch (_error) {
                setError('Invalid JSON format.');
                return;
            }

            const validation = os.validateDesktopState(parsed);
            if (!validation.ok) {
                setError(validation.error || 'Invalid desktop state.');
                return;
            }

            const ok = window.confirm('Import desktop state now? This replaces current layout.');
            if (!ok) return;

            os.importDesktopState(parsed);
        });

        copyShareBtn.addEventListener('click', async () => {
            clearError();
            const message = `I built my retro desktop — try it: ${SITE_URL_PLACEHOLDER}`;
            try {
                await copyText(message);
                os.showToast('Share text copied');
            } catch (_error) {
                setError('Unable to copy share text.');
            }
        });

        root.append(exportRow, label, textarea, actionRow, errorBox);
        return root;
    }
};

export default shareDesktopApp;
