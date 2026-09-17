import {
  uploadFileToMinio,
  deleteFileFromMinio,
  generateMinioKey
} from '../lib/oss';

export class FileManageService {
  private STORAGE_TYPE = 'minio';
  constructor() {}
  /**
   * 上传文件
   */
  async uploadFile({
    date,
    fileName,
    fileBuffer,
    size = 'raw'
  }: {
    date?: string;
    fileName: string;
    fileBuffer: Buffer;
    size?: 'small' | 'large' | 'raw';
  }) {
    if (this.STORAGE_TYPE === 'minio') {
      const key = generateMinioKey({ date, fileName, size });
      const { ETag, $metadata } = await uploadFileToMinio(key, fileBuffer);
      if (!ETag || $metadata?.httpStatusCode !== 200) {
        return Promise.reject({ success: false, msg: '上传文件失败' });
      }
      return {
        success: true,
        key,
        ETag,
        $metadata
      };
    }
  }
  /**
   * 删除文件
   */
  async deleteFile(key: string) {
    return await deleteFileFromMinio(key);
  }
}
