import { Code, Terminal, FileCode, Braces } from "lucide-react";
import { useEffect, useState } from "react";

const snippets = [
  `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const c = target - nums[i];
    if (map.has(c)) return [map.get(c), i];
    map.set(nums[i], i);
  }
}`,
  `def climbStairs(n):
    if n <= 2: return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b`,
  `public int maxProfit(int[] prices) {
    int min = Integer.MAX_VALUE, profit = 0;
    for (int p : prices) {
        min = Math.min(min, p);
        profit = Math.max(profit, p - min);
    }
    return profit;
}`,
];

export default function AuthImagePattern({ title, subtitle }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setActiveIndex((i) => (i + 1) % snippets.length),
      4000
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="hidden lg:flex flex-col items-center justify-center bg-ll-surface border-l border-ll-border p-12 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]">
        {[Braces, FileCode, Terminal, Code].map((Icon, i) => (
          <Icon
            key={i}
            className="absolute text-ll-accent"
            style={{
              top: `${15 + i * 20}%`,
              left: `${10 + i * 22}%`,
              width: 48 + i * 8,
              height: 48 + i * 8,
            }}
          />
        ))}
      </div>

      <div className="z-10 w-full max-w-md">
        <div className="ll-panel rounded-xl overflow-hidden shadow-2xl mb-8">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-ll-border bg-ll-surface-2">
            <span className="w-2.5 h-2.5 rounded-full bg-ll-error" />
            <span className="w-2.5 h-2.5 rounded-full bg-ll-medium" />
            <span className="w-2.5 h-2.5 rounded-full bg-ll-success" />
            <span className="text-xs text-ll-muted font-mono ml-2">solution.js</span>
          </div>
          <pre className="p-4 font-mono text-xs text-ll-easy leading-relaxed h-52 overflow-hidden">
            {snippets[activeIndex]}
          </pre>
        </div>
        <h2 className="text-2xl font-bold text-center">{title}</h2>
        <p className="text-ll-muted text-center mt-3 text-sm leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}
