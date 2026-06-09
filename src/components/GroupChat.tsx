import { useState, useRef, useEffect, FormEvent } from 'react';
import { Send, MessageSquare, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: string;
  group_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  message: string;
  created_at: string;
}

interface GroupChatProps {
  groupId: string;
  token: string | null;
  currentUser: { id: string; name: string; avatar_url?: string; email: string } | null;
  messages: ChatMessage[];
  onSendMessage: (msg: string) => Promise<void>;
}

export function GroupChat({ groupId, token, currentUser, messages, onSendMessage }: GroupChatProps) {
  const [typedMessage, setTypedMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages list grows
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const cleanMsg = typedMessage.trim();
    if (!cleanMsg || sending) return;

    setSending(true);
    try {
      await onSendMessage(cleanMsg);
      setTypedMessage('');
    } catch (err) {
      console.error('Failed to dispatch peer chat message:', err);
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Helper to highlight @username tag mentions in messages
  const renderMessageContent = (msg: ChatMessage) => {
    const text = msg.message;
    if (!currentUser) return text;

    const myFirstName = currentUser.name.split(' ')[0].toLowerCase();
    const myFullName = currentUser.name.toLowerCase();

    // Splitting tags by spaces or common delimiter
    const words = text.split(/(\s+)/);
    return words.map((word, index) => {
      const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
      // If matches @username/firstname
      if (cleanWord.startsWith('@') && (cleanWord.includes(myFirstName) || cleanWord.includes(myFullName))) {
        return (
          <span 
            key={index} 
            className="px-1.5 py-0.5 rounded bg-lime-voltage text-forest-ink dark:text-spruce font-bold font-sans border border-forest-ink/10 shadow-sm"
          >
            {word}
          </span>
        );
      } else if (word.toLowerCase().startsWith('@')) {
        // Tagging someone else
        return (
          <span 
            key={index} 
            className="text-forest-ink font-bold font-sans"
          >
            {word}
          </span>
        );
      }
      return word;
    });
  };

  return (
    <div className="bg-fog rounded-[10px] border border-forest-ink/10 overflow-hidden flex flex-col h-[420px]">
      {/* Mini-Header */}
      <div className="px-4 py-3 bg-paper border-b border-forest-ink/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-forest-ink" />
          <span className="font-sans font-bold text-[11px] uppercase tracking-wider text-obsidian">
            Trip Chat Room
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-forest-ink animate-pulse"></span>
          <span className="text-[9px] font-mono font-bold text-slate uppercase tracking-wider">LIVE CHANNEL</span>
        </div>
      </div>

      {/* Messages viewport */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-forest-ink/15 bg-paper"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2.5 opacity-80">
            <div className="p-3 rounded-full bg-linen-mist">
              <Sparkles className="w-5 h-5 text-forest-ink" />
            </div>
            <p className="text-xs text-charcoal leading-relaxed max-w-[240px]">
              No messages shared yet in this trip. Mention colleagues using <span className="text-forest-ink font-mono font-bold">@name</span> to poke them!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === currentUser?.id;
            const highlighted = currentUser && msg.message.toLowerCase().includes(`@${currentUser.name.split(' ')[0].toLowerCase()}`);

            return (
              <div 
                key={msg.id} 
                className={`flex gap-2.5 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <img
                  src={msg.user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.user_name}`}
                  alt={msg.user_name}
                  className="w-7 h-7 rounded-full object-cover border border-forest-ink/10 mt-1 shrink-0"
                />

                {/* Message Bubble Block */}
                <div className="space-y-1">
                  {!isMe && (
                    <span className="text-[9px] font-mono text-slate font-bold block ml-1 leading-none">
                      {msg.user_name.split(' ')[0]}
                    </span>
                  )}
                  <div 
                    className={`px-3.5 py-2 rounded-2xl text-[11.5px] leading-relaxed break-words border text-left ${
                      isMe 
                        ? 'bg-forest-ink border-forest-ink/10 text-white rounded-tr-sm' 
                        : highlighted
                          ? 'bg-linen-mist border-forest-ink/20 text-obsidian rounded-tl-sm'
                          : 'bg-fog border-forest-ink/5 text-charcoal rounded-tl-sm'
                    }`}
                  >
                    {renderMessageContent(msg)}
                  </div>
                  {/* Timestamp alignment */}
                  <span className={`text-[8px] font-mono text-pebble block ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                    {formatMessageTime(msg.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Tray footer */}
      <form onSubmit={handleSend} className="p-3 bg-paper border-t border-forest-ink/10 flex gap-2">
        <input
          required
          type="text"
          value={typedMessage}
          onChange={(e) => setTypedMessage(e.target.value)}
          placeholder={`Connect with splitters... Try @someone`}
          disabled={sending}
          className="flex-1 bg-paper border border-forest-ink/15 hover:border-forest-ink/30 rounded-[10px] px-3.5 py-2 text-xs text-obsidian placeholder-slate focus:outline-none focus:ring-1 focus:ring-forest-ink transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={sending || !typedMessage.trim()}
          className="p-2.5 bg-lime-voltage hover:opacity-90 disabled:bg-fog disabled:opacity-40 text-forest-ink dark:text-spruce rounded-full transition cursor-pointer shrink-0 shadow-sm flex items-center justify-center min-w-[38px]"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
