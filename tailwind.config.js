import { heroui } from '@heroui/theme';
import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // 容器背景 #161616
        'page-background': 'rgb(var(--page-background) / <alpha-value>)',
        background: 'rgb(var(--background) / <alpha-value>)',
        'background-light': 'rgb(var(--background-light) / <alpha-value>)',
        // 描边 #262626
        default: 'rgb(var(--border-default) / 0.2)',
        'border-light': 'rgb(var(--border-light) / <alpha-value>)',
        // 文字颜色
        main: 'rgb(var(--text-main) / <alpha-value>)', // 主文字
        sub: 'rgb(var(--text-sub) / <alpha-value>)', // 副文字
        muted: 'rgb(var(--text-muted) / <alpha-value>)', // 弱文字
        // 主题色点缀
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-light': 'rgb(var(--primary-light) / <alpha-value>)',
        // lab 令牌：网格化直角视觉语言，亮暗双主题，详见 globals.css
        lab: {
          ink: 'oklch(var(--lab-ink) / <alpha-value>)',
          raised: 'oklch(var(--lab-raised) / <alpha-value>)',
          sunken: 'oklch(var(--lab-sunken) / <alpha-value>)',
          paper: 'oklch(var(--lab-paper) / <alpha-value>)',
          muted: 'oklch(var(--lab-muted) / <alpha-value>)',
          faint: 'oklch(var(--lab-faint) / <alpha-value>)',
          line: 'oklch(var(--lab-line) / <alpha-value>)',
          'line-strong': 'oklch(var(--lab-line-strong) / <alpha-value>)',
          accent: 'oklch(var(--lab-accent) / <alpha-value>)',
          'accent-hover': 'oklch(var(--lab-accent-hover) / <alpha-value>)',
          'accent-ink': 'oklch(var(--lab-accent-ink) / <alpha-value>)',
          'accent-faint': 'oklch(var(--lab-accent-faint) / <alpha-value>)',
          success: 'oklch(var(--lab-success) / <alpha-value>)',
          warning: 'oklch(var(--lab-warning) / <alpha-value>)',
          danger: 'oklch(var(--lab-danger) / <alpha-value>)',
          'on-media': 'oklch(var(--lab-on-media) / <alpha-value>)',
          'on-media-muted': 'oklch(var(--lab-on-media-muted) / <alpha-value>)',
          'accent-on-media':
            'oklch(var(--lab-accent-on-media) / <alpha-value>)',
          'viewer-ink': 'oklch(var(--lab-viewer-ink) / <alpha-value>)'
        }
      },
      borderRadius: {
        DEFAULT: 'var(--radius)'
      },
      backdropBlur: {
        button: '4px'
      },
      shadow: {
        button: '0 4px 8px rgba(0, 0, 0, 0.05)',
        card: 'var(--shadow-card)'
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)']
      },
      animation: {
        // 创建一个新的动画类 'animate-spin-slow'
        'spin-2s': 'spin 2s linear infinite'
      },
      keyframes: {
        // 如果需要，也可以完全重新定义关键帧
        spin: {
          to: { transform: 'rotate(360deg)' }
        }
      }
    }
  },
  darkMode: 'class',
  plugins: [
    heroui(),
    plugin(function ({ addComponents, theme }) {
      addComponents({
        // 复合属性类
        '.border-glass': {
          'border-width': '1px',
          'border-style': 'solid',
          'border-color': 'rgb(var(--border-default) / 0.2)',
          'backdrop-filter': 'blur(10px)' // 顺便把玻璃拟态也带上
        },
        '.pm-rounded': {
          'border-radius': 'var(--radius)'
        },
        // 通用卡片类
        '.pm-card': {
          'border-radius': 'var(--radius)',
          'box-shadow': 'var(--shadow-card)',
          'border-width': '1px',
          'border-style': 'solid',
          'border-color': 'rgb(var(--border-default) / 0.2)',
          'backdrop-filter': 'blur(10px)' // 顺便把玻璃拟态也带上
        },

        /* ================= lab 视觉语言 ================= */

        // 栅格容器：定宽居中 + 响应式外边距
        '.lab-shell': {
          width: '100%',
          'max-width': 'var(--lab-max-w)',
          'margin-inline': 'auto',
          'padding-inline': 'var(--lab-gutter)'
        },
        // 12 列网格，列间距随视口缩放
        '.lab-grid': {
          display: 'grid',
          'grid-template-columns': 'repeat(12, minmax(0, 1fr))',
          'column-gap': 'var(--lab-grid-gap)'
        },
        // 大标题：紧凑字距 + 可变字重
        '.lab-title': {
          'font-size': 'clamp(30px, 4.4vw, 44px)',
          'font-variation-settings': '"wght" 660',
          'letter-spacing': '-0.04em',
          'line-height': '1.05',
          'text-wrap': 'balance'
        },
        // 正文：行高按中文阅读习惯取 1.7，拉丁文的 1.55 对中文偏紧
        '.lab-body': {
          'font-size': '15px',
          'font-variation-settings': '"wght" 440',
          'line-height': '1.7',
          'text-wrap': 'pretty'
        },
        // 可点击文案：按钮、链接等。
        // 与 .lab-mono 的区别是不做大写转换、字距接近 0，因此适用于中文。
        '.lab-action': {
          'font-size': '13px',
          'font-variation-settings': '"wght" 560',
          'letter-spacing': '0.02em',
          'line-height': '1'
        },
        // 等宽标签：编号、元信息、eyebrow。仅适用于拉丁字符
        '.lab-mono': {
          'font-family': 'var(--font-mono)',
          'font-size': '11px',
          'font-variation-settings': '"wght" 560',
          'letter-spacing': '0.12em',
          'line-height': '1.3',
          'text-transform': 'uppercase',
          'font-variant-numeric': 'tabular-nums'
        },
        // 1px 描边容器：直角、无阴影、无玻璃拟态
        '.lab-panel': {
          'border-width': '1px',
          'border-style': 'solid',
          'border-color': 'oklch(var(--lab-line))',
          'border-radius': '0',
          'background-color': 'oklch(var(--lab-raised))'
        }
      });
    })
  ]
};

export default config;
