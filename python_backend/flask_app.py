"""
Project 11: Inventory and Stock Analysis System
Reference Python Flask Application (flask_app.py)
-------------------------------------------------
Demonstrates the clean Python Flask routes connecting SQLite/MySQL entities
(products, suppliers, stock_transactions) with Pandas movement summaries,
NumPy stock valuation calculations, and Matplotlib visual charts.
"""

from flask import Flask, request, jsonify
from engine import InventoryEngine

app = Flask(__name__)
engine = InventoryEngine()


@app.route("/api/state", methods=["GET"])
def get_dashboard_state():
    """Returns current stock report, low-stock list, movement charts, and valuation."""
    return jsonify(engine.get_full_state())


@app.route("/api/transactions", methods=["POST"])
def record_transaction():
    """
    Records STOCK_IN, STOCK_OUT, or ADJUSTMENT.
    Acceptance Criteria:
    - Stock cannot silently become negative
    - All adjustments are logged
    - Transaction history reconciles with current stock
    """
    payload = request.get_json(force=True)
    result = engine.record_transaction(payload)
    if not result.get("ok"):
        return jsonify(result), 400
    return jsonify(result), 201


@app.route("/api/products", methods=["POST"])
def add_product():
    """Creates a new product SKU with opening balance, reorder level, and unit cost."""
    payload = request.get_json(force=True)
    result = engine.add_product(payload)
    if not result.get("ok"):
        return jsonify(result), 400
    return jsonify(result), 201


@app.route("/api/products/<int:product_id>/reorder-level", methods=["PATCH"])
def update_reorder_level(product_id: int):
    """Updates configurable reorder threshold for a product."""
    payload = request.get_json(force=True)
    result = engine.update_reorder_level(
        {"product_id": product_id, "reorder_level": payload.get("reorder_level")}
    )
    if not result.get("ok"):
        return jsonify(result), 400
    return jsonify(result), 200


@app.route("/api/suppliers", methods=["POST"])
def add_supplier():
    """Creates a new supplier record."""
    payload = request.get_json(force=True)
    result = engine.add_supplier(payload)
    if not result.get("ok"):
        return jsonify(result), 400
    return jsonify(result), 201


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
