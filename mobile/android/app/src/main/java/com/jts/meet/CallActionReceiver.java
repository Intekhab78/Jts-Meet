package com.jts.meet;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Handles notification actions (such as "Decline") directly in the background.
 * Instantly stops ringtone, cancels notification, and notifies backend API
 * so the caller side immediately terminates the ringing state.
 */
public class CallActionReceiver extends BroadcastReceiver {

    private static final String API_ENDPOINT = "https://meetapi.jtsmiddleeast.com/api/notifications/call-reject";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();

        if ("com.jts.meet.ACTION_DECLINE_CALL".equals(action)) {
            final String meetingId = intent.getStringExtra("meetingId");
            final String callerId = intent.getStringExtra("callerId");

            // 1. Immediately silence ringtone and cancel notification
            CallNotificationService.stopRinging();
            try {
                NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    nm.cancel(CallNotificationService.CALL_NOTIFICATION_ID);
                }
            } catch (Exception ignored) {}

            // 2. Clear pending call in MainActivity so reopening app won't show call
            MainActivity.notifyCallDeclined(meetingId, callerId);

            // 3. Notify backend server via HTTP POST so caller (web/mobile) stops ringing immediately
            if (meetingId != null && !meetingId.isEmpty()) {
                new Thread(() -> {
                    HttpURLConnection conn = null;
                    try {
                        URL url = new URL(API_ENDPOINT);
                        conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("POST");
                        conn.setRequestProperty("Content-Type", "application/json; utf-8");
                        conn.setDoOutput(true);
                        conn.setConnectTimeout(4000);
                        conn.setReadTimeout(4000);

                        String jsonInput = String.format(
                            "{\"meetingId\":\"%s\",\"callerId\":\"%s\",\"reason\":\"declined_from_notification\"}",
                            meetingId,
                            callerId != null ? callerId : ""
                        );

                        try (OutputStream os = conn.getOutputStream()) {
                            byte[] input = jsonInput.getBytes("utf-8");
                            os.write(input, 0, input.length);
                        }

                        conn.getResponseCode();
                    } catch (Exception e) {
                        e.printStackTrace();
                    } finally {
                        if (conn != null) {
                            conn.disconnect();
                        }
                    }
                }).start();
            }
        }
    }
}
