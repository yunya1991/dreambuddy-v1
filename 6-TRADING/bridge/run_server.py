#!/usr/bin/env python3
"""
Dream Universal Gateway - 桥接层API服务器 v1.0
===============================================
连接前端(dream-universal-gateway) 和 后端(scripts/)

功能:
- 封装 scripts/ 中的 Python 脚本为 REST API
- 提供市场数据、交易执行、情报监控等接口
- 支持用户意图路由到对应 SKILL

端口: 3847
"""

import sys
import os
from pathlib import Path

# 添加项目根目录到路径
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from bridge.api.dream_api_server import create_app

if __name__ == "__main__":
    app = create_app()
    
    # 启动配置
    host = os.getenv("BRIDGE_HOST", "127.0.0.1")
    port = int(os.getenv("BRIDGE_PORT", "3847"))
    debug = os.getenv("BRIDGE_DEBUG", "false").lower() == "true"
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║        Dream Universal Gateway - Bridge API Server v1.0      ║
╠══════════════════════════════════════════════════════════════╣
║  Status:     ✅ Running                                     ║
║  Host:       {host}:{port}                                          ║
║  Mode:       {'DEBUG' if debug else 'PRODUCTION'}                                        ║
║                                                              ║
║  Endpoints:                                                  ║
║  - /api/health          Health check                         ║
║  - /api/market/*        Market data (K线/行情)               ║
║  - /api/trade/*         Trade execution (交易执行)           ║
║  - /api/skill/*         SKILL routing (SKILL路由)           ║
║  - /api/intent/*        Intent routing (意图路由)           ║
║  - /api/bridge/*        Bridge management (桥接管理)         ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    app.run(host=host, port=port, debug=debug)
