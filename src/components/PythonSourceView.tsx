import React, { useState } from 'react';
import { InventoryState } from '../utils/inventoryLogic';
import { Copy, Check } from 'lucide-react';

interface PythonSourceViewProps {
  state: InventoryState;
}

export const PythonSourceView: React.FC<PythonSourceViewProps> = ({ state }) => {
  const filenames = Object.keys(state.python_sources);
  const [activeFile, setActiveFile] = useState<string>(filenames[0] || 'engine.py');
  const [copied, setCopied] = useState(false);

  const code = state.python_sources[activeFile] || '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure in headless browsers
    }
  };

  return (
    <div className="space-y-6 animate-fade-slide">
      <section aria-labelledby="python-arch-heading" className="bg-[#0f172a] border border-slate-800/90 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 bg-[#111a2e]/50">
          <div>
            <h2 id="python-arch-heading" className="text-base font-semibold text-white">
              Python Backend & Analytics Source Code (Python {state.summary.python_version})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect the live Python SQLite engine, Flask API routes, Pandas/NumPy/Matplotlib analytics module, and MySQL/SQLite schema.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg" role="group" aria-label="Select Python source file">
              {filenames.map((fname) => (
                <button
                  key={fname}
                  type="button"
                  onClick={() => setActiveFile(fname)}
                  className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                    activeFile === fname
                      ? 'bg-sky-500/20 border border-sky-400/40 text-sky-300'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {fname}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        <div className="bg-[#060911] text-slate-200 p-6 overflow-x-auto max-h-[620px]">
          <pre className="text-xs font-mono leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>
      </section>
    </div>
  );
};
