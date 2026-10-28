import React, { useState, useEffect } from 'react';
import {
  InventoryState,
  TransactionType,
  validateStockMovement,
} from '../utils/inventoryLogic';
import { AlertCircle, CheckCircle2, Search } from 'lucide-react';

interface TransactionsViewProps {
  state: InventoryState;
  preselectedProductId: number | null;
  onRecordTransaction: (payload: {
    product_id: number;
    transaction_type: TransactionType;
    quantity: number;
    supplier_id: number | null;
    transaction_date: string;
    notes: string;
  }) => Promise<{ ok: boolean; error?: string; message?: string }>;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  state,
  preselectedProductId,
  onRecordTransaction,
}) => {
  const [productId, setProductId] = useState<number>(
    preselectedProductId || (state.stock_report[0]?.product_id ?? 1)
  );
  const [txType, setTxType] = useState<TransactionType>('STOCK_OUT');
  const [quantityStr, setQuantityStr] = useState<string>('5');
  const [supplierId, setSupplierId] = useState<string>('');
  const [txDate, setTxDate] = useState<string>('2026-10-28');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    if (preselectedProductId) {
      setProductId(preselectedProductId);
    }
  }, [preselectedProductId]);

  const selectedProduct = state.stock_report.find((p) => p.product_id === productId);
  const parsedQty = parseInt(quantityStr, 10);
  const previewValidation = selectedProduct
    ? validateStockMovement(
        selectedProduct.current_stock,
        txType,
        Number.isNaN(parsedQty) ? 0 : parsedQty
      )
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedProduct) {
      setFeedback({ type: 'error', text: 'Please select a valid product.' });
      return;
    }

    if (Number.isNaN(parsedQty)) {
      setFeedback({ type: 'error', text: 'Please enter a valid integer quantity.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await onRecordTransaction({
        product_id: productId,
        transaction_type: txType,
        quantity: parsedQty,
        supplier_id:
          txType === 'STOCK_IN' && supplierId ? parseInt(supplierId, 10) : null,
        transaction_date: txDate,
        notes: notes.trim(),
      });

      if (!res.ok) {
        setFeedback({
          type: 'error',
          text: res.error || 'Transaction rejected by Python engine.',
        });
      } else {
        setFeedback({
          type: 'success',
          text: res.message || 'Stock movement logged and reconciled.',
        });
        setNotes('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTransactions = state.transactions.filter((tx) => {
    if (typeFilter !== 'ALL' && tx.transaction_type !== typeFilter) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase();
      return (
        tx.sku.toLowerCase().includes(q) ||
        tx.product_name.toLowerCase().includes(q) ||
        tx.notes.toLowerCase().includes(q) ||
        tx.supplier_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const maxGauge = selectedProduct
    ? Math.max(selectedProduct.current_stock, previewValidation?.projectedStock ?? 0, selectedProduct.reorder_level * 1.5, 30)
    : 50;
  const projectedPct = previewValidation
    ? Math.min(100, Math.max(0, (previewValidation.projectedStock / maxGauge) * 100))
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-slide">
      {/* Left Column: Record Stock Movement Form */}
      <section
        aria-labelledby="record-movement-heading"
        className="lg:col-span-4 bg-[#0f172a] border border-slate-800/90 rounded-xl p-6"
      >
        <h2 id="record-movement-heading" className="text-base font-semibold text-white">
          Record Stock Movement
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          All stock-in, stock-out, and audit adjustments are validated against current balance so stock never silently becomes negative.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="tx-product" className="block text-xs font-medium text-slate-300 mb-1">
              Product SKU
            </label>
            <select
              id="tx-product"
              value={productId}
              onChange={(e) => {
                setProductId(Number(e.target.value));
                setFeedback(null);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              {state.stock_report.map((item) => (
                <option key={item.product_id} value={item.product_id}>
                  {item.sku} — {item.product_name} (Stock: {item.current_stock})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Transaction Type
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg" role="group" aria-label="Select transaction type">
              {(['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTxType(t);
                    setFeedback(null);
                    if (t === 'ADJUSTMENT' && quantityStr === '5') {
                      setQuantityStr('-2');
                    } else if (t !== 'ADJUSTMENT' && quantityStr.startsWith('-')) {
                      setQuantityStr(String(Math.abs(parseInt(quantityStr, 10) || 5)));
                    }
                  }}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                    txType === t
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {t === 'STOCK_IN' ? 'Stock In (+)' : t === 'STOCK_OUT' ? 'Stock Out (-)' : 'Adjustment (±)'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tx-quantity" className="block text-xs font-medium text-slate-300 mb-1">
                {txType === 'ADJUSTMENT' ? 'Signed Qty (±)' : 'Quantity'}
              </label>
              <input
                id="tx-quantity"
                type="number"
                value={quantityStr}
                onChange={(e) => {
                  setQuantityStr(e.target.value);
                  setFeedback(null);
                }}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-900 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <div>
              <label htmlFor="tx-date" className="block text-xs font-medium text-slate-300 mb-1">
                Transaction Date
              </label>
              <input
                id="tx-date"
                type="date"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-900 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          {txType === 'STOCK_IN' && (
            <div>
              <label htmlFor="tx-supplier" className="block text-xs font-medium text-slate-300 mb-1">
                Supplier (Optional)
              </label>
              <select
                id="tx-supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="">— Select Supplier —</option>
                {state.suppliers.map((sup) => (
                  <option key={sup.supplier_id} value={sup.supplier_id}>
                    {sup.supplier_name} ({sup.lead_time_days}d lead)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="tx-notes" className="block text-xs font-medium text-slate-300 mb-1">
              Reference / Audit Notes
            </label>
            <input
              id="tx-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                txType === 'STOCK_IN'
                  ? 'e.g. PO-8910 restock delivery'
                  : txType === 'STOCK_OUT'
                  ? 'e.g. Production line requisition'
                  : 'e.g. Cycle count audit adjustment'
              }
              className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {/* Live Animated Reconciliation & Negative Stock Preview Box */}
          {selectedProduct && previewValidation && (
            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Current Balance ({selectedProduct.sku}):</span>
                <span className="font-mono tabular-nums font-semibold text-slate-200">
                  {selectedProduct.current_stock} units
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Projected Balance After Entry:</span>
                <span
                  className={`font-mono tabular-nums font-bold ${
                    previewValidation.projectedStock < 0
                      ? 'text-red-400'
                      : previewValidation.projectedStock <= selectedProduct.reorder_level
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {previewValidation.projectedStock} units
                </span>
              </div>

              <div className="h-2 bg-slate-950 rounded-full overflow-hidden relative border border-slate-800">
                <div
                  className={`h-full rounded-full spring-transition ${
                    previewValidation.projectedStock < 0
                      ? 'bg-red-500'
                      : previewValidation.projectedStock <= selectedProduct.reorder_level
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{
                    width: previewValidation.projectedStock < 0 ? '100%' : `${projectedPct}%`,
                  }}
                />
              </div>
            </div>
          )}

          {feedback && (
            <div
              role="alert"
              data-testid="transaction-feedback"
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 animate-fade-slide ${
                feedback.type === 'error'
                  ? 'bg-red-950/60 border-red-500/40 text-red-200'
                  : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              }`}
            >
              {feedback.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {submitting ? 'Recording in Python SQLite...' : 'Submit Stock Transaction'}
          </button>
        </form>
      </section>

      {/* Right Column: Reconciled Transaction History Log */}
      <section
        aria-labelledby="tx-history-heading"
        className="lg:col-span-8 bg-[#0f172a] border border-slate-800/90 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#111a2e]/50">
          <div>
            <h2 id="tx-history-heading" className="text-base font-semibold text-white">
              Logged Stock Transactions ({filteredTransactions.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Immutable audit trail of stock-in deliveries, stock-out requisitions, and inventory adjustments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter logs..."
                aria-label="Filter transaction logs"
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg" role="group" aria-label="Filter by movement type">
              {(['ALL', 'STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    typeFilter === t
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t === 'ALL' ? 'All' : t === 'STOCK_IN' ? 'In' : t === 'STOCK_OUT' ? 'Out' : 'Adj'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" data-testid="transaction-log-table">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/60 text-xs font-medium text-slate-400">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">SKU & Product</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Signed Qty</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {filteredTransactions.map((tx) => {
                const signedDisplay =
                  tx.transaction_type === 'STOCK_IN'
                    ? `+${tx.quantity}`
                    : tx.transaction_type === 'STOCK_OUT'
                    ? `-${tx.quantity}`
                    : tx.quantity > 0
                    ? `+${tx.quantity}`
                    : `${tx.quantity}`;

                const qtyColor =
                  tx.transaction_type === 'STOCK_IN'
                    ? 'text-emerald-400'
                    : tx.transaction_type === 'STOCK_OUT'
                    ? 'text-indigo-400'
                    : 'text-amber-400';

                return (
                  <tr key={tx.transaction_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">
                      #{tx.transaction_id}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-300 whitespace-nowrap">
                      {tx.transaction_date}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-semibold text-sky-400">
                        {tx.sku}
                      </span>
                      <span className="mx-1.5 text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-200 text-xs">{tx.product_name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                      {tx.transaction_type}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${qtyColor}`}>
                      {signedDisplay}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                      {tx.supplier_name}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {tx.notes || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
