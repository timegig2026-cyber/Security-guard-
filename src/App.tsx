import React, { useState, useEffect } from 'react';
import { BottomNav } from './components/BottomNav';
import { MyShiftsView } from './components/MyShiftsView';
import { PatrolTimesView } from './components/PatrolTimesView';
import { CaptureView } from './components/CaptureView';
import { GalleryView } from './components/GalleryView';
import { TabType } from './types';
import { playClickSound, startPanicAlertSound, stopPanicAlertSound } from './utils/sound';
import { getDb, collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, onAuthStateChanged, getAuthInstance } from './firebase';
import { RegistrationView } from './components/RegistrationView';
import { 
  MoreVertical, ShieldAlert, Phone, ShieldCheck, RefreshCw, X, Database, Terminal, Trash2, 
  Cloud, CloudOff, Loader2, Sparkles, Check, FileText,
  User, UploadCloud, Settings, Info, MapPin, Building, Award,
  Eye, Download, Share2, Camera, Mail, Send,
  Bell, CreditCard, Lock, Users, TrendingUp, Activity, Shield, CalendarDays, Star
} from 'lucide-react';

// ... (other imports)

const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  return (
    <div className="space-y-2.5 text-neutral-800 text-xs md:text-sm leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('# ')) {
          return <h1 key={idx} className="text-sm font-black text-red-600 uppercase tracking-wider border-b border-red-200 pb-1 mt-4 mb-2">{trimmed.slice(2)}</h1>;
        }
        if (trimmed.startsWith('## ')) {
          return <h2 key={idx} className="text-xs font-bold text-neutral-900 uppercase tracking-widest mt-3 flex items-center gap-2 border-b border-gray-100 pb-0.5">{trimmed.slice(3)}</h2>;
        }
        if (trimmed.startsWith('### ')) {
          return <h3 key={idx} className="text-xs font-bold text-neutral-600 uppercase tracking-wider mt-2">{trimmed.slice(4)}</h3>;
        }
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const content = trimmed.slice(2);
          return (
            <li key={idx} className="list-disc ml-4 font-semibold text-neutral-700 pl-1">
              {parseInlineMarkdown(content)}
            </li>
          );
        }
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }
        return <p key={idx} className="font-semibold text-neutral-700">{parseInlineMarkdown(trimmed)}</p>;
      })}
    </div>
  );
};

function parseInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-extrabold text-black">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('myshifts');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const auth = getAuthInstance();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);
  const [hideBottomNav, setHideBottomNav] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Custom dialogs/features from 3-dot menu
  const [isPanicActive, setIsPanicActive] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  // 3-Dot Menu Feature Modals State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showUploadDocsModal, setShowUploadDocsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Profile Data state loaded from localStorage
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('guard_profile_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          name: 'Officer Alex Mercer',
          badgeId: 'GS-98422',
          rank: 'Senior Patrol Officer',
          unit: 'Alpha Team - Night Watch',
          branch: 'Seattle Waterfront Terminal',
          phone: '+1 (206) 555-0144',
          avatarUrl: '',
          email: 'alex.mercer@secureshift.com',
          address: '1001 Alaskan Way, Seattle, WA',
          bio: 'Professional security veteran specialized in maritime port operations and real-time incident verification logs.',
          ...parsed
        };
      } catch { }
    }
    return {
      name: 'Officer Alex Mercer',
      badgeId: 'GS-98422',
      rank: 'Senior Patrol Officer',
      unit: 'Alpha Team - Night Watch',
      branch: 'Seattle Waterfront Terminal',
      phone: '+1 (206) 555-0144',
      avatarUrl: '',
      email: 'alex.mercer@secureshift.com',
      address: '1001 Alaskan Way, Seattle, WA',
      bio: 'Professional security veteran specialized in maritime port operations and real-time incident verification logs.'
    };
  });

  // Metrics
  const [totalProfit, setTotalProfit] = useState(0);
  const [activeUsersCount, setActiveUsersCount] = useState(0);

  useEffect(() => {
    const db = getDb();
    // Profit listener
    const qProfit = collection(db, 'shifts');
    const unsubscribeProfit = onSnapshot(qProfit, (snapshot) => {
      let profit = 0;
      snapshot.forEach(doc => {
        profit += doc.data().salary || 0;
      });
      setTotalProfit(profit);
    });

    // Active users listener
    const sessionId = 'session_' + Date.now();
    const activeUserRef = doc(collection(db, 'active_users'), sessionId);
    setDoc(activeUserRef, { lastActive: serverTimestamp() });
    
    const qUsers = collection(db, 'active_users');
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      setActiveUsersCount(snapshot.size);
    });

    return () => {
      unsubscribeProfit();
      unsubscribeUsers();
      deleteDoc(activeUserRef);
    };
  }, []);

  // Settings Data state loaded from localStorage
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('guard_app_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          playSounds: true,
          autoSync: true,
          imageQuality: 'High (1080p)',
          currency: 'USD ($)',
          ...parsed
        };
      } catch { }
    }
    return {
      playSounds: true,
      autoSync: true,
      imageQuality: 'High (1080p)',
      currency: 'USD ($)'
    };
  });

  // Additional Modal / Flow State
  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const [tempAvatar, setTempAvatar] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  // Subscription and Admin State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showPatrolHistoryModal, setShowPatrolHistoryModal] = useState(false);
  const [showShiftHistoryModal, setShowShiftHistoryModal] = useState(false);
  const [localPatrols, setLocalPatrols] = useState<any[]>([]);
  const [localShifts, setLocalShifts] = useState<any[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Trial Logic
  const [installDate] = useState(() => {
    const saved = localStorage.getItem('app_install_date');
    if (saved) return parseInt(saved);
    const now = Date.now();
    localStorage.setItem('app_install_date', now.toString());
    return now;
  });

  const isRestricted = () => {
    const daysSinceInstall = (Date.now() - installDate) / (1000 * 60 * 60 * 24);
    const isSubscribed = subscriptionStatus === 'active';
    // Restricted during trial (30 days) and if not subscribed
    return daysSinceInstall <= 30 && !isSubscribed;
  };

  const handleOpenPatrolHistory = () => {
    try {
      const saved = localStorage.getItem('patrol_sessions_history');
      setLocalPatrols(saved ? JSON.parse(saved) : []);
    } catch {
      setLocalPatrols([]);
    }
    setShowPatrolHistoryModal(true);
  };

  const handleOpenShiftHistory = () => {
    try {
      const saved = localStorage.getItem('myshifts_data');
      setLocalShifts(saved ? JSON.parse(saved) : []);
    } catch {
      setLocalShifts([]);
    }
    setShowShiftHistoryModal(true);
  };

  const handleOpenAdminConsole = () => {
    try {
      const savedPatrols = localStorage.getItem('patrol_sessions_history');
      setLocalPatrols(savedPatrols ? JSON.parse(savedPatrols) : []);
    } catch {
      setLocalPatrols([]);
    }
    try {
      const savedShifts = localStorage.getItem('myshifts_data');
      setLocalShifts(savedShifts ? JSON.parse(savedShifts) : []);
    } catch {
      setLocalShifts([]);
    }
    setShowAdminModal(true);
  };

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const downloadPatrolHistory = (patrolLog?: any) => {
    let content = '';
    if (patrolLog) {
      content = `================================================
PATROL STAMP - OFFICIAL SECURITY PATROL REPORT
================================================
Generated: ${new Date().toLocaleString()}
Officer: ${profile.name} (Badge: ${profile.badgeId || 'N/A'})
Contact: ${profile.phone || 'N/A'}
Branch: ${profile.branch || 'N/A'}

Patrol Session Details:
------------------------------------------------
Patrol Title: ${patrolLog.title}
Date/Time: ${patrolLog.createdAt}
Session Status: ${patrolLog.status.toUpperCase()}
Total Duration: ${patrolLog.durationSeconds} seconds
Points Registered: ${patrolLog.clockPoints?.length || 0} Points

Points Breakdown:
------------------------------------------------
${(patrolLog.clockPoints || []).map((p: any, idx: number) => 
  `${idx + 1}. [${p.isClocked ? 'CLOCKED' : 'MISSED'}] ${p.name} ${p.clockedAt ? `at ${p.clockedAt}` : ''}`
).join('\n')}

================================================
VERIFICATION SIGNATURE
Matthews (Operations Administrator)
================================================`;
    } else {
      const historyList = localPatrols;
      content = `================================================
PATROL STAMP - MASTER SECURITY PATROL LOGS
================================================
Generated: ${new Date().toLocaleString()}
Officer: ${profile.name} (Badge: ${profile.badgeId || 'N/A'})
Contact: ${profile.phone || 'N/A'}
Branch: ${profile.branch || 'N/A'}

Total Logged Patrols: ${historyList.length}

Sessions Log Summary:
------------------------------------------------
${historyList.map((p: any, idx: number) => 
  `[${idx + 1}] Title: ${p.title}
      Date: ${p.createdAt}
      Status: ${p.status.toUpperCase()}
      Points: ${p.clockPoints?.filter((cp: any) => cp.isClocked).length || 0}/${p.clockPoints?.length || 0} Registered
  ----------------------------------------------`
).join('\n')}

================================================
VERIFICATION SIGNATURE
Matthews (Operations Administrator)
================================================`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = patrolLog ? `patrol_report_${patrolLog.id}.txt` : `master_patrol_history.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadShiftHistory = (shiftLog?: any) => {
    let content = '';
    if (shiftLog) {
      content = `================================================
PATROL STAMP - INDIVIDUAL SHIFT STATEMENT
================================================
Generated: ${new Date().toLocaleString()}
Officer: ${profile.name} (Badge: ${profile.badgeId || 'N/A'})
Contact: ${profile.phone || 'N/A'}
Branch: ${profile.branch || 'N/A'}

Shift Details:
------------------------------------------------
Shift Title: ${shiftLog.title}
Date: ${shiftLog.day}
Hours Worked: ${shiftLog.hoursWorked || 'N/A'} hrs
Hourly Rate: R${shiftLog.ratePerHour || 'N/A'}/hr
Total Earnings: R${shiftLog.salary}

================================================
FINANCIAL VERIFICATION SIGNATURE
Matthews (Operations Administrator)
================================================`;
    } else {
      const shiftsList = localShifts;
      const totalEarnings = shiftsList.reduce((acc: number, curr: any) => acc + curr.salary, 0);
      content = `================================================
PATROL STAMP - ACCUMULATED SHIFTS STATEMENT
================================================
Generated: ${new Date().toLocaleString()}
Officer: ${profile.name} (Badge: ${profile.badgeId || 'N/A'})
Contact: ${profile.phone || 'N/A'}
Branch: ${profile.branch || 'N/A'}

Summary:
------------------------------------------------
Total Logged Shifts: ${shiftsList.length}
Total Accumulated Earnings: R${totalEarnings.toFixed(2)}

Shifts Breakdown:
------------------------------------------------
${shiftsList.map((s: any, idx: number) => 
  `[${idx + 1}] Title: ${s.title}
      Date: ${s.day}
      Hours: ${s.hoursWorked || 'N/A'} | Rate: R${s.ratePerHour || 'N/A'}/hr
      Earnings: R${s.salary}
  ----------------------------------------------`
).join('\n')}

================================================
FINANCIAL VERIFICATION SIGNATURE
Matthews (Operations Administrator)
================================================`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = shiftLog ? `shift_report_${shiftLog.id}.txt` : `master_shifts_statement.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [subscriptionStatus, setSubscriptionStatus] = useState<'none' | 'pending' | 'active' | 'declined'>(() => {
    const saved = localStorage.getItem('subscription_status');
    return (saved as 'none' | 'pending' | 'active' | 'declined') || 'none';
  });

  const [subscriptionRequests, setSubscriptionRequests] = useState<any[]>(() => {
    const saved = localStorage.getItem('subscription_requests');
    if (saved) {
      try { return JSON.parse(saved); } catch { }
    }
    return [];
  });

  const [notifications, setNotifications] = useState<any[]>(() => {
    const saved = localStorage.getItem('user_notifications');
    if (saved) {
      try { return JSON.parse(saved); } catch { }
    }
    return [];
  });

  useEffect(() => {
    if (showProfileModal) {
      setTempAvatar(profile.avatarUrl || '');
    }
  }, [showProfileModal, profile.avatarUrl]);

  // Document List loaded from localStorage
  const [documents, setDocuments] = useState<any[]>(() => {
    const saved = localStorage.getItem('uploaded_guard_documents');
    if (saved) {
      try { return JSON.parse(saved); } catch { }
    }
    return [];
  });

  const handleSaveProfile = (updatedProfile: typeof profile) => {
    playClickSound();
    setProfile(updatedProfile);
    localStorage.setItem('guard_profile_data', JSON.stringify(updatedProfile));
    setShowProfileModal(false);
    setShowCongratsModal(true);
  };

  const handleSaveSettings = (updatedSettings: typeof settings) => {
    playClickSound();
    setSettings(updatedSettings);
    localStorage.setItem('guard_app_settings', JSON.stringify(updatedSettings));
    setShowSettingsModal(false);
    window.dispatchEvent(new Event('settings-updated'));
  };

  const handleAddDocument = (newDoc: { name: string; size: string; dataUrl?: string; fileType?: string }) => {
    playClickSound();
    const updated = [
      ...documents,
      {
        id: `doc-${Date.now()}`,
        name: newDoc.name,
        size: newDoc.size,
        dataUrl: newDoc.dataUrl || '',
        fileType: newDoc.fileType || '',
        date: new Date().toISOString().split('T')[0],
        status: 'Verified'
      }
    ];
    setDocuments(updated);
    localStorage.setItem('uploaded_guard_documents', JSON.stringify(updated));
  };

  const handleDeleteDocument = (id: string) => {
    playClickSound();
    const updated = documents.filter(d => d.id !== id);
    setDocuments(updated);
    localStorage.setItem('uploaded_guard_documents', JSON.stringify(updated));
  };

  const handleDownloadFile = (doc: any) => {
    playClickSound();
    if (!doc.dataUrl) {
      alert("No data payload found for this document.");
      return;
    }
    const link = document.createElement('a');
    link.href = doc.dataUrl;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddNotification = (text: string) => {
    const newNotif = {
      id: `notif-${Date.now()}`,
      text,
      date: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().slice(0, 5),
      read: false
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      localStorage.setItem('user_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem('user_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('user_notifications');
  };

  const handleSubmitProofOfPayment = (file: { name: string; size: string; dataUrl: string }) => {
    const newRequest = {
      id: `req-${Date.now()}`,
      officerName: profile.name,
      officerBadge: profile.badgeId,
      fileName: file.name,
      fileSize: file.size,
      fileDataUrl: file.dataUrl,
      submittedAt: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().slice(0, 5),
      status: 'pending',
      reference: 'R49.99'
    };

    setSubscriptionRequests(prev => {
      const updatedRequests = [newRequest, ...prev];
      localStorage.setItem('subscription_requests', JSON.stringify(updatedRequests));
      return updatedRequests;
    });

    setSubscriptionStatus('pending');
    localStorage.setItem('subscription_status', 'pending');

    handleAddNotification(`Proof of Payment "${file.name}" has been successfully submitted and is currently UNDER REVIEW.`);
  };

  const handleApproveSubscription = (requestId: string) => {
    setSubscriptionRequests(prev => {
      const updatedRequests = prev.map(r => {
        if (r.id === requestId) {
          return { ...r, status: 'approved' };
        }
        return r;
      });
      localStorage.setItem('subscription_requests', JSON.stringify(updatedRequests));
      return updatedRequests;
    });

    setSubscriptionStatus('active');
    localStorage.setItem('subscription_status', 'active');

    // Add notification
    handleAddNotification("🎉 CONGRATULATIONS! Your monthly R49.99 subscription payment has been APPROVED by Matthews (Admin). Premium features are unlocked.");
  };

  const handleDeclineSubscription = (requestId: string) => {
    setSubscriptionRequests(prev => {
      const updatedRequests = prev.map(r => {
        if (r.id === requestId) {
          return { ...r, status: 'declined' };
        }
        return r;
      });
      localStorage.setItem('subscription_requests', JSON.stringify(updatedRequests));
      return updatedRequests;
    });

    setSubscriptionStatus('declined');
    localStorage.setItem('subscription_status', 'declined');

    // Add notification
    handleAddNotification("❌ Your subscription payment proof was DECLINED. Please ensure you make a bank transfer of R49.99 with correct details and upload again.");
  };

  const handleDeleteSubscriptionRequest = (requestId: string) => {
    setSubscriptionRequests(prev => {
      const updatedRequests = prev.filter(r => r.id !== requestId);
      localStorage.setItem('subscription_requests', JSON.stringify(updatedRequests));

      // Recalculate status from remaining requests
      let newStatus: 'none' | 'pending' | 'active' | 'declined' = 'none';
      if (updatedRequests.some(r => r.status === 'approved')) {
        newStatus = 'active';
      } else if (updatedRequests.some(r => r.status === 'pending')) {
        newStatus = 'pending';
      } else if (updatedRequests.some(r => r.status === 'declined')) {
        newStatus = 'declined';
      }
      setSubscriptionStatus(newStatus);
      localStorage.setItem('subscription_status', newStatus);

      return updatedRequests;
    });
  };

  // Cloud Sync & Gemini States
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [isCloudConfigured, setIsCloudConfigured] = useState(false);
  const [reportSummary, setReportSummary] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Storage counts for metrics
  const [metrics, setMetrics] = useState({ shiftsCount: 0, patrolsCount: 0, photosCount: 0, storageBytes: 0 });

  // Reset hideBottomNav when changing tabs to prevent getting stuck
  useEffect(() => {
    setHideBottomNav(false);
    setIsMenuOpen(false);
  }, [activeTab]);

  // Handle Panic Alarm Siren
  useEffect(() => {
    if (isPanicActive) {
      startPanicAlertSound();
    } else {
      stopPanicAlertSound();
    }
    return () => {
      stopPanicAlertSound();
    };
  }, [isPanicActive]);

  // Check cloud health and trigger initial sync on mount
  useEffect(() => {
    const checkAndSync = async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        setIsCloudConfigured(data.geminiConfigured);
        await syncAllData(false);
      } catch (err) {
        console.error("Backend health check failed:", err);
        setSyncStatus('error');
      }
    };
    checkAndSync();
  }, []);

  const syncAllData = async (manual = false) => {
    try {
      setSyncStatus('syncing');
      const shiftsRaw = localStorage.getItem('myshifts_data') || '[]';
      const patrolsRaw = localStorage.getItem('patrol_sessions_history') || '[]';
      const photosRaw = localStorage.getItem('captured_photos_data') || '[]';

      const clientShifts = JSON.parse(shiftsRaw);
      const clientPatrols = JSON.parse(patrolsRaw);
      const clientPhotos = JSON.parse(photosRaw);

      // Sync shifts
      const shiftsRes = await fetch('/api/shifts/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientShifts)
      });
      const shiftsData = await shiftsRes.json();
      if (shiftsData.success && shiftsData.shifts) {
        localStorage.setItem('myshifts_data', JSON.stringify(shiftsData.shifts));
      }

      // Sync patrols
      const patrolsRes = await fetch('/api/patrols/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientPatrols)
      });
      const patrolsData = await patrolsRes.json();
      if (patrolsData.success && patrolsData.patrols) {
        localStorage.setItem('patrol_sessions_history', JSON.stringify(patrolsData.patrols));
      }

      // Sync photos
      const photosRes = await fetch('/api/photos/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientPhotos)
      });
      const photosData = await photosRes.json();
      if (photosData.success && photosData.photos) {
        localStorage.setItem('captured_photos_data', JSON.stringify(photosData.photos));
      }

      setSyncStatus('synced');
      refreshMetrics();
      if (manual) {
        playClickSound();
        alert("✅ Cloud Sync Complete! All shifts, patrols, and media reports are secured on the backend.");
      }
    } catch (err) {
      console.error("Cloud synchronization failed:", err);
      setSyncStatus('error');
      if (manual) {
        alert("❌ Sync Error: Unable to connect to backend synchronization cluster.");
      }
    }
  };

  const handleGenerateSecurityReport = async () => {
    playClickSound();
    setIsGeneratingReport(true);
    setReportSummary(null);
    try {
      const shiftsRaw = localStorage.getItem('myshifts_data') || '[]';
      const patrolsRaw = localStorage.getItem('patrol_sessions_history') || '[]';
      const photosRaw = localStorage.getItem('captured_photos_data') || '[]';

      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shifts: JSON.parse(shiftsRaw),
          patrols: JSON.parse(patrolsRaw),
          photos: JSON.parse(photosRaw)
        })
      });
      const data = await res.json();
      if (data.summary) {
        setReportSummary(data.summary);
      } else {
        alert("Error: Server was unable to compile incident summary logs.");
      }
    } catch (err) {
      console.error("Report gen failed:", err);
      alert("Error: Backend security report engine is currently offline.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Load metrics from localstorage
  const refreshMetrics = () => {
    try {
      const shiftsRaw = localStorage.getItem('myshifts_data') || '[]';
      const patrolsRaw = localStorage.getItem('patrol_sessions_history') || '[]';
      const photosRaw = localStorage.getItem('captured_photos_data') || '[]';
      
      const sCount = JSON.parse(shiftsRaw).length;
      const pCount = JSON.parse(patrolsRaw).length;
      const phCount = JSON.parse(photosRaw).length;
      
      const totalString = shiftsRaw + patrolsRaw + photosRaw;
      const bytes = totalString.length * 2; // approximation for UTF-16
      
      setMetrics({
        shiftsCount: sCount,
        patrolsCount: pCount,
        photosCount: phCount,
        storageBytes: bytes
      });
    } catch {
      // fallback
    }
  };

  const handleTogglePanic = () => {
    playClickSound();
    setIsPanicActive(!isPanicActive);
    setIsMenuOpen(false);
  };

  const handleOpenMetrics = () => {
    playClickSound();
    refreshMetrics();
    setShowMetricsModal(true);
    setIsMenuOpen(false);
  };

  const handleHardReboot = () => {
    playClickSound();
    setIsMenuOpen(false);
    if (window.confirm("🔴 DANGER: Are you sure you want to perform a hard system reboot? This will wipe all shifts, stored patrols, and stamped gallery photos from this device permanently.")) {
      localStorage.clear();
      playClickSound();
      alert("App state has been completely wiped. The app will now reload.");
      window.location.reload();
    }
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'myshifts':
        return <MyShiftsView isRestricted={isRestricted} />;
      case 'patroltimes':
        return <PatrolTimesView onHideBottomNavChange={setHideBottomNav} isRestricted={isRestricted} />;
      case 'capture':
        return <CaptureView onHideBottomNavChange={setHideBottomNav} isRestricted={isRestricted} />;
      case 'gallery':
        return <GalleryView onHideBottomNavChange={setHideBottomNav} />;
      default:
        return <MyShiftsView />;
    }
  };

  if (!user) {
    return <RegistrationView onAuthSuccess={() => setUser(true)} />;
  }

  return (
    <div className={`min-h-screen bg-slate-50 text-black flex flex-col font-sans relative ${
      isPanicActive ? 'ring-8 ring-red-600 ring-inset animate-pulse' : ''
    }`}>
      {/* 🚨 PANIC MODE RED FLASHING TOP WARNING BAR */}
      {isPanicActive && (
        <div className="bg-red-600 text-white text-xs font-black uppercase py-2 px-4 text-center tracking-widest flex items-center justify-center gap-2 z-50 animate-bounce">
          <ShieldAlert className="w-4 h-4 animate-spin text-white" />
          <span>ALERT: Emergency Siren Active! Shift supervisor is notified.</span>
          <button 
            onClick={() => { playClickSound(); setIsPanicActive(false); }}
            className="ml-4 px-2 py-0.5 bg-white text-red-600 rounded font-bold hover:bg-neutral-100 transition-colors cursor-pointer text-[10px]"
          >
            MUTE SIREN
          </button>
        </div>
      )}

      {/* TOP BAR HEADER */}
      <header id="app-top-header" className="sticky top-0 bg-white border-b border-gray-200 text-neutral-900 h-14 z-40 px-3 md:px-6 flex items-center justify-end shadow-sm">
        {/* Action Controls on the Right */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* SUBSCRIPTION QUICK BADGE */}
          <button
            onClick={() => { playClickSound(); setShowSubscriptionModal(true); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer select-none border ${
              subscriptionStatus === 'active' 
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' 
                : subscriptionStatus === 'pending'
                ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100 animate-pulse'
                : subscriptionStatus === 'declined'
                ? 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100 animate-pulse'
                : 'bg-neutral-800 hover:bg-neutral-900 text-white border-neutral-700'
            }`}
            title="Monthly Subscription Status (Capitec R49.99)"
          >
            {subscriptionStatus === 'active' ? <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> : <CreditCard className="w-3.5 h-3.5" />}
            <span>
              {subscriptionStatus === 'active' && 'Premium Active'}
              {subscriptionStatus === 'pending' && 'Pending'}
              {subscriptionStatus === 'declined' && 'Declined'}
              {subscriptionStatus === 'none' && 'Upgrade'}
            </span>
          </button>

          {/* NOTIFICATION BELL */}
          <button
            onClick={() => { playClickSound(); setShowNotificationsModal(true); }}
            className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all relative cursor-pointer"
            title="Notification Hub"
          >
            <Bell className="w-4.5 h-4.5" />
            {notifications.some(n => !n.read) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            )}
            {notifications.some(n => !n.read) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {/* 3-DOT MENU TRIGGER */}
          <div className="relative">
            <button
              id="app-top-menu-btn"
              onClick={() => {
                playClickSound();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all cursor-pointer focus:outline-none"
              title="System Actions"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* 3-DOT DROPDOWN MENU */}
          {isMenuOpen && (
            <>
              {/* Click outside backdrop overlay */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsMenuOpen(false)} 
              />
              
              <div 
                id="top-menu-dropdown-list" 
                className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-1.5 animate-fadeIn text-black"
              >
                <div className="px-3 py-1.5 text-[9px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 mb-1">
                  Guard Actions
                </div>
                
                <button
                  onClick={() => {
                    playClickSound();
                    setIsMenuOpen(false);
                    setShowProfileModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-gray-700 hover:text-black hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-gray-500" />
                  <span>UserProfile</span>
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    setIsMenuOpen(false);
                    if (isRestricted()) {
                      alert("This feature is only available for premium subscribers.");
                      return;
                    }
                    setShowUploadDocsModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-gray-700 hover:text-black hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  <UploadCloud className={`w-4 h-4 ${isRestricted() ? 'text-gray-300' : 'text-gray-500'}`} />
                  <span className={isRestricted() ? 'text-gray-400' : 'text-gray-700'}>UploadDocuments</span>
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    setIsMenuOpen(false);
                    handleOpenPatrolHistory();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-gray-700 hover:text-black hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border-t border-gray-100"
                >
                  <Shield className="w-4 h-4 text-gray-500" />
                  <span>Patrol History Logs</span>
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    setIsMenuOpen(false);
                    handleOpenShiftHistory();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-gray-700 hover:text-black hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  <CalendarDays className="w-4 h-4 text-gray-500" />
                  <span>Shift History Logs</span>
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    setIsMenuOpen(false);
                    setShowSubscriptionModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-gray-700 hover:text-black hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border-t border-gray-100"
                >
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  <span>Premium Account</span>
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    setIsMenuOpen(false);
                    handleOpenAdminConsole();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-red-500" />
                  <span>Admin Console</span>
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    setIsMenuOpen(false);
                    setShowSettingsModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-gray-700 hover:text-black hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border-t border-gray-100"
                >
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span>settings</span>
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    setIsMenuOpen(false);
                    setShowAboutModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-gray-700 hover:text-black hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Info className="w-4 h-4 text-gray-500" />
                  <span>About</span>
                </button>
                
                <button
                  onClick={() => {
                    playClickSound();
                    setIsMenuOpen(false);
                    getAuthInstance().signOut().then(() => setUser(null));
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-t border-gray-100 mt-1"
                >
                  <Lock className="w-4 h-4 text-red-600" />
                  <span>Log Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* CORE ACTIVE VIEW PORT */}
      <div className="flex-1 flex flex-col">
        {renderActiveView()}
      </div>

      {/* BOTTOM NAV BAR (HIDDEN OPTIONALLY) */}
      {!hideBottomNav && (
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      {/* DEVICE METRICS MODAL */}
      {showMetricsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white border-2 border-neutral-900 rounded-xl shadow-2xl p-6 relative overflow-hidden max-h-[90vh] flex flex-col">
            {/* Top red warning accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />

            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-red-600" />
                <h2 className="text-sm font-extrabold text-black uppercase tracking-wider">
                  Secure Cloud Database & AI Auditor
                </h2>
              </div>
              <button
                onClick={() => { playClickSound(); setShowMetricsModal(false); }}
                className="p-1 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              <p className="text-xs text-gray-500 leading-normal">
                Verifies and synchronizes all data tables (shifts, checkpoint rounds, and photo proofs) with our secure cloud servers.
              </p>

              {/* CLOUD CONNECTION STATUS BARS */}
              <div className="bg-neutral-50 border border-gray-150 p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'error' ? 'bg-amber-500 animate-ping' : 'bg-green-600'}`} />
                  <div>
                    <span className="block text-[10px] font-extrabold text-black uppercase tracking-widest leading-none">
                      Cloud Connection
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5 block">
                      {syncStatus === 'error' ? 'STANDBY MODE' : 'MILITARY BACKEND SECURED'}
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                  syncStatus === 'syncing' 
                    ? 'bg-blue-50 border-blue-200 text-blue-600 animate-pulse'
                    : syncStatus === 'synced'
                    ? 'bg-green-50 border-green-200 text-green-600'
                    : syncStatus === 'error'
                    ? 'bg-amber-50 border-amber-200 text-amber-600'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}>
                  {syncStatus.toUpperCase()}
                </span>
              </div>

              {/* DATA TABLE AUDIT */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-3.5 bg-red-50/50 rounded-xl border border-red-200/60 shadow-xs">
                  <span className="block text-[9px] font-extrabold text-red-800 uppercase tracking-widest">
                    Salary Shifts Table
                  </span>
                  <span className="text-xl font-black text-red-950">
                    {metrics.shiftsCount} entries
                  </span>
                </div>

                <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60 shadow-xs">
                  <span className="block text-[9px] font-extrabold text-amber-800 uppercase tracking-widest">
                    Patrol Checkpoints
                  </span>
                  <span className="text-xl font-black text-amber-950">
                    {metrics.patrolsCount} runs
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 shadow-xs col-span-2 flex justify-between items-center">
                  <div>
                    <span className="block text-[9px] font-extrabold text-slate-700 uppercase tracking-widest">
                      Watermarked Media Proofs
                    </span>
                    <span className="text-xl font-black text-slate-950 block">
                      {metrics.photosCount} photos
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">
                      Total Offline Cache
                    </span>
                    <span className="text-xs font-mono font-bold text-red-600">
                      {(metrics.storageBytes / 1024).toFixed(2)} KB
                    </span>
                  </div>
                </div>
              </div>

              {/* SYNC TRIGGER BUTTON */}
              <button
                onClick={() => syncAllData(true)}
                disabled={syncStatus === 'syncing'}
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white font-bold rounded-lg uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                {syncStatus === 'syncing' ? 'Synchronizing Secure Server...' : 'Trigger Server Database Sync'}
              </button>

              {/* GEMINI REPORT AUDIT SECTION */}
              <div className="border-t border-gray-150 pt-4 space-y-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-red-600" />
                    AI Compliance Report Auditor
                  </h3>
                  {reportSummary && (
                    <button
                      onClick={() => { playClickSound(); setReportSummary(null); }}
                      className="text-[9px] font-extrabold text-red-600 hover:underline uppercase cursor-pointer"
                    >
                      Reset Briefing
                    </button>
                  )}
                </div>

                {!reportSummary ? (
                  <div className="bg-neutral-50 border border-dashed border-gray-200 p-3.5 rounded-lg text-center">
                    <p className="text-[11px] text-gray-500 mb-3.5 leading-relaxed">
                      Synthesize shift logs, checkpoint runs, and photo proofs into an official, watermarked security dossier briefing using server-side Gemini intelligence.
                    </p>
                    <button
                      onClick={handleGenerateSecurityReport}
                      disabled={isGeneratingReport}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold rounded-lg uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      {isGeneratingReport ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing logs with Gemini...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          Compile Security Audit Report
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="border-l-4 border-red-600 bg-neutral-900 text-white rounded-r-xl p-4 max-h-56 overflow-y-auto shadow-inner text-xs leading-relaxed font-mono relative scrollbar-thin">
                      {/* Subtly transparent Watermark badge inside dark report */}
                      <div className="absolute right-4 bottom-4 text-[44px] font-black text-neutral-800 select-none opacity-20 uppercase tracking-widest pointer-events-none">
                        SECURE
                      </div>
                      <div className="relative z-10">
                        <MarkdownRenderer text={reportSummary} />
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateSecurityReport}
                      disabled={isGeneratingReport}
                      className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-lg uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-neutral-200"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingReport ? 'animate-spin' : ''}`} />
                      Re-Compile Audit Report
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-150 flex items-center justify-between text-[11px] text-gray-400 font-mono mt-4 flex-shrink-0">
              <span className="flex items-center gap-1.5 font-bold">
                <Terminal className="w-3.5 h-3.5 text-green-600" />
                API STATUS: {isCloudConfigured ? 'GEMINI ON' : 'LOCAL TEMPLATE'}
              </span>
              <span>DB Engine: Server SQL + LocalStore</span>
            </div>
          </div>
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white border-2 border-neutral-900 rounded-xl shadow-2xl p-6 relative overflow-hidden text-black flex flex-col max-h-[90vh]">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
            
            <div className="flex items-center justify-between border-b border-gray-150 pb-3 mb-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-red-600" />
                <h2 className="text-sm font-extrabold text-black uppercase tracking-wider">
                  Officer Profile Registry
                </h2>
              </div>
              <button
                onClick={() => { playClickSound(); setShowProfileModal(false); }}
                className="p-1 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleSaveProfile({
                name: formData.get('name') as string,
                badgeId: formData.get('badgeId') as string,
                rank: formData.get('rank') as string,
                unit: formData.get('unit') as string,
                branch: formData.get('branch') as string,
                phone: formData.get('phone') as string,
                avatarUrl: tempAvatar,
                email: formData.get('email') as string,
                address: formData.get('address') as string,
                bio: formData.get('bio') as string,
              });
            }} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="bg-red-50/50 border border-red-200/60 p-3 rounded-lg flex items-center gap-3 flex-shrink-0">
                <div className="p-2 bg-red-600 text-white rounded-lg">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase text-red-800 tracking-wider">Credentials Verified</h4>
                  <p className="text-[11px] text-gray-500 font-medium leading-none mt-0.5">Tactical Terminal Authority Active</p>
                </div>
              </div>

              {/* PROFILE PORTRAIT UPLOAD */}
              <div className="flex flex-col items-center justify-center space-y-2 pb-2 border-b border-gray-100">
                <div className="relative group cursor-pointer">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 group-hover:border-red-600 overflow-hidden flex items-center justify-center bg-gray-50 relative shadow-inner">
                    {tempAvatar ? (
                      <img src={tempAvatar} alt="Profile Portrait" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const reader = new FileReader();
                        reader.onload = (uploadEvent) => {
                          if (uploadEvent.target?.result) {
                            setTempAvatar(uploadEvent.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    title="Upload Profile Picture"
                  />
                </div>
                <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest">
                  Click to Upload Portrait
                </span>
              </div>

              {/* PERSONAL & DUTY INFORMATION FIELDS */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                    Officer Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={profile.name}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                    Badge ID / serial *
                  </label>
                  <input
                    type="text"
                    name="badgeId"
                    defaultValue={profile.badgeId}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                    Rank / Designation *
                  </label>
                  <input
                    type="text"
                    name="rank"
                    defaultValue={profile.rank}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                    Squad Unit *
                  </label>
                  <input
                    type="text"
                    name="unit"
                    defaultValue={profile.unit}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                    Branch Location *
                  </label>
                  <input
                    type="text"
                    name="branch"
                    defaultValue={profile.branch}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                    Officer Contact Line (Phone) *
                  </label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={profile.phone}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-600"
                  />
                </div>

                {/* ADDITIONAL PERSONAL INFORMATION */}
                <div className="col-span-2 border-t border-dashed border-gray-150 pt-3">
                  <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2">Personal Records</h4>
                </div>

                <div className="col-span-2">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={profile.email || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                    Mailing / Base Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    defaultValue={profile.address || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                    Officer Biography / Specializations
                  </label>
                  <textarea
                    name="bio"
                    defaultValue={profile.bio || ''}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-600 resize-none"
                    placeholder="Describe special watch certifications, first aid ranks, or tactical equipment clearance details..."
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-gray-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => { playClickSound(); setShowProfileModal(false); }}
                  className="px-4 py-2 border border-gray-200 text-xs font-bold uppercase tracking-wider rounded-lg text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD DOCUMENTS MODAL */}
      {showUploadDocsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white border-2 border-neutral-900 rounded-xl shadow-2xl p-6 relative overflow-hidden max-h-[90vh] flex flex-col text-black">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-red-600" />
                <h2 className="text-sm font-extrabold text-black uppercase tracking-wider">
                  Patrol Document Registry
                </h2>
              </div>
              <button
                onClick={() => { playClickSound(); setShowUploadDocsModal(false); }}
                className="p-1 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1 mb-4">
              <p className="text-xs text-gray-500 leading-normal font-semibold">
                Upload safety certificates, weapon permits, gate lists, or duty instruction sheets in any format to store securely on this terminal.
              </p>

              {/* INTERACTIVE FILE UPLOADER */}
              <div 
                onClick={() => {
                  playClickSound();
                  const fileInput = document.getElementById('guard-doc-upload-input') as HTMLInputElement;
                  if (fileInput) fileInput.click();
                }}
                className="border-2 border-dashed border-gray-200 hover:border-red-500 rounded-xl p-6 text-center cursor-pointer bg-neutral-50/50 hover:bg-red-50/10 transition-all group"
              >
                <input 
                  type="file" 
                  id="guard-doc-upload-input" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const sizeStr = file.size > 1024 * 1024 
                        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                        : `${(file.size / 1024).toFixed(0)} KB`;
                      
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        if (evt.target?.result) {
                          handleAddDocument({
                            name: file.name,
                            size: sizeStr,
                            dataUrl: evt.target.result as string,
                            fileType: file.type
                          });
                        }
                      };
                      reader.readAsDataURL(file);
                      e.target.value = ''; // Reset uploader
                    }
                  }}
                />
                <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-red-600 mx-auto mb-2 transition-colors" />
                <span className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Select Any Duty File to Register
                </span>
                <span className="block text-[10px] text-gray-400 mt-1 uppercase font-bold">
                  All Formats Supported (PDF, DOCX, JPG, PNG, etc.)
                </span>
              </div>

              {/* UPLOADED FILES LIST */}
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  Registered Documents ({documents.length})
                </div>

                {documents.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400 border border-gray-150 rounded-lg bg-gray-50 font-semibold uppercase tracking-wider">
                    No Registered Documents
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-150 rounded-xl overflow-hidden">
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-3 bg-neutral-50/30 flex items-center justify-between text-xs hover:bg-neutral-50 transition-colors">
                        <div 
                          onClick={() => { playClickSound(); setSelectedDoc(doc); }}
                          className="flex items-center gap-2.5 min-w-0 pr-2 cursor-pointer flex-1"
                          title="Click to View Full Screen"
                        >
                          <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-gray-800 truncate uppercase text-[11px]" title={doc.name}>
                              {doc.name}
                            </p>
                            <div className="flex items-center gap-2 text-[9px] text-gray-400 font-semibold mt-0.5">
                              <span>{doc.size}</span>
                              <span>•</span>
                              <span>Uploaded: {doc.date}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* VIEW ACTION */}
                          <button
                            onClick={() => { playClickSound(); setSelectedDoc(doc); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="View Full Screen"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* DOWNLOAD ACTION */}
                          <button
                            onClick={() => handleDownloadFile(doc)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Download File"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* DELETE ACTION */}
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Remove Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => { playClickSound(); setShowUploadDocsModal(false); }}
                className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                Close Registry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPLICATION SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white border-2 border-neutral-900 rounded-xl shadow-2xl p-6 relative overflow-hidden text-black">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-red-600" />
                <h2 className="text-sm font-extrabold text-black uppercase tracking-wider">
                  Terminal Settings
                </h2>
              </div>
              <button
                onClick={() => { playClickSound(); setShowSettingsModal(false); }}
                className="p-1 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* CLICK SOUNDFX */}
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-gray-150">
                <div>
                  <span className="block text-[11px] font-black text-gray-800 uppercase tracking-wide">
                    Play Click Sound FX
                  </span>
                  <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">
                    Audio haptic blips on buttons and alerts
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.playSounds} 
                    onChange={(e) => {
                      const updated = { ...settings, playSounds: e.target.checked };
                      setSettings(updated);
                      localStorage.setItem('guard_app_settings', JSON.stringify(updated));
                      if (e.target.checked) playClickSound();
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              {/* AUTO SYNC */}
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-gray-150">
                <div>
                  <span className="block text-[11px] font-black text-gray-800 uppercase tracking-wide">
                    Automatic Cloud Sync
                  </span>
                  <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">
                    Real-time backup of patrols and shifts
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.autoSync} 
                    onChange={(e) => {
                      playClickSound();
                      const updated = { ...settings, autoSync: e.target.checked };
                      setSettings(updated);
                      localStorage.setItem('guard_app_settings', JSON.stringify(updated));
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              {/* MONEY CURRENCY SELECT */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-gray-150 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="block text-[11px] font-black text-gray-800 uppercase tracking-wide">
                      Preferred Money Currency
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">
                      Currency symbol used across shift logs
                    </span>
                  </div>
                  <select
                    value={settings.currency || 'USD ($)'}
                    onChange={(e) => {
                      playClickSound();
                      const updated = { ...settings, currency: e.target.value };
                      setSettings(updated);
                      localStorage.setItem('guard_app_settings', JSON.stringify(updated));
                      window.dispatchEvent(new Event('settings-updated'));
                    }}
                    className="text-xs font-bold bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-red-600 cursor-pointer"
                  >
                    <option value="USD ($)">USD ($)</option>
                    <option value="EUR (€)">EUR (€)</option>
                    <option value="GBP (£)">GBP (£)</option>
                    <option value="JPY (¥)">JPY (¥)</option>
                    <option value="AUD (A$)">AUD (A$)</option>
                    <option value="CAD (C$)">CAD (C$)</option>
                    <option value="CHF (CHF)">CHF (CHF)</option>
                    <option value="ILS (₪)">ILS (₪)</option>
                    <option value="INR (₹)">INR (₹)</option>
                    <option value="ZAR (R)">ZAR (R)</option>
                  </select>
                </div>
              </div>

              {/* IMAGE QUALITY DROPDOWN */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-gray-150 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="block text-[11px] font-black text-gray-800 uppercase tracking-wide">
                      Evidence Image Resolution
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">
                      Adjust camera capture compression
                    </span>
                  </div>
                  <select
                    value={settings.imageQuality}
                    onChange={(e) => {
                      playClickSound();
                      const updated = { ...settings, imageQuality: e.target.value };
                      setSettings(updated);
                      localStorage.setItem('guard_app_settings', JSON.stringify(updated));
                    }}
                    className="text-xs font-bold uppercase bg-white border border-gray-200 px-2 py-1 rounded-md focus:outline-none"
                  >
                    <option value="High (1080p)">High (1080p)</option>
                    <option value="Medium (720p)">Medium (720p)</option>
                    <option value="Standard (480p)">Standard (480p)</option>
                  </select>
                </div>
              </div>

              {/* DANGER ZONE */}
              <div className="border border-red-200/60 bg-red-50/30 p-3 rounded-xl space-y-2">
                <div className="text-[10px] font-black uppercase text-red-700 tracking-wider">
                  Danger Area (Hardware Reset)
                </div>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                  Permanently clear officer credentials, shift summaries, patrol routes, and watermarked image archives from this terminal.
                </p>
                <button
                  type="button"
                  onClick={handleHardReboot}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer text-center"
                >
                  Hard System Reboot
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 mt-4">
              <button
                onClick={() => { playClickSound(); setShowSettingsModal(false); }}
                className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABOUT APPLICATION MODAL */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white border-2 border-neutral-900 rounded-xl shadow-2xl p-6 relative overflow-hidden text-black">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
            
            <div className="flex items-center justify-between border-b border-gray-150 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-red-600" />
                <h2 className="text-sm font-extrabold text-black uppercase tracking-wider">
                  About Patrol Terminal
                </h2>
              </div>
              <button
                onClick={() => { playClickSound(); setShowAboutModal(false); }}
                className="p-1 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-gray-100">
                <div className="inline-block p-2 bg-neutral-900 text-red-500 rounded-xl mb-2">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-black text-black uppercase tracking-widest leading-none">
                  PatrolStamp Guard Terminal
                </h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono mt-1">
                  Tactical Edition • v4.2.1-prod
                </p>
              </div>

              <div className="space-y-3.5 text-xs text-gray-600 leading-relaxed font-medium">
                <p>
                  <strong>PatrolStamp</strong> is a secure, real-time photographic metadata logging application designed for high-accountability patrol operations, marine terminal watch, and security audit verifications.
                </p>
                
                <div>
                  <h4 className="text-[10px] font-black uppercase text-black tracking-wider mb-1">Core Tech Specifications:</h4>
                  <ul className="list-disc pl-4 space-y-1 text-gray-500 text-[11px]">
                    <li><strong>Hardware Camera API:</strong> Low-latency device camera hook-in with real-time overlay stamps</li>
                    <li><strong>Cryptographic Stamp Engine:</strong> Imposes precise UNIX timestamps, coordinates, and user metrics directly onto pixel buffers</li>
                    <li><strong>Compliance Audit:</strong> Powered by server-side Google Gemini intelligence to automatically inspect captures for low visibility, fog, or obstructions</li>
                    <li><strong>Zero-Loss Redundancy:</strong> Unified dual database engine syncing server SQL tables and device LocalStorage seamlessly</li>
                  </ul>
                </div>

                <div className="bg-neutral-50 border border-gray-150 p-2.5 rounded-lg text-center font-mono text-[9px] text-gray-400">
                  SYSTEM KEY: P-STAMP-GS2026-X8
                  <br />
                  BUILD TARGET: 2026-08-06 22:58
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 mt-4">
              <button
                onClick={() => { playClickSound(); setShowAboutModal(false); }}
                className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                Acknowledge System
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONGRATULATIONS MODAL */}
      {showCongratsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-white border-2 border-emerald-500 rounded-2xl shadow-2xl p-6 relative overflow-hidden text-center text-black">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500" />
            
            <div className="mt-2 mb-4 inline-flex p-3 bg-emerald-100 text-emerald-600 rounded-full animate-bounce">
              <Award className="w-10 h-10 stroke-[2.5]" />
            </div>
            
            <h2 className="text-lg font-black text-emerald-950 uppercase tracking-wide">
              Congratulations!
            </h2>
            <p className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-widest mt-0.5">
              Profile Registry Authenticated
            </p>
            
            <div className="my-4 p-3 border border-emerald-100 bg-emerald-50/50 rounded-xl space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500 bg-emerald-100 flex-shrink-0">
                  {profile.avatarUrl ? (
                    <img 
                      src={profile.avatarUrl} 
                      alt="Officer Portrait" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User className="w-full h-full p-2.5 text-emerald-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-black truncate uppercase">
                    {profile.name}
                  </h3>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                    Badge: {profile.badgeId} • {profile.rank}
                  </p>
                </div>
              </div>
              <div className="border-t border-emerald-100/60 pt-2 text-[11px] text-emerald-900 leading-normal font-semibold space-y-1">
                <p>• Sq. Unit: {profile.unit}</p>
                <p>• Branch: {profile.branch}</p>
                <p>• Contact: {profile.phone}</p>
                <p>• Email: {profile.email || "N/A"}</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                playClickSound();
                setShowCongratsModal(false);
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer"
            >
              Acknowledge & Save
            </button>
          </div>
        </div>
      )}

      {/* FULL SCREEN DOCUMENT VIEWER MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-neutral-900 border-2 border-neutral-700 rounded-xl shadow-2xl p-5 relative overflow-hidden max-h-[90vh] flex flex-col text-white">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
            
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                <h2 className="text-xs font-extrabold text-neutral-200 uppercase tracking-wider truncate" title={selectedDoc.name}>
                  Viewer: {selectedDoc.name}
                </h2>
              </div>
              <button
                onClick={() => { playClickSound(); setSelectedDoc(null); }}
                className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* VIEWER AREA */}
            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-2 mb-4 bg-black/40 border border-neutral-800 rounded-lg min-h-[300px]">
              {selectedDoc.dataUrl && selectedDoc.dataUrl.startsWith('data:image/') ? (
                <img 
                  src={selectedDoc.dataUrl} 
                  alt={selectedDoc.name} 
                  className="max-w-full max-h-[55vh] object-contain rounded shadow-lg"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center p-6 max-w-sm">
                  <div className="w-16 h-16 bg-neutral-800 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md border border-neutral-700 animate-pulse">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider mb-1">
                    {selectedDoc.name}
                  </h3>
                  <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest">
                    Format: {selectedDoc.fileType || "Generic Duty File"}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-2 font-medium">
                    This file format is securely archived on terminal hardware. Review the physical specs below or download to view externally.
                  </p>
                </div>
              )}
            </div>

            {/* ACTIONS & SHARING SECTION */}
            <div className="border-t border-neutral-800 pt-3 flex-shrink-0 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-neutral-400">
                <span>SIZE: {selectedDoc.size}</span>
                <span>REGISTRY DATE: {selectedDoc.date}</span>
                <span className="text-emerald-500 font-bold">STATUS: COMPLIANT ✓</span>
              </div>

              {/* SOCIAL MEDIA & EXPORT BUTTONS */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    playClickSound();
                    handleDownloadFile(selectedDoc);
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all border border-neutral-700 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-400" />
                  Download File
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    const text = `Verified Patrol Document:\nName: ${selectedDoc.name}\nSize: ${selectedDoc.size}\nDate: ${selectedDoc.date}\nSecured by PatrolStamp.`;
                    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-emerald-100" />
                  Share WhatsApp
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    const text = `Verified Patrol Document:\nName: ${selectedDoc.name}\nSize: ${selectedDoc.size}\nDate: ${selectedDoc.date}`;
                    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`;
                    window.open(telegramUrl, '_blank');
                  }}
                  className="flex items-center justify-center gap-2 py-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-blue-100" />
                  Telegram Link
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    const mailtoUrl = `mailto:?subject=${encodeURIComponent(`Patrol Registry: ${selectedDoc.name}`)}&body=${encodeURIComponent(`Duty Document Details:\n\nName: ${selectedDoc.name}\nSize: ${selectedDoc.size}\nRegistry Date: ${selectedDoc.date}\nCompliance Status: Verified`)}`;
                    window.location.href = mailtoUrl;
                  }}
                  className="flex items-center justify-center gap-2 py-2 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer animate-pulse"
                >
                  <Mail className="w-3.5 h-3.5 text-neutral-300" />
                  Export to Email
                </button>
              </div>

              {navigator.share && (
                <button
                  onClick={() => {
                    playClickSound();
                    navigator.share({
                      title: selectedDoc.name,
                      text: `Registry certified file: ${selectedDoc.name} (${selectedDoc.size})`,
                    }).catch(() => {});
                  }}
                  className="w-full py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-lg text-[11px] font-black uppercase tracking-wider text-center cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Trigger Device Native Share Tray
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM SUBSCRIPTION MODAL */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-2xl p-5 relative overflow-hidden max-h-[90vh] flex flex-col text-black">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-neutral-900" />
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-150 pb-3.5 mb-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-neutral-900" />
                <h2 className="text-xs font-black text-neutral-900 uppercase tracking-widest">
                  Monthly Subscription
                </h2>
              </div>
              <button
                onClick={() => { playClickSound(); setShowSubscriptionModal(false); }}
                className="p-1 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* CURRENT STATUS BANNER */}
              {subscriptionStatus === 'active' && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-[11px] uppercase tracking-wider">Premium Access Active</p>
                    <p className="text-emerald-700 font-medium mt-0.5 leading-relaxed">Your monthly subscription is verified and approved. You now have unrestricted access to document downloads and master logs.</p>
                  </div>
                </div>
              )}

              {subscriptionStatus === 'pending' && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-pulse">
                  <Loader2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
                  <div>
                    <p className="font-extrabold text-[11px] uppercase tracking-wider">Payment Under Review</p>
                    <p className="text-blue-700 font-medium mt-0.5 leading-relaxed">Your proof of payment has been uploaded and submitted. Matthews (Operations Admin) is currently verifying the transfer details.</p>
                  </div>
                </div>
              )}

              {subscriptionStatus === 'declined' && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5">
                  <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-[11px] uppercase tracking-wider">Payment Verification Failed</p>
                    <p className="text-red-700 font-medium mt-0.5 leading-relaxed">Your payment document was declined by admin. Please verify you transferred R49,99 with reference "R49.99", then submit a new document.</p>
                  </div>
                </div>
              )}

              {/* PREMIUM VALUE PROP */}
              <div className="p-5 bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl shadow-2xl space-y-4 border border-neutral-700">
                <div className="flex items-baseline justify-between border-b border-neutral-700/50 pb-3">
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                    Included Compliance Features
                  </span>
                  <span className="text-xs font-black text-amber-400 bg-amber-900/30 px-3 py-1 rounded-full border border-amber-700/50">
                    R49,99 / Monthly
                  </span>
                </div>

                <div className="space-y-3 text-xs text-neutral-200">
                  <div className="flex gap-3 items-start">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="leading-normal">
                      <strong className="text-white font-extrabold">Unlimited Shift & Patrol Logs</strong>: Record patrol paths, clock-ins, and shift earnings with zero limit.
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="leading-normal">
                      <strong className="text-white font-extrabold">Instant Document Downloads</strong>: Save individual or master history logs as official TXT statements.
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="leading-normal">
                      <strong className="text-white font-extrabold">Active Compliance Hub Sync</strong>: Direct reporting connectivity to administrators and control rooms.
                    </p>
                  </div>
                </div>
              </div>

              {/* BANKING DETAILS CARD */}
              <div className="p-4 bg-slate-50 rounded-xl border border-gray-200 space-y-3">
                <span className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Capitec EFT Payment Details
                </span>
                
                <div className="grid grid-cols-2 gap-y-2 text-xs font-medium text-gray-700">
                  <span className="text-gray-400">Bank Name:</span>
                  <span className="font-extrabold text-black">Capitec Bank</span>

                  <span className="text-gray-400">Account Name:</span>
                  <span className="font-extrabold text-black flex items-center">
                    Matthews
                    <button 
                      onClick={() => handleCopyText("Matthews", "holder")}
                      className="ml-1.5 px-1.5 py-0.5 bg-white hover:bg-gray-100 text-[9px] font-black rounded text-neutral-600 border border-gray-250 cursor-pointer transition-colors"
                    >
                      {copiedField === 'holder' ? 'Copied!' : 'Copy'}
                    </button>
                  </span>

                  <span className="text-gray-400">Account Number:</span>
                  <span className="font-extrabold font-mono text-black flex items-center">
                    1334067366
                    <button 
                      onClick={() => handleCopyText("1334067366", "acc")}
                      className="ml-1.5 px-1.5 py-0.5 bg-white hover:bg-gray-100 text-[9px] font-black rounded text-neutral-600 border border-gray-250 cursor-pointer transition-colors"
                    >
                      {copiedField === 'acc' ? 'Copied!' : 'Copy'}
                    </button>
                  </span>

                  <span className="text-gray-400">Required Price/Ref:</span>
                  <span className="font-black text-amber-600 font-mono tracking-wider bg-amber-50 px-1.5 rounded border border-amber-250 flex items-center w-fit">
                    R49.99
                    <button 
                      onClick={() => handleCopyText("R49.99", "ref")}
                      className="ml-1.5 px-1.5 py-0.5 bg-white hover:bg-amber-100 text-[9px] font-black rounded text-amber-800 border border-amber-250 cursor-pointer transition-colors"
                    >
                      {copiedField === 'ref' ? 'Copied!' : 'Copy'}
                    </button>
                  </span>
                </div>
              </div>

              {/* UPLOAD FORM */}
              {subscriptionStatus !== 'active' && (
                <div className="space-y-2.5">
                  <span className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    Submit Proof of Payment
                  </span>

                  <div className="relative border-2 border-dashed border-gray-200 hover:border-neutral-900 rounded-xl p-5 text-center transition-all group cursor-pointer bg-slate-50/50">
                    <input 
                      type="file" 
                      id="pop-upload-input" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          const sizeStr = file.size > 1024 * 1024
                            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                            : `${(file.size / 1024).toFixed(0)} KB`;
                          
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            if (evt.target?.result) {
                              playClickSound();
                              handleSubmitProofOfPayment({
                                name: file.name,
                                size: sizeStr,
                                dataUrl: evt.target.result as string
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-neutral-900 mx-auto mb-2 transition-colors" />
                    <span className="block text-xs font-black text-gray-700 uppercase tracking-wide">
                      Select Payment Document
                    </span>
                    <span className="block text-[10px] text-gray-400 mt-1 uppercase font-bold">
                      Upload PDF, JPEG, PNG, or TEXT receipt
                    </span>
                  </div>
                </div>
              )}

              {/* RECENT SUBMISSION HISTORY */}
              {subscriptionRequests.length > 0 && (
                <div className="space-y-2">
                  <span className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    Submission History
                  </span>
                  <div className="divide-y divide-gray-150 border border-gray-200 rounded-xl overflow-hidden text-xs bg-slate-50/50">
                    {subscriptionRequests.map((req) => (
                      <div key={req.id} className="p-3 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-gray-800 truncate uppercase text-[10px]" title={req.fileName}>
                            {req.fileName}
                          </p>
                          <p className="text-[9px] text-gray-400 mt-0.5 font-semibold">
                            Ref: {req.reference} • {req.submittedAt}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-full border tracking-wider ${
                          req.status === 'approved'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : req.status === 'declined'
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-blue-50 border-blue-200 text-blue-700 animate-pulse'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADMIN CONSOLE MODAL */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white text-black animate-fadeIn">
          {/* Top red header accent bar */}
          <div className="h-1.5 bg-red-600 flex-shrink-0" />
          
          {/* Full Screen Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-slate-50 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-600" />
              <h2 className="text-sm font-black uppercase tracking-wide text-neutral-900">
                PatrolStamp Admin Console
              </h2>
            </div>
            <button
              onClick={() => { playClickSound(); setShowAdminModal(false); }}
              className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Full Screen Content Wrapper */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            <div className="max-w-3xl mx-auto space-y-6">
              
              {/* ADMIN STATISTICS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* TOTAL APP PROFIT CARD */}
                <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      Total App Profit
                    </span>
                    <span className="block text-2xl font-black text-emerald-600 mt-1">
                      R{totalProfit.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-[9px] text-gray-500 font-bold block mt-0.5">
                      Sum of all shift salaries
                    </span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>

                {/* ONLINE ACTIVE USERS CARD */}
                <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      Online Active Users
                    </span>
                    <span className="block text-2xl font-black text-blue-600 mt-1">
                      {activeUsersCount}
                    </span>
                    <span className="text-[9px] text-blue-500 font-bold block mt-0.5 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      Live Terminals Syncing
                    </span>
                  </div>
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* PROOF OF PAYMENTS VERIFICATION PANEL */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
                    Subscription Payments Approval Queue
                  </span>
                  <span className="px-2.5 py-0.5 bg-slate-100 text-[9px] text-gray-700 rounded-full border border-gray-200 font-extrabold">
                    {subscriptionRequests.length} Total
                  </span>
                </div>

                {subscriptionRequests.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl bg-slate-50/50">
                    <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-600">Queue is Empty</p>
                    <p className="text-[10px] text-gray-400 max-w-xs mx-auto mt-1 leading-relaxed">
                      No proof of payment documents uploaded by patrol officers are awaiting verification at this time.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {subscriptionRequests.map((req) => (
                      <div key={req.id} className="p-4 bg-slate-50 rounded-xl border border-gray-200 space-y-3 shadow-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-neutral-800 uppercase truncate">
                              {req.officerName}
                            </h4>
                            <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                              Badge: {req.officerBadge} • Ref: <span className="text-amber-600 font-bold font-mono bg-amber-50 px-1 rounded border border-amber-100">{req.reference}</span>
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-full border ${
                            req.status === 'approved'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : req.status === 'declined'
                              ? 'bg-red-50 border-red-200 text-red-700'
                              : 'bg-blue-50 border-blue-200 text-blue-700 animate-pulse'
                          }`}>
                            {req.status}
                          </span>
                        </div>

                        {/* Document Detail Preview */}
                        <div className="p-3 bg-white rounded-lg border border-gray-200 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-gray-800 truncate text-[11px]" title={req.fileName}>
                                {req.fileName}
                              </p>
                              <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">
                                Size: {req.fileSize} • Submitted: {req.submittedAt}
                              </p>
                            </div>
                          </div>
                          
                          {req.fileDataUrl && (
                            <button
                              onClick={() => {
                                playClickSound();
                                const docToView = { id: req.id, name: req.fileName, size: req.fileSize, dataUrl: req.fileDataUrl, date: req.submittedAt };
                                setSelectedDoc(docToView);
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-[10px] text-neutral-700 font-bold uppercase rounded border border-gray-200 whitespace-nowrap cursor-pointer transition-colors"
                            >
                              Inspect PoP
                            </button>
                          )}
                        </div>

                        {/* Admin Action Bar */}
                        <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-2.5">
                          <button
                            onClick={() => { playClickSound(); handleDeleteSubscriptionRequest(req.id); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Delete Submission Log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {req.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { playClickSound(); handleDeclineSubscription(req.id); }}
                                className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                Decline
                              </button>
                              
                              <button
                                onClick={() => { playClickSound(); handleApproveSubscription(req.id); }}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS HUB MODAL */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn text-black">
          <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-2xl p-5 relative overflow-hidden max-h-[80vh] flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4.5 h-4.5 text-red-600" />
                <h2 className="text-xs font-black uppercase tracking-wider">
                  Notification Center
                </h2>
              </div>
              <button
                onClick={() => { playClickSound(); setShowNotificationsModal(false); }}
                className="p-1 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {notifications.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs font-bold uppercase tracking-wide">No Alerts Active</p>
                  <p className="text-[10px] text-gray-400 max-w-xs mx-auto mt-1">
                    Your compliance log is fully synced and clear. System updates will populate here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-3 rounded-lg border text-xs leading-normal transition-all relative ${
                        n.read 
                          ? 'bg-neutral-50/50 border-gray-150 text-gray-600' 
                          : 'bg-red-50/40 border-red-100 text-gray-800 font-semibold shadow-xs'
                      }`}
                    >
                      {!n.read && (
                        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-600 rounded-full" />
                      )}
                      <p>{n.text}</p>
                      <p className="text-[9px] text-gray-400 mt-1 font-bold font-mono uppercase">{n.date}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-3 flex-shrink-0 flex items-center justify-between gap-2 mt-3">
              <button
                onClick={() => { playClickSound(); handleClearNotifications(); }}
                className="px-2.5 py-1.5 text-[10px] font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer uppercase"
              >
                Clear All
              </button>
              
              <button
                onClick={() => { playClickSound(); handleMarkAllNotificationsAsRead(); }}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-black uppercase tracking-wider rounded-lg cursor-pointer"
              >
                Mark All Read
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PATROL HISTORY LOGS MODAL */}
      {showPatrolHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn text-black">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-xl shadow-2xl p-5 relative overflow-hidden max-h-[85vh] flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" />
                <h2 className="text-sm font-black uppercase tracking-wider">
                  Patrol History Logs
                </h2>
              </div>
              <button
                onClick={() => { playClickSound(); setShowPatrolHistoryModal(false); }}
                className="p-1 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-3.5 flex-shrink-0">
              <button
                onClick={() => { playClickSound(); downloadPatrolHistory(); }}
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download Master Patrol Log (.txt)
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {localPatrols.length === 0 ? (
                <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
                  <Shield className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs font-bold uppercase tracking-wide">No Patrol History Found</p>
                  <p className="text-[10px] text-gray-400 max-w-xs mx-auto mt-1">
                    Start a patrol session under the PatrolTimes tab first to register session history.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {localPatrols.map((patrol) => {
                    const clockedPoints = patrol.clockPoints?.filter((cp: any) => cp.isClocked).length || 0;
                    const totalPoints = patrol.clockPoints?.length || patrol.totalPoints || 0;
                    return (
                      <div key={patrol.id} className="p-3.5 bg-slate-50 border border-gray-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-gray-900 uppercase text-xs truncate">
                            {patrol.title || 'General Patrol'}
                          </h4>
                          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                            Points: {clockedPoints}/{totalPoints} • {patrol.createdAt}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full border ${
                              patrol.status === 'completed'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : patrol.status === 'missed'
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : 'bg-blue-50 border-blue-200 text-blue-700'
                            }`}>
                              {patrol.status}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => { playClickSound(); downloadPatrolHistory(patrol); }}
                          className="p-2 text-gray-500 hover:text-black hover:bg-gray-200/60 rounded-lg border border-gray-200 transition-colors cursor-pointer"
                          title="Download individual log"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SHIFT HISTORY LOGS MODAL */}
      {showShiftHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn text-black">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-xl shadow-2xl p-5 relative overflow-hidden max-h-[85vh] flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-red-600" />
                <h2 className="text-sm font-black uppercase tracking-wider">
                  Shift History Logs
                </h2>
              </div>
              <button
                onClick={() => { playClickSound(); setShowShiftHistoryModal(false); }}
                className="p-1 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-3.5 flex-shrink-0">
              <button
                onClick={() => { playClickSound(); downloadShiftHistory(); }}
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download Master Earnings Statement (.txt)
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {localShifts.length === 0 ? (
                <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
                  <CalendarDays className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs font-bold uppercase tracking-wide">No Shift History Found</p>
                  <p className="text-[10px] text-gray-400 max-w-xs mx-auto mt-1">
                    Log a shift session under the MyShifts tab first to register earnings history.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {localShifts.map((shift) => (
                    <div key={shift.id} className="p-3.5 bg-slate-50 border border-gray-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-gray-900 uppercase text-xs truncate">
                          {shift.title || 'Security Duty'}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                          Date: {shift.day}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase">
                          Earnings: R{shift.salary} {shift.hoursWorked && `(${shift.hoursWorked} hrs @ R${shift.ratePerHour || '0'}/hr)`}
                        </p>
                      </div>

                      <button
                        onClick={() => { playClickSound(); downloadShiftHistory(shift); }}
                        className="p-2 text-gray-500 hover:text-black hover:bg-gray-200/60 rounded-lg border border-gray-200 transition-colors cursor-pointer"
                        title="Download individual statement"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
