// 将 [度, 分, 秒] 转换为十进制
export const convertToDecimal = (dms: number[], ref?: string) => {
  if (dms.length < 3 || !ref) return 0;
  const decimal = dms[0] + dms[1] / 60 + dms[2] / 3600;
  return ref === 'S' || ref === 'W' ? -decimal : decimal;
};