import React, { useState } from 'react';
import { InventoryState, StockReportItem } from '../utils/inventoryLogic';
import { ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

interface StockFlowMotionGraphicProps {
  state: InventoryState;
  selectedSku: StockReportItem | null;
  onSelectSku: (item: StockReportItem) => void;
  onFilterStatus: (status: 'ALL' | 'LOW_STOCK' | 'FAST_MOVING') => void;
  onQuickNavigate: (tab: 'transactions' | 'analytics') => void;
}

export const StockFlowMotionGraphic: React.FC<StockFlowMotionGraphicProps> = ({
  state,
  selectedSku,
  onSelectSku,
  onFilterStatus,
  onQuickNavigate,
}) => {
  const [activeStage, setActiveStage] = useState<'ALL' | 'IN' | 'OUT' | 'LOW'>('ALL');

  const activeItem = selectedSku || state.stock_report[0];
  const totalOpening = state.stock_report.reduce((acc, r) => acc + r.opening_balance, 0);
  const totalIn = state.summary.total_in_units;
  const totalOut = state.summary.total_out_units;
  const totalAdj = state.summary.total_adjustment_units;
  const totalCurrent = state.summary.total_units_in_stock;

  const nominalCount = state.summary.total_skus - state.summary.low_stock_count;
  const healthRatio = state.summary.total_skus > 0 ? (nominalCount / state.summary.total_skus) * 100 : 100;

  return (
    <section
      aria-label="Interactive Stock Reconciliation and Motion Topology"
      className="bg-[#0f172a] border border-slate-800/90 rounded-xl overflow-hidden shadow-2xl shadow-black/40 animate-fade-slide"
    >
      {/* Top Bar of the Motion Studio */}
      <div className="px-6 py-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 bg-[#111a2e]/60">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Live Stock Reconciliation & Flow Topology
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Interactive vector flow verifying{' '}
            <span className="font-mono text-sky-300">
              Opening ({totalOpening}) + In ({totalIn}) - Out ({totalOut}) + Adj ({totalAdj >= 0 ? `+${totalAdj}` : totalAdj}) = Current ({totalCurrent} units)
            </span>
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-lg" role="group" aria-label="Highlight flow stage">
          {([
            { id: 'ALL', label: 'Full Pipeline' },
            { id: 'IN', label: 'Inbound (+In)' },
            { id: 'OUT', label: 'Outbound (-Out)' },
            { id: 'LOW', label: 'Threshold Alerts' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveStage(tab.id);
                if (tab.id === 'LOW') onFilterStatus('LOW_STOCK');
                else if (tab.id === 'OUT') onFilterStatus('FAST_MOVING');
                else onFilterStatus('ALL');
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                activeStage === tab.id
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Motion SVG Flow Canvas + Telemetry Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
        {/* Left 7 Cols: Animated Vector Pipeline */}
        <div className="lg:col-span-7 p-6 flex flex-col justify-between bg-gradient-to-b from-[#0f172a] to-[#0b1120]">
          <div className="relative w-full overflow-hidden">
            <svg
              viewBox="0 0 680 215"
              className="w-full h-auto select-none"
              role="img"
              aria-label="Animated Stock Movement Pipeline"
            >
              <defs>
                <linearGradient id="inGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="50%" stopColor="#10b981" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="outGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="lowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.95" />
                </linearGradient>
              </defs>

              {/* Subtle architectural coordinate grid */}
              {[35, 75, 115, 155, 195].map((y) => (
                <line
                  key={y}
                  x1="10"
                  y1={y}
                  x2="670"
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="3 5"
                />
              ))}

              {/* Path 1: Opening Balance -> Central Stock Pool */}
              <path
                d="M 155 58 C 215 58, 225 108, 285 108"
                fill="none"
                stroke="#1e293b"
                strokeWidth="3.5"
              />
              <path
                d="M 155 58 C 215 58, 225 108, 285 108"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
                strokeDasharray="8 10"
                className="animate-flow-stream-slow"
                opacity={activeStage === 'ALL' ? 0.9 : 0.35}
              />

              {/* Path 2: Inbound Deliveries (+In) -> Central Stock Pool */}
              <path
                d="M 155 158 C 215 158, 225 118, 285 118"
                fill="none"
                stroke="#1e293b"
                strokeWidth="4"
              />
              <path
                d="M 155 158 C 215 158, 225 118, 285 118"
                fill="none"
                stroke="url(#inGrad)"
                strokeWidth={activeStage === 'IN' ? 5 : 3.5}
                strokeDasharray="10 8"
                className="animate-flow-stream"
                opacity={activeStage === 'ALL' || activeStage === 'IN' ? 1 : 0.3}
              />

              {/* Path 3: Central Stock Pool -> Outbound Consumption (-Out) */}
              <path
                d="M 415 102 C 465 102, 475 58, 525 58"
                fill="none"
                stroke="#1e293b"
                strokeWidth="4"
              />
              <path
                d="M 415 102 C 465 102, 475 58, 525 58"
                fill="none"
                stroke="url(#outGrad)"
                strokeWidth={activeStage === 'OUT' ? 5 : 3.5}
                strokeDasharray="10 8"
                className="animate-flow-stream"
                opacity={activeStage === 'ALL' || activeStage === 'OUT' ? 1 : 0.3}
              />

              {/* Path 4: Central Stock Pool -> Low-Stock Threshold Watch */}
              <path
                d="M 415 122 C 465 122, 475 158, 525 158"
                fill="none"
                stroke="#1e293b"
                strokeWidth="3.5"
              />
              <path
                d="M 415 122 C 465 122, 475 158, 525 158"
                fill="none"
                stroke="url(#lowGrad)"
                strokeWidth={activeStage === 'LOW' ? 5 : 3.5}
                strokeDasharray="8 8"
                className="animate-flow-stream-slow"
                opacity={activeStage === 'ALL' || activeStage === 'LOW' ? 1 : 0.3}
              />

              {/* Node 1: Opening Balance */}
              <g transform="translate(16, 26)">
                <rect
                  width="138"
                  height="64"
                  rx="8"
                  fill="#111827"
                  stroke="#334155"
                  strokeWidth="1.5"
                />
                <text x="14" y="23" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="10" fill="#94a3b8">
                  01. Opening Balance
                </text>
                <text x="14" y="47" fontFamily="JetBrains Mono, monospace" fontSize="16" fontWeight="700" fill="#f8fafc">
                  {totalOpening} u
                </text>
              </g>

              {/* Node 2: Inbound Stream (+In & Adj) */}
              <g
                transform="translate(16, 126)"
                className="cursor-pointer"
                onClick={() => setActiveStage(activeStage === 'IN' ? 'ALL' : 'IN')}
              >
                <rect
                  width="138"
                  height="64"
                  rx="8"
                  fill="#06281e"
                  stroke={activeStage === 'IN' ? '#10b981' : '#065f46'}
                  strokeWidth="1.5"
                />
                <text x="14" y="23" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="10" fill="#6ee7b7">
                  02. Stock-In + Adj
                </text>
                <text x="14" y="47" fontFamily="JetBrains Mono, monospace" fontSize="16" fontWeight="700" fill="#34d399">
                  +{totalIn} / {totalAdj >= 0 ? `+${totalAdj}` : totalAdj}
                </text>
              </g>

              {/* Central Node: Reconciled Live Vault */}
              <g transform="translate(285, 66)">
                <rect
                  width="130"
                  height="92"
                  rx="10"
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                <text x="65" y="24" textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="10" fontWeight="600" fill="#7dd3fc">
                  Reconciled Stock
                </text>
                <text x="65" y="52" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="20" fontWeight="700" fill="#ffffff">
                  {totalCurrent} u
                </text>
                <text x="65" y="74" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#38bdf8">
                  ${state.summary.total_inventory_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </text>
              </g>

              {/* Node 3: Outbound Velocity (-Out) */}
              <g
                transform="translate(526, 26)"
                className="cursor-pointer"
                onClick={() => setActiveStage(activeStage === 'OUT' ? 'ALL' : 'OUT')}
              >
                <rect
                  width="138"
                  height="64"
                  rx="8"
                  fill="#17153b"
                  stroke={activeStage === 'OUT' ? '#818cf8' : '#3730a3'}
                  strokeWidth="1.5"
                />
                <text x="14" y="23" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="10" fill="#a5b4fc">
                  03. Outbound Flow
                </text>
                <text x="14" y="47" fontFamily="JetBrains Mono, monospace" fontSize="16" fontWeight="700" fill="#818cf8">
                  -{totalOut} u
                </text>
              </g>

              {/* Node 4: Reorder Threshold Watch */}
              <g
                transform="translate(526, 126)"
                className="cursor-pointer"
                onClick={() => setActiveStage(activeStage === 'LOW' ? 'ALL' : 'LOW')}
              >
                <rect
                  width="138"
                  height="64"
                  rx="8"
                  fill="#2a1215"
                  stroke={activeStage === 'LOW' ? '#f87171' : '#7f1d1d'}
                  strokeWidth="1.5"
                />
                <text x="14" y="23" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="10" fill="#fca5a5">
                  04. Below Threshold
                </text>
                <text x="14" y="47" fontFamily="JetBrains Mono, monospace" fontSize="16" fontWeight="700" fill="#f87171">
                  {state.summary.low_stock_count} of {state.summary.total_skus} SKUs
                </text>
              </g>
            </svg>
          </div>

          {/* Animated Threshold Health Bar */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[220px]">
              <span className="text-xs text-slate-400 whitespace-nowrap">
                Threshold Health:
              </span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full spring-transition"
                  style={{ width: `${healthRatio}%` }}
                />
                <div
                  className="bg-red-500 h-full spring-transition"
                  style={{ width: `${100 - healthRatio}%` }}
                />
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-300 whitespace-nowrap">
                {nominalCount} Nominal · {state.summary.low_stock_count} Flagged
              </span>
            </div>

            <button
              type="button"
              onClick={() => onQuickNavigate('analytics')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Explore Velocity & Valuation Charts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right 5 Cols: Interactive SKU Telemetry & Waterfall Inspector */}
        <div className="lg:col-span-5 p-6 bg-[#0d1424] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-medium text-slate-400">
                Interactive SKU Reconciliation Waterfall
              </span>
              <span className="text-xs font-mono text-slate-400">
                Click any SKU below to inspect
              </span>
            </div>

            {/* Interactive SKU Selector Strip */}
            <div className="grid grid-cols-4 gap-1.5 mb-4" role="group" aria-label="Select SKU for telemetry inspection">
              {state.stock_report.map((item) => {
                const isSelected = activeItem?.product_id === item.product_id;
                return (
                  <button
                    key={item.product_id}
                    type="button"
                    onClick={() => onSelectSku(item)}
                    className={`px-2 py-1 text-xs font-mono rounded-md transition-all text-center whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-sky-500/25 border border-sky-400/50 text-white font-semibold'
                        : item.is_low_stock
                        ? 'text-red-400 hover:text-red-300 bg-red-950/30 border border-red-900/30'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-900/70 border border-slate-800/80'
                    }`}
                  >
                    {item.sku}
                  </button>
                );
              })}
            </div>

            {/* Animated SKU Telemetry Card */}
            {activeItem && (
              <div key={activeItem.product_id} className="space-y-4 animate-fade-slide">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-sky-400">
                        {activeItem.sku}
                      </span>
                      <span className="text-slate-600" aria-hidden="true">·</span>
                      <span className="text-xs text-slate-400">{activeItem.category}</span>
                    </div>
                    <h3 className="text-base font-semibold text-white mt-0.5">
                      {activeItem.product_name}
                    </h3>
                  </div>

                  <div className="text-right font-mono tabular-nums">
                    <div className="text-lg font-bold text-white">
                      ${activeItem.stock_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-400">
                      @${activeItem.unit_cost.toFixed(2)} / unit
                    </div>
                  </div>
                </div>

                {/* Animated 5-Step Reconciliation Waterfall Bars */}
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {[
                    { label: 'Opening', val: activeItem.opening_balance, prefix: '', color: 'bg-slate-500', text: 'text-slate-200' },
                    { label: 'Stock In', val: activeItem.total_in, prefix: '+', color: 'bg-emerald-500', text: 'text-emerald-400' },
                    { label: 'Stock Out', val: activeItem.total_out, prefix: '-', color: 'bg-indigo-500', text: 'text-indigo-400' },
                    { label: 'Adjusted', val: activeItem.total_adjustment, prefix: activeItem.total_adjustment > 0 ? '+' : '', color: 'bg-amber-500', text: 'text-amber-400' },
                    {
                      label: 'Current',
                      val: activeItem.current_stock,
                      prefix: '',
                      color: activeItem.is_low_stock ? 'bg-red-500' : 'bg-sky-400',
                      text: activeItem.is_low_stock ? 'text-red-400' : 'text-sky-300',
                    },
                  ].map((step) => {
                    const maxRef = Math.max(
                      activeItem.opening_balance,
                      activeItem.total_in,
                      activeItem.total_out,
                      activeItem.current_stock,
                      activeItem.reorder_level,
                      20
                    );
                    const pct = Math.min(100, Math.max(8, (Math.abs(step.val) / maxRef) * 100));
                    return (
                      <div key={step.label} className="bg-slate-900/90 border border-slate-800/90 rounded-lg p-2.5 flex flex-col justify-between">
                        <span className="text-[11px] text-slate-400">{step.label}</span>
                        <div className="my-2 h-12 bg-slate-950 rounded flex items-end p-1">
                          <div
                            className={`w-full rounded-xs spring-transition ${step.color}`}
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                        <span className={`font-mono text-xs font-bold tabular-nums ${step.text}`}>
                          {step.prefix}{step.val}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Threshold Status Footer inside Inspector */}
                <div className="pt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {activeItem.is_low_stock ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="text-red-300 font-medium">
                          Below Threshold ({activeItem.current_stock} / {activeItem.reorder_level} u)
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-emerald-300 font-medium">
                          Above Threshold ({activeItem.current_stock} / {activeItem.reorder_level} u)
                        </span>
                      </>
                    )}
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <span className="text-slate-400">{activeItem.velocity_class} ({activeItem.turnover_ratio}x)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onQuickNavigate('transactions')}
                    className="text-xs font-medium text-sky-400 hover:text-sky-300 whitespace-nowrap"
                  >
                    Record Movement →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
