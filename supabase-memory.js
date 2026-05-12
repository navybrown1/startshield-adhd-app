// StartShield Supabase memory adapter
// Loads cloud memory into localStorage before app.js starts, then syncs selected localStorage keys to Supabase.
(function () {
    const config = window.STARTSHIELD_SUPABASE || {};
    const tableName = 'startshield_memory';
    const deviceKey = 'startshieldDeviceId';
    const syncedKeys = [
        'sessionCount',
        'currentTask',
        'startshieldSettings',
        'startshieldStats',
        'startshieldOnboardingDismissed'
    ];
    const syncedKeySet = new Set(syncedKeys);
    const nativeSetItem = Storage.prototype.setItem;
    const nativeGetItem = Storage.prototype.getItem;

    let isHydrating = false;
    let syncTimer = null;
    const pendingKeys = new Set();

    function getDeviceId() {
        let deviceId = nativeGetItem.call(localStorage, deviceKey);
        if (!deviceId) {
            const randomId = window.crypto && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            deviceId = `device-${randomId}`;
            nativeSetItem.call(localStorage, deviceKey, deviceId);
        }
        return deviceId;
    }

    function toJsonValue(rawValue) {
        if (rawValue === null || rawValue === undefined) return null;
        try {
            return JSON.parse(rawValue);
        } catch {
            return rawValue;
        }
    }

    function toStorageValue(value) {
        if (value === null || value === undefined) return null;
        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    const deviceId = getDeviceId();
    const isConfigured = Boolean(config.url && config.anonKey && window.supabase && window.supabase.createClient);
    const client = isConfigured
        ? window.supabase.createClient(config.url, config.anonKey, {
            global: {
                headers: {
                    'x-startshield-device-id': deviceId
                }
            }
        })
        : null;

    function queueSync(memoryKey) {
        if (!client || isHydrating || !syncedKeySet.has(memoryKey)) return;
        pendingKeys.add(memoryKey);
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(flushPendingKeys, 500);
    }

    Storage.prototype.setItem = function startShieldSetItem(key, value) {
        nativeSetItem.call(this, key, value);
        if (this === localStorage) queueSync(key);
    };

    async function hydrateLocalStorage() {
        if (!client) return { configured: false, hydrated: false };

        isHydrating = true;
        try {
            const { data, error } = await client
                .from(tableName)
                .select('memory_key,memory_value')
                .eq('device_id', deviceId);

            if (error) throw error;

            for (const row of data || []) {
                if (!syncedKeySet.has(row.memory_key)) continue;
                const value = toStorageValue(row.memory_value);
                if (value !== null) nativeSetItem.call(localStorage, row.memory_key, value);
            }

            return { configured: true, hydrated: true, count: data ? data.length : 0 };
        } catch (error) {
            console.warn('StartShield Supabase memory load failed. Using this device storage instead.', error.message);
            return { configured: true, hydrated: false, error: error.message };
        } finally {
            isHydrating = false;
        }
    }

    async function syncKey(memoryKey) {
        if (!client || !syncedKeySet.has(memoryKey)) return false;

        const { error } = await client
            .from(tableName)
            .upsert({
                device_id: deviceId,
                memory_key: memoryKey,
                memory_value: toJsonValue(nativeGetItem.call(localStorage, memoryKey))
            }, {
                onConflict: 'device_id,memory_key'
            });

        if (error) {
            console.warn(`StartShield Supabase memory sync failed for ${memoryKey}.`, error.message);
            return false;
        }

        return true;
    }

    async function flushPendingKeys() {
        if (!client || pendingKeys.size === 0) return { configured: Boolean(client), synced: false };
        const keys = [...pendingKeys];
        pendingKeys.clear();
        const results = await Promise.all(keys.map(syncKey));
        return { configured: true, synced: results.every(Boolean), keys };
    }

    async function syncNow() {
        if (!client) return { configured: false, synced: false };
        if (pendingKeys.size > 0) return flushPendingKeys();
        const results = await Promise.all(syncedKeys.map(syncKey));
        return { configured: true, synced: results.every(Boolean), keys: syncedKeys };
    }

    if (client) {
        window.addEventListener('beforeunload', () => {
            syncNow();
        });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') syncNow();
        });
        setInterval(syncNow, 15000);
    }

    window.startShieldMemory = {
        isConfigured,
        deviceId,
        hydrateLocalStorage,
        syncKey,
        syncNow,
        syncedKeys
    };
})();
