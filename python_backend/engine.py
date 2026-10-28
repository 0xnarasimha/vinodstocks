#!/usr/bin/env python3
"""
Project 11: Inventory and Stock Analysis System
Core Python Execution Engine (SQLite3 + Movement & Valuation Analytics)
"""

import os
import sys
import json
import sqlite3
from datetime import datetime
from typing import Dict, Any, List, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "inventory.db")
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")

from analytics_pandas_numpy import (
    compute_stock_and_valuation_numpy,
    render_svg_stock_chart,
)


def render_svg_movement_chart(stock_report: List[Dict[str, Any]]) -> str:
    """
    Pure-Python SVG chart generator (Matplotlib dark style) for Stock-In vs Stock-Out Movements per SKU.
    """
    if not stock_report:
        return '<svg viewBox="0 0 760 280" xmlns="http://www.w3.org/2000/svg"></svg>'

    width, height = 760, 290
    pad_l, pad_r, pad_t, pad_b = 52, 24, 38, 62
    plot_w = width - pad_l - pad_r
    plot_h = height - pad_t - pad_b

    max_val = max(
        max((int(r["total_in"]) for r in stock_report), default=10),
        max((int(r["total_out"]) for r in stock_report), default=10),
        10,
    )
    y_max = int(((max_val * 1.15) // 10 + 1) * 10)

    lines = [
        f'<svg viewBox="0 0 {width} {height}" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Python Matplotlib Product Movement Chart">',
        '<rect width="100%" height="100%" fill="#0f172a" rx="8" />',
        f'<text x="{pad_l}" y="22" font-family="Plus Jakarta Sans, sans-serif" font-size="12" font-weight="600" fill="#f8fafc">Python Plot: Cumulative Stock-In vs. Stock-Out Movement by SKU</text>',
        f'<rect x="{width - 245}" y="12" width="10" height="10" fill="#10b981" rx="2" />',
        f'<text x="{width - 230}" y="21" font-family="Plus Jakarta Sans, sans-serif" font-size="11" fill="#94a3b8">Stock-In (+)</text>',
        f'<rect x="{width - 142}" y="12" width="10" height="10" fill="#6366f1" rx="2" />',
        f'<text x="{width - 127}" y="21" font-family="Plus Jakarta Sans, sans-serif" font-size="11" fill="#94a3b8">Stock-Out (-)</text>',
    ]

    for i in range(5):
        val = int(round(y_max * i / 4))
        y = pad_t + plot_h - (val / y_max) * plot_h
        lines.append(
            f'<line x1="{pad_l}" y1="{y:.1f}" x2="{width - pad_r}" y2="{y:.1f}" stroke="#1e293b" stroke-dasharray="3,3" stroke-width="1" />'
        )
        lines.append(
            f'<text x="{pad_l - 8}" y="{y + 4:.1f}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="10" fill="#64748b">{val}</text>'
        )

    n = len(stock_report)
    slot_w = plot_w / max(n, 1)
    bar_w = min(22.0, slot_w * 0.34)

    for idx, item in enumerate(stock_report):
        cx = pad_l + slot_w * (idx + 0.5)
        t_in = int(item["total_in"])
        t_out = int(item["total_out"])

        in_h = (t_in / y_max) * plot_h
        out_h = (t_out / y_max) * plot_h

        in_y = pad_t + plot_h - in_h
        out_y = pad_t + plot_h - out_h

        lines.append(
            f'<rect x="{cx - bar_w - 2:.1f}" y="{in_y:.1f}" width="{bar_w:.1f}" height="{max(in_h, 2):.1f}" fill="#10b981" rx="2" />'
        )
        lines.append(
            f'<text x="{cx - bar_w / 2 - 2:.1f}" y="{in_y - 5:.1f}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="600" fill="#34d399">+{t_in}</text>'
        )

        lines.append(
            f'<rect x="{cx + 2:.1f}" y="{out_y:.1f}" width="{bar_w:.1f}" height="{max(out_h, 2):.1f}" fill="#6366f1" rx="2" />'
        )
        lines.append(
            f'<text x="{cx + bar_w / 2 + 2:.1f}" y="{out_y - 5:.1f}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="600" fill="#818cf8">-{t_out}</text>'
        )

        sku_label = item["sku"]
        lines.append(
            f'<text x="{cx:.1f}" y="{pad_t + plot_h + 18:.1f}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" font-weight="600" fill="#e2e8f0">{sku_label}</text>'
        )
        vel_label = item["velocity_class"]
        lines.append(
            f'<text x="{cx:.1f}" y="{pad_t + plot_h + 32:.1f}" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="9.5" fill="#94a3b8">{vel_label}</text>'
        )

    lines.append(
        f'<line x1="{pad_l}" y1="{pad_t + plot_h}" x2="{width - pad_r}" y2="{pad_t + plot_h}" stroke="#334155" stroke-width="1.5" />'
    )
    lines.append("</svg>")
    return "\n".join(lines)


class InventoryEngine:
    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _init_db(self) -> None:
        with self._get_conn() as conn:
            with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
                conn.executescript(f.read())
            cur = conn.execute("SELECT COUNT(*) AS cnt FROM products")
            if cur.fetchone()["cnt"] == 0:
                self._seed_initial_data(conn)

    def _seed_initial_data(self, conn: sqlite3.Connection) -> None:
        suppliers = [
            ("Apex Industrial Supply", "orders@apexindustrial.com", 4),
            ("Nordic Precision Components", "dispatch@nordicprecision.se", 7),
            ("Vanguard Electronics Ltd", "supply@vanguardelectronics.io", 5),
            ("Pacifica Packaging Co", "logistics@pacificapack.com", 3),
        ]
        conn.executemany(
            "INSERT INTO suppliers (supplier_name, contact_email, lead_time_days) VALUES (?, ?, ?)",
            suppliers,
        )

        # (sku, product_name, category, opening_balance, reorder_level, unit_cost)
        products = [
            ("SKU-101", "Optical Proximity Sensor M18", "Sensors & Actuators", 40, 25, 48.50),
            ("SKU-102", "Programmable Logic Relay 24V", "Power & Controllers", 30, 20, 115.00),
            ("SKU-103", "Brushless Stepper Motor NEMA23", "Sensors & Actuators", 25, 18, 84.00),
            ("SKU-104", "DIN-Rail Switching Power 480W", "Power & Controllers", 20, 15, 62.75),
            ("SKU-105", "Stainless Hex Flange Bolt M8x30", "Mechanical Fasteners", 200, 80, 1.40),
            ("SKU-106", "Anti-Static Shielding Bag 300mm", "Packaging & Logistics", 120, 100, 0.95),
            ("SKU-107", "Industrial Ethernet Switch 8-Port", "Power & Controllers", 15, 12, 142.00),
            ("SKU-108", "Linear Guide Carriage Block HGH20", "Mechanical Fasteners", 28, 15, 36.20),
        ]
        conn.executemany(
            """
            INSERT INTO products (sku, product_name, category, opening_balance, reorder_level, unit_cost)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            products,
        )

        # Seed realistic transactions (product_id, date, type, quantity, supplier_id, notes)
        # Note: STOCK_IN adds quantity, STOCK_OUT subtracts quantity, ADJUSTMENT adds signed quantity
        transactions = [
            # SKU-101: Opening 40 + 20 - 42 - 2 = 16 (Below reorder level 25!)
            (1, "2026-10-12", "STOCK_IN", 20, 1, "PO-8801 restock shipment"),
            (1, "2026-10-16", "STOCK_OUT", 24, None, "Assembly Line A batch requisition"),
            (1, "2026-10-21", "STOCK_OUT", 18, None, "Assembly Line B sensor install"),
            (1, "2026-10-23", "ADJUSTMENT", -2, None, "QC inspection damaged housing"),
            # SKU-102: Opening 30 + 15 - 12 = 33 (Healthy, reorder 20)
            (2, "2026-10-13", "STOCK_IN", 15, 3, "PO-8804 controller delivery"),
            (2, "2026-10-19", "STOCK_OUT", 12, None, "Control cabinet build #14"),
            # SKU-103: Opening 25 + 10 - 22 = 13 (Below reorder level 18!)
            (3, "2026-10-14", "STOCK_IN", 10, 2, "Nordic batch delivery"),
            (3, "2026-10-18", "STOCK_OUT", 14, None, "CNC gantry assembly"),
            (3, "2026-10-24", "STOCK_OUT", 8, None, "Customer spare part order"),
            # SKU-104: Opening 20 + 12 - 9 = 23 (Healthy, reorder 15)
            (4, "2026-10-15", "STOCK_IN", 12, 3, "Routine power unit restock"),
            (4, "2026-10-22", "STOCK_OUT", 9, None, "Panel assembly run"),
            # SKU-105: Opening 200 + 150 - 230 + 5 = 125 (Healthy, Fast-Moving, reorder 80)
            (5, "2026-10-11", "STOCK_IN", 150, 1, "Bulk fastener carton"),
            (5, "2026-10-17", "STOCK_OUT", 140, None, "Chassis production run"),
            (5, "2026-10-25", "STOCK_OUT", 90, None, "Frame sub-assembly"),
            (5, "2026-10-26", "ADJUSTMENT", 5, None, "Cycle count surplus found in Bin C4"),
            # SKU-106: Opening 120 + 50 - 95 = 75 (Below reorder level 100!)
            (6, "2026-10-12", "STOCK_IN", 50, 4, "Packaging roll pack"),
            (6, "2026-10-20", "STOCK_OUT", 95, None, "Outbound electronics fulfillment"),
            # SKU-107: Opening 15 + 0 - 6 = 9 (Below reorder level 12!)
            (7, "2026-10-19", "STOCK_OUT", 6, None, "Network rack deployment"),
            # SKU-108: Opening 28 + 10 - 11 = 27 (Healthy, reorder 15)
            (8, "2026-10-14", "STOCK_IN", 10, 2, "Linear rail shipment"),
            (8, "2026-10-23", "STOCK_OUT", 11, None, "Automation cell build"),
        ]
        conn.executemany(
            """
            INSERT INTO stock_transactions
            (product_id, transaction_date, transaction_type, quantity, supplier_id, notes)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            transactions,
        )
        conn.commit()

    def reset_demo_data(self) -> Dict[str, Any]:
        with self._get_conn() as conn:
            conn.execute("DELETE FROM stock_transactions")
            conn.execute("DELETE FROM products")
            conn.execute("DELETE FROM suppliers")
            conn.execute("DELETE FROM sqlite_sequence")
            self._seed_initial_data(conn)
        return {"ok": True, "state": self.get_full_state()}

    def get_product_current_stock(self, conn: sqlite3.Connection, product_id: int) -> Optional[Dict[str, Any]]:
        cur = conn.execute(
            "SELECT product_id, sku, product_name, opening_balance, reorder_level, unit_cost FROM products WHERE product_id = ?",
            (product_id,),
        )
        prod = cur.fetchone()
        if not prod:
            return None

        tx_cur = conn.execute(
            "SELECT transaction_type, quantity FROM stock_transactions WHERE product_id = ?",
            (product_id,),
        )
        total_in = 0
        total_out = 0
        total_adj = 0
        for row in tx_cur.fetchall():
            ttype = row["transaction_type"]
            qty = int(row["quantity"])
            if ttype == "STOCK_IN":
                total_in += qty
            elif ttype == "STOCK_OUT":
                total_out += qty
            elif ttype == "ADJUSTMENT":
                total_adj += qty

        opening = int(prod["opening_balance"])
        current_stock = opening + total_in - total_out + total_adj
        return {
            "product_id": int(prod["product_id"]),
            "sku": prod["sku"],
            "product_name": prod["product_name"],
            "opening_balance": opening,
            "total_in": total_in,
            "total_out": total_out,
            "total_adjustment": total_adj,
            "current_stock": current_stock,
        }

    def record_transaction(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        try:
            product_id = int(payload.get("product_id", 0))
        except (ValueError, TypeError):
            return {"ok": False, "error": "Please select a valid product."}

        tx_type = str(payload.get("transaction_type", "")).strip().upper()
        if tx_type not in ("STOCK_IN", "STOCK_OUT", "ADJUSTMENT"):
            return {
                "ok": False,
                "error": "Transaction type must be STOCK_IN, STOCK_OUT, or ADJUSTMENT.",
            }

        try:
            quantity = int(payload.get("quantity", 0))
        except (ValueError, TypeError):
            return {"ok": False, "error": "Quantity must be a valid integer."}

        if tx_type in ("STOCK_IN", "STOCK_OUT") and quantity <= 0:
            return {
                "ok": False,
                "error": f"Quantity for {tx_type} must be a positive integer greater than 0.",
            }
        if tx_type == "ADJUSTMENT" and quantity == 0:
            return {
                "ok": False,
                "error": "Adjustment quantity cannot be zero (use positive for surplus, negative for shrinkage).",
            }

        tx_date = str(payload.get("transaction_date") or datetime.now().strftime("%Y-%m-%d")).strip()
        notes = str(payload.get("notes") or "").strip()
        if tx_type == "ADJUSTMENT" and not notes:
            notes = "Logged inventory audit adjustment"

        raw_supplier = payload.get("supplier_id")
        supplier_id = int(raw_supplier) if raw_supplier not in (None, "", 0, "0") else None

        with self._get_conn() as conn:
            stock_info = self.get_product_current_stock(conn, product_id)
            if not stock_info:
                return {"ok": False, "error": f"Product ID {product_id} does not exist."}

            signed_delta = (
                quantity
                if tx_type == "STOCK_IN"
                else (-quantity if tx_type == "STOCK_OUT" else quantity)
            )
            projected_stock = stock_info["current_stock"] + signed_delta

            # ACCEPTANCE CRITERION: Stock cannot silently become negative
            if projected_stock < 0:
                return {
                    "ok": False,
                    "error": (
                        f"Negative stock prevented for {stock_info['sku']} ({stock_info['product_name']}): "
                        f"Current stock is {stock_info['current_stock']} units. "
                        f"Applying a change of {signed_delta} units would result in {projected_stock} units."
                    ),
                }

            conn.execute(
                """
                INSERT INTO stock_transactions
                (product_id, transaction_date, transaction_type, quantity, supplier_id, notes)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (product_id, tx_date, tx_type, quantity, supplier_id, notes),
            )
            conn.commit()

        return {
            "ok": True,
            "message": f"Recorded {tx_type} ({signed_delta:+d} units) for {stock_info['sku']}. New stock: {projected_stock} units.",
            "state": self.get_full_state(),
        }

    def add_product(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        sku = str(payload.get("sku") or "").strip().upper()
        product_name = str(payload.get("product_name") or "").strip()
        category = str(payload.get("category") or "").strip()

        if not sku or not product_name or not category:
            return {"ok": False, "error": "SKU, Product Name, and Category are required."}

        try:
            opening_balance = int(payload.get("opening_balance", 0))
            reorder_level = int(payload.get("reorder_level", 10))
            unit_cost = round(float(payload.get("unit_cost", 0.0)), 2)
        except (ValueError, TypeError):
            return {
                "ok": False,
                "error": "Opening balance, reorder level, and unit cost must be valid numbers.",
            }

        if opening_balance < 0 or reorder_level < 0 or unit_cost < 0:
            return {
                "ok": False,
                "error": "Opening balance, reorder level, and unit cost cannot be negative.",
            }

        try:
            with self._get_conn() as conn:
                conn.execute(
                    """
                    INSERT INTO products (sku, product_name, category, opening_balance, reorder_level, unit_cost)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (sku, product_name, category, opening_balance, reorder_level, unit_cost),
                )
                conn.commit()
        except sqlite3.IntegrityError:
            return {"ok": False, "error": f"A product with SKU '{sku}' already exists."}

        return {
            "ok": True,
            "message": f"Added product {sku} ({product_name}).",
            "state": self.get_full_state(),
        }

    def update_reorder_level(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        try:
            product_id = int(payload.get("product_id", 0))
            reorder_level = int(payload.get("reorder_level", -1))
        except (ValueError, TypeError):
            return {"ok": False, "error": "Product ID and reorder level must be integers."}

        if reorder_level < 0:
            return {"ok": False, "error": "Reorder threshold cannot be negative."}

        with self._get_conn() as conn:
            cur = conn.execute(
                "UPDATE products SET reorder_level = ? WHERE product_id = ?",
                (reorder_level, product_id),
            )
            if cur.rowcount == 0:
                return {"ok": False, "error": f"Product ID {product_id} not found."}
            conn.commit()

        return {
            "ok": True,
            "message": f"Updated configurable reorder threshold to {reorder_level} units.",
            "state": self.get_full_state(),
        }

    def add_supplier(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        supplier_name = str(payload.get("supplier_name") or "").strip()
        contact_email = str(payload.get("contact_email") or "").strip()
        try:
            lead_time_days = int(payload.get("lead_time_days", 5))
        except (ValueError, TypeError):
            lead_time_days = 5

        if not supplier_name:
            return {"ok": False, "error": "Supplier name is required."}
        if lead_time_days < 1:
            return {"ok": False, "error": "Lead time must be at least 1 day."}

        try:
            with self._get_conn() as conn:
                conn.execute(
                    "INSERT INTO suppliers (supplier_name, contact_email, lead_time_days) VALUES (?, ?, ?)",
                    (supplier_name, contact_email, lead_time_days),
                )
                conn.commit()
        except sqlite3.IntegrityError:
            return {"ok": False, "error": f"Supplier '{supplier_name}' already exists."}

        return {
            "ok": True,
            "message": f"Added supplier '{supplier_name}'.",
            "state": self.get_full_state(),
        }

    def get_full_state(self) -> Dict[str, Any]:
        with self._get_conn() as conn:
            products = [
                dict(r)
                for r in conn.execute(
                    "SELECT * FROM products ORDER BY product_id ASC"
                ).fetchall()
            ]
            suppliers = [
                dict(r)
                for r in conn.execute(
                    "SELECT * FROM suppliers ORDER BY supplier_id ASC"
                ).fetchall()
            ]
            transactions = [
                dict(r)
                for r in conn.execute(
                    """
                    SELECT
                        t.transaction_id,
                        t.product_id,
                        p.sku,
                        p.product_name,
                        p.category,
                        t.transaction_date,
                        t.transaction_type,
                        t.quantity,
                        t.supplier_id,
                        COALESCE(s.supplier_name, '—') AS supplier_name,
                        t.notes
                    FROM stock_transactions t
                    JOIN products p ON p.product_id = t.product_id
                    LEFT JOIN suppliers s ON s.supplier_id = t.supplier_id
                    ORDER BY t.transaction_date DESC, t.transaction_id DESC
                    """
                ).fetchall()
            ]

        # Group movements by product_id
        tx_by_pid: Dict[int, List[Dict[str, Any]]] = {}
        for tx in transactions:
            pid = int(tx["product_id"])
            tx_by_pid.setdefault(pid, []).append(tx)

        # Calculate median outbound units to classify Fast-Moving vs Moderate vs Slow-Moving
        outbound_totals = []
        for p in products:
            pid = int(p["product_id"])
            out_qty = sum(
                int(t["quantity"])
                for t in tx_by_pid.get(pid, [])
                if t["transaction_type"] == "STOCK_OUT"
            )
            outbound_totals.append(out_qty)

        sorted_out = sorted(outbound_totals)
        high_velocity_cutoff = sorted_out[int(len(sorted_out) * 0.65)] if sorted_out else 15

        stock_report: List[Dict[str, Any]] = []
        low_stock_list: List[Dict[str, Any]] = []
        category_Map: Dict[str, Dict[str, Any]] = {}
        all_reconciled = True

        for p in products:
            pid = int(p["product_id"])
            p_txs = tx_by_pid.get(pid, [])
            opening = int(p["opening_balance"])
            reorder_lvl = int(p["reorder_level"])
            unit_cost = float(p["unit_cost"])

            total_in = sum(
                int(t["quantity"]) for t in p_txs if t["transaction_type"] == "STOCK_IN"
            )
            total_out = sum(
                int(t["quantity"]) for t in p_txs if t["transaction_type"] == "STOCK_OUT"
            )
            total_adj = sum(
                int(t["quantity"]) for t in p_txs if t["transaction_type"] == "ADJUSTMENT"
            )

            net_movement = total_in - total_out + total_adj
            current_stock = opening + net_movement
            reconciled = (opening + total_in - total_out + total_adj == current_stock) and (
                current_stock >= 0
            )
            if not reconciled:
                all_reconciled = False

            stock_value = round(current_stock * unit_cost, 2)
            is_low_stock = current_stock <= reorder_lvl

            # Turnover / Velocity analysis
            avg_stock = max((opening + current_stock) / 2.0, 1.0)
            turnover_ratio = round(total_out / avg_stock, 2)
            if total_out >= max(high_velocity_cutoff, 15) or turnover_ratio >= 0.75:
                velocity_class = "Fast-Moving"
            elif total_out >= 10 or turnover_ratio >= 0.35:
                velocity_class = "Moderate"
            else:
                velocity_class = "Slow-Moving"

            item_row = {
                "product_id": pid,
                "sku": p["sku"],
                "product_name": p["product_name"],
                "category": p["category"],
                "opening_balance": opening,
                "total_in": total_in,
                "total_out": total_out,
                "total_adjustment": total_adj,
                "net_movement": net_movement,
                "current_stock": current_stock,
                "reorder_level": reorder_lvl,
                "unit_cost": unit_cost,
                "stock_value": stock_value,
                "is_low_stock": is_low_stock,
                "reconciled": reconciled,
                "tx_count": len(p_txs),
                "turnover_ratio": turnover_ratio,
                "velocity_class": velocity_class,
            }
            stock_report.append(item_row)

            if is_low_stock:
                deficit = max(0, reorder_lvl - current_stock)
                recommended_qty = max(reorder_lvl * 2 - current_stock, reorder_lvl, 10)
                low_stock_list.append(
                    {
                        **item_row,
                        "deficit": deficit,
                        "recommended_reorder_qty": recommended_qty,
                        "estimated_reorder_cost": round(recommended_qty * unit_cost, 2),
                    }
                )

            cat = p["category"]
            if cat not in category_Map:
                category_Map[cat] = {
                    "category": cat,
                    "sku_count": 0,
                    "total_units": 0,
                    "total_value": 0.0,
                    "low_stock_skus": 0,
                }
            category_Map[cat]["sku_count"] += 1
            category_Map[cat]["total_units"] += current_stock
            category_Map[cat]["total_value"] = round(
                category_Map[cat]["total_value"] + stock_value, 2
            )
            if is_low_stock:
                category_Map[cat]["low_stock_skus"] += 1

        numpy_summary = compute_stock_and_valuation_numpy(products, transactions)

        # Sort fast moving products by outbound units descending
        fast_moving_ranking = sorted(
            stock_report, key=lambda r: (r["total_out"], r["turnover_ratio"]), reverse=True
        )

        # Daily movement summary (Pandas-equivalent groupby date)
        daily_map: Dict[str, Dict[str, Any]] = {}
        for tx in transactions:
            d = tx["transaction_date"]
            if d not in daily_map:
                daily_map[d] = {
                    "date": d,
                    "stock_in": 0,
                    "stock_out": 0,
                    "adjustments": 0,
                    "net_change": 0,
                    "tx_count": 0,
                }
            qty = int(tx["quantity"])
            ttype = tx["transaction_type"]
            if ttype == "STOCK_IN":
                daily_map[d]["stock_in"] += qty
                daily_map[d]["net_change"] += qty
            elif ttype == "STOCK_OUT":
                daily_map[d]["stock_out"] += qty
                daily_map[d]["net_change"] -= qty
            else:
                daily_map[d]["adjustments"] += qty
                daily_map[d]["net_change"] += qty
            daily_map[d]["tx_count"] += 1

        daily_summaries = sorted(daily_map.values(), key=lambda x: x["date"], reverse=True)

        # Read Python source files for transparency in the UI
        source_files = {}
        for fname in ("flask_app.py", "analytics_pandas_numpy.py", "engine.py", "schema.sql"):
            fpath = os.path.join(BASE_DIR, fname)
            if os.path.exists(fpath):
                with open(fpath, "r", encoding="utf-8") as f:
                    source_files[fname] = f.read()

        return {
            "summary": {
                **numpy_summary,
                "total_skus": len(products),
                "total_suppliers": len(suppliers),
                "total_transactions": len(transactions),
                "total_in_units": sum(r["total_in"] for r in stock_report),
                "total_out_units": sum(r["total_out"] for r in stock_report),
                "total_adjustment_units": sum(r["total_adjustment"] for r in stock_report),
                "all_reconciled": all_reconciled,
                "python_version": sys.version.split()[0],
            },
            "stock_report": stock_report,
            "low_stock_list": low_stock_list,
            "fast_moving_ranking": fast_moving_ranking,
            "category_valuation": list(category_Map.values()),
            "daily_summaries": daily_summaries,
            "transactions": transactions,
            "suppliers": suppliers,
            "charts": {
                "stock_level_svg": render_svg_stock_chart(stock_report),
                "movement_velocity_svg": render_svg_movement_chart(stock_report),
            },
            "python_sources": source_files,
        }


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "Missing command argument"}))
        sys.exit(1)

    cmd = sys.argv[1]
    payload = json.loads(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else {}
    engine = InventoryEngine()

    if cmd == "get_state":
        print(json.dumps({"ok": True, "state": engine.get_full_state()}))
    elif cmd == "record_transaction":
        print(json.dumps(engine.record_transaction(payload)))
    elif cmd == "add_product":
        print(json.dumps(engine.add_product(payload)))
    elif cmd == "update_reorder_level":
        print(json.dumps(engine.update_reorder_level(payload)))
    elif cmd == "add_supplier":
        print(json.dumps(engine.add_supplier(payload)))
    elif cmd == "reset_demo":
        print(json.dumps(engine.reset_demo_data()))
    else:
        print(json.dumps({"ok": False, "error": f"Unknown command: {cmd}"}))


if __name__ == "__main__":
    main()
