import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, ClipboardCheck, Trash2, Download, AlertCircle, ShoppingCart, Globe, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import copy from 'copy-to-clipboard';

interface Result {
  url: string;
  imageUrl?: string;
  name?: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
}

export default function App() {
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const processLinks = async () => {
    const links = inputText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.includes('shopee'));

    if (links.length === 0) return;

    setIsProcessing(true);
    const initialResults: Result[] = links.map(link => ({
      url: link,
      status: 'loading'
    }));
    setResults(initialResults);

    for (let i = 0; i < links.length; i++) {
      const url = links[i];
      try {
        const response = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });

        const data = await response.json();
        
        setResults(prev => prev.map((r, idx) => 
          idx === i 
            ? (data.imageUrl ? { ...r, status: 'success', imageUrl: data.imageUrl, name: data.name } : { ...r, status: 'error', error: data.error || 'Not found' })
            : r
        ));
      } catch (err) {
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'error', error: 'Server error' } : r
        ));
      }
    }
    setIsProcessing(false);
  };

  const handleCopyAll = () => {
    const validLinks = results
      .filter(r => r.imageUrl)
      .map(r => r.imageUrl)
      .join('\n');
    
    if (validLinks) {
      copy(validLinks);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const clearAll = () => {
    setInputText('');
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-[#f0fdf4] text-[#064e3b] font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white px-10 py-6 border-b-2 border-[#d1fae5] shadow-sm flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#10b981] rounded-lg flex items-center justify-center text-white font-bold text-lg">
            S
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#065f46] tracking-tight leading-none">Shopee Image Scraper</h1>
            <p className="text-[12px] text-slate-500 font-medium">V4 API Standalone Tool</p>
          </div>
        </div>
        <div className="text-[13px] text-[#059669] font-semibold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          V.1.0.2 • System Ready
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-6 p-10 flex-grow max-w-7xl mx-auto w-full">
        
        {/* Input Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col bg-white rounded-2xl border border-[#d1fae5] shadow-sm overflow-hidden min-h-[500px]"
        >
          <div className="px-5 py-4 border-b border-[#f0fdf4] flex justify-between items-center">
            <span className="text-[13px] font-bold uppercase tracking-wider text-[#059669]">Input URLs</span>
            <span className="text-[11px] text-slate-400">One link per line</span>
          </div>
          
          <div className="flex-grow p-5 flex flex-col gap-4">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste Shopee product links here..."
              spellCheck={false}
              className="flex-grow w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-3 font-mono text-[13px] text-slate-800 outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent transition-all resize-none shadow-inner"
            />
          </div>

          <div className="p-5 pt-0 flex gap-3">
            <button
              onClick={processLinks}
              disabled={isProcessing || !inputText.trim()}
              className="flex-grow h-12 bg-[#10b981] hover:bg-[#059669] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-sm text-sm active:scale-[0.98]"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Extract Images
            </button>
            <button 
              onClick={clearAll}
              className="px-6 h-12 bg-[#f8fafc] hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-lg font-bold transition-all shadow-sm text-sm active:scale-[0.98]"
            >
              Clear
            </button>
          </div>
        </motion.div>

        {/* Output Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col bg-white rounded-2xl border border-[#d1fae5] shadow-sm overflow-hidden min-h-[500px]"
        >
          <div className="px-5 py-4 border-b border-[#f0fdf4] flex justify-between items-center">
            <span className="text-[13px] font-bold uppercase tracking-wider text-[#059669]">Results Overview</span>
            <span className="text-[11px] text-slate-400">Found: {results.filter(r => r.imageUrl).length} images</span>
          </div>

          <div className="flex-grow p-5 space-y-3 overflow-y-auto max-h-[400px] custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {results.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                  <Globe className="w-10 h-10 mb-2 opacity-10" />
                  <p className="text-[13px]">System Idle • Waiting for input</p>
                </div>
              ) : (
                results.map((result, index) => (
                  <motion.div
                    key={`${result.url}-${index}`}
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3 hover:border-[#10b981] transition-all group"
                  >
                    <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center shadow-xs">
                      {result.status === 'loading' ? (
                        <div className="w-4 h-4 border-2 border-emerald-100 border-t-emerald-500 rounded-full animate-spin" />
                      ) : result.imageUrl ? (
                        <img src={result.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-grow">
                      <p className="text-[10px] font-mono text-slate-400 truncate leading-none mb-1.5">{result.url}</p>
                      {result.status === 'success' && result.imageUrl ? (
                        <div className="flex items-center gap-2">
                          <code className="text-[11px] font-mono text-[#059669] truncate bg-white px-2 py-1 rounded border border-slate-100 flex-grow">
                            {result.imageUrl}
                          </code>
                          <button 
                            onClick={() => copy(result.imageUrl!)}
                            className="bg-white p-1.5 rounded border border-slate-200 hover:border-[#10b981] text-slate-400 hover:text-[#10b981] transition-all shadow-xs"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      ) : result.status === 'error' ? (
                        <span className="text-[11px] text-red-500">{result.error}</span>
                      ) : (
                        <div className="h-4 w-32 bg-slate-200 animate-pulse rounded" />
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <div className="p-5 pt-0">
            <button
              onClick={handleCopyAll}
              disabled={results.length === 0 || !results.some(r => r.imageUrl)}
              className={`w-full h-12 rounded-lg font-bold transition-all shadow-sm text-sm active:scale-[0.98] flex items-center justify-center gap-2 ${
                copied 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-[#ecfdf5] text-[#059669] border border-[#10b981] hover:bg-[#d1fae5] disabled:bg-slate-50 disabled:text-slate-300 disabled:border-slate-200'
              }`}
            >
              {copied ? (
                <ClipboardCheck className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              Copy All Results
            </button>
          </div>
        </motion.div>

      </main>

      {/* Status Bar */}
      <footer className="px-10 py-3 bg-white border-top border-[#d1fae5] flex items-center gap-6 text-[12px] text-slate-500 shadow-inner">
        <div>Status: <span className="px-2 py-0.5 bg-[#d1fae5] rounded-full text-[#065f46] font-bold ml-1">Live Connection</span></div>
        <div>Processed: <span className="font-bold text-slate-700">{results.length} Links</span></div>
        <div className="hidden sm:block">Engine: <span className="font-mono text-[#059669]">Shopee-API-v4-Extractor</span></div>
        <div className="ml-auto hidden md:block">CLI Emulation Mode</div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1fae5;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #10b981;
        }
      `}</style>
    </div>
  );
}
