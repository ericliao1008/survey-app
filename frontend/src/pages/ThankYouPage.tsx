export default function ThankYouPage() {
  return (
    <div className="min-h-full flex items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full text-center animate-slide-up">
        <p className="chapter-mark text-wine-600 justify-center mb-8">
          <span className="inline-block w-6 h-px bg-wine-600" />
          Fin.
          <span className="inline-block w-6 h-px bg-wine-600" />
        </p>

        <h1 className="font-serif text-display text-paper-900 leading-[1.05] tracking-tight">
          感谢
          <br />
          <span className="italic text-paper-800">您的参与</span>
        </h1>

        <div className="rule mt-10 mx-auto max-w-[120px]" />

        <p className="mt-10 font-serif text-lg sm:text-xl text-paper-800 leading-relaxed">
          您的作答已成功提交。
          <br />
          每一份反馈，都将被仔细聆听。
        </p>

        <p className="mt-16 chapter-mark text-paper-700 justify-center">
          <span className="inline-block w-4 h-0.5 bg-paper-500" />
          您现在可以关闭此页面
          <span className="inline-block w-4 h-0.5 bg-paper-500" />
        </p>
      </div>
    </div>
  );
}
