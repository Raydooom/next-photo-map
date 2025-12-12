export interface CommonResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export interface PagerResponse<T> {
  list: T[];
  page: number;
  size: number;
  total: number;
}
