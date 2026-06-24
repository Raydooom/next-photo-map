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
        'primary-light': 'rgb(var(--primary-light) / <alpha-value>)'
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
        }
      });
    })
  ]
};

export default config;
