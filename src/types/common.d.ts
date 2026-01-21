export interface CommonResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PagerResponse<T> {
  list: T[];
  page: number;
  size: number;
  total: number;
}

export interface PagerRequest {
  page: number;
  pageSize: number;
  [key: string]: any;
}

export interface RequestOptions {
  [key: string]: any;
}
