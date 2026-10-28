export type TransactionType = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';

export interface StockReportItem {
  product_id: number;
  sku: string;
  product_name: string;
  category: string;
  opening_balance: number;
  total_in: number;
  total_out: number;
  total_adjustment: number;
  net_movement: number;
  current_stock: number;
  reorder_level: number;
  unit_cost: number;
  stock_value: number;
  is_low_stock: boolean;
  reconciled: boolean;
  tx_count: number;
  turnover_ratio: number;
  velocity_class: 'Fast-Moving' | 'Moderate' | 'Slow-Moving';
}

export interface LowStockItem extends StockReportItem {
  deficit: number;
  recommended_reorder_qty: number;
  estimated_reorder_cost: number;
}

export interface StockTransaction {
  transaction_id: number;
  product_id: number;
  sku: string;
  product_name: string;
  category: string;
  transaction_date: string;
  transaction_type: TransactionType;
  quantity: number;
  supplier_id: number | null;
  supplier_name: string;
  notes: string;
}

export interface Supplier {
  supplier_id: number;
  supplier_name: string;
  contact_email: string;
  lead_time_days: number;
}

export interface CategoryValuation {
  category: string;
  sku_count: number;
  total_units: number;
  total_value: number;
  low_stock_skus: number;
}

export interface DailySummary {
  date: string;
  stock_in: number;
  stock_out: number;
  adjustments: number;
  net_change: number;
  tx_count: number;
}

export interface InventoryState {
  summary: {
    total_inventory_value: number;
    total_units_in_stock: number;
    low_stock_count: number;
    mean_product_value: number;
    total_skus: number;
    total_suppliers: number;
    total_transactions: number;
    total_in_units: number;
    total_out_units: number;
    total_adjustment_units: number;
    all_reconciled: boolean;
    python_version: string;
  };
  stock_report: StockReportItem[];
  low_stock_list: LowStockItem[];
  fast_moving_ranking: StockReportItem[];
  category_valuation: CategoryValuation[];
  daily_summaries: DailySummary[];
  transactions: StockTransaction[];
  suppliers: Supplier[];
  charts: {
    stock_level_svg: string;
    movement_velocity_svg: string;
  };
  python_sources: Record<string, string>;
}

/**
 * Pure client-side validation & reconciliation helpers mirroring Python engine rules.
 */
export function calculateReconciledStock(
  openingBalance: number,
  totalIn: number,
  totalOut: number,
  totalAdjustment: number
): number {
  return openingBalance + totalIn - totalOut + totalAdjustment;
}

export function validateStockMovement(
  currentStock: number,
  transactionType: TransactionType,
  quantity: number
): { valid: boolean; projectedStock: number; error?: string } {
  if (!Number.isInteger(quantity)) {
    return { valid: false, projectedStock: currentStock, error: 'Quantity must be a whole integer.' };
  }
  if ((transactionType === 'STOCK_IN' || transactionType === 'STOCK_OUT') && quantity <= 0) {
    return {
      valid: false,
      projectedStock: currentStock,
      error: `Quantity for ${transactionType} must be greater than 0.`,
    };
  }
  if (transactionType === 'ADJUSTMENT' && quantity === 0) {
    return {
      valid: false,
      projectedStock: currentStock,
      error: 'Adjustment quantity cannot be zero.',
    };
  }

  const signedDelta =
    transactionType === 'STOCK_IN'
      ? quantity
      : transactionType === 'STOCK_OUT'
      ? -quantity
      : quantity;

  const projectedStock = currentStock + signedDelta;
  if (projectedStock < 0) {
    return {
      valid: false,
      projectedStock,
      error: `Negative stock prevented: Current stock is ${currentStock} units; applying ${signedDelta} units would result in ${projectedStock} units.`,
    };
  }

  return { valid: true, projectedStock };
}

export function filterStockReport(
  items: StockReportItem[],
  searchQuery: string,
  categoryFilter: string,
  statusFilter: 'ALL' | 'LOW_STOCK' | 'FAST_MOVING'
): StockReportItem[] {
  const q = searchQuery.trim().toLowerCase();
  return items.filter((item) => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
      return false;
    }
    if (statusFilter === 'LOW_STOCK' && !item.is_low_stock) {
      return false;
    }
    if (statusFilter === 'FAST_MOVING' && item.velocity_class !== 'Fast-Moving') {
      return false;
    }
    if (q) {
      return (
        item.sku.toLowerCase().includes(q) ||
        item.product_name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }
    return true;
  });
}

export function generateStockCsv(items: StockReportItem[]): string {
  const headers = [
    'SKU',
    'Product Name',
    'Category',
    'Opening Balance',
    'Stock In',
    'Stock Out',
    'Adjustments',
    'Current Stock',
    'Reorder Level',
    'Status',
    'Velocity',
    'Unit Cost ($)',
    'Total Value ($)',
  ];
  const rows = items.map((r) => [
    r.sku,
    `"${r.product_name.replace(/"/g, '""')}"`,
    `"${r.category}"`,
    r.opening_balance,
    r.total_in,
    r.total_out,
    r.total_adjustment,
    r.current_stock,
    r.reorder_level,
    r.is_low_stock ? 'BELOW_REORDER' : 'OK',
    r.velocity_class,
    r.unit_cost.toFixed(2),
    r.stock_value.toFixed(2),
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
