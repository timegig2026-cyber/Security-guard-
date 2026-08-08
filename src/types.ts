export type TabType = 'myshifts' | 'patroltimes' | 'capture' | 'gallery';

export interface TabConfig {
  id: TabType;
  label: string;
  iconName: string;
}

export interface Shift {
  id: string;
  title: string;
  day: string; // e.g. "Monday, Aug 10" or "2026-08-07"
  hoursWorked?: number;
  ratePerHour?: number;
  salary: number; // Total salary attached to shift
  createdAt: string;
}

export interface ClockPoint {
  id: string;
  name: string;
  isClocked: boolean;
  clockedAt?: string;
}

export interface Patrol {
  id: string;
  title: string;
  totalPoints: number;
  clockPoints: ClockPoint[]; // dynamic custom-named clock points
  clockedPoints: number[]; // kept for safety/backward-compatibility
  durationSeconds: number;
  timeRemaining: number; // dynamic remaining time in seconds
  alarmThresholdSeconds: number; // alarm triggers if timeRemaining <= threshold and unclocked points exist
  status: 'active' | 'completed' | 'missed' | 'alarm';
  createdAt: string;
  endedAt?: string;
}

export interface CapturedPhoto {
  id: string;
  imageUrl: string; // base64 data URL
  timestamp: string;
  visitType: 'On Duty' | '2nd Visit';
  notes?: string;
  location?: string;
  createdAt: string;
}

