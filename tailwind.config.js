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

module.exports = config;
