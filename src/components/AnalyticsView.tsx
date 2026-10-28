import React, { useState } from 'react';
import { InventoryState } from '../utils/inventoryLogic';

interface AnalyticsViewProps {
  state: InventoryState;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ state }) => {
  const [hoveredSku, setHoveredSku] = useState<string | null>(null);

  const maxStock = Math.max(
    ...state.stock_report.map((r) => Math.max(r.current_stock, r.reorder_level)),
    20
  );

  const totalCapital = Math.max(state.summary.total_inventory_value, 1);

  return (
    <div className="space-y-8 animate-fade-slide">
      {/* Interactive Motion Bar Chart: Stock Level vs Reorder Threshold */}
      <section
        aria-labelledby="interactive-motion-chart-heading"
        className="bg-[#0f172a] border border-slate-800/90 rounded-xl p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 id="interactive-motion-chart-heading" className="text-base font-semibold text-white">
              Interactive Stock Horizon vs. Reorder Thresholds
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hover any SKU column to inspect live reconciliation metrics. Crimson bars denote SKUs at or below threshold.
            </p>
          </div>
          <div className="flex items-center gap-5 text-xs text-slate-300">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-sky-400 inline-block" />
              <span>Nominal Stock</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-red-500 inline-block" />
              <span>Below Threshold</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-amber-400 inline-block" />
              <span>Reorder Threshold</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 pt-2">
          {state.stock_report.map((item) => {
            const currPct = Math.max(6, Math.round((item.current_stock / maxStock) * 100));
            const reordPct = Math.max(6, Math.round((item.reorder_level / maxStock) * 100));
            const isHovered = hoveredSku === item.sku;

            return (
              <div
                key={item.product_id}
                onMouseEnter={() => setHoveredSku(item.sku)}
                onMouseLeave={() => setHoveredSku(null)}
                className={`p-3 rounded-lg border transition-all ${
                  isHovered
                    ? 'bg-slate-800/80 border-sky-400/50 -translate-y-0.5'
                    : 'bg-slate-900/70 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span className="font-bold text-slate-200">{item.sku}</span>
                  <span className={item.is_low_stock ? 'text-red-400 font-semibold' : 'text-sky-400'}>
                    {item.current_stock}u
                  </span>
                </div>

                {/* Dual Vertical Motion Bars */}
                <div className="h-36 bg-slate-950/90 rounded-md p-2.5 flex items-end justify-center gap-2.5 border border-slate-800/60">
                  <div className="flex-1 h-full flex flex-col justify-end items-center">
                    <span className="text-[10px] font-mono text-slate-300 mb-1">
                      {item.current_stock}
                    </span>
                    <div
                      className={`w-full rounded-t spring-transition ${
                        item.is_low_stock
                          ? 'bg-gradient-to-t from-red-600 to-red-400'
                          : 'bg-gradient-to-t from-sky-600 to-sky-400'
                      }`}
                      style={{ height: `${currPct}%` }}
                    />
                  </div>

                  <div className="flex-1 h-full flex flex-col justify-end items-center">
                    <span className="text-[10px] font-mono text-amber-300 mb-1">
                      {item.reorder_level}
                    </span>
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-amber-600 to-amber-400 opacity-85 spring-transition"
                      style={{ height: `${reordPct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-2.5 text-[11px] text-slate-300 truncate" title={item.product_name}>
                  {item.product_name}
                </div>
                <div className="mt-0.5 text-[10px] font-mono text-slate-400 flex justify-between">
                  <span>+{item.total_in} / -{item.total_out}</span>
                  <span>{item.turnover_ratio}x</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Python-Rendered SVG Plots Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <section
          aria-labelledby="chart-stock-heading"
          className="bg-[#0f172a] border border-slate-800/90 rounded-xl p-5 flex flex-col justify-between"
        >
          <div className="mb-3">
            <h2 id="chart-stock-heading" className="text-base font-semibold text-white">
              Python Matplotlib Plot: Stock Level vs. Reorder Threshold
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Generated directly by <span className="font-mono text-sky-400">analytics_pandas_numpy.py</span>.
            </p>
          </div>
          <div
            className="w-full overflow-x-auto rounded-lg border border-slate-800"
            data-testid="python-stock-chart"
            dangerouslySetInnerHTML={{ __html: state.charts.stock_level_svg }}
          />
        </section>

        <section
          aria-labelledby="chart-movement-heading"
          className="bg-[#0f172a] border border-slate-800/90 rounded-xl p-5 flex flex-col justify-between"
        >
          <div className="mb-3">
            <h2 id="chart-movement-heading" className="text-base font-semibold text-white">
              Python Matplotlib Plot: Stock-In vs. Stock-Out Volume
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Compares cumulative inbound deliveries against outbound consumption across SKUs.
            </p>
          </div>
          <div
            className="w-full overflow-x-auto rounded-lg border border-slate-800"
            data-testid="python-movement-chart"
            dangerouslySetInnerHTML={{ __html: state.charts.movement_velocity_svg }}
          />
        </section>
      </div>

      {/* Fast-Moving Products & Turnover Velocity Table + Category Valuation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section
          aria-labelledby="fast-moving-heading"
          className="lg:col-span-7 bg-[#0f172a] border border-slate-800/90 rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-800/80 bg-[#111a2e]/50">
            <h2 id="fast-moving-heading" className="text-base font-semibold text-white">
              Fast-Moving Products & Movement Velocity Ranking
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked by outbound unit volume and turnover ratio (<span className="font-mono text-slate-300">Stock Out / Avg Stock</span>).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/60 text-xs font-medium text-slate-400">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">SKU & Product</th>
                  <th className="py-3 px-4 text-right">Outbound Units</th>
                  <th className="py-3 px-4 text-right">Turnover Ratio</th>
                  <th className="py-3 px-4">Velocity Classification</th>
                  <th className="py-3 px-4 text-right">Current Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {state.fast_moving_ranking.map((item, idx) => (
                  <tr key={item.product_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">
                      0{idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-100">
                        <span className="font-mono text-xs font-semibold text-sky-400 mr-2">
                          {item.sku}
                        </span>
                        {item.product_name}
                      </div>
                      <div className="text-xs text-slate-400">{item.category}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-indigo-400">
                      {item.total_out} units
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                      {item.turnover_ratio.toFixed(2)}x
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-200">
                      {item.velocity_class}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-white font-semibold">
                      {item.current_stock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Category Valuation + Daily Movement Summary */}
        <div className="lg:col-span-5 space-y-6">
          <section
            aria-labelledby="category-valuation-heading"
            className="bg-[#0f172a] border border-slate-800/90 rounded-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-800/80 bg-[#111a2e]/50">
              <h2 id="category-valuation-heading" className="text-base font-semibold text-white">
                Stock Valuation by Category (NumPy Summary)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Capital allocation and share of total inventory value.
              </p>
            </div>
            <div className="p-5 space-y-4">
              {state.category_valuation.map((cat) => {
                const sharePct = Math.round((cat.total_value / totalCapital) * 100);
                return (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">{cat.category}</span>
                      <span className="font-mono tabular-nums text-slate-300">
                        ${cat.total_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({sharePct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 spring-transition"
                        style={{ width: `${sharePct}%` }}
                      />
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {cat.sku_count} SKUs · {cat.total_units} total units · {cat.low_stock_skus} low-stock
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section
            aria-labelledby="daily-movement-heading"
            className="bg-[#0f172a] border border-slate-800/90 rounded-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-800/80 bg-[#111a2e]/50">
              <h2 id="daily-movement-heading" className="text-base font-semibold text-white">
                Daily Movement Summary (Pandas GroupBy Date)
              </h2>
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/60 text-xs font-medium text-slate-400">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-3 text-right">In (+)</th>
                    <th className="py-2.5 px-3 text-right">Out (-)</th>
                    <th className="py-2.5 px-3 text-right">Adj</th>
                    <th className="py-2.5 px-4 text-right">Net Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs font-mono tabular-nums">
                  {state.daily_summaries.map((d) => (
                    <tr key={d.date} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 text-slate-300">{d.date}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400">+{d.stock_in}</td>
                      <td className="py-2.5 px-3 text-right text-indigo-400">-{d.stock_out}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{d.adjustments}</td>
                      <td
                        className={`py-2.5 px-4 text-right font-semibold ${
                          d.net_change >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {d.net_change > 0 ? `+${d.net_change}` : d.net_change}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
