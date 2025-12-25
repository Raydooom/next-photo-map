'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TriggeredMorphModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- JS 触发函数 ---
  const handleOpenAction = () => {
    // 你可以在这里执行其他逻辑，比如打点、验证等
    console.log('准备弹出...');
    setIsModalOpen(true);
  };

  const handleCloseAction = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-slate-50">
      {/* 触发源：可以是任何 motion 组件 */}

      <motion.div
        layoutId="morph-box"
        onClick={handleOpenAction} // 绑定 JS 函数
        className="cursor-pointer bg-black text-white px-8 py-4  shadow-xl"
      ></motion.div>

      {/* 弹窗层 */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            {/* 遮罩层 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20  z-40"
              onClick={handleCloseAction}
              layoutId="morph-box"
            />

            {/* 弹出容器 */}
            <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
              123123
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
