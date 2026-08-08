import React from 'react';
import { CalendarDays, Shield, Camera, Image } from 'lucide-react';
import { TabType } from '../types';
import { playClickSound } from '../utils/sound';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'myshifts', label: 'MyShifts', icon: CalendarDays },
    { id: 'patroltimes', label: 'PatrolTimes', icon: Shield },
    { id: 'capture', label: 'Capture', icon: Camera },
    { id: 'gallery', label: 'Gallery', icon: Image },
  ];

  return (
    <nav 
      id="bottom-navigation-bar" 
      className="fixed bottom-0 left-0 right-0 h-14 md:h-16 bg-white border-t border-gray-200 z-50 px-2 md:px-8 flex items-center justify-around"
    >
      <div className="w-full max-w-lg mx-auto flex items-center justify-around h-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              onClick={() => {
                playClickSound();
                onTabChange(tab.id);
              }}
              className={`flex flex-col items-center justify-center space-y-0.5 h-full px-3 relative transition-all duration-300 cursor-pointer group ${
                isActive ? 'opacity-100 scale-105' : 'opacity-60 hover:opacity-100 hover:-translate-y-1'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 to-red-600 rounded-b-md shadow-[0_2px_10px_rgba(220,38,38,0.5)]" />
              )}
              <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-neutral-100 shadow-inner' : 'bg-transparent group-hover:bg-neutral-50'}`}>
                <Icon className={`w-6 h-6 stroke-[1.5] ${isActive ? 'text-red-600 drop-shadow-sm' : 'text-neutral-500'}`} />
              </div>
              <span className={`text-[10px] uppercase tracking-wider transition-colors duration-300 ${isActive ? 'font-bold text-red-600' : 'font-semibold text-neutral-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
