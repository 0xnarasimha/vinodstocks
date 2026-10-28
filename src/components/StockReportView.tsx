import React, { useState } from 'react';
import {
  InventoryState,
  StockReportItem,
  filterStockReport,
} from '../utils/inventoryLogic';
import { StockFlowMotionGraphic } from './StockFlowMotionGraphic';
import { AlertTriangle, CheckCircle2, ArrowUpRight, Search } from 'lucide-react';

interface StockReportViewProps {
  state: InventoryState;
  onUpdateReorderLevel: (productId: number, newLevel: number) => Promise<void>;
  onQuickRestock: (item: StockReportItem, recommendedQty: number) => Promise<void>;
  onNavigateToTransactions: (productId?: number) => void;
  onNavigateToAnalytics: () => void;
}

export const StockReportView: React.FC<StockReportViewProps> = ({
  state,
  onUpdateReorderLevel,
  onQuickRestock,
  onNavigateToTransactions,
  onNavigateToAnalytics,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW_STOCK' | 'FAST_MOVING'>('ALL');
  const [selectedSku, setSelectedSku] = useState<StockReportItem | null>(
    state.stock_report[0] || null
  );
  const [editingThresholds, setEditingThresholds] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const categories = Array.from(new Set(state.stock_report.map((r) => r.category)));
  const filteredItems = filterStockReport(
    state.stock_report,
    searchQuery,
    categoryFilter,
    statusFilter
  );

  const currentSelectedSku =
    state.stock_report.find((r) => r.product_id === selectedSku?.product_id) ||
    state.stock_report[0] ||
    null;

  const handleThresholdChange = (productId: number, val: string) => {
    setEditingThresholds((prev) => ({ ...prev, [productId]: val }));
  };

  const handleThresholdSave = async (item: StockReportItem) => {
    const raw = editingThresholds[item.product_id];
    const parsed = raw !== undefined ? parseInt(raw, 10) : item.reorder_level;
    if (Number.isNaN(parsed) || parsed < 0) return;
    setSavingId(item.product_id);
    try {
      await onUpdateReorderLevel(item.product_id, parsed);
      setEditingThresholds((prev) => {
        const next = { ...prev };
        delete next[item.product_id];
        return next;
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-slide">
      {/* 4-Column High-Contrast KPI Strip */}
      <section aria-label="Inventory Key Metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] border border-slate-800/90 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="text-xs font-medium text-slate-400">Estimated Inventory Value</div>
          <div
            className="mt-2 text-2xl font-bold font-mono tabular-nums text-white"
            data-testid="kpi-inventory-value"
          >
            ${state.summary.total_inventory_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-400 font-mono tabular-nums">
            Mean SKU Value: ${state.summary.mean_product_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800/90 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="text-xs font-medium text-slate-400">Total Units & Reconciliation</div>
          <div
            className="mt-2 text-2xl font-bold font-mono tabular-nums text-white"
            data-testid="kpi-total-units"
          >
            {state.summary.total_units_in_stock.toLocaleString()} units
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              {state.summary.all_reconciled
                ? `Reconciled across ${state.summary.total_skus} SKUs`
                : 'Reconciliation mismatch detected'}
            </span>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800/90 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="text-xs font-medium text-slate-400">Low-Stock Alert Thresholds</div>
          <div
            className="mt-2 text-2xl font-bold font-mono tabular-nums text-red-400"
            data-testid="kpi-low-stock-count"
          >
            {state.summary.low_stock_count} of {state.summary.total_skus} SKUs
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Flagged at or below configurable reorder level
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800/90 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="text-xs font-medium text-slate-400">Cumulative Stock Movements</div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-white">
            {state.summary.total_transactions} logged
          </div>
          <div className="mt-2 text-xs text-slate-400 font-mono tabular-nums">
            <span className="text-emerald-400">+{state.summary.total_in_units} In</span> ·{' '}
            <span className="text-indigo-400">-{state.summary.total_out_units} Out</span> ·{' '}
            <span className="text-amber-400">
              {state.summary.total_adjustment_units >= 0
                ? `+${state.summary.total_adjustment_units}`
                : state.summary.total_adjustment_units}{' '}
              Adj
            </span>
          </div>
        </div>
      </section>

      {/* Centerpiece Interactive Motion Graphics: Flow Topology & SKU Waterfall */}
      <StockFlowMotionGraphic
        state={state}
        selectedSku={currentSelectedSku}
        onSelectSku={(item) => setSelectedSku(item)}
        onFilterStatus={(st) => setStatusFilter(st)}
        onQuickNavigate={(tab) => {
          if (tab === 'transactions') {
            onNavigateToTransactions(currentSelectedSku?.product_id);
          } else {
            onNavigateToAnalytics();
          }
        }}
      />

      {/* Low-Stock Alert & Reorder Recommendations List */}
      <section
        aria-labelledby="low-stock-heading"
        className="bg-[#0f172a] border border-slate-800/90 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 bg-[#111a2e]/50">
          <div>
            <h2 id="low-stock-heading" className="text-base font-semibold text-white">
              Low-Stock Watchlist & Reorder Recommendations
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              SKUs where current balance is at or below configurable threshold. Trigger manual restock without automatic purchasing.
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-amber-300">
            Est. Restock Capital: $
            {state.low_stock_list
              .reduce((acc, item) => acc + item.estimated_reorder_cost, 0)
              .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {state.low_stock_list.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            All products are currently above their configured reorder thresholds.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/60 text-xs font-medium text-slate-400">
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Threshold Fill Gauge</th>
                  <th className="py-3 px-4 text-right">Current</th>
                  <th className="py-3 px-4 text-right">Reorder Level</th>
                  <th className="py-3 px-4 text-right">Deficit</th>
                  <th className="py-3 px-4 text-right">Recommended Order</th>
                  <th className="py-3 px-4 text-right">Est. Cost</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {state.low_stock_list.map((item) => {
                  const fillPct = Math.min(
                    100,
                    Math.round((item.current_stock / Math.max(item.reorder_level, 1)) * 100)
                  );
                  return (
                    <tr
                      key={item.product_id}
                      onClick={() => setSelectedSku(item)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-sky-400 whitespace-nowrap">
                        {item.sku}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-100">{item.product_name}</div>
                        <div className="text-xs text-slate-400">
                          {item.category} · {item.velocity_class}
                        </div>
                      </td>
                      <td className="py-3 px-4 w-44">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="h-full bg-gradient-to-r from-red-500 to-amber-500 spring-transition"
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-red-400 w-9 text-right">
                            {fillPct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-red-400">
                        {item.current_stock}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                        {item.reorder_level}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-400">
                        -{item.deficit} u
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-400">
                        +{item.recommended_reorder_qty} u
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                        ${item.estimated_reorder_cost.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onQuickRestock(item, item.recommended_reorder_qty)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md transition-colors whitespace-nowrap shrink-0"
                          aria-label={`Record recommended restock of ${item.recommended_reorder_qty} units for ${item.sku}`}
                        >
                          Restock +{item.recommended_reorder_qty}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Complete Reconciled Stock Report Table */}
      <section
        aria-labelledby="stock-report-heading"
        className="bg-[#0f172a] border border-slate-800/90 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-800/80 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-[#111a2e]/50">
          <div className="shrink-0">
            <h2 id="stock-report-heading" className="text-base font-semibold text-white">
              Current Stock Report & Transaction Reconciliation
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Reconciled in Python: <span className="font-mono text-slate-300">Opening + In - Out + Adj = Current Stock</span>
            </p>
          </div>

          {/* Search & Interactive Filter Controls */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKU or name..."
                aria-label="Search SKU or product name"
                className="w-44 pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
              className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <div
              className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg"
              role="group"
              aria-label="Filter stock report by status"
            >
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === 'ALL'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All SKUs ({state.stock_report.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('LOW_STOCK')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === 'LOW_STOCK'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Below Reorder ({state.summary.low_stock_count})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('FAST_MOVING')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === 'FAST_MOVING'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Fast-Moving
              </button>
            </div>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No products match the current search or filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" data-testid="stock-report-table">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/60 text-xs font-medium text-slate-400">
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Product & Category</th>
                  <th className="py-3 px-3 text-right">Opening</th>
                  <th className="py-3 px-3 text-right">In (+)</th>
                  <th className="py-3 px-3 text-right">Out (-)</th>
                  <th className="py-3 px-3 text-right">Adj (±)</th>
                  <th className="py-3 px-4 text-right">Current Stock</th>
                  <th className="py-3 px-4">Reorder Threshold</th>
                  <th className="py-3 px-4">Status · Velocity</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Stock Value</th>
                  <th className="py-3 px-4 text-right">Move</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {filteredItems.map((item) => {
                  const thresholdVal =
                    editingThresholds[item.product_id] !== undefined
                      ? editingThresholds[item.product_id]
                      : String(item.reorder_level);
                  const isDirty =
                    editingThresholds[item.product_id] !== undefined &&
                    editingThresholds[item.product_id] !== String(item.reorder_level);

                  const maxScale = Math.max(item.current_stock, item.reorder_level * 1.6, 30);
                  const stockBarPct = Math.min(100, Math.round((item.current_stock / maxScale) * 100));
                  const thresholdMarkerPct = Math.min(96, Math.round((item.reorder_level / maxScale) * 100));

                  return (
                    <tr
                      key={item.product_id}
                      onClick={() => setSelectedSku(item)}
                      className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${
                        currentSelectedSku?.product_id === item.product_id ? 'bg-sky-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-sky-400 whitespace-nowrap">
                        {item.sku}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-100">{item.product_name}</div>
                        <div className="text-xs text-slate-400">{item.category}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-400">
                        {item.opening_balance}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-400">
                        +{item.total_in}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-indigo-400">
                        -{item.total_out}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-400">
                        {item.total_adjustment > 0
                          ? `+${item.total_adjustment}`
                          : item.total_adjustment}
                      </td>
                      <td
                        className="py-3 px-4 text-right"
                        data-testid={`current-stock-${item.sku}`}
                      >
                        <div
                          className={`font-mono tabular-nums font-bold ${
                            item.is_low_stock ? 'text-red-400' : 'text-white'
                          }`}
                        >
                          {item.current_stock}
                        </div>
                        <div className="mt-1 w-24 ml-auto h-1.5 bg-slate-950 rounded-full relative overflow-hidden">
                          <div
                            className={`h-full rounded-full spring-transition ${
                              item.is_low_stock ? 'bg-red-500' : 'bg-sky-400'
                            }`}
                            style={{ width: `${stockBarPct}%` }}
                          />
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-amber-400"
                            style={{ left: `${thresholdMarkerPct}%` }}
                            title={`Reorder Threshold: ${item.reorder_level}`}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            value={thresholdVal}
                            onChange={(e) =>
                              handleThresholdChange(item.product_id, e.target.value)
                            }
                            aria-label={`Reorder threshold for ${item.sku}`}
                            className="w-16 px-2 py-1 text-xs font-mono tabular-nums bg-slate-900 border border-slate-700 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                          />
                          {isDirty && (
                            <button
                              type="button"
                              disabled={savingId === item.product_id}
                              onClick={() => handleThresholdSave(item)}
                              aria-label={`Save reorder threshold for ${item.sku}`}
                              className="px-2 py-1 text-xs font-medium text-slate-950 bg-sky-400 hover:bg-sky-300 rounded transition-colors whitespace-nowrap shrink-0"
                            >
                              Save
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap">
                        {item.is_low_stock ? (
                          <span className="inline-flex items-center gap-1 font-medium text-red-400">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Below Reorder</span>
                          </span>
                        ) : (
                          <span className="font-medium text-emerald-400">Nominal</span>
                        )}
                        <span className="mx-1.5 text-slate-600" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-slate-400">{item.velocity_class}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                        ${item.unit_cost.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-100">
                        ${item.stock_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onNavigateToTransactions(item.product_id)}
                          aria-label={`Log movement for ${item.sku}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 hover:text-sky-300"
                        >
                          <span>Log</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
