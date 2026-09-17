import { useRef, useState, type DragEvent } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadZoneProps {
  onAddFiles: (files: FileList | File[]) => void;
  disabled?: boolean;
}

const ACCEPT = '.jpg,.jpeg,.png,.heic,.webp,.mp4,.mov';

export function FileUploadZone({ onAddFiles, disabled }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onAddFiles(e.target.files);
      e.target.value = ''; // 允许重复选择同一文件
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files?.length) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 px-4 cursor-pointer transition-colors ${
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-default-200 hover:border-primary/50 hover:bg-default-50'
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={handleSelect}
      />
      <div className="rounded-full bg-primary/10 p-2.5">
        <Upload className="w-5 h-5 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">点击或拖拽文件到此处</p>
        <p className="text-[11px] text-default-400 mt-0.5">
          支持多选 · 图片 (jpg/png/heic/webp) 和视频 (mp4/mov)
        </p>
        <p className="text-[11px] text-default-400">
          同名图片 + 视频将作为 Live Photo 入库
        </p>
      </div>
    </div>
  );
}
