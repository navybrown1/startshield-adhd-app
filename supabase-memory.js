// StartShield Supabase memory adapter
// Loads cloud memory into localStorage before app.js starts, then syncs localStorage back to Supabase.
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

    function getDeviceId() {
        let deviceId = localStorage.getItem(deviceKey);
        if (!deviceId) {
            const randomId = window.crypto && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            deviceId = `device-${randomId}`;
            localStorage.setItem(deviceKey, deviceId);
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

    async function hydrateLocalStorage() {
        if (!client) return { configured: false, hydrated: false };

        try {
            const { data, error } = await client
                .from(tableName)
                .select('memory_key,memory_value')
                .eq('device_id', deviceId);

            if (error) throw error;

            for (const row of data || []) {
                if (!syncedKeys.includes(row.memory_key)) continue;
                const value = toStorageValue(row.memory_value);
                if (value !== null) localStorage.setItem(row.memory_key, value);
            }

            return { configured: true, hydrated: true, count: data ? data.length : 0 };
        } catch (error) {
            console.warn('StartShield Supabase memory load failed. Using this device storage instead.', error.message);
            return { configured: true, hydrated: false, error: error.message };
        }
    }

    async function syncKey(memoryKey) {
        if (!client || !syncedKeys.includes(memoryKey)) return false;

        const { error } = await client
            .from(tableName)
            .upsert({
                device_id: deviceId,
                memory_key: memoryKey,
                memory_value: toJsonValue(localStorage.getItem(memoryKey))
            }, {
                onConflict: 'device_id,memory_key'
            });

        if (error) {
            console.warn(`StartShield Supabase memory sync failed for ${memoryKey}.`, error.message);
            return false;
        }

        return true;
    }

    async function syncNow() {
        if (!client) return { configured: false, synced: false };
        const results = await Promise.all(syncedKeys.map(syncKey));
        return { configured: true, synced: results.every(Boolean) };
    }

    if (client) {
        window.addEventListener('beforeunload', () => {
            syncNow();
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
