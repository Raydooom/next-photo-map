export const formatExposureTime = (exposureTime: string) => {
  if (!exposureTime) {
    return '';
  }
  return `1/${Math.round(1 / Number(exposureTime))}s`;
};

export const formatFNumber = (fNumber: string) => {
  if (!fNumber) {
    return '';
  }
  return `f/${Number(Number(fNumber).toFixed(2))}`;
};

export const formatIso = (iso: string) => {
  if (!iso) {
    return '';
  }
  return Number(iso);
};

export const formatFocalLength = (focalLength?: string | number) => {
  if (!focalLength) {
    return '';
  }
  return `${Math.round(parseFloat(focalLength.toString()))}mm`;
};
// 格式化曝光补偿
export const formatExposurebias = (value?: number) => {
  if (value !== undefined) {
    return `${Number(value).toFixed(2)} EV`;
  }
  return '';
};
// 格式化尺寸
export const formatDimension = (width?: number, height?: number) => {
  if (width !== undefined && height !== undefined) {
    return `${width}px × ${height}px`;
  }
  return '';
};
// 格式化像素， 单位MP
export const formatPixel = (width?: number, height?: number) => {
  if (width !== undefined && height !== undefined) {
    const total_pixels = width * height;
    const mp = total_pixels / 1_000_000;
    return `${mp.toFixed(1)} MP`;
  }
  return '';
};

export const formatFileSize = (size: number) => {
  if (!size) {
    return '';
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};
