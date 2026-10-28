package com.jts.meet;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

public class ScreenCaptureService extends Service {
    private static final String CHANNEL_ID = "jts_screen_capture_channel";
    private static final int NOTIF_ID = 2001;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        try {
            createNotificationChannel();
            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setContentTitle("JTS Meet Screen Sharing")
                    .setContentText("Sharing phone screen to meeting...")
                    .setSmallIcon(android.R.drawable.ic_menu_camera)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setOngoing(true)
                    .build();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
            } else {
                startForeground(NOTIF_ID, notification);
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        try {
            stopForeground(true);
        } catch (Throwable ignored) {}
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Screen Sharing Service",
                        NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("JTS Meet Screen Sharing Notification");
                NotificationManager manager = getSystemService(NotificationManager.class);
                if (manager != null) {
                    manager.createNotificationChannel(channel);
                }
            } catch (Throwable ignored) {}
        }
    }
}
