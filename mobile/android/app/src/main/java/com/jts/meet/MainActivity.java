package com.jts.meet;

import android.app.Activity;
import android.app.PictureInPictureParams;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.util.Rational;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;

public class MainActivity extends BridgeActivity {

    private static final int REQUEST_CODE_SCREEN_CAPTURE = 3001;
    private MediaProjectionManager projectionManager;
    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private ImageReader imageReader;
    private Handler backgroundHandler;
    private HandlerThread backgroundThread;
    private boolean isCapturingScreen = false;
    private static String pendingCallDataJson = null;
    private static String lastDispatchedMeetingId = null;
    private static MainActivity activeInstance = null;
    private android.widget.Toast currentToast = null;
    private long lastToastTime = 0;
    private String lastToastMessage = "";
    private android.os.PowerManager.WakeLock proximityWakeLock = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        activeInstance = this;

        // Keep the phone screen awake during meetings
        try {
            getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        } catch (Throwable ignored) {}

        // Handle incoming call if launched with call intent
        try {
            handleIncomingCallIntent(getIntent());
        } catch (Throwable t) {
            t.printStackTrace();
        }

        // Request runtime permissions safely (only dangerous permissions, never normal permissions)
        try {
            java.util.List<String> neededPerms = new java.util.ArrayList<>();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (checkSelfPermission(android.Manifest.permission.CAMERA) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    neededPerms.add(android.Manifest.permission.CAMERA);
                }
                if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    neededPerms.add(android.Manifest.permission.RECORD_AUDIO);
                }
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    neededPerms.add(android.Manifest.permission.POST_NOTIFICATIONS);
                }
            }
            if (!neededPerms.isEmpty()) {
                requestPermissions(neededPerms.toArray(new String[0]), 101);
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }

        try {
            if (bridge != null && bridge.getWebView() != null) {
                WebView webView = bridge.getWebView();
                WebSettings settings = webView.getSettings();
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setAllowFileAccess(true);

            webView.addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public void startNativeScreenShare() {
                    runOnUiThread(() -> {
                        try {
                            projectionManager = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
                            if (projectionManager != null) {
                                startActivityForResult(projectionManager.createScreenCaptureIntent(), REQUEST_CODE_SCREEN_CAPTURE);
                            }
                        } catch (Exception e) {
                            showToast("Could not start screen capture: " + e.getMessage());
                        }
                    });
                }

                @android.webkit.JavascriptInterface
                public void stopNativeScreenShare() {
                    runOnUiThread(MainActivity.this::stopScreenCaptureInternal);
                }

                @android.webkit.JavascriptInterface
                public boolean isNativeScreenShareAvailable() {
                    return true;
                }

                @android.webkit.JavascriptInterface
                public void enterPipMode() {
                    runOnUiThread(() -> {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            try {
                                PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
                                Rational aspectRatio = new Rational(9, 16);
                                builder.setAspectRatio(aspectRatio);
                                enterPictureInPictureMode(builder.build());
                            } catch (Exception ignored) {}
                        }
                    });
                }

                @android.webkit.JavascriptInterface
                public void setAudioMode(String mode) {
                    runOnUiThread(() -> {
                        try {
                            android.media.AudioManager audioManager = (android.media.AudioManager) getSystemService(Context.AUDIO_SERVICE);
                            if (audioManager == null) return;

                            audioManager.setMode(android.media.AudioManager.MODE_IN_COMMUNICATION);

                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                java.util.List<android.media.AudioDeviceInfo> devices = audioManager.getAvailableCommunicationDevices();
                                if ("speaker".equalsIgnoreCase(mode)) {
                                    for (android.media.AudioDeviceInfo device : devices) {
                                        if (device.getType() == android.media.AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) {
                                            audioManager.setCommunicationDevice(device);
                                            break;
                                        }
                                    }
                                } else if ("earpiece".equalsIgnoreCase(mode)) {
                                    for (android.media.AudioDeviceInfo device : devices) {
                                        if (device.getType() == android.media.AudioDeviceInfo.TYPE_BUILTIN_EARPIECE) {
                                            audioManager.setCommunicationDevice(device);
                                            break;
                                        }
                                    }
                                } else if ("bluetooth".equalsIgnoreCase(mode)) {
                                    for (android.media.AudioDeviceInfo device : devices) {
                                        if (device.getType() == android.media.AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                                            device.getType() == android.media.AudioDeviceInfo.TYPE_BLE_HEADSET) {
                                            audioManager.setCommunicationDevice(device);
                                            break;
                                        }
                                    }
                                }
                            }

                            if ("speaker".equalsIgnoreCase(mode)) {
                                audioManager.setSpeakerphoneOn(true);
                            } else {
                                audioManager.setSpeakerphoneOn(false);
                            }
                        } catch (Throwable ignored) {}
                    });
                }

                @android.webkit.JavascriptInterface
                public void resetAudioMode() {
                    runOnUiThread(() -> {
                        try {
                            android.media.AudioManager audioManager = (android.media.AudioManager) getSystemService(Context.AUDIO_SERVICE);
                            if (audioManager == null) return;

                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                audioManager.clearCommunicationDevice();
                            }
                            audioManager.setSpeakerphoneOn(false);
                            audioManager.setMode(android.media.AudioManager.MODE_NORMAL);
                        } catch (Throwable ignored) {}
                    });
                }

                @android.webkit.JavascriptInterface
                public void showToast(String message) {
                    if (message == null || message.trim().isEmpty()) return;
                    runOnUiThread(() -> {
                        long now = System.currentTimeMillis();
                        if (message.equals(lastToastMessage) && (now - lastToastTime) < 2000) {
                            return;
                        }
                        lastToastMessage = message;
                        lastToastTime = now;

                        if (currentToast != null) {
                            currentToast.cancel();
                        }
                        currentToast = android.widget.Toast.makeText(MainActivity.this, message, android.widget.Toast.LENGTH_SHORT);
                        currentToast.show();
                    });
                }

                @android.webkit.JavascriptInterface
                public String getPendingCallData() {
                    return pendingCallDataJson != null ? pendingCallDataJson : "";
                }

                @android.webkit.JavascriptInterface
                public void clearPendingCallData() {
                    pendingCallDataJson = null;
                }

                @android.webkit.JavascriptInterface
                public void cancelCallNotification() {
                    try {
                        CallNotificationService.stopRinging();
                        android.app.NotificationManager nm = (android.app.NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                        if (nm != null) {
                            nm.cancel(2026);
                        }
                    } catch (Exception ignored) {}
                }

                @android.webkit.JavascriptInterface
                public void setProximitySensorEnabled(boolean enable) {
                    MainActivity.this.setProximitySensorEnabled(enable);
                }

                @android.webkit.JavascriptInterface
                public void startOngoingCallNotification(String meetingId, String title) {
                    runOnUiThread(() -> {
                        try {
                            Intent serviceIntent = new Intent(MainActivity.this, OngoingCallService.class);
                            serviceIntent.setAction(OngoingCallService.ACTION_START);
                            serviceIntent.putExtra(OngoingCallService.EXTRA_MEETING_ID, meetingId != null ? meetingId : "");
                            serviceIntent.putExtra(OngoingCallService.EXTRA_TITLE, title != null ? title : "JTS Meet - Active Meeting");
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                startForegroundService(serviceIntent);
                            } else {
                                startService(serviceIntent);
                            }
                        } catch (Throwable ignored) {}
                    });
                }

                @android.webkit.JavascriptInterface
                public void stopOngoingCallNotification() {
                    runOnUiThread(() -> {
                        try {
                            Intent serviceIntent = new Intent(MainActivity.this, OngoingCallService.class);
                            serviceIntent.setAction(OngoingCallService.ACTION_STOP);
                            startService(serviceIntent);
                        } catch (Throwable ignored) {}
                    });
                }

                @android.webkit.JavascriptInterface
                public void enableAutoPip(boolean enable) {
                    runOnUiThread(() -> {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                            try {
                                PictureInPictureParams params = new PictureInPictureParams.Builder()
                                        .setAspectRatio(new Rational(9, 16))
                                        .setAutoEnterEnabled(enable)
                                        .build();
                                setPictureInPictureParams(params);
                            } catch (Throwable ignored) {}
                        }
                    });
                }
            }, "MobileAppBridge");
        }
    } catch (Throwable t) {
        t.printStackTrace();
    }
}

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_CODE_SCREEN_CAPTURE) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                try {
                    Intent serviceIntent = new Intent(this, ScreenCaptureService.class);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(serviceIntent);
                    } else {
                        startService(serviceIntent);
                    }

                    // Ensure Foreground Service is attached before getMediaProjection (required on Android 14)
                    new Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                        try {
                            startScreenCaptureWithData(resultCode, data);
                        } catch (Throwable t) {
                            t.printStackTrace();
                            stopScreenCaptureInternal();
                        }
                    }, 250);
                } catch (Throwable t) {
                    t.printStackTrace();
                    if (bridge != null && bridge.getWebView() != null) {
                        bridge.getWebView().evaluateJavascript("window.__onNativeScreenShareCancelled && window.__onNativeScreenShareCancelled()", null);
                    }
                }
            } else {
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript("window.__onNativeScreenShareCancelled && window.__onNativeScreenShareCancelled()", null);
                }
            }
        }
    }

    private void startScreenCaptureWithData(int resultCode, Intent data) {
        try {
            if (projectionManager == null) {
                projectionManager = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
            }
            if (projectionManager == null) return;

            mediaProjection = projectionManager.getMediaProjection(resultCode, data);
            if (mediaProjection == null) return;

            DisplayMetrics metrics = new DisplayMetrics();
            getWindowManager().getDefaultDisplay().getMetrics(metrics);
            final int screenWidth = metrics.widthPixels > 0 ? metrics.widthPixels : 1080;
            final int screenHeight = metrics.heightPixels > 0 ? metrics.heightPixels : 1920;

            final int targetWidth = 540;
            int calcHeight = (int) (540.0 * screenHeight / screenWidth);
            if (calcHeight % 2 != 0) calcHeight++;
            final int targetHeight = calcHeight;

            backgroundThread = new HandlerThread("ScreenCaptureBackground");
            backgroundThread.start();
            backgroundHandler = new Handler(backgroundThread.getLooper());

            // Android 14 (API 34) strictly requires a callback registered on MediaProjection before createVirtualDisplay()
            mediaProjection.registerCallback(new MediaProjection.Callback() {
                @Override
                public void onStop() {
                    super.onStop();
                    runOnUiThread(() -> {
                        if (isCapturingScreen) {
                            stopScreenCaptureInternal();
                        }
                    });
                }
            }, backgroundHandler);

            imageReader = ImageReader.newInstance(targetWidth, targetHeight, PixelFormat.RGBA_8888, 2);
            virtualDisplay = mediaProjection.createVirtualDisplay(
                    "JtsScreenCapture",
                    targetWidth, targetHeight, metrics.densityDpi,
                    DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                    imageReader.getSurface(),
                    null, backgroundHandler
            );

            isCapturingScreen = true;
            final long[] lastFrameTime = new long[]{0};

            imageReader.setOnImageAvailableListener(reader -> {
                Image image = null;
                try {
                    image = reader.acquireLatestImage();
                    if (image == null) return;
                    long now = System.currentTimeMillis();
                    // Throttle to 10 fps (100ms) for stability and smooth WebRTC canvas streaming
                    if (now - lastFrameTime[0] < 100) {
                        image.close();
                        return;
                    }
                    lastFrameTime[0] = now;

                    Image.Plane plane = image.getPlanes()[0];
                    ByteBuffer buffer = plane.getBuffer();
                    int pixelStride = plane.getPixelStride();
                    int rowStride = plane.getRowStride();
                    int rowPadding = rowStride - pixelStride * targetWidth;

                    Bitmap bitmap = Bitmap.createBitmap(targetWidth + rowPadding / pixelStride, targetHeight, Bitmap.Config.ARGB_8888);
                    bitmap.copyPixelsFromBuffer(buffer);
                    image.close();
                    image = null;

                    Bitmap croppedBitmap = Bitmap.createBitmap(bitmap, 0, 0, targetWidth, targetHeight);
                    if (bitmap != croppedBitmap) {
                        bitmap.recycle();
                    }

                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    croppedBitmap.compress(Bitmap.CompressFormat.JPEG, 60, baos);
                    croppedBitmap.recycle();
                    byte[] bytes = baos.toByteArray();
                    String base64 = Base64.encodeToString(bytes, Base64.NO_WRAP);

                    if (bridge != null && bridge.getWebView() != null) {
                        runOnUiThread(() -> {
                            try {
                                if (bridge != null && bridge.getWebView() != null) {
                                    bridge.getWebView().evaluateJavascript("window.__onNativeScreenFrame && window.__onNativeScreenFrame('" + base64 + "')", null);
                                }
                            } catch (Throwable ignored) {}
                        });
                    }
                } catch (Throwable t) {
                    if (image != null) {
                        try { image.close(); } catch (Throwable ignored) {}
                    }
                }
            }, backgroundHandler);

            if (bridge != null && bridge.getWebView() != null) {
                runOnUiThread(() -> {
                    try {
                        if (bridge != null && bridge.getWebView() != null) {
                            bridge.getWebView().evaluateJavascript("window.__onNativeScreenShareStarted && window.__onNativeScreenShareStarted()", null);
                        }
                    } catch (Throwable ignored) {}
                });
            }
        } catch (Throwable e) {
            e.printStackTrace();
            stopScreenCaptureInternal();
        }
    }

    private void stopScreenCaptureInternal() {
        if (!isCapturingScreen && mediaProjection == null && virtualDisplay == null && imageReader == null) {
            return;
        }
        boolean wasCapturing = isCapturingScreen;
        isCapturingScreen = false;
        try {
            if (virtualDisplay != null) {
                virtualDisplay.release();
                virtualDisplay = null;
            }
            if (imageReader != null) {
                imageReader.close();
                imageReader = null;
            }
            MediaProjection mp = mediaProjection;
            mediaProjection = null;
            if (mp != null) {
                try { mp.stop(); } catch (Throwable ignored) {}
            }
            if (backgroundThread != null) {
                backgroundThread.quitSafely();
                backgroundThread = null;
                backgroundHandler = null;
            }
            stopService(new Intent(this, ScreenCaptureService.class));
        } catch (Throwable ignored) {}

        if (wasCapturing && bridge != null && bridge.getWebView() != null) {
            runOnUiThread(() -> {
                try {
                    if (bridge != null && bridge.getWebView() != null) {
                        bridge.getWebView().evaluateJavascript("window.__onNativeScreenShareStopped && window.__onNativeScreenShareStopped()", null);
                    }
                } catch (Throwable ignored) {}
            });
        }
    }

    @Override
    public void onDestroy() {
        try {
            setProximitySensorEnabled(false);
            Intent stopService = new Intent(this, OngoingCallService.class);
            stopService.setAction(OngoingCallService.ACTION_STOP);
            startService(stopService);
        } catch (Throwable ignored) {}
        if (activeInstance == this) {
            activeInstance = null;
        }
        stopScreenCaptureInternal();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        // If Android 8.0+ (Oreo and above), enter native Android PiP mode on Back button!
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
                Rational aspectRatio = new Rational(9, 16);
                builder.setAspectRatio(aspectRatio);
                if (enterPictureInPictureMode(builder.build())) {
                    return;
                }
            } catch (Exception ignored) {}
        }
        super.onBackPressed();
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        // Enter PiP when home button is pressed
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
                Rational aspectRatio = new Rational(9, 16);
                builder.setAspectRatio(aspectRatio);
                enterPictureInPictureMode(builder.build());
            } catch (Exception ignored) {}
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingCallIntent(intent);
    }

    private void handleIncomingCallIntent(Intent intent) {
        if (intent == null) return;
        String type = intent.getStringExtra("type");
        String meetingId = intent.getStringExtra("meetingId");

        if ("decline_call".equals(type)) {
            CallNotificationService.stopRinging();
            try {
                android.app.NotificationManager nm = (android.app.NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    nm.cancel(2026);
                }
            } catch (Exception ignored) {}

            final String rejectScript = String.format(
                "try { " +
                "  var payload = { meetingId: '%s', callerId: '%s', actionId: 'decline' }; " +
                "  window.dispatchEvent(new CustomEvent('jts:notification-action', { detail: payload })); " +
                "} catch (e) {} ",
                meetingId != null ? meetingId : "",
                intent.getStringExtra("callerId") != null ? intent.getStringExtra("callerId") : ""
            );
            runOnUiThread(() -> {
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript(rejectScript, null);
                }
            });
            finish();
            return;
        }

        if ("incoming_call".equals(type) && meetingId != null && !meetingId.isEmpty()) {
            long callTimestamp = 0;
            try {
                if (intent.hasExtra("callTimestamp")) {
                    Object val = intent.getExtras() != null ? intent.getExtras().get("callTimestamp") : null;
                    if (val instanceof Number) {
                        callTimestamp = ((Number) val).longValue();
                    } else if (val instanceof String) {
                        callTimestamp = Long.parseLong((String) val);
                    }
                }
            } catch (Exception ignored) {}

            long now = System.currentTimeMillis();
            if (callTimestamp > 0 && (now - callTimestamp > 120000)) {
                pendingCallDataJson = null;
                resetIntent(intent);
                return;
            }
            if (callTimestamp == 0 && meetingId.startsWith("call_")) {
                try {
                    String[] parts = meetingId.split("_");
                    if (parts.length >= 2) {
                        long t = Long.parseLong(parts[1]);
                        if (t > 0 && (now - t > 120000)) {
                            pendingCallDataJson = null;
                            resetIntent(intent);
                            return;
                        }
                    }
                } catch (Exception ignored) {}
            }

            // Wake up screen and show incoming call over lockscreen
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                    setShowWhenLocked(true);
                    setTurnScreenOn(true);
                    android.app.KeyguardManager km = (android.app.KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
                    if (km != null) {
                        km.requestDismissKeyguard(this, null);
                    }
                } else {
                    getWindow().addFlags(
                        android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                        android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                        android.view.WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
                    );
                }
            } catch (Throwable ignored) {}

            String callerName = intent.getStringExtra("callerName");
            String callerAvatar = intent.getStringExtra("callerAvatar");
            String callType = intent.getStringExtra("callType");
            String callerId = intent.getStringExtra("callerId");
            String autoAccept = intent.getStringExtra("autoAccept");

            try {
                org.json.JSONObject obj = new org.json.JSONObject();
                obj.put("meetingId", meetingId);
                obj.put("callerName", callerName != null ? callerName : "Colleague");
                obj.put("callerAvatar", callerAvatar != null ? callerAvatar : "");
                obj.put("callType", callType != null ? callType : "audio");
                obj.put("callerId", callerId != null ? callerId : "");
                obj.put("autoAccept", "true".equals(autoAccept) ? "true" : "false");
                obj.put("timestamp", now);
                pendingCallDataJson = obj.toString();
            } catch (Exception ignored) {}

            // Deduplicate: If this meetingId was already dispatched to WebView in this session, do not repeat
            if (meetingId != null && meetingId.equals(lastDispatchedMeetingId)) {
                resetIntent(intent);
                return;
            }
            lastDispatchedMeetingId = meetingId;

            final String script = String.format(
                "try { " +
                "  var mId = '%s'; " +
                "  if (localStorage.getItem('jts_accepted_call_' + mId) === 'true' || localStorage.getItem('jts_declined_call_' + mId) === 'true') { return; } " +
                "  var payload = { meetingId: mId, callerName: '%s', callerAvatar: '%s', callType: '%s', callerId: '%s', autoAccept: '%s', timestamp: %d }; " +
                "  localStorage.setItem('jts_pending_notification', JSON.stringify(payload)); " +
                "  window.dispatchEvent(new CustomEvent('jts:incoming-call-push', { detail: payload })); " +
                "} catch (e) { console.error(e); }",
                meetingId,
                callerName != null ? callerName.replace("'", "\\'") : "Colleague",
                callerAvatar != null ? callerAvatar.replace("'", "\\'") : "",
                callType != null ? callType : "audio",
                callerId != null ? callerId : "",
                "true".equals(autoAccept) ? "true" : "false",
                now
            );

            // Reset intent extras so opening the app normally does not re-trigger an old call
            resetIntent(intent);

            runOnUiThread(() -> {
                // Dispatch once after 350ms to ensure WebView bridge is ready
                new Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                    if (bridge != null && bridge.getWebView() != null) {
                        try {
                            bridge.getWebView().evaluateJavascript(script, null);
                        } catch (Exception ignored) {}
                    }
                }, 350);
            });
        }
    }

    public static void notifyCallDeclined(String meetingId, String callerId) {
        pendingCallDataJson = null;
        lastDispatchedMeetingId = null;
        if (activeInstance != null) {
            if (activeInstance.getIntent() != null) {
                activeInstance.resetIntent(activeInstance.getIntent());
            }
            activeInstance.runOnUiThread(() -> {
                if (activeInstance.bridge != null && activeInstance.bridge.getWebView() != null) {
                    try {
                        String mId = meetingId != null ? meetingId : "";
                        String js = "try { " +
                                    "  localStorage.removeItem('jts_pending_notification'); " +
                                    (mId.isEmpty() ? "" : "  localStorage.setItem('jts_declined_call_" + mId + "', 'true'); ") +
                                    "  window.dispatchEvent(new CustomEvent('jts:call-declined-native', { detail: { meetingId: '" + mId + "' } })); " +
                                    "} catch(e) {}";
                        activeInstance.bridge.getWebView().evaluateJavascript(js, null);
                    } catch (Exception ignored) {}
                }
            });
        }
    }

    private void resetIntent(Intent intent) {
        if (intent == null) return;
        try {
            intent.removeExtra("type");
            intent.removeExtra("meetingId");
            intent.removeExtra("callerName");
            intent.removeExtra("callerAvatar");
            intent.removeExtra("callType");
            intent.removeExtra("callerId");
            intent.removeExtra("autoAccept");
            intent.removeExtra("callTimestamp");
        } catch (Exception ignored) {}
    }

    public void setProximitySensorEnabled(boolean enable) {
        runOnUiThread(() -> {
            try {
                android.os.PowerManager pm = (android.os.PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm == null) return;
                if (enable) {
                    if (proximityWakeLock == null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        if (pm.isWakeLockLevelSupported(android.os.PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK)) {
                            proximityWakeLock = pm.newWakeLock(android.os.PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK, "JTSMeet:ProximityLock");
                            proximityWakeLock.acquire();
                        }
                    }
                } else {
                    if (proximityWakeLock != null && proximityWakeLock.isHeld()) {
                        proximityWakeLock.release();
                        proximityWakeLock = null;
                    }
                }
            } catch (Throwable ignored) {}
        });
    }

    public static MainActivity getActiveInstance() {
        return activeInstance;
    }

    public static void notifyNativeHangup(String meetingId) {
        if (activeInstance != null) {
            activeInstance.runOnUiThread(() -> {
                if (activeInstance.bridge != null && activeInstance.bridge.getWebView() != null) {
                    try {
                        String js = "try { window.dispatchEvent(new CustomEvent('jts:native-hangup', { detail: { meetingId: '" + (meetingId != null ? meetingId : "") + "' } })); } catch(e) {}";
                        activeInstance.bridge.getWebView().evaluateJavascript(js, null);
                    } catch (Exception ignored) {}
                }
            });
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        activeInstance = this;
        try {
            getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        } catch (Throwable ignored) {}
    }
}
