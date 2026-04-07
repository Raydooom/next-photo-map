'use client';
import * as Admin from '@/server/actions/admin';
import * as PhotoAction from '@/server/actions/photo';
import { Button } from '@heroui/button';

export default function AboutPage() {
  const startScanner = async () => {
    const res = await Admin.scanner();
    console.log(res);
  };

  const getList = async () => {
    const list = await PhotoAction.getPhotoList();
  };

  const getExif = async () => {
    const exif = await PhotoAction.getPhotoExif();
    console.log(exif);
  };
  return (
    <div>
      <h1>Admin</h1>
      <Button onPress={() => startScanner()}>Start Scanner</Button>
      <Button onPress={() => getList()}>Count Photos</Button>
      <Button onPress={() => getExif()}>Get Exif</Button>
    </div>
  );
}
