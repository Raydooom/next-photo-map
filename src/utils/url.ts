export const replaceUrl = (newUrl: string) => {
  window.history.replaceState(
    { ...window.history.state, as: newUrl, url: newUrl },
    '',
    newUrl
  );
};

// 获取url参数
export const getParams = (key: string) => {
  const searchParams = new URLSearchParams(window.location.search);
  return Array.isArray(searchParams.get(key))
    ? searchParams.get(key)?.split(',') || []
    : searchParams.get(key) || '';
};
