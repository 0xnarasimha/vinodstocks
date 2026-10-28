import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateReconciledStock,
  validateStockMovement,
  filterStockReport,
  StockReportItem,
} from './inventoryLogic';

test('calculateReconciledStock reconciles opening balance and all movement types', () => {
  assert.equal(calculateReconciledStock(40, 20, 42, -2), 16);
  assert.equal(calculateReconciledStock(200, 150, 230, 5), 125);
});

test('validateStockMovement blocks negative stock on STOCK_OUT and ADJUSTMENT', () => {
  const outAttempt = validateStockMovement(16, 'STOCK_OUT', 20);
  assert.equal(outAttempt.valid, false);
  assert.equal(outAttempt.projectedStock, -4);
  assert.ok(outAttempt.error?.includes('Negative stock prevented'));

  const adjAttempt = validateStockMovement(10, 'ADJUSTMENT', -15);
  assert.equal(adjAttempt.valid, false);
  assert.equal(adjAttempt.projectedStock, -5);

  const validOut = validateStockMovement(16, 'STOCK_OUT', 16);
  assert.equal(validOut.valid, true);
  assert.equal(validOut.projectedStock, 0);

  const validIn = validateStockMovement(16, 'STOCK_IN', 10);
  assert.equal(validIn.valid, true);
  assert.equal(validIn.projectedStock, 26);
});

test('filterStockReport filters by search query, category, and low-stock status', () => {
  const sample: StockReportItem[] = [
    {
      product_id: 1,
      sku: 'SKU-101',
      product_name: 'Optical Proximity Sensor M18',
      category: 'Sensors & Actuators',
      opening_balance: 40,
      total_in: 20,
      total_out: 42,
      total_adjustment: -2,
      net_movement: -24,
      current_stock: 16,
      reorder_level: 25,
      unit_cost: 48.5,
      stock_value: 776,
      is_low_stock: true,
      reconciled: true,
      tx_count: 4,
      turnover_ratio: 1.5,
      velocity_class: 'Fast-Moving',
    },
    {
      product_id: 2,
      sku: 'SKU-102',
      product_name: 'Programmable Logic Relay 24V',
      category: 'Power & Controllers',
      opening_balance: 30,
      total_in: 15,
      total_out: 12,
      total_adjustment: 0,
      net_movement: 3,
      current_stock: 33,
      reorder_level: 20,
      unit_cost: 115,
      stock_value: 3795,
      is_low_stock: false,
      reconciled: true,
      tx_count: 2,
      turnover_ratio: 0.38,
      velocity_class: 'Moderate',
    },
  ];

  assert.equal(filterStockReport(sample, '', 'ALL', 'LOW_STOCK').length, 1);
  assert.equal(filterStockReport(sample, 'relay', 'ALL', 'ALL')[0].sku, 'SKU-102');
  assert.equal(filterStockReport(sample, '', 'Sensors & Actuators', 'FAST_MOVING').length, 1);
});
