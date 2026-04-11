import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import SurveyPage from "./pages/SurveyPage";
import { LoadingSkeleton } from "./components/LoadingSkeleton";

// 代码分割：非主流程页面延迟加载，减小首屏 bundle
const ThankYouPage = lazy(() => import("./pages/ThankYouPage"));
const StatsPage = lazy(() => import("./pages/StatsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// 默认问卷 slug - 与 backend/surveys/ 下的 JSON 文件名对应
const DEFAULT_SLUG = "example";

export default function App() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={`/s/${DEFAULT_SLUG}`} replace />}
        />
        <Route path="/s/:slug" element={<SurveyPage />} />
        <Route path="/s/:slug/thanks" element={<ThankYouPage />} />
        <Route path="/admin/:slug/stats" element={<StatsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
