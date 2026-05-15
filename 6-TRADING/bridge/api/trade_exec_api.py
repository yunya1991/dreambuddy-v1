#!/usr/bin/env python3
"""
交易执行API - Trade Execution API
封装交易执行逻辑，支持模拟盘和实盘
"""

from flask import Blueprint, jsonify, request
import sys
from pathlib import Path
from datetime import datetime
import uuid

# 添加scripts路径
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "scripts"))

try:
    from okx_cli import OKXCLI
    OKX_AVAILABLE = True
except ImportError:
    OKX_AVAILABLE = False

trade_bp = Blueprint('trade', __name__)

# 模拟订单存储
MOCK_ORDERS = {}


@trade_bp.route('/order', methods=['POST'])
def place_order():
    """下单接口"""
    data = request.get_json() or {}
    
    # 验证必填参数
    required = ['inst_id', 'side', 'pos_side', 'sz', 'px']
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({
            "success": False,
            "error": f"Missing required fields: {missing}"
        }), 400
    
    # 模拟订单
    order_id = f"demo_{uuid.uuid4().hex[:12]}"
    order = {
        "ord_id": order_id,
        "inst_id": data['inst_id'],
        "side": data['side'],  # buy/sell
        "pos_side": data['pos_side'],  # long/short/net
        "sz": data['sz'],
        "px": data['px'],
        "ord_type": data.get('ord_type', 'limit'),
        "state": "live",
        "timestamp": datetime.now().isoformat()
    }
    
    MOCK_ORDERS[order_id] = order
    
    return jsonify({
        "success": True,
        "order": order,
        "mode": "simulation"
    })


@trade_bp.route('/order/<order_id>', methods=['GET'])
def get_order(order_id):
    """查询订单"""
    order = MOCK_ORDERS.get(order_id)
    if order:
        return jsonify({
            "success": True,
            "order": order
        })
    
    return jsonify({
        "success": False,
        "error": "Order not found"
    }), 404


@trade_bp.route('/orders', methods=['GET'])
def get_orders():
    """查询所有订单"""
    status = request.args.get('state', 'all')
    
    if status == 'all':
        orders = list(MOCK_ORDERS.values())
    else:
        orders = [o for o in MOCK_ORDERS.values() if o['state'] == status]
    
    return jsonify({
        "success": True,
        "count": len(orders),
        "orders": orders
    })


@trade_bp.route('/order/<order_id>', methods=['DELETE'])
def cancel_order(order_id):
    """取消订单"""
    if order_id in MOCK_ORDERS:
        MOCK_ORDERS[order_id]['state'] = 'cancelled'
        return jsonify({
            "success": True,
            "message": "Order cancelled",
            "order_id": order_id
        })
    
    return jsonify({
        "success": False,
        "error": "Order not found"
    }), 404


@trade_bp.route('/positions', methods=['GET'])
def get_positions():
    """获取持仓"""
    # 模拟持仓数据
    return jsonify({
        "success": True,
        "positions": [
            {
                "inst_id": "BTC-USDT-SWAP",
                "pos_side": "long",
                "sz": "0.1",
                "avg_px": "95000.00",
                "pnl": "100.00",
                "upl": "50.00",
                "leverage": "5"
            }
        ]
    })


@trade_bp.route('/balance', methods=['GET'])
def get_balance():
    """获取账户余额"""
    return jsonify({
        "success": True,
        "balance": {
            "total_equity": "10000.00",
            "available": "8000.00",
            "margin_used": "2000.00",
            "unrealized_pnl": "100.00",
            "currency": "USDT"
        },
        "mode": "simulation"
    })


@trade_bp.route('/set-leverage', methods=['POST'])
def set_leverage():
    """设置杠杆倍数"""
    data = request.get_json() or {}
    
    required = ['inst_id', 'leverage', 'mgn_mode']
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({
            "success": False,
            "error": f"Missing required fields: {missing}"
        }), 400
    
    return jsonify({
        "success": True,
        "message": "Leverage set",
        "inst_id": data['inst_id'],
        "leverage": data['leverage'],
        "mgn_mode": data['mgn_mode']
    })


@trade_bp.route('/close-position', methods=['POST'])
def close_position():
    """平仓"""
    data = request.get_json() or {}
    inst_id = data.get('inst_id')
    pos_side = data.get('pos_side')
    
    if not inst_id:
        return jsonify({
            "success": False,
            "error": "inst_id required"
        }), 400
    
    return jsonify({
        "success": True,
        "message": "Position closed",
        "inst_id": inst_id,
        "pos_side": pos_side or "all"
    })


@trade_bp.route('/history', methods=['GET'])
def get_trade_history():
    """获取交易历史"""
    inst_id = request.args.get('inst_id')
    
    return jsonify({
        "success": True,
        "history": [],
        "note": "Trade history will be synced from OKX"
    })
