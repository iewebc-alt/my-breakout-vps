// storage.js — Работа с LocalStorage
import { state } from './state.js';

const STORAGE_KEY = 'breakout_v11_final';

export function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
}

export function loadSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved) {
            // Мержим сохраненные настройки в текущий state
            Object.assign(state.settings, saved);
        }
        
        // Синхронизация UI элементов с загруженными данными
        setTimeout(() => {
            const uiMap = {
                'select-rank': 'value',
                'toggle-sound': 'checked',
                'toggle-autoplay': 'checked',
                'toggle-stars': 'checked',
                'toggle-invert': 'checked',
                'gyro-slider': 'value'
            };

            for (const [id, prop] of Object.entries(uiMap)) {
                const el = document.getElementById(id);
                if (el) {
                    el[prop] = state.settings[id.replace('toggle-', '').replace('select-', '').replace('gyro-slider', 'sens')];
                    // Специальный фикс для ранга и сенсы, так как ключи в state короче
                    if (id === 'select-rank') el.value = state.settings.rank;
                    if (id === 'gyro-slider') el.value = state.settings.sens;
                }
            }

            const gyroValueDisplay = document.getElementById('gyro-value');
            if (gyroValueDisplay) gyroValueDisplay.textContent = state.settings.sens;
        }, 100);
    } catch(e) {
        console.warn("Could not load settings:", e);
    }
}
