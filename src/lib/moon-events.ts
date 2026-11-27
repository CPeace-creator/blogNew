export type JourneyPhase = 'departing' | 'arriving' | 'parked' | 'error';
export const moonState = { night: typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark', arrived: false, driving: false, playing: false };

declare global {
  interface WindowEventMap {
    'moon:journey': CustomEvent<{ phase: JourneyPhase }>;
    'moon:drive': CustomEvent;
    'moon:lighting': CustomEvent<{ night: boolean; source: 'studio' | 'avatar' | 'theme' }>;
    'moon:music': CustomEvent<{ playing: boolean }>;
    'moon:music-toggle': CustomEvent;
    'moon:wind': CustomEvent;
  }
}

export function journeyPhase(phase: JourneyPhase) {
  moonState.driving = phase === 'departing' || phase === 'arriving';
  if (phase === 'parked') moonState.arrived = true;
  window.dispatchEvent(new CustomEvent('moon:journey', { detail: { phase } }));
}

export function setMoonNight(night: boolean, source: 'studio' | 'avatar' | 'theme') {
  moonState.night = night;
  window.dispatchEvent(new CustomEvent('moon:lighting', { detail: { night, source } }));
}
