// storage.js
import { state } from './state.js';

const STORAGE_KEY = 'breakout_v11_final';

export function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
}

export function loadSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved) Object.assign(state.settings, saved);

        setTimeout(() => {
            const s = state.settings;
            const map = [
                { id: 'select-rank', val: s.rank, p: 'value' },
                { id: 'toggle-sound', val: s.sound, p: 'checked' },
                { id: 'toggle-autoplay', val: s.auto, p: 'checked' },
                { id: 'stars-slider', val: s.starDensity, p: 'value' },
                { id: 'gyro-slider', val: s.sens, p: 'value' },
                { id: 'spin-slider', val: s.spinStrength, p: 'value' }
            ];
            map.forEach(i => {
                const el = document.getElementById(i.id);
                if (el) el[i.p] = i.val;
            });
            if (document.getElementById('stars-value')) document.getElementById('stars-value').textContent = s.starDensity;
            if (document.getElementById('gyro-value')) document.getElementById('gyro-value').textContent = s.sens;
            if (document.getElementById('spin-value')) document.getElementById('spin-value').textContent = s.spinStrength;
        }, 150);
    } catch(e) {}
}