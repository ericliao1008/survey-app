import { Button } from "@/components/ui/Button";

interface Props {
  title?: string;
  message?: string;
  onRestart?: () => void;
}

export function TerminationScreen({
  title = "非常感谢您的参与",
  message = "根据您的回答，本次问卷已结束。再次感谢您抽出时间。",
  onRestart,
}: Props) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 sm:px-10 py-16 sm:py-24 text-center animate-fade-in">
      <div className="chapter-mark mb-6 justify-center text-paper-700">
        <span className="inline-block w-6 h-0.5 bg-paper-500" />
        SURVEY COMPLETE
      </div>

      <h1 className="font-serif text-display text-paper-900 leading-tight tracking-tight">
        {title}
      </h1>

      <p className="mt-8 font-serif text-lg sm:text-xl text-paper-800 leading-relaxed max-w-xl mx-auto">
        {message}
      </p>

      <div className="rule mt-12 sm:mt-16" />

      {onRestart && (
        <div className="mt-10">
          <Button variant="outline" onClick={onRestart}>
            重新作答
          </Button>
        </div>
      )}
    </div>
  );
}
