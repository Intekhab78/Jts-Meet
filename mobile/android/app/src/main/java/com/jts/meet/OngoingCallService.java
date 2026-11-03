package com.jts.meet;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

/**
 * OngoingCallService keeps the WebRTC call alive in the background
 * by running as an Android Foreground Service (Microphone type).
 * This ensures Android OS never freezes CPU/network or mutes audio/mic
 * when the user switches apps or turns off the screen.
 */
public class OngoingCallService extends Service {
    public static final String ACTION_START = "com.jts.meet.action.START_ONGOING_CALL";
    public static final String ACTION_STOP = "com.jts.meet.action.STOP_ONGOING_CALL";
    public static final String EXTRA_TITLE = "extra_call_title";
    public static final String EXTRA_MEETING_ID = "extra_meeting_id";

    private static final String CHANNEL_ID = "jts_ongoing_call_channel";
    private static final int NOTIF_ID = 3001;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        String title = intent != null ? intent.getStringExtra(EXTRA_TITLE) : null;
        if (title == null || title.trim().isEmpty()) {
            title = "JTS Meet - Active Meeting";
        }
        String meetingId = intent != null ? intent.getStringExtra(EXTRA_MEETING_ID) : "";

        createNotificationChannel();

        // 1. PendingIntent to return to meeting in MainActivity
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        // 2. PendingIntent to End Call from notification
        Intent endIntent = new Intent(this, CallActionReceiver.class);
        endIntent.setAction("com.jts.meet.ACTION_END_CALL");
        endIntent.putExtra("meetingId", meetingId);
        PendingIntent endPendingIntent = PendingIntent.getBroadcast(
            this,
            1,
            endIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText("Meeting in progress • Tap to return")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .setContentIntent(contentPendingIntent)
                .addAction(android.R.drawable.ic_menu_call, "Return", contentPendingIntent)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "End Call", endPendingIntent);

        Notification notification = builder.build();

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
            } else {
                startForeground(NOTIF_ID, notification);
            }
        } catch (Throwable t) {
            try {
                startForeground(NOTIF_ID, notification);
            } catch (Throwable ignored) {}
        }

        return START_STICKY;
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
                        "Ongoing Call",
                        NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Maintains background audio and prevents disconnection during active calls");
                channel.setShowBadge(false);
                NotificationManager manager = getSystemService(NotificationManager.class);
                if (manager != null) {
                    manager.createNotificationChannel(channel);
                }
            } catch (Throwable ignored) {}
        }
    }
}
