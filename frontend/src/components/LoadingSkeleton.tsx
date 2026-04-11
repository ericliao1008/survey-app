// 编辑式加载骨架屏 —— 与 WelcomeScreen 布局对齐，避免首屏闪烁

interface Props {
  variant?: "survey" | "stats";
}

export function LoadingSkeleton({ variant = "survey" }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 sm:px-10 py-10 sm:py-20">
      <div className="animate-pulse">
        {/* chapter-mark 骨架 */}
        <div className="flex items-center gap-3 mb-8">
          <span className="inline-block w-6 h-0.5 bg-paper-400" />
          <span className="inline-block h-3 w-32 bg-paper-300 rounded-sm" />
        </div>

        {/* 大标题骨架 */}
        <div className="space-y-3">
          <div className="h-10 sm:h-14 w-full max-w-lg bg-paper-300 rounded-sm" />
          <div className="h-10 sm:h-14 w-3/4 max-w-md bg-paper-300 rounded-sm" />
        </div>

        {/* 描述骨架 */}
        <div className="mt-8 space-y-2 max-w-xl">
          <div className="h-4 w-full bg-paper-300/80 rounded-sm" />
          <div className="h-4 w-5/6 bg-paper-300/80 rounded-sm" />
        </div>

        <div className="rule mt-10" />

        {variant === "survey" ? (
          <>
            {/* Meta 网格骨架 */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10">
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-block w-3 h-0.5 bg-paper-400" />
                    <span className="inline-block h-3 w-16 bg-paper-300 rounded-sm" />
                  </div>
                  <div className="h-10 w-24 bg-paper-300 rounded-sm" />
                </div>
              ))}
            </div>

            <div className="rule mt-10" />

            {/* 按钮骨架 */}
            <div className="mt-10 h-[52px] w-44 bg-paper-300 rounded-full" />
          </>
        ) : (
          <>
            {/* Stats 骨架 */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-8">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="h-4 w-full bg-paper-300 rounded-sm" />
                  <div className="h-2 w-4/5 bg-paper-300/80 rounded-full" />
                  <div className="h-2 w-3/5 bg-paper-300/80 rounded-full" />
                  <div className="h-2 w-2/5 bg-paper-300/80 rounded-full" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
