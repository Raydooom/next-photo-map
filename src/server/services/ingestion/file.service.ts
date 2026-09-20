import 'server-only';

import {
  uploadFileToMinio,
  deleteFileFromMinio,
  generateMinioKey
} from '@/server/infra/storage';

class FileManageService {
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
    const key = generateMinioKey({ date, fileName, size });
    const { ETag, $metadata } = await uploadFileToMinio(key, fileBuffer);

    if (!ETag || $metadata?.httpStatusCode !== 200) {
      return Promise.reject({ success: false, msg: '上传文件失败' });
    }

    return { success: true, key, ETag, $metadata };
  }

  async deleteFile(key: string) {
    return await deleteFileFromMinio(key);
  }
}

export const fileManageService = new FileManageService();
