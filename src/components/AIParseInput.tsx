import React, { useState } from 'react';
import { Cpu, Loader2, AlertCircle } from 'lucide-react';

interface AIParseInputProps {
  groupId: string;
  onParsed: (data: {
    title: string;
    amount: number;
    currency: string;
    paid_by_id: string;
    split_type: 'equal' | 'percentage' | 'custom' | 'shares';
    participants: string[];
  }) => void;
  token: string | null;
}

export function AIParseInput({ groupId, onParsed, token }: AIParseInputProps) {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/parse-expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: inputText,
          groupId: groupId
        })
      });

      if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.error || 'Server parsing error');
      }

      const parsedJSON = await response.json();
      onParsed(parsedJSON);
      setInputText(''); // Clear input after fill success
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'AI could not comprehend. Please write clearly or fill manually.');
    } finally {
      setLoading(false);
    }
  };

  const setSuggestion = (text: string) => {
    setInputText(text);
  };

  return (
    <div className="bg-fog p-5 rounded-[10px] border border-forest-ink/10">
      <div className="flex items-center gap-2 mb-2">
        <Cpu className="w-4 h-4 text-forest-ink" />
        <span className="text-xs font-bold text-obsidian tracking-wide uppercase">Intelligent AI Prompt Filler</span>
      </div>
      <p className="text-[11px] text-charcoal mb-4 block leading-relaxed font-sans">
        Type what you bought, who paid, and who shares it. Gemini parses in real-time to pre-fill the form below:
      </p>

      <div className="relative">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="E.g., Priya paid €90 for Florence Train tickets split equal between her, me, and Rahul..."
          className="w-full h-24 bg-paper border border-forest-ink/15 rounded-[10px] p-3 text-xs text-obsidian focus:outline-none focus:ring-1 focus:ring-forest-ink placeholder-pebble resize-none pr-3"
          disabled={loading}
        />

        <div className="absolute right-2 bottom-2">
          <button
            type="button"
            onClick={handleParse}
            disabled={loading || !inputText.trim()}
            className="px-4 py-1.5 bg-forest-ink dark:bg-lime-voltage hover:opacity-90 disabled:opacity-40 text-[10px] uppercase tracking-wider font-extrabold text-white dark:text-spruce rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-sm animate-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-voltage dark:text-spruce" />
                Thinking...
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-lime-voltage dark:text-spruce" strokeWidth={2.5} />
                Parse Entry
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-1.5 p-2.5 rounded-[10px] bg-alarm-red/10 text-alarm-red border border-alarm-red/20 text-[11px] select-none">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Suggested quick presets */}
      <div className="mt-4">
        <span className="text-[9px] uppercase font-bold text-slate tracking-widest">Try writing:</span>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSuggestion("Dinner at Pizza Hut €120, split equal between me, Priya and Rahul")}
            className="text-[10px] font-bold bg-paper hover:bg-linen-mist border border-forest-ink/10 px-2.5 py-1.5 rounded-full text-forest-ink transition cursor-pointer"
          >
            "Pizza Hut dinner equal..."
          </button>
          <button
            type="button"
            onClick={() => setSuggestion("I paid €450 for Rome Airbnb, split between Priya and me equal")}
            className="text-[10px] font-bold bg-paper hover:bg-linen-mist border border-forest-ink/10 px-2.5 py-1.5 rounded-full text-forest-ink transition cursor-pointer"
          >
            "Alex paid Rome Airbnb equal..."
          </button>
          <button
            type="button"
            onClick={() => setSuggestion("Rahul paid €30 for Florentine Gelato, Priya gets 50% and Rahul gets 50%")}
            className="text-[10px] font-bold bg-paper hover:bg-linen-mist border border-forest-ink/10 px-2.5 py-1.5 rounded-full text-forest-ink transition cursor-pointer"
          >
            "Rahul paid Gelato percentage..."
          </button>
        </div>
      </div>
    </div>
  );
}
