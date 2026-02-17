export function createStartMenu({ startButtonEl, menuEl, getApps, onLaunch }) {
    let open = false;
    let highlightedIndex = -1;

    function getMenuItems() {
        return [...menuEl.querySelectorAll('.menu-item:not(.disabled)')];
    }

    function applyHighlight() {
        const items = getMenuItems();
        items.forEach((item, index) => {
            const selected = index === highlightedIndex;
            item.classList.toggle('kb-selected', selected);
            if (selected) item.focus();
        });
    }

    function setHighlight(index) {
        const items = getMenuItems();
        if (!items.length) {
            highlightedIndex = -1;
            return;
        }
        highlightedIndex = Math.max(0, Math.min(index, items.length - 1));
        applyHighlight();
    }

    function render() {
        menuEl.innerHTML = '';
        highlightedIndex = -1;

        getApps().forEach((app) => {
            if (app.showInStartMenu === false) return;
            const item = document.createElement('button');
            item.className = 'menu-item';
            item.type = 'button';
            item.role = 'menuitem';
            item.innerHTML = `<span>${app.icon || '📦'}</span><span>${app.name}</span>`;
            if (app.disabled) {
                item.disabled = true;
                item.classList.add('disabled');
            } else {
                item.addEventListener('click', () => {
                    onLaunch(app.id);
                    close();
                });
            }
            menuEl.appendChild(item);
        });
    }

    function openMenu() {
        if (open) return;
        open = true;
        menuEl.style.display = 'block';
        menuEl.setAttribute('aria-hidden', 'false');
        startButtonEl.classList.add('active');
        startButtonEl.setAttribute('aria-expanded', 'true');
        setHighlight(0);
    }

    function close() {
        if (!open) return;
        open = false;
        menuEl.style.display = 'none';
        menuEl.setAttribute('aria-hidden', 'true');
        startButtonEl.classList.remove('active');
        startButtonEl.setAttribute('aria-expanded', 'false');
        highlightedIndex = -1;
    }

    function toggle() {
        if (open) close();
        else openMenu();
    }

    function isOpen() {
        return open;
    }

    function handleGlobalEvents() {
        document.addEventListener('click', (event) => {
            if (!open) return;
            if (event.target.closest('#start-button') || event.target.closest('#start-menu')) return;
            close();
        });

        document.addEventListener('keydown', (event) => {
            if (!open) {
                if (event.key === 'Escape') close();
                return;
            }

            if (event.key === 'Escape') {
                close();
                startButtonEl.focus();
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setHighlight(highlightedIndex + 1);
                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setHighlight(highlightedIndex - 1);
                return;
            }

            if (event.key === 'Home') {
                event.preventDefault();
                setHighlight(0);
                return;
            }

            if (event.key === 'End') {
                event.preventDefault();
                const items = getMenuItems();
                setHighlight(items.length - 1);
                return;
            }

            if (event.key === 'Enter') {
                const items = getMenuItems();
                if (!items.length) return;
                event.preventDefault();
                const target = items[Math.max(0, highlightedIndex)];
                if (target) target.click();
            }
        });
    }

    return {
        render,
        toggle,
        close,
        isOpen,
        handleGlobalEvents
    };
}
