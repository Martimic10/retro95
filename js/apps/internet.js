function normalizeUrl(input) {
    const trimmed = (input || '').trim();
    if (!trimmed) return 'https://example.com';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
}

const bookmarks = [
    { label: 'Example', url: 'https://example.com' },
    { label: 'Wikipedia', url: 'https://www.wikipedia.org' },
    { label: 'MDN', url: 'https://developer.mozilla.org' }
];

const internetApp = {
    id: 'internet',
    name: 'Internet',
    desktopName: 'Internet',
    icon: '🌎',
    defaultSize: { w: 900, h: 620 },
    singleInstance: false,
    createWindowContent({ state, setState, os }) {
        const appState = {
            history: Array.isArray(state.history) && state.history.length ? state.history : ['https://www.google.com'],
            index: Number.isInteger(state.index) ? state.index : 0,
            autoPopupShown: Boolean(state.autoPopupShown)
        };

        appState.index = Math.max(0, Math.min(appState.index, appState.history.length - 1));

        const wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.flexDirection = 'column';
        wrap.style.height = '100%';

        const toolbar = document.createElement('div');
        toolbar.className = 'browser-toolbar';

        const backBtn = document.createElement('button');
        backBtn.className = 'btn';
        backBtn.textContent = 'Back';

        const forwardBtn = document.createElement('button');
        forwardBtn.className = 'btn';
        forwardBtn.textContent = 'Forward';

        const reloadBtn = document.createElement('button');
        reloadBtn.className = 'btn';
        reloadBtn.textContent = 'Reload';

        const address = document.createElement('input');
        address.className = 'textbox';
        address.style.flex = '1';
        address.value = appState.history[appState.index];

        const goBtn = document.createElement('button');
        goBtn.className = 'btn';
        goBtn.textContent = 'Go';

        const popupBtn = document.createElement('button');
        popupBtn.className = 'btn';
        popupBtn.textContent = 'Open Popup';

        const tabBtn = document.createElement('button');
        tabBtn.className = 'btn';
        tabBtn.textContent = 'Open Tab';

        const bookmarkSelect = document.createElement('select');
        bookmarkSelect.className = 'selectbox';
        const defaultOption = document.createElement('option');
        defaultOption.textContent = 'Bookmarks';
        defaultOption.value = '';
        bookmarkSelect.appendChild(defaultOption);
        bookmarks.forEach((bookmark) => {
            const option = document.createElement('option');
            option.value = bookmark.url;
            option.textContent = bookmark.label;
            bookmarkSelect.appendChild(option);
        });

        toolbar.append(backBtn, forwardBtn, reloadBtn, address, goBtn, popupBtn, tabBtn, bookmarkSelect);

        const content = document.createElement('div');
        content.className = 'browser-content';

        const iframe = document.createElement('iframe');
        iframe.className = 'browser-iframe';
        iframe.title = 'Web content';

        const fallback = document.createElement('div');
        fallback.className = 'browser-fallback';
        fallback.innerHTML = `
            <div>
                <div style="font-size: 14px; font-weight: bold; margin-bottom: 6px;">This site can't be embedded.</div>
                <div style="margin-bottom: 10px;">Use Open Popup / Open Tab.</div>
                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button type="button" class="btn" data-action="popup">Open Popup</button>
                    <button type="button" class="btn" data-action="tab">Open Tab</button>
                </div>
            </div>
        `;

        content.append(iframe, fallback);
        wrap.append(toolbar, content);

        let pendingToken = 0;

        function persist() {
            setState({
                history: appState.history,
                index: appState.index,
                autoPopupShown: appState.autoPopupShown
            });
        }

        function currentUrl() {
            return appState.history[appState.index] || 'https://example.com';
        }

        function openPopup(url) {
            const target = normalizeUrl(url);
            const width = 980;
            const height = 700;
            const left = Math.max(0, Math.round((window.screen.width - width) / 2));
            const top = Math.max(0, Math.round((window.screen.height - height) / 2));
            const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
            const popup = window.open(target, 'retroInternetPopup', features);
            if (!popup) {
                window.open(target, '_blank', 'noopener,noreferrer');
            }
        }

        function openTab(url) {
            window.open(normalizeUrl(url), '_blank', 'noopener,noreferrer');
        }

        function setFallback(show) {
            fallback.style.display = show ? 'flex' : 'none';
        }

        function renderControls() {
            backBtn.disabled = appState.index <= 0;
            forwardBtn.disabled = appState.index >= appState.history.length - 1;
            address.value = currentUrl();
            os.setStatus(currentUrl());
        }

        function loadUrl(url) {
            const target = normalizeUrl(url);
            pendingToken += 1;
            const token = pendingToken;
            setFallback(false);

            const timeoutId = window.setTimeout(() => {
                if (token !== pendingToken) return;
                setFallback(true);
                os.setStatus('Embedding blocked');
            }, 2500);

            iframe.onload = () => {
                if (token !== pendingToken) return;
                window.clearTimeout(timeoutId);
                let blocked = false;

                try {
                    const frameLocation = iframe.contentWindow?.location?.href;
                    if (!frameLocation || frameLocation === 'about:blank' || frameLocation.startsWith('chrome-error://')) {
                        blocked = true;
                    }
                } catch (_error) {
                    blocked = false;
                }

                setFallback(blocked);
                os.setStatus(blocked ? 'Embedding blocked' : 'Loaded');
            };

            iframe.onerror = () => {
                if (token !== pendingToken) return;
                window.clearTimeout(timeoutId);
                setFallback(true);
                os.setStatus('Unable to load');
            };

            iframe.src = target;
        }

        function navigate(rawUrl, { pushHistory = true } = {}) {
            const target = normalizeUrl(rawUrl);
            if (pushHistory) {
                appState.history = appState.history.slice(0, appState.index + 1);
                appState.history.push(target);
                appState.index = appState.history.length - 1;
            }
            persist();
            renderControls();
            loadUrl(target);
        }

        backBtn.addEventListener('click', () => {
            if (appState.index <= 0) return;
            appState.index -= 1;
            persist();
            renderControls();
            loadUrl(currentUrl());
        });

        forwardBtn.addEventListener('click', () => {
            if (appState.index >= appState.history.length - 1) return;
            appState.index += 1;
            persist();
            renderControls();
            loadUrl(currentUrl());
        });

        reloadBtn.addEventListener('click', () => {
            loadUrl(currentUrl());
        });

        goBtn.addEventListener('click', () => navigate(address.value));
        address.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                navigate(address.value);
            }
        });

        popupBtn.addEventListener('click', () => openPopup(currentUrl()));
        tabBtn.addEventListener('click', () => openTab(currentUrl()));

        bookmarkSelect.addEventListener('change', () => {
            if (!bookmarkSelect.value) return;
            navigate(bookmarkSelect.value);
            bookmarkSelect.value = '';
        });

        fallback.addEventListener('click', (event) => {
            const action = event.target.dataset.action;
            if (action === 'popup') openPopup(currentUrl());
            if (action === 'tab') openTab(currentUrl());
        });

        renderControls();
        loadUrl(currentUrl());
        if (!appState.autoPopupShown) {
            openPopup('https://www.google.com');
            appState.autoPopupShown = true;
        }
        persist();

        return wrap;
    }
};

export default internetApp;
