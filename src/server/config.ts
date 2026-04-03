import path from 'path';
import fs from 'fs';

// 相片存储目录
export const PHOTO_BASE_DIR = path.join(process.cwd(), 'photos');
// 缩略图存储目录
export const THUMBNAIL_LARGE_DIR = path.join(
  PHOTO_BASE_DIR,
  'thumbnails-large'
);
export const THUMBNAIL_SMALL_DIR = path.join(
  PHOTO_BASE_DIR,
  'thumbnails-small'
);

// // 确保目录存在
// [PHOTO_BASE_DIR, THUMBNAIL_LARGE_DIR, THUMBNAIL_SMALL_DIR].forEach(dir => {
//   if (!fs.existsSync(dir)) {
//     fs.mkdirSync(dir, { recursive: true });
//   }
// });
