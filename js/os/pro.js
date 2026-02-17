export const PRO_KEY = 'retro95_pro';
export const STRIPE_CHECKOUT_URL = 'PASTE_STRIPE_CHECKOUT_URL_HERE';
export const CHECKOUT_API_URL = '/api/create-checkout-session';
const CHECKOUT_PENDING_KEY = 'retro95_checkout_pending';

function removeExistingModal() {
    const existing = document.getElementById('pro-upgrade-overlay');
    if (existing) existing.remove();
}

export function isPro() {
    return localStorage.getItem(PRO_KEY) === 'true';
}

export function unlockPro() {
    localStorage.setItem(PRO_KEY, 'true');
    window.dispatchEvent(new CustomEvent('retro95:proUnlocked'));
}

export function lockPro() {
    localStorage.removeItem(PRO_KEY);
}

async function createCheckoutSession() {
    const res = await fetch(CHECKOUT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'retro95_pro' })
    });
    if (!res.ok) {
        let message = 'Unable to start checkout';
        try {
            const data = await res.json();
            message = data?.error || JSON.stringify(data);
        } catch (_error) {
            const text = await res.text();
            if (text) message = text;
        }
        throw new Error(`Checkout API error (${res.status}): ${message}`);
    }
    const data = await res.json();
    if (!data.url) throw new Error('Missing checkout URL');
    return data.url;
}

export function showUpgradeModal(options = {}) {
    removeExistingModal();

    const overlay = document.createElement('div');
    overlay.id = 'pro-upgrade-overlay';
    overlay.className = 'pro-upgrade-overlay';

    const modal = document.createElement('div');
    modal.className = 'pro-upgrade-window';

    const title = document.createElement('div');
    title.className = 'pro-upgrade-title';
    title.textContent = 'Upgrade to Retro95 Pro';

    const body = document.createElement('div');
    body.className = 'pro-upgrade-body';
    body.innerHTML = [
        'Unlock more games, customization, and power features.',
        '',
        '✔ Play Pro Games (Tetris + 2048 + future games)',
        '✔ Custom wallpaper upload',
        '✔ Save multiple desktops',
        '✔ Extra terminal themes + effects',
        '✔ Custom boot screen text',
        '',
        '$6.99 — one-time payment'
    ].join('<br>');

    const buttons = document.createElement('div');
    buttons.className = 'pro-upgrade-buttons';

    const unlockBtn = document.createElement('button');
    unlockBtn.className = 'btn';
    unlockBtn.textContent = 'Unlock Pro - $6.99';
    let errorEl = null;
    unlockBtn.addEventListener('click', async () => {
        unlockBtn.disabled = true;
        unlockBtn.textContent = 'Opening Checkout...';
        if (errorEl) {
            errorEl.remove();
            errorEl = null;
        }
        localStorage.setItem(CHECKOUT_PENDING_KEY, String(Date.now()));
        try {
            const checkoutUrl = await createCheckoutSession();
            window.location.href = checkoutUrl;
        } catch (error) {
            if (STRIPE_CHECKOUT_URL && STRIPE_CHECKOUT_URL !== 'PASTE_STRIPE_CHECKOUT_URL_HERE') {
                window.location.href = STRIPE_CHECKOUT_URL;
                return;
            }
            unlockBtn.disabled = false;
            unlockBtn.textContent = 'Unlock Pro - $6.99';
            errorEl = document.createElement('div');
            errorEl.className = 'pro-upgrade-message';
            errorEl.textContent = String(error?.message || 'Checkout unavailable. Try again shortly.');
            body.prepend(errorEl);
            console.error('Retro95 checkout error:', error);
            localStorage.removeItem(CHECKOUT_PENDING_KEY);
        }
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => overlay.remove());

    buttons.append(unlockBtn, cancelBtn);
    modal.append(title, body, buttons);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    if (options.message) {
        const msg = document.createElement('div');
        msg.className = 'pro-upgrade-message';
        msg.textContent = options.message;
        body.prepend(msg);
    }

    return overlay;
}

export function requirePro(cb, options = {}) {
    if (isPro()) {
        cb();
        return true;
    }
    showUpgradeModal(options);
    return false;
}
