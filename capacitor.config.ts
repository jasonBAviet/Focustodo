import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.focustodo.app',
  appName: 'Focus Todo',
  webDir: 'dist',
  // Cho phep ung dung tren thiet bi that ket noi den server truoc khi deploy
  // Thay IP nay thanh dia chi IP LAN cua may tinh chay server
  // Vi du: http://192.168.1.100:4000
  server: {
    // Trong moi truong dev, co the dung hostname de redirect den may tinh
    // Trong production, xoa block nay hoac doi thanh domain that
    androidScheme: 'https',
    // allowNavigation: ['192.168.1.*'] // Bo comment khi test tren LAN
  },
  android: {
    // Cho phep ung dung tren Android chay duoc trong debug mode
    // Trong production, xoa dong nay
    allowMixedContent: true,
  },
  plugins: {
    StatusBar: {
      // Dat mau nen thanh trang thai Android
      backgroundColor: '#141416',
      style: 'DARK',
      overlaysWebView: false,
    },
    LocalNotifications: {
      iconColor: '#f25f5c',
    },
  },
};

export default config;
