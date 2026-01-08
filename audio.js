// audio.js — Звуковой движок (Web Audio API)
import { state } from './state.js';

export function initAudio() {
    if (state.audioCtx) return;
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        state.audioCtx = new AC();
        const size = state.audioCtx.sampleRate * 0.1;
        state.noiseBuffer = state.audioCtx.createBuffer(1, size, state.audioCtx.sampleRate);
        const data = state.noiseBuffer.getChannelData(0);
        // Генерация белого шума для эффекта удара
        for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    } catch(e) {
        console.error("Audio initialization failed", e);
    }
}

export function playNaturalSound(type) {
    if (!state.settings.sound || !state.audioCtx || !state.noiseBuffer) return;
    if (state.audioCtx.state === 'suspended') state.audioCtx.resume();

    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    const noise = state.audioCtx.createBufferSource();
    const nGain = state.audioCtx.createGain();

    noise.buffer = state.noiseBuffer;

    switch(type) {
        case 'brick': 
            osc.type = 'triangle'; 
            osc.frequency.setValueAtTime(550, state.audioCtx.currentTime); 
            gain.gain.setValueAtTime(0.1, state.audioCtx.currentTime); 
            break;
        case 'wall': 
            osc.type = 'sine'; 
            osc.frequency.setValueAtTime(150, state.audioCtx.currentTime); 
            gain.gain.setValueAtTime(0.05, state.audioCtx.currentTime); 
            break;
        case 'paddle': 
            osc.type = 'square'; 
            osc.frequency.setValueAtTime(200, state.audioCtx.currentTime); 
            gain.gain.setValueAtTime(0.15, state.audioCtx.currentTime); 
            break;
        case 'powerup': 
            osc.type = 'sine'; 
            osc.frequency.setValueAtTime(440, state.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, state.audioCtx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.2, state.audioCtx.currentTime); 
            break;
    }

    // Плавное затухание
    gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + 0.3);
    nGain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + 0.1);

    osc.connect(gain); 
    gain.connect(state.audioCtx.destination);
    noise.connect(nGain); 
    nGain.connect(state.audioCtx.destination);

    osc.start(); 
    osc.stop(state.audioCtx.currentTime + 0.3);
    noise.start(); 
    noise.stop(state.audioCtx.currentTime + 0.1);
}
