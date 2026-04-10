interface ReverseGeocodingResponse {
  status: string;
  regeocode: {
    formatted_address: string;
    addressComponent: {
      country: string;
      province: string;
      city: string;
      district: string;
      township: string;
      street: string;
      streetNumber: string;
      adcode: string;
      countryCode: string;
      direction: string;
      distance: string;
      neighborhood: {
        name: string;
        type: string;
      };
    };
    pois: any[];
    roads: any[];
    aois: any[];
  };
  info: string;
  infocode: string;
}

export class GeocodingService {
  private key: string;

  constructor() {
    this.key = process.env.AMAP_API_KEY || '';
  }

  /**
   * 处理空数组字段，转换为空字符串
   */
  private processEmptyArrays(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.length === 0 ? '' : obj.map(item => this.processEmptyArrays(item));
    }

    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = this.processEmptyArrays(obj[key]);
      }
    }
    return result;
  }

  async reverseGeocode(
    lat: number,
    lng: number
  ): Promise<ReverseGeocodingResponse['regeocode'] | null> {
    try {
      // coordtype=wgs84ll 表示输入坐标为 GPS 坐标
      const url = `https://restapi.amap.com/v3/geocode/regeo?output=json&key=${this.key}&coordtype=wgs84ll&location=${lng.toFixed(6)},${lat.toFixed(6)}`;

      const response = await fetch(url);
      const data = (await response.json()) as ReverseGeocodingResponse;

      if (data.status === "1") {
        // 处理空数组字段，转换为空字符串
        const processedData = this.processEmptyArrays(data.regeocode);
        return processedData;
      } else {
        console.error(
          `Reverse Geocoding API Error: ${data.status} - ${data.info || 'Unknown error'}`
        );
        return null;
      }
    } catch (error) {
      console.error('Reverse Geocoding request failed:', error);
      return null;
    }
  }
}
