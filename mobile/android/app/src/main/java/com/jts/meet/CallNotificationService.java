package com.jts.meet;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/**
 * Native Android Firebase Messaging Service with Full-Screen Intent Support.
 * Enables WhatsApp / MS Teams style incoming call experience:
 * Automatically turns on screen, displays incoming call UI over the lock screen, and rings.
 */
public class CallNotificationService extends FirebaseMessagingService {

    private static final String CHANNEL_CALLS_ID = "incoming_calls";
    private static final String CHANNEL_MESSAGES_ID = "chat_messages";
    private static final int CALL_NOTIFICATION_ID = 2026;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        String type = data.get("type");

        // Handle High-Priority Incoming Call with Full-Screen Lockscreen Overlay
        if ("incoming_call".equals(type) || "call_incoming".equals(type)) {
            handleIncomingCall(data);
            return;
        }

        // Delegate chat messages and other standard notifications to Capacitor plugin
        try {
            PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleIncomingCall(Map<String, String> data) {
        String meetingId = data.get("meetingId");
        String callerName = data.get("callerName");
        String callerAvatar = data.get("callerAvatar");
        String callType = data.get("callType");
        String callerId = data.get("callerId");
        boolean isAudio = "audio".equalsIgnoreCase(callType);

        if (callerName == null || callerName.isEmpty()) {
            callerName = "Colleague";
        }

        // 1. Wake up the device CPU and turn screen on immediately
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                PowerManager.WakeLock wakeLock = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                    "JTSMeet:CallWakeLock"
                );
                wakeLock.acquire(15000); // Hold for 15s while ringing
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 2. Prepare Intent to launch MainActivity over lockscreen
        Intent fullScreenIntent = new Intent(this, MainActivity.class);
        fullScreenIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP |
            Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        fullScreenIntent.putExtra("type", "incoming_call");
        fullScreenIntent.putExtra("meetingId", meetingId);
        fullScreenIntent.putExtra("callerName", callerName);
        fullScreenIntent.putExtra("callerAvatar", callerAvatar);
        fullScreenIntent.putExtra("callType", callType);
        fullScreenIntent.putExtra("callerId", callerId);

        int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            (int) System.currentTimeMillis(),
            fullScreenIntent,
            pendingFlags
        );

        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;

        Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (ringtoneUri == null) {
            ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }

        // 3. Ensure High-Priority Notification Channel exists
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel callChannel = new NotificationChannel(
                CHANNEL_CALLS_ID,
                "Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH
            );
            callChannel.setDescription("Incoming voice and video calls with continuous ringtone");
            callChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            callChannel.enableVibration(true);
            callChannel.setVibrationPattern(new long[]{0, 1000, 800, 1000, 800, 1000});

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();
            callChannel.setSound(ringtoneUri, audioAttributes);
            notificationManager.createNotificationChannel(callChannel);
        }

        String callTitle = isAudio ? "📞 Incoming Audio Call" : "📹 Incoming Video Call";
        String callBody = callerName + " is calling you on JTS Meet...";

        // 4. Build Notification with setFullScreenIntent(..., true)
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_CALLS_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(callTitle)
            .setContentText(callBody)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSound(ringtoneUri)
            .setVibrate(new long[]{0, 1000, 800, 1000, 800, 1000})
            .setAutoCancel(true)
            .setOngoing(true)
            .setContentIntent(fullScreenPendingIntent)
            .setFullScreenIntent(fullScreenPendingIntent, true); // <── Wakes lockscreen & pops up incoming call modal!

        notificationManager.notify(CALL_NOTIFICATION_ID, builder.build());
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        try {
            PushNotificationsPlugin.onNewToken(token);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
