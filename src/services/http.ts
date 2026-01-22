import { CommonResponse, RequestOptions } from '@/types';
class FetchService {
  BASE_URL: string = '';

  constructor(BASE_URL: string) {
    this.BASE_URL = BASE_URL;
  }
  async request<T>(url: string, options: RequestOptions): Promise<T> {
    try {
      const response = await fetch(this.BASE_URL + url, options);
      if (!response.ok) {
        throw new Error(response.statusText, { cause: url });
      }
      const jsonRes = (await response.json()) as CommonResponse<T>;
      if (jsonRes.code !== 0) {
        throw new Error(jsonRes.message);
      }
      return jsonRes.data;
    } catch (error) {
      throw error;
    }
  }

  async get<T>(url: string, options: RequestOptions = {}): Promise<T> {
    if (!options.params) {
      options.params = {};
    }
    const queryString = new URLSearchParams(options.params).toString();
    return await this.request(url + (queryString ? '?' + queryString : ''), {
      ...options,
      method: 'GET'
    });
  }

  async post<T>(url: string, options: RequestOptions): Promise<T> {
    if (!options.body) {
      options.body = {};
    }
    
    let body = options.body;
    const headers: any = { ...options.headers };

    // Auto-detect JSON body
    if (
      body &&
      typeof body === 'object' &&
      !(typeof FormData !== 'undefined' && body instanceof FormData) &&
      !(typeof Blob !== 'undefined' && body instanceof Blob) &&
      !(typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams)
    ) {
      body = JSON.stringify(body);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    return await this.request(url, {
      ...options,
      method: 'POST',
      body,
      headers
    });
  }
}

export default new FetchService('http://localhost:3000/api/client');
