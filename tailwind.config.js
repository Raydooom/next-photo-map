import { heroui } from '@heroui/theme';

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
        // 描边 #262626
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-light': 'rgb(var(--border-light) / <alpha-value>)',
        // 主题色点缀
        primary: 'rgb(var(--primary) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',

        main: 'rgb(var(--text-main) / <alpha-value>)', // 主文字
        sub: 'rgb(var(--text-sub) / <alpha-value>)', // 副文字
        muted: 'rgb(var(--text-muted) / <alpha-value>)' // 弱文字
      },
      borderRadius: {
        DEFAULT: 'var(--radius)'
      },
      backdropBlur: {
        button: '4px'
      },
      shadow: {
        button: '0 4px 8px rgba(0, 0, 0, 0.05)'
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
  plugins: [heroui()]
};

export default config;
