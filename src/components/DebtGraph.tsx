import React from 'react';
import { SimplifiedDebt } from '../types';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface DebtGraphProps {
  debts: SimplifiedDebt[];
  baseCurrency: string;
  onQuickSettle?: (debt: SimplifiedDebt) => void;
  onPingRequest?: (debt: SimplifiedDebt) => void;
  currentUserId?: string;
}

export function DebtGraph({ debts, baseCurrency, onQuickSettle, onPingRequest, currentUserId }: DebtGraphProps) {
  const getCurrencySymbol = (code: string) => {
    switch (code) {
      case 'EUR': return '€';
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'GBP': return '£';
      default: return code;
    }
  };

  const symbol = getCurrencySymbol(baseCurrency);

  return (
    <div className="bg-fog rounded-[10px] p-6 border border-forest-ink/5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-sans text-[15px] font-bold text-obsidian flex items-center gap-2 tracking-tight">
            <Sparkles className="w-4 h-4 text-forest-ink" />
            Minimization Ledger
          </h3>
          <p className="text-[10px] text-slate mt-0.5 font-sans">Automated optimal math models grouping your transaction counts</p>
        </div>
        <span className="text-[9px] uppercase tracking-wider font-extrabold bg-linen-mist text-forest-ink py-1 px-2.5 rounded-full border border-forest-ink/10">
          Optimal Path
        </span>
      </div>

      <div className="space-y-3">
        {debts.map((debt, idx) => {
          return (
            <div
              key={idx}
              className="p-4 bg-paper rounded-[10px] border border-forest-ink/5 hover:border-forest-ink/12 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Debtors flow representation */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* From user */}
                <div className="flex flex-col items-center min-w-[70px]">
                  <img
                    src={debt.from_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${debt.from_name}`}
                    alt={debt.from_name}
                    className="w-8.5 h-8.5 rounded-full border border-alarm-red/20 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${debt.from_name}`;
                    }}
                  />
                  <span className="text-[11px] text-obsidian font-bold truncate max-w-20 mt-1">{debt.from_name.split(' ')[0]}</span>
                  <span className="text-[8px] text-alarm-red font-bold uppercase tracking-wider bg-alarm-red/5 px-1.5 py-0.5 rounded mt-0.5">Debtor</span>
                </div>

                {/* Arrow & middle amount */}
                <div className="flex-1 flex flex-col items-center justify-center px-1 min-w-12">
                  <div className="text-center font-bold text-xs font-mono text-forest-ink bg-linen-mist px-2.5 py-1 rounded-[10px] border border-forest-ink/5 shadow-sm">
                    {symbol}{debt.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="relative w-full flex items-center justify-center mt-2.5">
                    <div className="absolute inset-x-0 h-[1.5px] bg-forest-ink/10"></div>
                    <ArrowRight className="w-3.5 h-3.5 text-forest-ink relative z-10" />
                  </div>
                </div>

                {/* To user */}
                <div className="flex flex-col items-center min-w-[70px]">
                  <img
                    src={debt.to_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${debt.to_name}`}
                    alt={debt.to_name}
                    className="w-8.5 h-8.5 rounded-full border border-forest-ink/20 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${debt.to_name}`;
                    }}
                  />
                  <span className="text-[11px] text-obsidian font-bold truncate max-w-20 mt-1">{debt.to_name.split(' ')[0]}</span>
                  <span className="text-[8px] text-forest-ink font-bold uppercase tracking-wider bg-linen-mist px-1.5 py-0.5 rounded mt-0.5">Creditor</span>
                </div>
              </div>

              {/* Action settling trigger */}
              <div className="flex items-center justify-end gap-2 shrink-0 md:ml-4">
                {onPingRequest && (
                  <button
                    type="button"
                    onClick={() => onPingRequest(debt)}
                    disabled={currentUserId !== debt.to_user_id}
                    className={`py-1.5 px-3.5 border text-[10px] font-bold tracking-wider uppercase rounded-full transition-all flex items-center justify-center ${
                      currentUserId === debt.to_user_id
                        ? "bg-paper hover:bg-fog border-forest-ink/20 text-forest-ink cursor-pointer"
                        : "bg-paper border-pebble/10 text-slate opacity-40 cursor-not-allowed"
                    }`}
                    title={
                      currentUserId !== debt.to_user_id
                        ? "Only the creditor can ping for settlement"
                        : "Send an in-app ping to request settlement"
                    }
                  >
                    Ping
                  </button>
                )}
                {onQuickSettle && (
                  <button
                    type="button"
                    onClick={() => onQuickSettle(debt)}
                    disabled={currentUserId !== debt.from_user_id}
                    className={`py-1.5 px-4 text-[10px] font-bold tracking-wider uppercase rounded-full transition-all flex items-center justify-center gap-1 ${
                      currentUserId === debt.from_user_id
                        ? "bg-lime-voltage hover:opacity-90 text-forest-ink dark:text-spruce border border-forest-ink/15 cursor-pointer"
                        : "bg-paper border border-pebble/10 text-slate opacity-40 cursor-not-allowed"
                    }`}
                    title={
                      currentUserId !== debt.from_user_id
                        ? "Only the debtor can settle their due payment"
                        : "Click to record payment settlement"
                    }
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-current" />
                    Settle
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {debts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-paper border border-dashed border-forest-ink/10 rounded-[10px] p-4">
            <CheckCircle2 className="w-9 h-9 text-forest-ink mb-2" />
            <h4 className="text-obsidian font-bold text-xs tracking-tight">Everyone is fully settled!</h4>
            <p className="text-[11px] text-slate max-w-xs mt-1">No outstanding balances or pending transactions found in this ledger.</p>
          </div>
        )}
      </div>
    </div>
  );
}
