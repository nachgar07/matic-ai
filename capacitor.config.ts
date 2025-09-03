import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.bf11eb5fa7b84f8dbbf6236699e6b550',
  appName: 'nourish-aim-sync',
  webDir: 'dist',
  server: {
    url: 'https://bf11eb5f-a7b8-4f8d-bbf6-236699e6b550.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
    Filesystem: {
      iosDatabaseLocation: 'Documents'
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: 'TU_WEB_CLIENT_ID.apps.googleusercontent.com', // Web client ID
      androidClientId: 'TU_ANDROID_CLIENT_ID.apps.googleusercontent.com', // Android client ID
      forceCodeForRefreshToken: true
    }
  }
};

export default config;