export function createAppRegistry() {
    const apps = new Map();
    let launcher = null;

    return {
        register(app) {
            if (!app || !app.id) {
                throw new Error('App must include an id.');
            }
            apps.set(app.id, app);
        },
        get(id) {
            return apps.get(id) || null;
        },
        has(id) {
            return apps.has(id);
        },
        list() {
            return Array.from(apps.values());
        },
        listIds() {
            return Array.from(apps.keys());
        },
        setLauncher(fn) {
            launcher = fn;
        },
        launch(id, options = {}) {
            if (!apps.has(id)) return null;
            if (typeof launcher !== 'function') return null;
            return launcher(id, options);
        },
        open(id, options = {}) {
            return this.launch(id, options);
        }
    };
}
