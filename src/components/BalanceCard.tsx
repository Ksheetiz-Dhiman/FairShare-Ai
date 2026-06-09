import React from 'react';
import { ParticipantBalance } from '../types';
import { ArrowUpRight, ArrowDownLeft, Landmark } from 'lucide-react';

interface BalanceCardProps {
  balances: ParticipantBalance[];
  baseCurrency: string;
}

export function BalanceCard({ balances, baseCurrency }: BalanceCardProps) {
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
        <h3 className="font-sans text-[15px] font-bold text-obsidian flex items-center gap-2 tracking-tight">
          <Landmark className="w-4 h-4 text-forest-ink" />
          Balances Registry
        </h3>
        <span className="text-[10px] text-slate font-mono uppercase tracking-wider bg-linen-mist px-2.5 py-1 rounded-full font-bold text-forest-ink">
          BASE: {baseCurrency}
        </span>
      </div>

      <div className="space-y-3.5">
        {balances.map((b) => {
          const isCreditor = b.net_balance > 0.01;
          const isDebtor = b.net_balance < -0.01;
          const statusText = isCreditor 
            ? 'is owed' 
            : isDebtor 
              ? 'owes money' 
              : 'fully settled';

          return (
            <div 
              key={b.user_id} 
              className="flex flex-col p-4 bg-paper rounded-[10px] border border-forest-ink/5 hover:border-forest-ink/15 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={b.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${b.name}`}
                    alt={b.name}
                    className="w-8.5 h-8.5 rounded-full object-cover border-2 border-forest-ink/10"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${b.name}`;
                    }}
                  />
                  <div>
                    <h4 className="font-bold text-[13px] text-obsidian leading-snug">{b.name}</h4>
                    <span className="text-[10px] text-slate font-mono">{b.email}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-sm font-bold font-mono flex items-center justify-end gap-0.5 ${
                    isCreditor ? 'text-forest-ink' : isDebtor ? 'text-alarm-red' : 'text-slate'
                  }`}>
                    {isCreditor && <ArrowUpRight className="w-3.5 h-3.5 text-forest-ink" />}
                    {isDebtor && <ArrowDownLeft className="w-3.5 h-3.5 text-alarm-red" />}
                    {symbol}{Math.abs(b.net_balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full mt-1 inline-block ${
                    isCreditor 
                      ? 'bg-linen-mist text-forest-ink' 
                      : isDebtor 
                        ? 'bg-alarm-red/10 text-alarm-red' 
                        : 'bg-fog text-slate'
                  }`}>
                    {statusText}
                  </span>
                </div>
              </div>

              {/* Progress metrics */}
              <div className="mt-3.5 pt-3 border-t border-forest-ink/5 grid grid-cols-2 gap-4 text-[10px] text-slate font-mono">
                <div>
                  <span className="text-pebble block uppercase tracking-wider text-[9px]">Total Spend:</span>
                  <span className="font-bold text-obsidian">{symbol}{b.total_paid.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-pebble block uppercase tracking-wider text-[9px]">Actual Share:</span>
                  <span className="font-bold text-obsidian">{symbol}{b.total_share.toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })}

        {balances.length === 0 && (
          <div className="text-center py-6 text-pebble text-xs">
            No active members have logged splits yet.
          </div>
        )}
      </div>
    </div>
  );
}
