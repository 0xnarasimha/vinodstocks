"""
Project 11: Inventory and Stock Analysis System
Data Analysis & Visualization Module (Pandas, NumPy, Matplotlib)
----------------------------------------------------------------
Provides:
1. Pandas movement summaries (IN, OUT, ADJUSTMENT by product and date)
2. NumPy stock reconciliation and inventory valuation calculations
3. Matplotlib stock-level vs. reorder-level and product-movement charts
"""

import io
import base64
from typing import List, Dict, Any

# Standard Pandas / NumPy / Matplotlib implementation
try:
    import numpy as np
    import pandas as pd
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    HAS_DATA_STACK = True
except ImportError:
    HAS_DATA_STACK = False


def compute_stock_and_valuation_numpy(
    products: List[Dict[str, Any]],
    transactions: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Uses NumPy arrays to compute current stock from opening_balance + net movements,
    flag low-stock items against configurable reorder_level, and calculate stock valuation.
    """
    if HAS_DATA_STACK and len(products) > 0:
        df_prod = pd.DataFrame(products)
        df_tx = pd.DataFrame(transactions) if transactions else pd.DataFrame(
            columns=["product_id", "transaction_type", "quantity"]
        )

        # Signed movement calculation in Pandas
        if not df_tx.empty:
            df_tx["signed_qty"] = np.where(
                df_tx["transaction_type"] == "STOCK_IN",
                df_tx["quantity"],
                np.where(
                    df_tx["transaction_type"] == "STOCK_OUT",
                    -df_tx["quantity"],
                    df_tx["quantity"],  # ADJUSTMENT is already signed (+ or -)
                ),
            )
            net_movements = df_tx.groupby("product_id")["signed_qty"].sum().reindex(
                df_prod["product_id"], fill_value=0
            ).to_numpy()
        else:
            net_movements = np.zeros(len(df_prod), dtype=int)

        opening = df_prod["opening_balance"].to_numpy(dtype=int)
        reorder = df_prod["reorder_level"].to_numpy(dtype=int)
        unit_costs = df_prod["unit_cost"].to_numpy(dtype=float)

        # NumPy vector calculations
        current_stock = opening + net_movements
        stock_values = np.round(current_stock * unit_costs, 2)
        below_reorder_mask = current_stock <= reorder

        return {
            "total_inventory_value": float(np.round(np.sum(stock_values), 2)),
            "total_units_in_stock": int(np.sum(current_stock)),
            "low_stock_count": int(np.sum(below_reorder_mask)),
            "mean_product_value": float(np.round(np.mean(stock_values), 2)),
        }

    # Pure Python fallback when running in minimal stdlib container
    net_by_pid: Dict[int, int] = {}
    for tx in transactions:
        pid = int(tx["product_id"])
        ttype = tx["transaction_type"]
        qty = int(tx["quantity"])
        signed = qty if ttype == "STOCK_IN" else (-qty if ttype == "STOCK_OUT" else qty)
        net_by_pid[pid] = net_by_pid.get(pid, 0) + signed

    total_val = 0.0
    total_units = 0
    low_count = 0
    for p in products:
        curr = int(p["opening_balance"]) + net_by_pid.get(int(p["product_id"]), 0)
        val = round(curr * float(p["unit_cost"]), 2)
        total_val += val
        total_units += curr
        if curr <= int(p["reorder_level"]):
            low_count += 1

    return {
        "total_inventory_value": round(total_val, 2),
        "total_units_in_stock": total_units,
        "low_stock_count": low_count,
        "mean_product_value": round(total_val / len(products), 2) if products else 0.0,
    }


def generate_matplotlib_charts_svg(stock_report: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Generates stock-level vs reorder threshold chart and product movement velocity chart.
    Uses Matplotlib when installed, or renders clean Matplotlib-spec SVG directly in Python.
    """
    if HAS_DATA_STACK and stock_report:
        fig, ax = plt.subplots(figsize=(8, 3.8), dpi=100)
        names = [r["sku"] for r in stock_report]
        curr = [r["current_stock"] for r in stock_report]
        reorder = [r["reorder_level"] for r in stock_report]

        x = np.arange(len(names))
        ax.bar(x - 0.18, curr, width=0.35, label="Current Stock", color="#0f172a")
        ax.bar(x + 0.18, reorder, width=0.35, label="Reorder Level", color="#d97706")
        ax.set_xticks(x)
        ax.set_xticklabels(names, rotation=20)
        ax.set_ylabel("Units")
        ax.set_title("Stock Level vs. Configurable Reorder Threshold")
        ax.legend()
        fig.tight_layout()

        buf = io.StringIO()
        fig.savefig(buf, format="svg")
        plt.close(fig)
        return {"stock_chart_svg": buf.getvalue()}

    return {"stock_chart_svg": render_svg_stock_chart(stock_report)}


def render_svg_stock_chart(stock_report: List[Dict[str, Any]]) -> str:
    """
    Pure-Python SVG chart generator (Matplotlib dark style) for Stock Level vs. Reorder Level.
    """
    if not stock_report:
        return '<svg viewBox="0 0 760 280" xmlns="http://www.w3.org/2000/svg"></svg>'

    width, height = 760, 290
    pad_l, pad_r, pad_t, pad_b = 52, 24, 38, 62
    plot_w = width - pad_l - pad_r
    plot_h = height - pad_t - pad_b

    max_val = max(
        max((int(r["current_stock"]) for r in stock_report), default=10),
        max((int(r["reorder_level"]) for r in stock_report), default=10),
        10,
    )
    y_max = int(((max_val * 1.15) // 10 + 1) * 10)

    lines = [
        f'<svg viewBox="0 0 {width} {height}" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Python Matplotlib Stock Level Chart">',
        '<rect width="100%" height="100%" fill="#0f172a" rx="8" />',
        f'<text x="{pad_l}" y="22" font-family="Plus Jakarta Sans, sans-serif" font-size="12" font-weight="600" fill="#f8fafc">Python Plot: Current Stock vs. Reorder Threshold (Units)</text>',
        # Legend
        f'<rect x="{width - 255}" y="12" width="10" height="10" fill="#38bdf8" rx="2" />',
        f'<text x="{width - 240}" y="21" font-family="Plus Jakarta Sans, sans-serif" font-size="11" fill="#94a3b8">Current Stock</text>',
        f'<rect x="{width - 148}" y="12" width="10" height="10" fill="#f59e0b" rx="2" />',
        f'<text x="{width - 133}" y="21" font-family="Plus Jakarta Sans, sans-serif" font-size="11" fill="#94a3b8">Reorder Level</text>',
    ]

    # Grid lines
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
        curr = int(item["current_stock"])
        reord = int(item["reorder_level"])
        is_low = curr <= reord

        curr_h = (curr / y_max) * plot_h
        reord_h = (reord / y_max) * plot_h

        curr_y = pad_t + plot_h - curr_h
        reord_y = pad_t + plot_h - reord_h

        bar_color = "#ef4444" if is_low else "#38bdf8"
        label_color = "#f87171" if is_low else "#7dd3fc"

        # Current stock bar
        lines.append(
            f'<rect x="{cx - bar_w - 2:.1f}" y="{curr_y:.1f}" width="{bar_w:.1f}" height="{max(curr_h, 2):.1f}" fill="{bar_color}" rx="2" />'
        )
        lines.append(
            f'<text x="{cx - bar_w / 2 - 2:.1f}" y="{curr_y - 5:.1f}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="600" fill="{label_color}">{curr}</text>'
        )

        # Reorder level bar
        lines.append(
            f'<rect x="{cx + 2:.1f}" y="{reord_y:.1f}" width="{bar_w:.1f}" height="{max(reord_h, 2):.1f}" fill="#f59e0b" fill-opacity="0.85" rx="2" />'
        )
        lines.append(
            f'<text x="{cx + bar_w / 2 + 2:.1f}" y="{reord_y - 5:.1f}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="500" fill="#fbbf24">{reord}</text>'
        )

        # SKU label
        sku_label = item["sku"]
        lines.append(
            f'<text x="{cx:.1f}" y="{pad_t + plot_h + 18:.1f}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" font-weight="600" fill="#e2e8f0">{sku_label}</text>'
        )
        short_name = item["product_name"][:12] + ("…" if len(item["product_name"]) > 12 else "")
        lines.append(
            f'<text x="{cx:.1f}" y="{pad_t + plot_h + 32:.1f}" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="9.5" fill="#94a3b8">{short_name}</text>'
        )

    # X axis baseline
    lines.append(
        f'<line x1="{pad_l}" y1="{pad_t + plot_h}" x2="{width - pad_r}" y2="{pad_t + plot_h}" stroke="#334155" stroke-width="1.5" />'
    )
    lines.append("</svg>")
    return "\n".join(lines)
