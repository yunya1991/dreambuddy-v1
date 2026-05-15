#!/usr/bin/env python3
"""
Dream Universal Gateway - API服务器核心 v1.0
==============================================
提供完整的REST API接口
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import logging
from datetime import datetime

# 导入各模块API
from .market_data_api import market_bp
from .trade_exec_api import trade_bp
from .skill_router_api import skill_bp
from .intent_router_api import intent_bp
from .bridge_management_api import bridge_bp

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_app():
    """创建Flask应用"""
    app = Flask(__name__)
    
    # CORS配置 - 允许前端访问
    CORS(app, resources={
        r"/api/*": {
            "origins": [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3847"
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # 注册蓝图
    app.register_blueprint(market_bp, url_prefix='/api/market')
    app.register_blueprint(trade_bp, url_prefix='/api/trade')
    app.register_blueprint(skill_bp, url_prefix='/api/skill')
    app.register_blueprint(intent_bp, url_prefix='/api/intent')
    app.register_blueprint(bridge_bp, url_prefix='/api/bridge')
    
    # 全局请求日志
    @app.before_request
    def log_request():
        logger.info(f"[{datetime.now().isoformat()}] {request.method} {request.path}")
    
    # 健康检查端点
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "Dream Universal Gateway Bridge",
            "version": "1.0.0",
            "timestamp": datetime.now().isoformat(),
            "endpoints": {
                "market": "/api/market/*",
                "trade": "/api/trade/*",
                "skill": "/api/skill/*",
                "intent": "/api/intent/*",
                "bridge": "/api/bridge/*"
            }
        })
    
    # 根路径
    @app.route('/', methods=['GET'])
    def index():
        return jsonify({
            "service": "Dream Universal Gateway Bridge API",
            "version": "1.0.0",
            "docs": "/api/health",
            "endpoints": [
                "GET  /api/health - 健康检查",
                "GET  /api/market/ticker/<inst_id> - 获取行情",
                "GET  /api/market/candles/<inst_id> - 获取K线",
                "POST /api/trade/order - 下单",
                "POST /api/skill/execute - 执行SKILL",
                "POST /api/intent/route - 意图路由",
                "GET  /api/bridge/status - 桥接状态"
            ]
        })
    
    # 错误处理
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            "error": "Not Found",
            "message": f"Endpoint {request.path} not found",
            "available_endpoints": [
                "/api/health",
                "/api/market/*",
                "/api/trade/*",
                "/api/skill/*",
                "/api/intent/*",
                "/api/bridge/*"
            ]
        }), 404
    
    @app.errorhandler(500)
    def internal_error(e):
        logger.error(f"Internal error: {e}")
        return jsonify({
            "error": "Internal Server Error",
            "message": str(e)
        }), 500
    
    logger.info("✅ Dream Bridge API Server initialized")
    return app
