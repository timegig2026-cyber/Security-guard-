import React, { useState, useEffect, useRef } from 'react';
import { Shield, Plus, Trash2, Play, AlertTriangle, CheckCircle, Clock, Volume2, VolumeX, Eye } from 'lucide-react';
import { Patrol, ClockPoint } from '../types';
import { playClickSound } from '../utils/sound';

interface PatrolTimesViewProps {
  onHideBottomNavChange?: (hide: boolean) => void;
  isRestricted: () => boolean;
}

export const PatrolTimesView: React.FC<PatrolTimesViewProps> = ({ onHideBottomNavChange, isRestricted }) => {
  const [patrols, setPatrols] = useState<Patrol[]>(() => {
    try {
      const saved = localStorage.getItem('patrol_sessions_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activePatrol, setActivePatrol] = useState<Patrol | null>(() => {
    try {
      const saved = localStorage.getItem('active_patrol_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Notify parent layout about setup form open state
  useEffect(() => {
    onHideBottomNavChange?.(isFormOpen);
  }, [isFormOpen, onHideBottomNavChange]);

  // Form states
  const [title, setTitle] = useState('');
  const [durationPreset, setDurationPreset] = useState('60'); // default 60 seconds (1 min) for quick testing
  const [customDuration, setCustomDuration] = useState('');
  const [warningThreshold, setWarningThreshold] = useState('15'); // 15s warning

  // Setup Clock Points management state
  const [setupClockPoints, setSetupClockPoints] = useState<{ id: string; name: string }[]>([
    { id: '1', name: 'Clock Point 1' },
    { id: '2', name: 'Clock Point 2' },
    { id: '3', name: 'Clock Point 3' },
    { id: '4', name: 'Clock Point 4' },
  ]);
  const [newPointInput, setNewPointInput] = useState('');

  // Ad-hoc Clock Point states for live patrol manual addition
  const [adhocPointName, setAdhocPointName] = useState('');
  const [showAdhocInput, setShowAdhocInput] = useState(false);

  // Audio Beeper Context for Alarms
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<any>(null);

  // Synchronize history
  useEffect(() => {
    try {
      localStorage.setItem('patrol_sessions_history', JSON.stringify(patrols));
    } catch (e) {
      console.error(e);
    }
  }, [patrols]);

  // Synchronize active patrol
  useEffect(() => {
    try {
      if (activePatrol) {
        localStorage.setItem('active_patrol_session', JSON.stringify(activePatrol));
      } else {
        localStorage.removeItem('active_patrol_session');
      }
    } catch (e) {
      console.error(e);
    }
  }, [activePatrol]);

  // Handle active patrol timer countdown
  useEffect(() => {
    if (!activePatrol || activePatrol.status === 'completed' || activePatrol.status === 'missed') {
      stopAlarmSound();
      return;
    }

    const timer = setInterval(() => {
      setActivePatrol((prev) => {
        if (!prev) return null;
        
        const pts = prev.clockPoints || [];
        const totalCount = pts.length || prev.totalPoints || 0;
        const clockedCount = pts.filter(p => p.isClocked).length;

        if (prev.timeRemaining <= 1) {
          // Timer finished
          clearInterval(timer);
          playLoudTimeOutSound();
          const hasUnclocked = clockedCount < totalCount;
          const finalStatus = hasUnclocked ? 'missed' : 'completed';
          
          const finalized: Patrol = {
            ...prev,
            timeRemaining: 0,
            status: finalStatus,
            endedAt: new Date().toISOString(),
          };

          // Save to history
          setPatrols((history) => [finalized, ...history]);
          return null; // close active monitor
        }

        const nextRemaining = prev.timeRemaining - 1;
        const hasUnclocked = clockedCount < totalCount;
        const isNearEnd = nextRemaining <= prev.alarmThresholdSeconds;
        
        let nextStatus = prev.status;
        if (hasUnclocked && isNearEnd) {
          nextStatus = 'alarm';
        } else if (prev.status === 'alarm' && (!hasUnclocked || !isNearEnd)) {
          nextStatus = 'active';
        }

        return {
          ...prev,
          timeRemaining: nextRemaining,
          status: nextStatus,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activePatrol?.id]);

  // Trigger sound alarm when in "alarm" status
  useEffect(() => {
    if (activePatrol?.status === 'alarm') {
      if (!isMuted) {
        startAlarmSound();
      } else {
        stopAlarmSound();
      }
    } else {
      stopAlarmSound();
    }
    return () => stopAlarmSound();
  }, [activePatrol?.status, isMuted]);

  // Start sound synthesiser beeps
  const startAlarmSound = () => {
    if (alarmIntervalRef.current) return;
    
    const playBeep = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        
        // Crisp dual-beep alarm
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } catch (e) {
        console.warn('Web Audio API not allowed or supported yet', e);
      }
    };

    // Play beep instantly then every 0.8 seconds
    playBeep();
    alarmIntervalRef.current = setInterval(playBeep, 800);
  };

  const stopAlarmSound = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  };

  const playLoudTimeOutSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const now = ctx.currentTime;
      // Synthesize 4 loud, piercing high-frequency dual-tone alarm beeps (Siren style)
      for (let i = 0; i < 4; i++) {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc1.type = 'sawtooth';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(950, now + i * 0.45); // piercing pitch 1
        osc2.frequency.setValueAtTime(1100, now + i * 0.45 + 0.1); // piercing pitch 2
        
        gainNode.gain.setValueAtTime(0.0, now + i * 0.45);
        gainNode.gain.linearRampToValueAtTime(0.85, now + i * 0.45 + 0.05); // Piercing loudness
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + i * 0.45 + 0.4);
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc1.start(now + i * 0.45);
        osc1.stop(now + i * 0.45 + 0.43);
        osc2.start(now + i * 0.45 + 0.1);
        osc2.stop(now + i * 0.45 + 0.43);
      }
    } catch (e) {
      console.warn('Could not trigger timeout sound Synthesizer', e);
    }
  };

  const applyPresetCount = (count: number) => {
    const arr = Array.from({ length: count }).map((_, i) => ({
      id: (i + 1).toString(),
      name: `Clock Point ${i + 1}`,
    }));
    setSetupClockPoints(arr);
  };

  const handleAddSetupPoint = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPointInput.trim()) return;
    setSetupClockPoints([
      ...setupClockPoints,
      { id: Date.now().toString(), name: newPointInput.trim() }
    ]);
    setNewPointInput('');
  };

  const handleRemoveSetupPoint = (id: string) => {
    setSetupClockPoints(setupClockPoints.filter(p => p.id !== id));
  };

  const handleUpdateSetupPointName = (id: string, newName: string) => {
    setSetupClockPoints(setupClockPoints.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const handleStartPatrol = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    
    if (isRestricted() && patrols.length >= 5) {
      alert("Trial limit reached: You can only set up to 5 patrols during your trial. Please subscribe to unlock unlimited patrols.");
      setIsFormOpen(false);
      return;
    }

    if (!title.trim()) return;
    if (setupClockPoints.length === 0) return;

    let totalSecs = parseInt(durationPreset);
    if (durationPreset === 'custom') {
      const parsedCustom = parseInt(customDuration);
      totalSecs = isNaN(parsedCustom) ? 60 : parsedCustom * 60;
    }

    const threshold = parseInt(warningThreshold);

    const activePoints: ClockPoint[] = setupClockPoints.map(p => ({
      id: p.id,
      name: p.name,
      isClocked: false,
    }));

    const newPatrolSession: Patrol = {
      id: Date.now().toString(),
      title: title.trim(),
      totalPoints: activePoints.length,
      clockPoints: activePoints,
      clockedPoints: [],
      durationSeconds: totalSecs,
      timeRemaining: totalSecs,
      alarmThresholdSeconds: threshold,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    setActivePatrol(newPatrolSession);
    setIsFormOpen(false);
    setTitle('');
  };

  const handleClockInPoint = (pointId: string) => {
    playClickSound();
    if (!activePatrol) return;

    setActivePatrol((prev) => {
      if (!prev) return null;
      
      const pts = (prev.clockPoints || []).map(p => 
        p.id === pointId ? { ...p, isClocked: true, clockedAt: new Date().toISOString() } : p
      );
      
      const clockedCount = pts.filter(p => p.isClocked).length;
      const totalCount = pts.length;
      const isDone = clockedCount === totalCount;
      
      // If fully clocked, check status and end early
      if (isDone) {
        const completedSession: Patrol = {
          ...prev,
          clockPoints: pts,
          totalPoints: totalCount,
          clockedPoints: pts.map((p, i) => p.isClocked ? i + 1 : 0).filter(Boolean),
          status: 'completed',
          endedAt: new Date().toISOString(),
        };
        // Add to history and clear active patrol
        setPatrols((hist) => [completedSession, ...hist]);
        return null;
      }

      // Check if threshold logic is satisfied
      const isNearEnd = prev.timeRemaining <= prev.alarmThresholdSeconds;
      const nextStatus = (clockedCount < totalCount && isNearEnd) ? 'alarm' : 'active';

      return {
        ...prev,
        clockPoints: pts,
        totalPoints: totalCount,
        status: nextStatus,
      };
    });
  };

  const handleAddAdhocPoint = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (!activePatrol || !adhocPointName.trim()) return;

    setActivePatrol((prev) => {
      if (!prev) return null;
      
      const newPoint: ClockPoint = {
        id: Date.now().toString(),
        name: adhocPointName.trim(),
        isClocked: false,
      };

      const updatedPoints = [...(prev.clockPoints || []), newPoint];
      const nextTotal = updatedPoints.length;
      
      const isNearEnd = prev.timeRemaining <= prev.alarmThresholdSeconds;
      const nextStatus = isNearEnd ? 'alarm' : 'active';

      return {
        ...prev,
        clockPoints: updatedPoints,
        totalPoints: nextTotal,
        status: nextStatus,
      };
    });

    setAdhocPointName('');
    setShowAdhocInput(false);
  };

  const handleCancelActivePatrol = () => {
    playClickSound();
    if (!activePatrol) return;
    
    // Log as missed or cancelled
    const cancelled: Patrol = {
      ...activePatrol,
      status: 'missed',
      endedAt: new Date().toISOString(),
    };
    setPatrols((hist) => [cancelled, ...hist]);
    setActivePatrol(null);
  };

  const handleDeleteHistoryItem = (id: string) => {
    playClickSound();
    setPatrols(patrols.filter((p) => p.id !== id));
  };

  const handleClearAllHistory = () => {
    playClickSound();
    if (window.confirm("Are you sure you want to clear all patrol logs?")) {
      setPatrols([]);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div id="view-patroltimes" className="flex-1 flex flex-col bg-white min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] pb-16 relative">
      <main className="flex-grow max-w-xl w-full mx-auto p-4 md:p-6 flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-black tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-black" />
              Patrol System
            </h1>
            <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">
              Live Check-In & Countdown Alert
            </p>
          </div>

          {!activePatrol && (
            <button
              id="start-patrol-trigger-btn"
              onClick={() => { playClickSound(); setIsFormOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold uppercase tracking-wider rounded-md hover:bg-red-700 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Setup Patrol
            </button>
          )}
        </div>

        {/* 🚨 ACTIVE PATROL COUNTDOWN MONITOR */}
        {activePatrol && (
          <div 
            id="active-patrol-monitor-panel"
            className={`p-5 md:p-6 border-2 rounded-xl mb-6 transition-colors duration-300 ${
              activePatrol.status === 'alarm' 
                ? 'border-red-600 bg-red-50/55 animate-pulse' 
                : 'border-black bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-black text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  Active Patrol Tracking
                </span>
                <h2 id="active-patrol-title" className="text-lg font-bold text-black mt-2">
                  {activePatrol.title}
                </h2>
              </div>

              {/* Mute toggle */}
              <button
                id="mute-alarm-toggle"
                onClick={() => { playClickSound(); setIsMuted(!isMuted); }}
                className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:text-red-600 hover:border-red-600 transition-colors"
                title={isMuted ? "Unmute Alarm Sound" : "Mute Alarm Sound"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-red-600 animate-pulse" />}
              </button>
            </div>

            {/* Countdown Display */}
            <div className="text-center my-6">
              <div 
                id="active-countdown-timer" 
                className={`text-5xl md:text-6xl font-mono tracking-tighter ${
                  activePatrol.status === 'alarm' ? 'text-red-600 font-extrabold animate-pulse' : 'text-black font-semibold'
                }`}
              >
                {formatTimer(activePatrol.timeRemaining)}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">
                Time Remaining
              </div>
            </div>

            {/* Warning Alarm Header */}
            {activePatrol.status === 'alarm' && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded-lg flex items-center gap-2.5 text-red-800 text-xs">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-bounce text-red-600" />
                <div>
                  <span className="font-bold uppercase block">🚨 Warning Alert Alarm!</span>
                  {activePatrol.totalPoints - (activePatrol.clockPoints || []).filter(p => p.isClocked).length} clock points missed with less than {activePatrol.alarmThresholdSeconds}s remaining! Scan points now!
                </div>
              </div>
            )}

            {/* Clock points checkpoint grid */}
            <div className="space-y-3 mt-4">
              <div className="flex justify-between items-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <span>Site Clock Points Checkpoints</span>
                <span>
                  {(activePatrol.clockPoints || []).filter(p => p.isClocked).length} / {activePatrol.totalPoints} Scanned
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {(activePatrol.clockPoints || []).map((point, index) => {
                  const isScanned = point.isClocked;
                  
                  return (
                    <button
                      key={point.id}
                      id={`clockpoint-btn-${point.id}`}
                      onClick={() => handleClockInPoint(point.id)}
                      disabled={isScanned}
                      className={`p-3 border text-left rounded-xl transition-all flex items-center justify-between shadow-xs group ${
                        isScanned 
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-medium' 
                          : 'bg-slate-50 border-slate-200 text-black hover:bg-red-50 hover:border-red-600 hover:text-red-600 cursor-pointer'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-semibold text-gray-400 tracking-wider block">
                          Tag #{index + 1} Checkpoint
                        </span>
                        <span className="text-xs font-bold line-clamp-1 text-black">
                          {point.name}
                        </span>
                      </div>
                      
                      {isScanned ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 animate-scaleUp" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-red-600 flex-shrink-0 flex items-center justify-center transition-colors">
                          <span className="w-2.5 h-2.5 rounded-full bg-transparent group-hover:bg-red-600 transition-all scale-0 group-hover:scale-100" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ad-hoc Dynamic Manual Point Addition */}
            <div className="mt-4 border-t border-gray-100 pt-3">
              {!showAdhocInput ? (
                <button
                  type="button"
                  id="add-adhoc-trigger-btn"
                  onClick={() => { playClickSound(); setShowAdhocInput(true); }}
                  className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Add Ad-Hoc Point Manually
                </button>
              ) : (
                <form onSubmit={handleAddAdhocPoint} className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Boiler Room Door"
                    value={adhocPointName}
                    onChange={(e) => setAdhocPointName(e.target.value)}
                    className="flex-grow px-2.5 py-1.5 border border-red-200 rounded text-xs text-black focus:border-red-600 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { playClickSound(); setShowAdhocInput(false); }}
                    className="text-xs text-gray-400 hover:text-black cursor-pointer"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>

            {/* Terminate patrol button */}
            <div className="border-t border-gray-100 pt-4 mt-4 flex justify-end">
              <button
                id="cancel-active-patrol-btn"
                onClick={handleCancelActivePatrol}
                className="px-3.5 py-1.5 border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer shadow-xs"
              >
                Quit / Miss Patrol
              </button>
            </div>
          </div>
        )}

        {/* SETUP PATROL FORM MODAL */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white border border-black rounded-lg shadow-xl p-6 relative">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <h2 className="text-sm font-semibold text-black uppercase tracking-wider">
                  Setup Active Patrol Site
                </h2>
                <button
                  onClick={() => { playClickSound(); setIsFormOpen(false); }}
                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleStartPatrol} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-black mb-1">
                    Patrol Route / Location Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. North Warehouse & Server Room"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none text-sm text-black"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-black">
                      Configure Route Clock-Points *
                    </label>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase">
                      {setupClockPoints.length} Points Configured
                    </span>
                  </div>

                  {/* Preset helpers */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-medium">Quick presets:</span>
                    {[2, 4, 6, 8].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => { playClickSound(); applyPresetCount(num); }}
                        className="px-2 py-0.5 border border-gray-200 text-[10px] rounded hover:border-red-600 hover:text-red-600 transition-colors bg-white cursor-pointer font-bold"
                      >
                        {num} Points
                      </button>
                    ))}
                  </div>

                  {/* Editable List of Clock Points */}
                  <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-lg p-2.5 bg-gray-50 space-y-2">
                    {setupClockPoints.map((pt, idx) => (
                      <div key={pt.id} className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-gray-400 w-4">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          required
                          value={pt.name}
                          onChange={(e) => handleUpdateSetupPointName(pt.id, e.target.value)}
                          placeholder={`Point Name #${idx + 1}`}
                          className="flex-grow px-2 py-1 bg-white border border-gray-200 rounded text-xs text-black focus:border-red-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => { playClickSound(); handleRemoveSetupPoint(pt.id); }}
                          disabled={setupClockPoints.length <= 1}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-white rounded transition-colors disabled:opacity-35"
                          title="Delete point"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add manual point to setup */}
                  <div className="flex gap-1.5 items-center bg-white p-1.5 border border-gray-200 rounded focus-within:border-red-600">
                    <input
                      type="text"
                      placeholder="Type custom point name manually..."
                      value={newPointInput}
                      onChange={(e) => setNewPointInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          playClickSound();
                          handleAddSetupPoint();
                        }
                      }}
                      className="flex-grow px-2 py-1 text-xs text-black focus:outline-none bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => { playClickSound(); handleAddSetupPoint(); }}
                      className="px-2.5 py-1 bg-red-600 text-white text-[10px] font-bold uppercase rounded hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-black mb-1">
                      Patrol Time Timer
                    </label>
                    <select
                      value={durationPreset}
                      onChange={(e) => setDurationPreset(e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none text-sm text-black bg-white"
                    >
                      <option value="15">15 Seconds (Demo)</option>
                      <option value="30">30 Seconds (Demo)</option>
                      <option value="60">1 Minute</option>
                      <option value="300">5 Minutes</option>
                      <option value="600">10 Minutes</option>
                      <option value="1800">30 Minutes</option>
                      <option value="custom">Custom Minutes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-black mb-1">
                      Alarm Sound Warning
                    </label>
                    <select
                      value={warningThreshold}
                      onChange={(e) => setWarningThreshold(e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none text-sm text-black bg-white"
                    >
                      <option value="5">5s Before End</option>
                      <option value="15">15s Before End</option>
                      <option value="30">30s Before End</option>
                      <option value="60">1 min Before End</option>
                      <option value="120">2 min Before End</option>
                    </select>
                  </div>
                </div>

                {durationPreset === 'custom' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-black mb-1">
                      Custom Duration (in Minutes)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 15"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none text-sm text-black"
                    />
                  </div>
                )}

                <p className="text-[11px] text-gray-500 leading-normal bg-gray-50 p-3 border border-gray-100 rounded">
                  <strong>Notice:</strong> If any clock points remain unscanned when the countdown timer dips below the warning threshold, a visual alarm banner and beeping sound will trigger.
                </p>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { playClickSound(); setIsFormOpen(false); }}
                    className="px-4 py-2 border border-gray-200 text-xs font-semibold uppercase tracking-wider rounded text-gray-600 hover:text-black hover:border-gray-400 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white border border-red-600 text-xs font-bold uppercase tracking-wider rounded hover:bg-red-700 transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Start Patrol
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* HISTORY LIST */}
        <div className="flex-1 flex flex-col mt-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2.5 mb-4">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Patrol Verification Logs ({patrols.length})
            </span>
            {patrols.length > 0 && (
              <button
                onClick={handleClearAllHistory}
                className="text-[10px] font-semibold text-red-600 hover:text-red-800 uppercase tracking-wider cursor-pointer"
              >
                Clear Logs
              </button>
            )}
          </div>

          {patrols.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center my-8 p-6 border border-dashed border-gray-200 rounded-lg">
              <Shield className="w-8 h-8 text-gray-300 stroke-[1.5] mb-2" />
              <p className="text-xs text-gray-400 max-w-xs">
                No past patrol verification logs found. Active completed and missed checkpoints will register here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {patrols.map((log) => {
                const clockPts = log.clockPoints || [];
                const clockedCount = clockPts.filter(p => p.isClocked).length;
                const missedCount = log.totalPoints - clockedCount;
                const isSuccess = log.status === 'completed';

                return (
                  <div
                    key={log.id}
                    className={`p-4 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all shadow-xs ${
                      isSuccess 
                        ? 'bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-500 hover:bg-emerald-50/70' 
                        : 'bg-red-50/40 border-red-200/80 hover:border-red-500 hover:bg-red-50/60'
                    }`}
                  >
                    <div className="space-y-1 flex-grow">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-black uppercase tracking-wider">
                          {log.title}
                        </span>
                        
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                            COMPLETED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded">
                            MISSED / INCOMPLETE
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-gray-500 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDateTime(log.createdAt)}
                        </span>
                        <span>•</span>
                        <span>
                          {clockedCount} of {log.totalPoints} Clock Points Scanned
                        </span>
                      </div>

                      {/* Dynamic Custom Named Points in History List */}
                      {clockPts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5 pt-2 border-t border-dashed border-gray-100">
                          {clockPts.map((cp) => (
                            <span
                              key={cp.id}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                                cp.isClocked
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                  : 'bg-red-50/70 text-red-800 border-red-100'
                              }`}
                            >
                              <span className={`w-1 h-1 rounded-full ${cp.isClocked ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                              {cp.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-gray-100 pt-2.5 md:pt-0">
                      <div className="text-left md:text-right">
                        <div className="text-[10px] text-gray-400 uppercase tracking-widest">
                          Verification Status
                        </div>
                        {isSuccess ? (
                          <span className="text-xs font-semibold text-emerald-600">
                            All tags scanned successfully
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-red-600">
                            Missed {missedCount} {missedCount === 1 ? 'point' : 'points'}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteHistoryItem(log.id)}
                        className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition-colors cursor-pointer"
                        title="Delete log"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
