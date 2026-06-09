import { useState, useRef, useEffect, ReactNode } from 'react';
import { Send, Sparkles, MessageSquare, Loader2, Bot, User, Trash2 } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface InsightsChatProps {
  groupId: string;
  token: string | null;
  onRefreshGroup?: () => void;
}

// Simple bulletproof helper to render Markdown safely without heavy package dependencies
function CustomMarkdownRenderer({ text }: { text: string }) {
  const parseMarkdown = (raw: string) => {
    // Split into lines for list/heading parser
    const lines = raw.split('\n');
    let inList = false;
    const listBuffer: ReactNode[] = [];
    const elements: ReactNode[] = [];

    lines.forEach((line, idx) => {
      let cleanLine = line.trim();

      // Heading 3
      if (cleanLine.startsWith('###')) {
        if (inList) {
          elements.push(<ul key={`list-${idx}`} className="list-disc list-inside ml-4 space-y-1 my-2 text-charcoal">{...listBuffer}</ul>);
          listBuffer.length = 0;
          inList = false;
        }
        elements.push(
          <h4 key={`h3-${idx}`} className="text-sm font-bold text-obsidian mt-4 mb-2 font-display">
            {cleanLine.replace('###', '').trim()}
          </h4>
        );
        return;
      }

      // Heading 2
      if (cleanLine.startsWith('##')) {
        if (inList) {
          elements.push(<ul key={`list-${idx}`} className="list-disc list-inside ml-4 space-y-1 my-2 text-charcoal">{...listBuffer}</ul>);
          listBuffer.length = 0;
          inList = false;
        }
        elements.push(
          <h3 key={`h2-${idx}`} className="text-base font-bold text-obsidian mt-4 mb-2 font-display border-b border-forest-ink/10 pb-1">
            {cleanLine.replace('##', '').trim()}
          </h3>
        );
        return;
      }

      // Bullet points
      if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
        inList = true;
        const bulletText = cleanLine.substring(2);
        listBuffer.push(
          <li key={`li-${idx}`} className="text-xs leading-relaxed text-charcoal">
            {renderBoldText(bulletText)}
          </li>
        );
        return;
      }

      // Non-bullet, close list if any
      if (inList) {
        elements.push(<ul key={`list-${idx}`} className="list-disc list-inside ml-4 space-y-1.5 my-2 text-charcoal">{...listBuffer}</ul>);
        listBuffer.length = 0;
        inList = false;
      }

      if (cleanLine === '') {
        elements.push(<div key={`space-${idx}`} className="h-2" />);
      } else {
        elements.push(
          <p key={`p-${idx}`} className="text-xs leading-relaxed text-charcoal my-1">
            {renderBoldText(cleanLine)}
          </p>
        );
      }
    });

    if (inList) {
      elements.push(<ul key={`list-end`} className="list-disc list-inside ml-4 space-y-1 my-2 text-charcoal">{...listBuffer}</ul>);
    }

    return elements;
  };

  const renderBoldText = (txt: string) => {
    // Match **text**
    const parts = txt.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-bold text-obsidian bg-forest-ink/5 px-1 py-0.5 rounded font-mono">{part}</strong>;
      }
      return part;
    });
  };

  return <div className="space-y-1">{parseMarkdown(text)}</div>;
}

export function InsightsChat({ groupId, token, onRefreshGroup }: InsightsChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I am your **FairShare AI Assistant**. I can help you analyze your expense data, list who paid the most, identify your top expense categories, or explain the optimal settlement path in plain language!\n\nTry asking me: \n- *Who spent the most this trip?*\n- *Which category dominates our spending?*\n- *Explain our debt settlement strategy!*"
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    const query = textToSend.trim();
    if (!query) return;

    // Append user query
    const updatedMsgs = [...messages, { role: 'user', content: query } as ChatMessage];
    setMessages(updatedMsgs);
    setInputVal('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          groupId: groupId,
          query: query,
          messageHistory: messages.slice(-10) // last 10 messages of context
        })
      });

      if (!response.ok) {
        throw new Error('Analyst experienced an issue');
      }

      const resJSON = await response.json();
      setMessages([...updatedMsgs, { role: 'assistant', content: resJSON.reply }]);
    } catch (err: any) {
      setMessages([...updatedMsgs, {
        role: 'assistant',
        content: "I apologize, but I encountered a processing error while fetching your group analysis. Please confirm your API key and network bounds."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Chat cleared successfully! Ask me any questions about your group's bills, shares or optimal financial settlement details."
      }
    ]);
  };

  const handleQuickQuestion = (q: string) => {
    if (loading) return;
    handleSend(q);
  };

  return (
    <div className="bg-fog rounded-[10px] flex flex-col h-[520px] border border-forest-ink/10 overflow-hidden">
      {/* Header */}
      <div className="bg-paper border-b border-forest-ink/10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-forest-ink rounded-[10px] text-lime-voltage">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-sans text-xs font-bold text-obsidian uppercase tracking-wider flex items-center gap-1.5">
              Financial Co-Pilot
              <span className="text-[9px] font-mono font-bold bg-linen-mist text-forest-ink border border-forest-ink/15 px-1.5 py-0.5 rounded uppercase tracking-wider">
                Ledger AI
              </span>
            </h3>
            <p className="text-[10px] text-slate font-sans">Gemini live analyst answers about your group ledger</p>
          </div>
        </div>

        <button
          onClick={handleClear}
          title="Clear Conversation"
          className="p-1.5 hover:bg-fog rounded-lg text-slate hover:text-alarm-red transition cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-paper">
        {messages.map((msg, idx) => {
          const isBot = msg.role === 'assistant';
          return (
            <div key={idx} className={`flex gap-3 max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                isBot ? 'bg-linen-mist border-forest-ink/15 text-forest-ink' : 'bg-fog border-forest-ink/10 text-obsidian'
              }`}>
                {isBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              </div>

              <div className={`p-3.5 rounded-[10px] border text-xs leading-relaxed ${
                isBot 
                  ? 'bg-fog border-forest-ink/5 text-charcoal rounded-tl-none text-left' 
                  : 'bg-forest-ink border-forest-ink/10 text-white rounded-tr-none text-left'
              }`}>
                <CustomMarkdownRenderer text={msg.content} />
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 max-w-[80%] mr-auto items-center">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border bg-linen-mist border-forest-ink/20 text-forest-ink">
              <Bot className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="bg-fog border border-forest-ink/5 p-3 rounded-[10px] rounded-tl-none flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-forest-ink animate-spin" />
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate animate-pulse">Running financial analysis...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Quick suggestions presets */}
      <div className="px-4 py-2.5 border-t border-forest-ink/10 bg-fog flex flex-wrap gap-2">
        <button
          onClick={() => handleQuickQuestion("Who spent the most money overall?")}
          className="text-[10px] font-bold bg-paper hover:bg-linen-mist border border-forest-ink/10 px-2.5 py-1 rounded-full text-forest-ink transition cursor-pointer"
          disabled={loading}
        >
          🔍 Who paid most?
        </button>
        <button
          onClick={() => handleQuickQuestion("Summarize category expenses in bullet points")}
          className="text-[10px] font-bold bg-paper hover:bg-linen-mist border border-forest-ink/10 px-2.5 py-1 rounded-full text-forest-ink transition cursor-pointer"
          disabled={loading}
        >
          📂 Category breakdown
        </button>
        <button
          onClick={() => handleQuickQuestion("Explain who needs to pay whom via UPI or bank transfers")}
          className="text-[10px] font-bold bg-paper hover:bg-linen-mist border border-forest-ink/10 px-2.5 py-1 rounded-full text-forest-ink transition cursor-pointer"
          disabled={loading}
        >
          💡 Settle recommendations
        </button>
      </div>

      {/* Footer input form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputVal);
        }}
        className="p-3 bg-paper border-t border-forest-ink/10 flex gap-2"
      >
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Ask analytical questions..."
          className="flex-1 bg-paper border border-forest-ink/15 rounded-[10px] px-3 py-2 text-xs text-obsidian placeholder-slate focus:outline-none focus:ring-1 focus:ring-forest-ink"
          disabled={loading}
        />
        <button
          type="submit"
          className="p-2.5 bg-lime-voltage hover:opacity-90 disabled:opacity-40 text-forest-ink dark:text-spruce rounded-full transition shrink-0 cursor-pointer flex items-center justify-center min-w-[36px]"
          disabled={loading || !inputVal.trim()}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
