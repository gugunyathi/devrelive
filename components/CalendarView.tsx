'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, Video, Phone, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ScheduledCall {
  scheduledCallId: string;
  title: string;
  topic?: string;
  notes?: string;
  scheduledAt: string;
  durationMinutes: number;
  devrel?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

// Mock fallback shown when user is not signed in
const MOCK_SCHEDULED: ScheduledCall[] = [
  { scheduledCallId: 'mock-s1', title: 'Base Account Integration Help', scheduledAt: new Date(2026, 2, 15, 10, 0).toISOString(), durationMinutes: 30, devrel: 'Alice', status: 'confirmed' },
  { scheduledCallId: 'mock-s2', title: 'Smart Contract Debugging', scheduledAt: new Date(2026, 2, 18, 14, 30).toISOString(), durationMinutes: 30, devrel: 'Bob', status: 'pending' },
];

const NOW = new Date();
const CUR_MONTH = NOW.getMonth();
const CUR_YEAR = NOW.getFullYear();
const MONTH_LABEL = NOW.toLocaleString('default', { month: 'long', year: 'numeric' });
const DAYS_IN_MONTH = new Date(CUR_YEAR, CUR_MONTH + 1, 0).getDate();
const TODAY = NOW.getDate();

export function CalendarView() {
  const { address, userId } = useAuth();
  const [selectedDate, setSelectedDate] = useState<number>(TODAY);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledCalls, setScheduledCalls] = useState<ScheduledCall[]>(MOCK_SCHEDULED);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formTopic, setFormTopic] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formDuration, setFormDuration] = useState(30);

  const loadScheduled = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/scheduled-calls?address=${address}&status=pending&status=confirmed`);
      if (res.ok) {
        const { calls } = await res.json();
        setScheduledCalls(calls.length > 0 ? calls : MOCK_SCHEDULED);
      }
    } catch {
      // keep mock
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) loadScheduled();
  }, [address, loadScheduled]);

  const handleSchedule = async () => {
    if (!formTitle || !formDate || !formTime) return;
    if (!address || !userId) {
      // Simulate locally for unauthenticated users
      const fake: ScheduledCall = {
        scheduledCallId: `mock-${Date.now()}`,
        title: formTitle,
        topic: formTopic,
        scheduledAt: new Date(`${formDate}T${formTime}`).toISOString(),
        durationMinutes: formDuration,
        status: 'pending',
      };
      setScheduledCalls(prev => [...prev, fake]);
      setShowScheduleModal(false);
      resetForm();
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/scheduled-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          address,
          title: formTitle,
          topic: formTopic,
          scheduledAt: new Date(`${formDate}T${formTime}`).toISOString(),
          durationMinutes: formDuration,
        }),
      });
      if (res.ok) {
        const { call } = await res.json();
        setScheduledCalls(prev => [...prev, call]);
      }
    } catch (e) {
      console.error('Failed to schedule call:', e);
    } finally {
      setIsSaving(false);
      setShowScheduleModal(false);
      resetForm();
    }
  };

  const handleCancel = async (id: string) => {
    // Optimistic UI
    setScheduledCalls(prev => prev.map(c => c.scheduledCallId === id ? { ...c, status: 'cancelled' } : c));
    try {
      await fetch(`/api/scheduled-calls/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to cancel:', e);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormTopic('');
    setFormDate('');
    setFormTime('');
    setFormDuration(30);
  };

  const activeCalls = scheduledCalls.filter(c => c.status !== 'cancelled');

  const callsOnSelectedDay = activeCalls.filter(c => {
    const d = new Date(c.scheduledAt);
    return d.getDate() === selectedDate && d.getMonth() === CUR_MONTH && d.getFullYear() === CUR_YEAR;
  });

  function statusBadge(status: string) {
    if (status === 'confirmed') return <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">Confirmed</span>;
    if (status === 'completed') return <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/20">Completed</span>;
    return <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/20">Pending</span>;
  }

  return (
    <div className="flex h-full w-full bg-zinc-950 text-white p-4 sm:p-8 flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 shrink-0">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-indigo-500" />
          Scheduled Calls
        </h1>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          Schedule New Call
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden custom-scrollbar">
        {/* Calendar Grid */}
        <div className="w-full lg:w-96 bg-zinc-900 border border-white/10 rounded-2xl p-6 flex flex-col shrink-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">{MONTH_LABEL}</h2>
            {isLoading && <span className="text-xs text-zinc-500 animate-pulse">Loading…</span>}
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-sm mb-2 text-zinc-500 font-medium">
            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
          </div>
          <div className="grid grid-cols-7 gap-2 text-sm">
            {Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1).map(day => {
              const hasCall = activeCalls.some(c => {
                const d = new Date(c.scheduledAt);
                return d.getDate() === day && d.getMonth() === CUR_MONTH && d.getFullYear() === CUR_YEAR;
              });
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-colors ${
                    selectedDate === day
                      ? 'bg-indigo-500 text-white font-bold'
                      : day === TODAY
                        ? 'text-indigo-300 ring-1 ring-indigo-500/40'
                        : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {day}
                  {hasCall && (
                    <div className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${selectedDate === day ? 'bg-white' : 'bg-indigo-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Details */}
        <div className="flex-1 bg-zinc-900 border border-white/10 rounded-2xl p-6 overflow-y-auto custom-scrollbar">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            {MONTH_LABEL.split(' ')[0]} {selectedDate}, {CUR_YEAR}
          </h2>

          <div className="space-y-4">
            {callsOnSelectedDay.length > 0 ? (
              callsOnSelectedDay.map(call => (
                <div key={call.scheduledCallId} className="bg-zinc-950 border border-white/10 rounded-xl p-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        <Video className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{call.title}</h3>
                          {statusBadge(call.status)}
                        </div>
                        <p className="text-zinc-400 text-sm flex items-center gap-2 mt-1">
                          <Clock className="w-4 h-4" />
                          {new Date(call.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' · '}{call.durationMinutes} min
                          {call.devrel ? ` · with DevRel ${call.devrel}` : ''}
                        </p>
                        {call.topic && <p className="text-zinc-500 text-sm mt-0.5">{call.topic}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Join
                      </button>
                      <button
                        onClick={() => handleCancel(call.scheduledCallId)}
                        className="p-2 rounded-lg bg-zinc-800 hover:bg-red-900/40 hover:text-red-400 transition-colors"
                        title="Cancel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-zinc-500 py-12">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No calls scheduled for this day.</p>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1 mx-auto transition-colors"
                >
                  <Plus className="w-4 h-4" /> Schedule one now
                </button>
              </div>
            )}
          </div>

          {/* Upcoming calls summary */}
          {activeCalls.length > 0 && (
            <div className="mt-8 pt-6 border-t border-white/5">
              <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> All Upcoming ({activeCalls.length})
              </h3>
              <div className="space-y-2">
                {activeCalls.slice(0, 5).map(c => (
                  <div key={c.scheduledCallId} className="flex items-center justify-between text-sm text-zinc-400 px-2 py-1 rounded hover:bg-zinc-800/50">
                    <span className="truncate">{c.title}</span>
                    <span className="shrink-0 ml-4 text-zinc-500">
                      {new Date(c.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Schedule New Call</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="What do you need help with?"
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Topic (optional)</label>
                <input
                  type="text"
                  value={formTopic}
                  onChange={e => setFormTopic(e.target.value)}
                  placeholder="e.g. Smart contract, AA, Paymaster…"
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Date *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Time *</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={e => setFormTime(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Duration</label>
                <select
                  value={formDuration}
                  onChange={e => setFormDuration(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => { setShowScheduleModal(false); resetForm(); }} className="px-4 py-2 rounded-lg font-medium text-zinc-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                disabled={isSaving || !formTitle || !formDate || !formTime}
                className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isSaving ? 'Saving…' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
