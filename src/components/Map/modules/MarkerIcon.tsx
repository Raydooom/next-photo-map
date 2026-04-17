export function MarkerIcon() {
  return (
    <div className="relative flex flex-col items-center group cursor-pointer">
      {/* 连接处与底部光点 */}
      <div className="flex flex-col items-center -mt-1">
        {/* 呼吸灯效果的外圈 */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-4 h-4 bg-brand-primary rounded-full animate-ping opacity-75" />
          <div className="relative w-3 h-3 bg-white rounded-full border-3 border-brand-primary shadow-[0_0_12px_#fff]" />
        </div>
      </div>
    </div>
  );
}
