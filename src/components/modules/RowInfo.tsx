export const RowInfo = ({
  icon: Icon,
  value
}: {
  icon: React.ReactNode;
  value: string | number | undefined;
}) => {
  return value ? (
    <div className="flex items-center gap-1 text-foreground/90 mt-1">
      {Icon}
      <span className="text-xs truncate max-w-full">{value}</span>
    </div>
  ) : null;
};
