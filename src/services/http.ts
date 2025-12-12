import { CommonResponse } from '@/types';
class FetchService {
  BASE_URL: string = '';

  constructor(BASE_URL: string) {
    this.BASE_URL = BASE_URL;
  }
  async request<T>(url: string, options: RequestInit = {}): Promise<T> {
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
}

export default new FetchService('http://localhost:5555');
