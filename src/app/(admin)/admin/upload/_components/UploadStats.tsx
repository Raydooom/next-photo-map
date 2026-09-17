interface UploadStatsProps {
  stats: {
    total: number;
    pending: number;
    success: number;
    error: number;
    totalSize: number;
  };
  formatSize: (bytes: number) => string;
}

export function UploadStats({ stats, formatSize }: UploadStatsProps) {
  if (stats.total === 0) return null;

  return (
    <div className="grid grid-cols-4 gap-2">
      <div className="text-center p-2 rounded-lg bg-primary/5 ring-1 ring-primary/10">
        <div className="text-lg font-bold text-primary">{stats.total}</div>
        <div className="text-[10px] text-default-500">总数</div>
      </div>
      <div className="text-center p-2 rounded-lg bg-default/5 ring-1 ring-default/10">
        <div className="text-lg font-bold text-default-600">
          {stats.pending}
        </div>
        <div className="text-[10px] text-default-500">待上传</div>
      </div>
      <div className="text-center p-2 rounded-lg bg-success/5 ring-1 ring-success/10">
        <div className="text-lg font-bold text-success">{stats.success}</div>
        <div className="text-[10px] text-default-500">成功</div>
      </div>
      <div className="text-center p-2 rounded-lg bg-danger/5 ring-1 ring-danger/10">
        <div className="text-lg font-bold text-danger">{stats.error}</div>
        <div className="text-[10px] text-default-500">失败</div>
      </div>
    </div>
  );
}
