'use client';
import * as Admin from '@/server/actions/admin';
import * as PhotoAction from '@/server/actions/index';
import { Button } from '@heroui/button';

export default function AboutPage() {
  const startScanner = async () => {
    const res = await Admin.scanner(true);
    console.log(res);
  };

  const getList = async () => {
    const list = await PhotoAction.getPhotoList();
  };

  const getExif = async () => {
    const exif = await PhotoAction.getPhotoExif(1);
    console.log(exif);
  };
  return (
    <div>
      <Button onPress={() => startScanner()}>Start Scanner</Button>
      <Button onPress={() => getList()}>Count Photos</Button>
      <Button onPress={() => getExif()}>Get Exif</Button>
    </div>
  );
}
