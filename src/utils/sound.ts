let audioCtx: AudioContext | null = null;
let panicInterval: any = null;

export const playClickSound = () => {
  try {
    const settingsRaw = localStorage.getItem('guard_app_settings');
    if (settingsRaw) {
      const settings = JSON.parse(settingsRaw);
      if (settings.playSounds === false) return;
    }

    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    
    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine'; // crisp tactical blip
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    }
  } catch (e) {
    console.warn('Audio click failed to play', e);
  }
};

export const startPanicAlertSound = () => {
  try {
    if (panicInterval) return; // already running
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    
    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      
      let alternating = false;
      panicInterval = setInterval(() => {
        if (!audioCtx) return;
        try {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          
          osc.type = 'triangle'; // rich tone for clear warning
          osc.frequency.setValueAtTime(alternating ? 950 : 700, audioCtx.currentTime);
          alternating = !alternating;
          
          gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
          
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.start();
          osc.stop(audioCtx.currentTime + 0.3);
        } catch (err) {
          console.error(err);
        }
      }, 350);
    }
  } catch (e) {
    console.warn('Panic audio start failed', e);
  }
};

export const stopPanicAlertSound = () => {
  if (panicInterval) {
    clearInterval(panicInterval);
    panicInterval = null;
  }
};
