'use client';

/**
 * PaymentGate — modal that gates an action behind a Base Pay USDC payment.
 *
 * Usage:
 *   <PaymentGate
 *     open={showGate}
 *     amount="2.00"
 *     title="AI Repair"
 *     description="One AI-powered repair session"
 *     purpose="repair"
 *     userAddress={address}
 *     onSuccess={() => { setShowGate(false); startRepair(); }}
 *     onClose={() => setShowGate(false)}
 *   />
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertCircle, Loader2, DollarSign } from 'lucide-react';
import { requestPayment } from '@/lib/payments';

interface PaymentGateProps {
  open: boolean;
  amount: string;           // USD string e.g. "2.00"
  title: string;
  description: string;
  purpose: string;          // 'repair' | 'call' etc — stored server-side
  userAddress: string | null;
  onSuccess: () => void;
  onClose: () => void;
}

type Stage = 'idle' | 'paying' | 'verifying' | 'success' | 'error';

export function PaymentGate({
  open,
  amount,
  title,
  description,
  purpose,
  userAddress,
  onSuccess,
  onClose,
}: PaymentGateProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const reset = () => {
    setStage('idle');
    setErrorMsg('');
  };

  const handleClose = () => {
    if (stage === 'paying' || stage === 'verifying') return; // prevent dismiss during flow
    reset();
    onClose();
  };

  const handlePay = async () => {
    if (!userAddress) {
      setErrorMsg('Please sign in before making a payment.');
      setStage('error');
      return;
    }

    try {
      setStage('paying');
      const { id: txId } = await requestPayment(amount);

      setStage('verifying');
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txId, purpose, userAddress }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Verification failed');
      }

      setStage('success');
      // Brief moment to show the success tick, then proceed
      setTimeout(() => {
        reset();
        onSuccess();
      }, 900);
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 12 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-white/8">
              <div>
                <h3 className="text-white font-semibold text-base">{title}</h3>
                <p className="text-zinc-400 text-sm mt-0.5">{description}</p>
              </div>
              <button
                onClick={handleClose}
                disabled={stage === 'paying' || stage === 'verifying'}
                className="text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors ml-3 mt-0.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Amount */}
            <div className="px-5 pt-5 pb-2">
              <div className="flex items-center justify-between bg-zinc-800/60 border border-white/8 rounded-xl px-4 py-3">
                <span className="text-zinc-400 text-sm">Amount</span>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span className="text-white font-bold text-lg">{amount}</span>
                  <span className="text-zinc-500 text-sm font-medium">USDC</span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 pb-5 pt-3 space-y-3">
              {stage === 'error' && (
                <div className="flex items-start gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {stage === 'success' ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Payment confirmed!</span>
                </div>
              ) : (
                <button
                  onClick={handlePay}
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
                      {/* Base Pay wordmark — blue square dot */}
                      <div className="w-4 h-4 bg-white rounded-sm shrink-0" />
                      Pay with Base
                    </>
                  )}
                </button>
              )}

              <p className="text-center text-zinc-600 text-xs">
                Powered by Base Pay · USDC on Base · No fees
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
