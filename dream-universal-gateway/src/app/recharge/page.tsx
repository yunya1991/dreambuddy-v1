"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RechargePage() {
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const packages = [
    { id: "basic", name: "基础包", credits: 200, price: 9.9, desc: "适合轻度使用" },
    { id: "standard", name: "标准包", credits: 1000, price: 39.9, desc: "推荐日常使用", popular: true },
    { id: "pro", name: "专业包", credits: 3000, price: 99.9, desc: "适合高频使用" },
    { id: "enterprise", name: "企业包", credits: 10000, price: 268, desc: "无限可能" },
  ];

  const handleRecharge = async () => {
    if (!selectedPackage) return;
    setLoading(true);
    // 模拟充值流程
    await new Promise(resolve => setTimeout(resolve, 1500));
    alert(`充值成功！已购买 ${packages.find(p => p.id === selectedPackage)?.name}`);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#e0e0e0]">
      {/* Header */}
      <header className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-[#8a8a8a] hover:text-white transition">
            <span>←</span>
            <span>返回</span>
          </Link>
          <h1 className="text-lg font-bold text-white">💎 积分充值</h1>
          <div className="w-16"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Info Banner */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-4 mb-8">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="text-sm text-[#8a8a8a]">积分用途</p>
              <p className="text-xs text-[#666666] mt-1">
                深度分析150积分/次 | 情报收集50积分/次 | 定时任务按频率扣费
              </p>
            </div>
          </div>
        </div>

        {/* Package Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={`relative p-4 rounded-lg border transition-all ${
                selectedPackage === pkg.id
                  ? "bg-[#0066ff]/10 border-[#0066ff]"
                  : "bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a]"
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[#0066ff] text-white text-xs rounded-full">
                  推荐
                </span>
              )}
              <div className="text-lg font-bold text-white">{pkg.name}</div>
              <div className="text-2xl font-bold text-[#0066ff] mt-2">¥{pkg.price}</div>
              <div className="text-sm text-[#8a8a8a] mt-1">{pkg.credits.toLocaleString()} 积分</div>
              <div className="text-xs text-[#666666] mt-2">{pkg.desc}</div>
            </button>
          ))}
        </div>

        {/* Recharge Button */}
        <div className="text-center">
          <button
            onClick={handleRecharge}
            disabled={!selectedPackage || loading}
            className={`px-8 py-3 rounded-lg font-medium transition ${
              selectedPackage && !loading
                ? "bg-[#0066ff] text-white hover:bg-[#0052cc]"
                : "bg-[#333333] text-[#666666] cursor-not-allowed"
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⟳</span>
                处理中...
              </span>
            ) : selectedPackage ? (
              `立即充值 ¥${packages.find(p => p.id === selectedPackage)?.price}`
            ) : (
              "请选择套餐"
            )}
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center text-xs text-[#666666]">
          <p>充值问题请联系客服 | 积分有效期：永久有效</p>
        </div>
      </main>
    </div>
  );
}
