/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 暖奶油纸张色系 —— 替代冷灰（已按 WCAG 对比度调整）
        paper: {
          50: "#fdfbf6",
          100: "#faf6ec",
          200: "#f6f1e8",  // 主背景
          300: "#dcd2bb",  // 发丝边 / 浅分隔（更可见）
          400: "#b5a988",  // 装饰线 / 占位符
          500: "#7d735f",  // 三级文字（4.9:1 ✓）
          600: "#5d5547",  // 次要文字（7.6:1 ✓）
          700: "#403a30",  // 正文备用
          800: "#26221c",  // 加重文字
          900: "#1a1714",  // 主文字（暖墨黑）
        },
        // 深酒红强调色（editorial accent，仅用于装饰与强调）
        wine: {
          50: "#fbf3f3",
          100: "#f5e1e1",
          400: "#c26a6a",
          600: "#8b2f2f",  // 主强调色
          700: "#6d2424",
          800: "#4a1818",
        },
      },
      fontFamily: {
        serif: [
          "Fraunces",
          "Noto Serif SC",
          "ui-serif",
          "Georgia",
          "Cambria",
          "serif",
        ],
        sans: [
          "Inter",
          "Noto Sans SC",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "PingFang SC",
          "Hiragino Sans GB",
          "sans-serif",
        ],
      },
      fontSize: {
        // 更夸张的类型层级
        "display": ["clamp(2.25rem, 5vw, 3.5rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "title": ["clamp(1.5rem, 3vw, 2rem)", { lineHeight: "1.25", letterSpacing: "-0.015em" }],
        "question": ["clamp(1.375rem, 2.5vw, 1.75rem)", { lineHeight: "1.35", letterSpacing: "-0.01em" }],
      },
      boxShadow: {
        // 柔光替代硬阴影
        paper: "0 1px 0 rgba(26, 23, 20, 0.04), 0 10px 40px -12px rgba(26, 23, 20, 0.08)",
        "paper-lg": "0 1px 0 rgba(26, 23, 20, 0.04), 0 24px 60px -18px rgba(26, 23, 20, 0.12)",
        "inner-line": "inset 0 -1px 0 rgba(26, 23, 20, 0.08)",
      },
      animation: {
        "fade-in": "fadeIn 400ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slideUp 500ms cubic-bezier(0.16, 1, 0.3, 1)",
        "reveal": "reveal 600ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        reveal: {
          "0%": { opacity: "0", transform: "translateY(16px)", filter: "blur(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
