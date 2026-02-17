export function createTaskbar({ taskbarItemsEl, windowManager, onStartClick }) {
    function render() {
        const windows = windowManager.getWindows();
        const focusedId = windows
            .filter((win) => !win.minimized)
            .sort((a, b) => b.zIndex - a.zIndex)[0]?.id || null;

        taskbarItemsEl.innerHTML = '';
        windows
            .sort((a, b) => a.id.localeCompare(b.id))
            .forEach((win) => {
                const btn = document.createElement('button');
                btn.className = 'taskbar-item';
                if (win.id === focusedId && !win.minimized) {
                    btn.classList.add('active');
                }
                if (win.minimized) {
                    btn.classList.add('minimized');
                }

                btn.dataset.windowId = win.id;
                btn.textContent = win.title || (win.appId.charAt(0).toUpperCase() + win.appId.slice(1));

                btn.addEventListener('click', () => {
                    if (win.minimized) {
                        windowManager.restoreWindow(win.id);
                        return;
                    }

                    if (win.id === focusedId) {
                        windowManager.minimizeWindow(win.id);
                    } else {
                        windowManager.focusWindow(win.id);
                    }
                });

                taskbarItemsEl.appendChild(btn);
            });
    }

    return {
        render,
        bindStartButton(startButton) {
            startButton.addEventListener('click', onStartClick);
        }
    };
}
