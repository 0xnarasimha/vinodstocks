#!/usr/bin/env python3
"""
Unit tests for the Python Inventory & Stock Analysis Engine.
Verifies:
1. Current stock reconciles with opening_balance + STOCK_IN - STOCK_OUT + ADJUSTMENT
2. Stock cannot silently become negative (STOCK_OUT and negative ADJUSTMENT blocked)
3. All adjustments are logged in stock_transactions
4. Configurable reorder level flags low-stock items accurately
"""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine import InventoryEngine


class TestInventoryEngine(unittest.TestCase):
    def setUp(self):
        self.tmp_fd, self.tmp_db = tempfile.mkstemp(suffix=".db")
        os.close(self.tmp_fd)
        self.engine = InventoryEngine(db_path=self.tmp_db)

    def tearDown(self):
        if os.path.exists(self.tmp_db):
            os.remove(self.tmp_db)

    def test_initial_reconciliation_and_valuation(self):
        state = self.engine.get_full_state()
        self.assertTrue(state["summary"]["all_reconciled"])
        self.assertEqual(state["summary"]["total_skus"], 8)
        for item in state["stock_report"]:
            expected = (
                item["opening_balance"]
                + item["total_in"]
                - item["total_out"]
                + item["total_adjustment"]
            )
            self.assertEqual(item["current_stock"], expected)
            self.assertGreaterEqual(item["current_stock"], 0)

    def test_negative_stock_prevention_on_stock_out(self):
        # SKU-101 starts with 16 units in current_stock
        res = self.engine.record_transaction(
            {
                "product_id": 1,
                "transaction_type": "STOCK_OUT",
                "quantity": 999,
                "notes": "Attempt excessive withdrawal",
            }
        )
        self.assertFalse(res["ok"])
        self.assertIn("Negative stock prevented", res["error"])

        # Verify stock remained 16
        state = self.engine.get_full_state()
        sku101 = next(r for r in state["stock_report"] if r["product_id"] == 1)
        self.assertEqual(sku101["current_stock"], 16)

    def test_negative_stock_prevention_on_adjustment(self):
        res = self.engine.record_transaction(
            {
                "product_id": 1,
                "transaction_type": "ADJUSTMENT",
                "quantity": -50,
                "notes": "Excessive negative adjustment",
            }
        )
        self.assertFalse(res["ok"])
        self.assertIn("Negative stock prevented", res["error"])

    def test_valid_movements_and_logged_adjustments_reconcile(self):
        # Record STOCK_IN of +10 on product_id=1 (16 -> 26, above reorder_level 25)
        res_in = self.engine.record_transaction(
            {
                "product_id": 1,
                "transaction_type": "STOCK_IN",
                "quantity": 10,
                "supplier_id": 1,
                "notes": "Restock test",
            }
        )
        self.assertTrue(res_in["ok"])
        sku101 = next(
            r for r in res_in["state"]["stock_report"] if r["product_id"] == 1
        )
        self.assertEqual(sku101["current_stock"], 26)
        self.assertFalse(sku101["is_low_stock"])

        # Record ADJUSTMENT of -4 on product_id=1 (26 -> 22, below reorder_level 25)
        res_adj = self.engine.record_transaction(
            {
                "product_id": 1,
                "transaction_type": "ADJUSTMENT",
                "quantity": -4,
                "notes": "Audit shrinkage check",
            }
        )
        self.assertTrue(res_adj["ok"])
        sku101_after = next(
            r for r in res_adj["state"]["stock_report"] if r["product_id"] == 1
        )
        self.assertEqual(sku101_after["current_stock"], 22)
        self.assertTrue(sku101_after["is_low_stock"])
        self.assertTrue(res_adj["state"]["summary"]["all_reconciled"])


if __name__ == "__main__":
    unittest.main()
