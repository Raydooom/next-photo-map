import { CommonResponse, RequestOptions } from '@/types';
class FetchService {
  BASE_URL: string = '';

  constructor(BASE_URL: string) {
    this.BASE_URL = BASE_URL;
  }
  async request<T>(url: string, options: RequestOptions): Promise<T> {
    const response = await fetch(this.BASE_URL + url, options);
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    const jsonRes = (await response.json()) as CommonResponse<T>;
    if (jsonRes.code !== 0) {
      throw new Error(jsonRes.msg);
    }

    return jsonRes.data;
  }

  async get<T>(url: string, options: RequestOptions): Promise<T> {
    if (!options.params) {
      options.params = {};
    }
    const queryString = new URLSearchParams(options.params).toString();
    return await this.request(url + '?' + queryString, {
      ...options,
      method: 'GET'
    });
  }

  async post<T>(url: string, options: RequestOptions): Promise<T> {
    if (!options.body) {
      options.body = {};
    }
    options.body = JSON.stringify(options.body);

    return await this.request(url, {
      ...options,
      method: 'POST'
    });
  }
}

export default new FetchService('http://localhost:5555');
