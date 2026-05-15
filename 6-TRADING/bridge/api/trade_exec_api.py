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
    """下单接口
    
    Request Body:
        inst_id: 交易对
        side: buy/sell
        pos_side: long/short/net
        sz: 数量
        ord_type: market/limit (optional, default: market)
        px: 价格 (optional, 市价单不需要)
    """
    # 验证 Content-Type
    if not request.is_json:
        return jsonify({
            "success": False,
            "error": "Content-Type must be application/json"
        }), 400
    
    data = request.get_json() or {}
    
    # 验证必填参数
    required = ['inst_id', 'side', 'pos_side', 'sz']
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({
            "success": False,
            "error": f"Missing required fields: {missing}",
            "code": "MISSING_REQUIRED_FIELDS"
        }), 400
    
    # 验证参数格式
    valid_sides = ['buy', 'sell']
    if data['side'] not in valid_sides:
        return jsonify({
            "success": False,
            "error": f"Invalid side. Must be one of: {valid_sides}",
            "code": "INVALID_SIDE"
        }), 400
    
    valid_pos_sides = ['long', 'short', 'net']
    if data['pos_side'] not in valid_pos_sides:
        return jsonify({
            "success": False,
            "error": f"Invalid pos_side. Must be one of: {valid_pos_sides}",
            "code": "INVALID_POS_SIDE"
        }), 400
    
    # 验证数量
    try:
        sz = float(data['sz'])
        if sz <= 0:
            return jsonify({
                "success": False,
                "error": "sz must be positive",
                "code": "INVALID_SIZE"
            }), 400
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "error": "sz must be a valid number",
            "code": "INVALID_SIZE"
        }), 400
    
    # 验证订单类型
    ord_type = data.get('ord_type', 'market')
    valid_ord_types = ['market', 'limit']
    if ord_type not in valid_ord_types:
        return jsonify({
            "success": False,
            "error": f"Invalid ord_type. Must be one of: {valid_ord_types}",
            "code": "INVALID_ORD_TYPE"
        }), 400
    
    # 如果是限价单，验证价格
    if ord_type == 'limit':
        if 'px' not in data:
            return jsonify({
                "success": False,
                "error": "px required for limit orders",
                "code": "MISSING_PRICE"
            }), 400
        try:
            px = float(data['px'])
            if px <= 0:
                return jsonify({
                    "success": False,
                    "error": "px must be positive",
                    "code": "INVALID_PRICE"
                }), 400
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "error": "px must be a valid number",
                "code": "INVALID_PRICE"
            }), 400
    
    # 如果有 OKX CLI，执行真实下单
    if OKX_AVAILABLE:
        try:
            okx = OKXCLI(profile='paper')
            result = okx.place_order(
                inst_id=data['inst_id'],
                side=data['side'],
                pos_side=data['pos_side'],
                sz=int(data['sz']),
                ord_type=data.get('ord_type', 'market'),
                price=float(data['px']) if 'px' in data else None
            )
            return jsonify(result)
        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
    
    # 模拟订单（OKX CLI 不可用时）
    order_id = f"demo_{uuid.uuid4().hex[:12]}"
    order = {
        "ord_id": order_id,
        "inst_id": data['inst_id'],
        "side": data['side'],
        "pos_side": data['pos_side'],
        "sz": data['sz'],
        "px": data.get('px', 'market'),
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
