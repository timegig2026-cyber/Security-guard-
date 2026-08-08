import React, { useState, useEffect } from 'react';
import { CalendarDays, Plus, Trash2, DollarSign, Clock, X } from 'lucide-react';
import { Shift } from '../types';
import { getDb, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from '../firebase';

export const MyShiftsView: React.FC<{ isRestricted: () => boolean }> = ({ isRestricted }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);

  useEffect(() => {
    const db = getDb();
    const q = query(collection(db, 'shifts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const shiftsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Shift[];
      setShifts(shiftsData);
    });
    return () => unsubscribe();
  }, []);

  const [currencySymbol, setCurrencySymbol] = useState('$');

  useEffect(() => {
    const updateCurrency = () => {
      try {
        const savedSettings = localStorage.getItem('guard_app_settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (parsed && parsed.currency) {
            const match = parsed.currency.match(/\(([^)]+)\)/);
            if (match && match[1]) {
              setCurrencySymbol(match[1]);
            } else {
              setCurrencySymbol(parsed.currency);
            }
          }
        }
      } catch {
        // fallback
      }
    };
    
    updateCurrency();
    // Also listen to storage events to update in real-time
    window.addEventListener('storage', updateCurrency);
    // Custom event to handle local changes
    window.addEventListener('settings-updated', updateCurrency);
    return () => {
      window.removeEventListener('storage', updateCurrency);
      window.removeEventListener('settings-updated', updateCurrency);
    };
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [day, setDay] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [ratePerHour, setRatePerHour] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [salary, setSalary] = useState('');

  // Auto-calculate total salary when ratePerHour or hoursWorked changes
  const handleRateChange = (val: string) => {
    setRatePerHour(val);
    const rate = parseFloat(val);
    const hours = parseFloat(hoursWorked);
    if (!isNaN(rate) && rate >= 0 && !isNaN(hours) && hours >= 0) {
      setSalary((rate * hours).toFixed(2));
    }
  };

  const handleHoursChange = (val: string) => {
    setHoursWorked(val);
    const hours = parseFloat(val);
    const rate = parseFloat(ratePerHour);
    if (!isNaN(rate) && rate >= 0 && !isNaN(hours) && hours >= 0) {
      setSalary((rate * hours).toFixed(2));
    }
  };

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !day || !salary) return;

    if (isRestricted() && shifts.length >= 5) {
      alert("Trial limit reached: You can only add up to 5 shifts during your trial. Please subscribe to unlock unlimited shifts.");
      setIsModalOpen(false);
      return;
    }

    const parsedSalary = parseFloat(salary);
    if (isNaN(parsedSalary) || parsedSalary < 0) return;

    const parsedRate = ratePerHour ? parseFloat(ratePerHour) : undefined;
    const parsedHours = hoursWorked ? parseFloat(hoursWorked) : undefined;

    const newShift = {
      title: title.trim(),
      day,
      ratePerHour: parsedRate && !isNaN(parsedRate) ? parsedRate : undefined,
      hoursWorked: parsedHours && !isNaN(parsedHours) ? parsedHours : undefined,
      salary: parsedSalary,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(getDb(), 'shifts'), newShift);
    } catch (e) {
      console.error("Error adding shift: ", e);
    }
    
    // Reset form
    setTitle('');
    setRatePerHour('');
    setHoursWorked('');
    setSalary('');
    setIsModalOpen(false);
  };

  const handleDeleteShift = async (id: string) => {
    try {
      await deleteDoc(doc(getDb(), 'shifts', id));
    } catch (e) {
      console.error("Error deleting shift: ", e);
    }
  };

  const totalEarnings = shifts.reduce((acc, curr) => acc + curr.salary, 0);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div id="view-myshifts" className="flex-1 flex flex-col bg-white min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] pb-16 relative">
      {/* Content Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 md:p-6 flex flex-col">
        {/* Header & Stats Bar */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-black tracking-tight flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-black" />
              MyShifts
            </h1>
            <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">
              Completed Shifts & Earnings
            </p>
          </div>

          <button
            id="add-shift-btn"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-semibold uppercase tracking-wider rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Shift
          </button>
        </div>

        {/* Total Summary Banner */}
        {shifts.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-3.5 border border-emerald-200 rounded-xl bg-emerald-50/70 flex flex-col justify-between shadow-xs animate-fadeIn">
              <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-widest leading-none">
                Total Earnings
              </span>
              <span className="text-2xl font-black text-emerald-950 mt-2 leading-none">
                {currencySymbol}{totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-3.5 border border-red-200 rounded-xl bg-red-50/70 flex flex-col justify-between shadow-xs animate-fadeIn">
              <span className="text-[10px] font-extrabold text-red-800 uppercase tracking-widest leading-none">
                Completed Shifts
              </span>
              <span className="text-2xl font-black text-red-950 mt-2 leading-none">
                {shifts.length} {shifts.length === 1 ? 'Shift' : 'Shifts'}
              </span>
            </div>
          </div>
        )}

        {/* Shifts List or Empty View */}
        {shifts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center my-12">
            <div className="mb-4 p-6 border border-black rounded-full bg-white">
              <CalendarDays className="w-10 h-10 text-black stroke-[1.5]" />
            </div>
            <h2 className="text-2xl font-light tracking-tight mb-2 text-black">
              No Shifts Recorded
            </h2>
            <p className="text-gray-400 font-normal max-w-xs text-sm mb-6 leading-relaxed">
              Log your completed shifts along with the day and total salary attached.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 border border-black bg-black text-white text-xs font-semibold uppercase tracking-wider rounded hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Add First Shift
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Recent Completed Shifts
            </div>
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 hover:border-red-600 hover:bg-white transition-all flex items-center justify-between group shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-black uppercase tracking-wider">
                      {shift.title}
                    </span>
                    {shift.hoursWorked && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-medium">
                        <Clock className="w-3 h-3" />
                        {shift.hoursWorked} {shift.hoursWorked === 1 ? 'hr' : 'hrs'}
                        {shift.ratePerHour && ` @ ${currencySymbol}${shift.ratePerHour.toFixed(2)}/hr`}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 font-medium">
                    {formatDate(shift.day)}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-400 uppercase tracking-widest text-[9px]">
                      Salary
                    </div>
                    <div className="text-base font-bold text-black">
                      {currencySymbol}{shift.salary.toFixed(2)}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteShift(shift.id)}
                    title="Delete Shift"
                    className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Shift Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-black rounded-lg shadow-xl p-6 relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h2 className="text-base font-semibold text-black uppercase tracking-wider">
                Add Completed Shift
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-black rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddShift} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-black mb-1">
                  Shift Title / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Day Patrol, Night Security Guard"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:border-black focus:outline-none text-sm text-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-black mb-1">
                  Day / Date *
                </label>
                <input
                  type="date"
                  required
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:border-black focus:outline-none text-sm text-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-black mb-1">
                    Rate Per Hour ({currencySymbol}/hr)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 text-xs">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="25.00"
                      value={ratePerHour}
                      onChange={(e) => handleRateChange(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded focus:border-black focus:outline-none text-sm text-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-black mb-1">
                    Hours Worked
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    placeholder="8.0"
                    value={hoursWorked}
                    onChange={(e) => handleHoursChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:border-black focus:outline-none text-sm text-black"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-black">
                    Total Salary ({currencySymbol}) *
                  </label>
                  {ratePerHour && hoursWorked && (
                    <span className="text-[10px] text-gray-500 font-medium">
                      Calculated ({hoursWorked} hrs × {currencySymbol}{ratePerHour}/hr)
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-xs">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="200.00"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded focus:border-black focus:outline-none text-sm text-black font-semibold"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-xs font-semibold uppercase tracking-wider rounded text-gray-600 hover:text-black hover:border-gray-400 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white border border-black text-xs font-semibold uppercase tracking-wider rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Save Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
