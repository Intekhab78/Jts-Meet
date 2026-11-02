package com.jts.meet;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/**
 * Enterprise Native Android Firebase Messaging Service with Full-Screen Intent Support.
 * Ensures incoming calls ring loudly (even on lock screen) and automatically display
 * the incoming call UI over the lock screen like WhatsApp / Microsoft Teams.
 */
public class CallNotificationService extends FirebaseMessagingService {

    public static final String CHANNEL_CALLS_ID = "jts_incoming_calls_v3";
    public static final String CHANNEL_MESSAGES_ID = "chat_messages";
    public static final int CALL_NOTIFICATION_ID = 2026;

    private static Ringtone activeRingtone = null;
    private static Vibrator activeVibrator = null;

    /**
     * Instantly stops native ringtone and vibration when call is answered, declined, or cancelled.
     */
    public static synchronized void stopRinging() {
        try {
            if (activeRingtone != null && activeRingtone.isPlaying()) {
                activeRingtone.stop();
            }
            activeRingtone = null;
        } catch (Exception ignored) {}

        try {
            if (activeVibrator != null) {
                activeVibrator.cancel();
            }
            activeVibrator = null;
        } catch (Exception ignored) {}
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        String type = data.get("type");

        // High-Priority Incoming Call with Full-Screen Overlay & Loud Ringtone
        if ("incoming_call".equals(type) || "call_incoming".equals(type)) {
            handleIncomingCall(data);
            return;
        }

        // Delegate chat messages and standard notifications to Capacitor plugin
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

        // Discard stale/queued calls:
        // Use server NTP sentAt timestamp if present, otherwise extract timestamp from meetingId.
        // Allow up to 120,000 ms (2 minutes) to tolerate carrier latency and device clock drift between phones.
        long callTimestamp = 0;
        String sentAtStr = data.get("sentAt");
        if (sentAtStr != null && !sentAtStr.isEmpty()) {
            try {
                callTimestamp = Long.parseLong(sentAtStr);
            } catch (Exception ignored) {}
        }
        if (callTimestamp == 0 && meetingId != null && meetingId.startsWith("call_")) {
            try {
                String[] parts = meetingId.split("_");
                if (parts.length >= 2) {
                    callTimestamp = Long.parseLong(parts[1]);
                }
            } catch (Exception ignored) {}
        }

        if (callTimestamp > 0) {
            long age = System.currentTimeMillis() - callTimestamp;
            // Only discard if more than 120 seconds old (e.g. offline queue replay).
            // Do NOT discard fresh calls if there is normal network delay or minor device clock difference!
            if (age > 120000) {
                android.util.Log.w("CallNotificationService", "Discarding stale incoming call: age=" + age + "ms, meetingId=" + meetingId);
                return;
            }
        }


        if (callerName == null || callerName.isEmpty()) {
            callerName = "Colleague";
        }

        // 1. Wake up screen and CPU immediately (hold for 30s)
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                PowerManager.WakeLock wakeLock = pm.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE,
                    "JTSMeet:CallWakeLock"
                );
                wakeLock.acquire(30000);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 2. Play continuous native ringtone via RingtoneManager (LOUD & REPEATING)
        try {
            stopRinging();
            Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            if (ringtoneUri == null) {
                ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            activeRingtone = RingtoneManager.getRingtone(getApplicationContext(), ringtoneUri);
            if (activeRingtone != null) {
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build();
                activeRingtone.setAudioAttributes(audioAttributes);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    activeRingtone.setLooping(true);
                }
                activeRingtone.play();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 3. Start continuous phone vibration
        try {
            activeVibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (activeVibrator != null) {
                long[] pattern = {0, 1000, 800, 1000, 800, 1000};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    activeVibrator.vibrate(VibrationEffect.createWaveform(pattern, 1));
                } else {
                    activeVibrator.vibrate(pattern, 1);
                }
            }
        } catch (Exception ignored) {}

        // 4. Prepare Full-Screen Intent for MainActivity
        Intent fullScreenIntent = new Intent(this, MainActivity.class);
        fullScreenIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP |
            Intent.FLAG_ACTIVITY_SINGLE_TOP |
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        );
        fullScreenIntent.putExtra("type", "incoming_call");
        fullScreenIntent.putExtra("meetingId", meetingId);
        fullScreenIntent.putExtra("callerName", callerName);
        fullScreenIntent.putExtra("callerAvatar", callerAvatar);
        fullScreenIntent.putExtra("callType", callType);
        fullScreenIntent.putExtra("callerId", callerId);
        fullScreenIntent.putExtra("callTimestamp", System.currentTimeMillis());

        // 5. Try direct startActivity to immediately display UI over lock screen
        try {
            startActivity(fullScreenIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }

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

        // Accept Action Button
        Intent acceptIntent = new Intent(this, MainActivity.class);
        acceptIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        acceptIntent.putExtra("type", "incoming_call");
        acceptIntent.putExtra("autoAccept", "true");
        acceptIntent.putExtra("meetingId", meetingId);
        acceptIntent.putExtra("callerName", callerName);
        acceptIntent.putExtra("callerAvatar", callerAvatar);
        acceptIntent.putExtra("callType", callType);
        acceptIntent.putExtra("callerId", callerId);
        PendingIntent acceptPendingIntent = PendingIntent.getActivity(
            this,
            (int) System.currentTimeMillis() + 1,
            acceptIntent,
            pendingFlags
        );

        // Decline Action Button (Handled purely in background by CallActionReceiver)
        Intent declineIntent = new Intent(this, CallActionReceiver.class);
        declineIntent.setAction("com.jts.meet.ACTION_DECLINE_CALL");
        declineIntent.putExtra("meetingId", meetingId);
        declineIntent.putExtra("callerId", callerId);
        PendingIntent declinePendingIntent = PendingIntent.getBroadcast(
            this,
            (int) System.currentTimeMillis() + 2,
            declineIntent,
            pendingFlags
        );

        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;

        Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (ringtoneUri == null) {
            ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }

        // 6. Create Fresh High-Priority Call Notification Channel
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                notificationManager.deleteNotificationChannel("incoming_calls");
            } catch (Exception ignored) {}

            NotificationChannel callChannel = new NotificationChannel(
                CHANNEL_CALLS_ID,
                "Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH
            );
            callChannel.setDescription("Incoming voice and video calls with continuous ringtone");
            callChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            callChannel.enableVibration(true);
            callChannel.setVibrationPattern(new long[]{0, 1000, 800, 1000, 800, 1000});
            callChannel.setBypassDnd(true);

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();
            callChannel.setSound(ringtoneUri, audioAttributes);
            notificationManager.createNotificationChannel(callChannel);
        }

        String callTitle = isAudio ? "📞 Incoming Audio Call" : "📹 Incoming Video Call";
        String callBody = callerName + " is calling you on JTS Meet...";

        // 7. Build Notification with setFullScreenIntent(..., true) and action buttons
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
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .addAction(android.R.drawable.ic_menu_call, "Accept", acceptPendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Decline", declinePendingIntent);

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
