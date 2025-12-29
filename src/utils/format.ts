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

export const formatFocalLength = (focalLength: string) => {
  if (!focalLength) {
    return '';
  }
  return `${Number(focalLength).toFixed(2)}mm`;
};

export const formatFileSize = (size: number) => {
  if (!size) {
    return '';
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};
