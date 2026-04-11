import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-full flex items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full animate-fade-in">
        {/* chapter-mark */}
        <div className="flex justify-center">
          <p className="chapter-mark text-wine-600">
            <span className="inline-block w-6 h-0.5 bg-wine-600" />
            not found
            <span className="inline-block w-6 h-0.5 bg-wine-600" />
          </p>
        </div>

        {/* 巨大的 404 —— 编辑式数字雕刻 */}
        <div className="relative mt-8 flex items-center justify-center">
          {/* 上下细线框，模拟杂志标题分栏 */}
          <span
            aria-hidden="true"
            className="absolute left-0 right-0 top-2 h-px bg-paper-400"
          />
          <span
            aria-hidden="true"
            className="absolute left-0 right-0 bottom-2 h-px bg-paper-400"
          />
          <h1 className="font-serif text-paper-900 leading-none tabular-nums text-[clamp(6rem,18vw,11rem)] font-light tracking-[-0.04em] px-8 py-2">
            4<span className="text-wine-600">0</span>4
          </h1>
        </div>

        {/* 副标题 */}
        <p className="mt-10 text-center font-serif text-paper-800 text-xl sm:text-2xl leading-snug">
          这一页<span className="italic text-wine-700">不存在</span>。
        </p>
        <p className="mt-3 text-center font-serif text-paper-600 italic">
          — 也许它被归档，也许从未被印刷
        </p>

        <div className="mt-10 flex justify-center">
          <div className="inline-flex flex-col items-center gap-3">
            <Link to="/">
              <Button variant="outline">
                <span aria-hidden>←</span>
                <span>返回首页</span>
              </Button>
            </Link>
            <p className="chapter-mark text-paper-500">
              <span className="inline-block w-3 h-0.5 bg-paper-400" />
              err. 404 · page not found
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
