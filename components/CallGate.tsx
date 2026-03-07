'use client';

/**
 * CallGate — modal shown before a call starts.
 *
 * Rules:
 *  - 1 free call per 24h (FREE_DURATION_SECS = 3 min).
 *  - Paid tiers: $1 → 5 min, $2 → 10 min, $3 → 15 min, $4 → 20 min.
 *
 * Calls onStart(maxDurationSecs) when the user is cleared to go.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, Gift, Clock, DollarSign, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { hasFreeCallAvailable, consumeFreeCall } from '@/lib/call-credits';
import { requestPayment } from '@/lib/payments';

export const FREE_DURATION_SECS = 3 * 60;   // 3 minutes

export const PAID_TIERS: { amount: string; label: string; durationSecs: number }[] = [
  { amount: '1.00', label: '$1', durationSecs: 5 * 60 },
  { amount: '2.00', label: '$2', durationSecs: 10 * 60 },
  { amount: '3.00', label: '$3', durationSecs: 15 * 60 },
  { amount: '4.00', label: '$4', durationSecs: 20 * 60 },
];

interface CallGateProps {
  open: boolean;
  channelName: string;
  userAddress: string | null;
  onStart: (maxDurationSecs: number) => void;
  onClose: () => void;
}

type Stage = 'idle' | 'paying' | 'verifying' | 'error';

export function CallGate({ open, channelName, userAddress, onStart, onClose }: CallGateProps) {
  const [freeAvailable, setFreeAvailable] = useState(false);
  const [selectedTier, setSelectedTier] = useState<typeof PAID_TIERS[number] | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Re-check free credit whenever the modal opens
  useEffect(() => {
    if (open && userAddress) {
      setFreeAvailable(hasFreeCallAvailable(userAddress));
      setSelectedTier(null);
      setStage('idle');
      setErrorMsg('');
    }
  }, [open, userAddress]);

  const handleClose = () => {
    if (stage === 'paying' || stage === 'verifying') return;
    setStage('idle');
    setErrorMsg('');
    onClose();
  };

  const handleFreeCall = () => {
    if (!userAddress) return;
    consumeFreeCall(userAddress);
    onStart(FREE_DURATION_SECS);
  };

  const handlePaidCall = async () => {
    if (!selectedTier || !userAddress) return;

    try {
      setStage('paying');
      const { id: txId } = await requestPayment(selectedTier.amount);

      setStage('verifying');
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txId, purpose: 'call', userAddress }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Verification failed');
      }

      setStage('idle');
      onStart(selectedTier.durationSecs);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMsg(e?.message ?? 'Payment failed. Please try again.');
      setStage('error');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.2 }}
            className="relative w-full sm:max-w-sm bg-zinc-900 border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base leading-tight">Start Call</h3>
                  <p className="text-zinc-400 text-xs mt-0.5">{channelName}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={stage === 'paying' || stage === 'verifying'}
                className="text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Error */}
              {stage === 'error' && (
                <div className="flex items-start gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Free call option */}
              {freeAvailable && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Free call today</p>
                  <button
                    onClick={handleFreeCall}
                    disabled={stage === 'paying' || stage === 'verifying'}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Gift className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-white text-sm">Free Call</p>
                      <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 3 minutes · resets daily
                      </p>
                    </div>
                    <div className="text-emerald-400 font-bold text-sm shrink-0">FREE</div>
                  </button>
                </div>
              )}

              {/* Paid tiers */}
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  {freeAvailable ? 'Or buy extended time' : 'Choose call duration'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PAID_TIERS.map(tier => {
                    const isSelected = selectedTier?.amount === tier.amount;
                    const mins = tier.durationSecs / 60;
                    return (
                      <button
                        key={tier.amount}
                        onClick={() => setSelectedTier(tier)}
                        disabled={stage === 'paying' || stage === 'verifying'}
                        className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                            : 'bg-zinc-800/60 border-white/8 text-zinc-300 hover:bg-zinc-800 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <DollarSign className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-zinc-400'}`} />
                          <span className="font-bold text-lg leading-none">{parseFloat(tier.amount).toFixed(0)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-zinc-400">
                          <Clock className="w-3 h-3" />
                          {mins} min
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pay CTA */}
              {selectedTier && (
                <button
                  onClick={handlePaidCall}
                  disabled={stage === 'paying' || stage === 'verifying'}
                  className="w-full flex items-center justify-center gap-2.5 bg-[#0000FF] hover:bg-blue-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {stage === 'paying' || stage === 'verifying' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {stage === 'paying' ? 'Awaiting payment…' : 'Verifying…'}
                    </>
                  ) : (
                    <>
                      <div className="w-4 h-4 bg-white rounded-sm shrink-0" />
                      Pay {selectedTier.label} with Base
                    </>
                  )}
                </button>
              )}

              <p className="text-center text-zinc-600 text-xs">
                {freeAvailable ? '1 free call available · ' : ''}Paid calls via Base Pay · USDC · No fees
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
