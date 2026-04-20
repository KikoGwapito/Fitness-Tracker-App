import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.grefine.app',
  appName: 'G-Refine',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#F27D26",
      sound: "beep.wav",
    },
  },
};

export default config;
