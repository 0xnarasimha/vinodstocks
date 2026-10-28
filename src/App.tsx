import React, { useEffect, useState, useCallback } from 'react';
import {
  InventoryState,
  StockReportItem,
  TransactionType,
  generateStockCsv,
} from './utils/inventoryLogic';
import { StockReportView } from './components/StockReportView';
import { TransactionsView } from './components/TransactionsView';
import { AnalyticsView } from './components/AnalyticsView';
import { CatalogSuppliersView } from './components/CatalogSuppliersView';
import { PythonSourceView } from './components/PythonSourceView';
import { AlertCircle } from 'lucide-react';

type ActiveTab = 'report' | 'transactions' | 'analytics' | 'catalog' | 'python';

export default function App() {
  const [state, setState] = useState<InventoryState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('report');
  const [preselectedProductId, setPreselectedProductId] = useState<number | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/state');
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || 'Failed to load inventory state from Python engine');
      }
      setState(data.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach Python backend');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const showBanner = (msg: string) => {
    setBannerNotice(msg);
    setTimeout(() => {
      setBannerNotice((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const handleRecordTransaction = async (payload: {
    product_id: number;
    transaction_type: TransactionType;
    quantity: number;
    supplier_id: number | null;
    transaction_date: string;
    notes: string;
  }) => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.ok && data.state) {
      setState(data.state);
    }
    return data;
  };

  const handleUpdateReorderLevel = async (productId: number, newLevel: number) => {
    const res = await fetch(`/api/products/${productId}/reorder-level`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reorder_level: newLevel }),
    });
    const data = await res.json();
    if (data.ok && data.state) {
      setState(data.state);
      showBanner(data.message || 'Updated reorder threshold.');
    }
  };

  const handleQuickRestock = async (item: StockReportItem, recommendedQty: number) => {
    const res = await handleRecordTransaction({
      product_id: item.product_id,
      transaction_type: 'STOCK_IN',
      quantity: recommendedQty,
      supplier_id: state?.suppliers[0]?.supplier_id ?? null,
      transaction_date: '2026-10-28',
      notes: `Threshold restock (+${recommendedQty} units above reorder level ${item.reorder_level})`,
    });
    if (res.ok) {
      showBanner(`Restocked +${recommendedQty} units for ${item.sku} (${item.product_name}).`);
    }
  };

  const handleAddProduct = async (payload: {
    sku: string;
    product_name: string;
    category: string;
    opening_balance: number;
    reorder_level: number;
    unit_cost: number;
  }) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.ok && data.state) {
      setState(data.state);
    }
    return data;
  };

  const handleAddSupplier = async (payload: {
    supplier_name: string;
    contact_email: string;
    lead_time_days: number;
  }) => {
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.ok && data.state) {
      setState(data.state);
    }
    return data;
  };

  const handleResetDemo = async () => {
    const res = await fetch('/api/reset', { method: 'POST' });
    const data = await res.json();
    if (data.ok && data.state) {
      setState(data.state);
      showBanner('Reset database to initial seed inventory.');
    }
  };

  const handleDownloadCsv = () => {
    if (!state) return;
    const csvContent = generateStockCsv(state.stock_report);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'pystock_current_stock_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'report', label: 'Stock Report' },
    { id: 'transactions', label: 'Movements & Log' },
    { id: 'analytics', label: 'Analytics & Charts' },
    { id: 'catalog', label: 'Products & Suppliers' },
    { id: 'python', label: 'Python Code' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-[#0b111e]/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30">
        <a
          href="#report"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('report');
          }}
          className="text-lg font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0"
        >
          PyStock Analytics
        </a>

        <nav
          aria-label="Primary Navigation"
          className="flex items-center gap-6 overflow-x-auto text-sm font-medium text-slate-400"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`py-1.5 border-b-2 transition-all whitespace-nowrap shrink-0 ${
                activeTab === item.id
                  ? 'border-sky-400 text-white font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={!state}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            Download CSV
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-6 py-8">
        {/* Contextual Workspace Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
              Inventory & Stock Intelligence Studio
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Python-backed stock transaction ledger, configurable reorder threshold alerts, movement velocity rankings, and live valuation topology.
            </p>
          </div>
          {bannerNotice && (
            <div
              role="status"
              className="px-3.5 py-2 text-xs font-medium bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 rounded-lg animate-fade-slide"
            >
              {bannerNotice}
            </div>
          )}
        </div>

        {loading && (
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-8 space-y-4">
            <div className="h-6 w-48 bg-slate-800 rounded animate-pulse" />
            <div className="h-10 w-full bg-slate-800 rounded animate-pulse" />
            <div className="h-10 w-full bg-slate-800 rounded animate-pulse" />
            <div className="h-10 w-full bg-slate-800 rounded animate-pulse" />
          </div>
        )}

        {error && !loading && (
          <div
            role="alert"
            className="bg-red-950/60 border border-red-500/40 rounded-xl p-6 flex items-center justify-between gap-4 text-sm text-red-200"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchState}
              className="px-3 py-1.5 text-xs font-medium bg-slate-900 border border-red-500/40 rounded-md hover:bg-slate-800 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        {!loading && !error && state && (
          <div key={activeTab} className="animate-fade-slide">
            {activeTab === 'report' && (
              <StockReportView
                state={state}
                onUpdateReorderLevel={handleUpdateReorderLevel}
                onQuickRestock={handleQuickRestock}
                onNavigateToTransactions={(productId) => {
                  if (productId) setPreselectedProductId(productId);
                  setActiveTab('transactions');
                }}
                onNavigateToAnalytics={() => setActiveTab('analytics')}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsView
                state={state}
                preselectedProductId={preselectedProductId}
                onRecordTransaction={handleRecordTransaction}
              />
            )}

            {activeTab === 'analytics' && <AnalyticsView state={state} />}

            {activeTab === 'catalog' && (
              <CatalogSuppliersView
                state={state}
                onAddProduct={handleAddProduct}
                onAddSupplier={handleAddSupplier}
                onResetDemo={handleResetDemo}
              />
            )}

            {activeTab === 'python' && <PythonSourceView state={state} />}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/80 bg-[#0b111e] px-6 py-4 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
        <div>
          Project 11: Inventory & Stock Analysis System · Python SQLite & Data Analytics Engine
        </div>
        <div>
          All adjustments logged · Negative stock prevented · Transaction history reconciled
        </div>
      </footer>
    </div>
  );
}
