/**
 * 就地替换地址栏，不产生新的历史记录、不触发导航。
 *
 * state 传 null：App Router 会拦截原生的 history 方法来同步自身的路由状态，
 * 塞入 Pages Router 时代的 `{ as, url }` 结构会干扰它，
 * 表现为地址栏与 useSearchParams / usePathname 读到的值不一致。
 */
export const replaceUrl = (newUrl: string) => {
  window.history.replaceState(null, '', newUrl);
};

/**
 * 写入（或覆盖）一个查询参数，其余参数原样保留。
 * 拼 `?key=value` 的写法会把地址栏上已有的其他参数一并丢掉。
 */
export const setUrlParam = (key: string, value: string) => {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  replaceUrl(`${url.pathname}${url.search}`);
};

/** 移除一个查询参数，其余参数原样保留 */
export const removeUrlParam = (key: string) => {
  const url = new URL(window.location.href);
  url.searchParams.delete(key);
  replaceUrl(`${url.pathname}${url.search}`);
};

/**
 * 直接读地址栏上的查询参数。
 *
 * 与 useSearchParams 的区别：这里读的是浏览器的真实 URL，
 * 因此能反映 history.replaceState 造成的改动 —— 那类改动不会让
 * useSearchParams 重新求值，两者可能短暂不一致。
 */
export const readUrlParam = (key: string) => {
  return new URL(window.location.href).searchParams.get(key);
};

// 获取url参数
export const getParams = (key: string) => {
  const searchParams = new URLSearchParams(window.location.search);
  return Array.isArray(searchParams.get(key))
    ? searchParams.get(key)?.split(',') || []
    : searchParams.get(key) || '';
};
