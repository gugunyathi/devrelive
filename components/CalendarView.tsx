import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, Video, Phone } from 'lucide-react';

export function CalendarView() {
  const [selectedDate, setSelectedDate] = useState<number>(15);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const scheduledCalls = [
    { id: 1, title: "Base Account Integration Help", date: 15, time: "10:00 AM", devrel: "Alice" },
    { id: 2, title: "Smart Contract Debugging", date: 18, time: "2:30 PM", devrel: "Bob" },
  ];

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
            <h2 className="text-xl font-semibold">March 2026</h2>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-sm mb-2 text-zinc-500 font-medium">
            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
          </div>
          <div className="grid grid-cols-7 gap-2 text-sm">
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
              const hasCall = scheduledCalls.some(c => c.date === day);
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-colors ${
                    selectedDate === day 
                      ? 'bg-indigo-500 text-white font-bold' 
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
            Schedule for March {selectedDate}, 2026
          </h2>

          <div className="space-y-4">
            {scheduledCalls.filter(c => c.date === selectedDate).length > 0 ? (
              scheduledCalls.filter(c => c.date === selectedDate).map(call => (
                <div key={call.id} className="bg-zinc-950 border border-white/10 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{call.title}</h3>
                      <p className="text-zinc-400 text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4" /> {call.time} • with DevRel {call.devrel}
                      </p>
                    </div>
                  </div>
                  <button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shrink-0">
                    <Phone className="w-4 h-4" />
                    Join Call
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center text-zinc-500 py-12">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No calls scheduled for this day.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4">Schedule New Call</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Topic</label>
                <input type="text" placeholder="What do you need help with?" className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Date</label>
                  <input type="date" className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Time</label>
                  <input type="time" className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 rounded-lg font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
