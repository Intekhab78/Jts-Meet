import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jts.meet',
  appName: 'JTS Meet',
  webDir: 'dist',
  server: {
    hostname: 'meet.jtsmiddleeast.com',
    androidScheme: 'https',
    cleartext: false
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false
  }
};

export default config;
