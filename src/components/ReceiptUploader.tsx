import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileText, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface ReceiptUploaderProps {
  groupId: string;
  token: string | null;
  onScanned: (data: {
    title: string;
    amount: number;
    currency: string;
    line_items?: Array<{ name: string; amount: number }>;
  }) => void;
}

export function ReceiptUploader({ groupId, token, onScanned }: ReceiptUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Reassuring messages that cycle during long image scans
  const [loadingMessage, setLoadingMessage] = useState("Initializing safe scanner container...");
  const messages = [
    "Uploading receipt image to Gemini Vision container...",
    "Gemini is analyzing the OCR print text layers...",
    "Scanning merchant and shopping titles...",
    "Summing line items and validating calculated totals...",
    "Compiling transaction currency fields...",
    "Pre-filling ultimate form records..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (loading) {
      let idx = 0;
      setLoadingMessage(messages[0]);
      interval = setInterval(() => {
        idx = (idx + 1) % messages.length;
        setLoadingMessage(messages[idx]);
      }, 3500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file) return;

    // Validate if it is indeed an image
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, WEBP)');
      return;
    }

    setLoading(true);
    setError(null);

    // Create image preview local URL
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);

    try {
      // Convert image file to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      // Submit base64 raw parameters to scanner endpoint
      const response = await fetch('/api/ai/scan-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          image: base64Data,
          mimeType: file.type,
          groupId: groupId
        })
      });

      if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.error || 'Server error OCR-ing receipt image');
      }

      const scannedData = await response.json();

      // Trigger pre-fill handler
      onScanned({
        title: scannedData.merchant || 'Receipt Expense',
        amount: Number(scannedData.total || 0),
        currency: scannedData.currency || 'EUR',
        line_items: scannedData.line_items || []
      });

      setFilePreview(null); // Clear preview after completion
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Verification error scanning receipt. Set values manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-fog p-5 rounded-[10px] border border-forest-ink/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-sans text-xs font-bold text-obsidian uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-forest-ink" />
          Receipt Snap Scanner
        </h3>
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-forest-ink bg-linen-mist px-2.5 py-1 rounded-full border border-forest-ink/10 flex items-center gap-1">
          <FileText className="w-3 h-3 text-forest-ink" />
          AUTO SCANNER
        </span>
      </div>

      {!loading ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          className={`border border-dashed rounded-[10px] p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            dragActive 
              ? 'border-forest-ink bg-linen-mist' 
              : 'border-forest-ink/20 hover:border-forest-ink/40 bg-paper hover:bg-linen-mist/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleChange}
          />
          
          <UploadCloud className="w-8 h-8 text-slate mb-3" />
          
          <p className="text-xs font-medium text-obsidian font-sans">
            Drag & drop receipt image here, or <span className="text-forest-ink font-bold underline hover:text-forest-ink/80">browse file</span>
          </p>
          <p className="text-[10px] text-slate mt-1.5 font-sans">Support PNG, JPG, WEBP. Extract line items & totals instantly.</p>
        </div>
      ) : (
        <div className="border border-forest-ink/10 bg-linen-mist/45 rounded-[10px] p-6 flex flex-col items-center justify-center text-center animate-none">
          {filePreview && (
            <div className="relative mb-4">
              <img
                src={filePreview}
                alt="Scanning..."
                className="w-20 h-20 rounded-[10px] object-cover opacity-60 border border-forest-ink/35 blur-[0.5px]"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-forest-ink animate-spin" />
              </div>
            </div>
          )}
          {!filePreview && <Loader2 className="w-8 h-8 text-forest-ink animate-spin mb-3" />}
          
          <h4 className="text-xs font-bold text-obsidian uppercase tracking-wide">Analyzing Receipt Snap...</h4>
          <p className="text-[11px] text-forest-ink font-mono mt-2 animate-pulse">{loadingMessage}</p>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-1.5 p-2.5 rounded-[10px] bg-alarm-red/10 text-alarm-red border border-alarm-red/20 text-[11px] select-none">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
