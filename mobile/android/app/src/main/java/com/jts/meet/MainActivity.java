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

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep the phone screen awake during meetings and wake screen for calls
        getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                android.view.WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String[] perms = {
                android.Manifest.permission.CAMERA,
                android.Manifest.permission.RECORD_AUDIO,
                android.Manifest.permission.MODIFY_AUDIO_SETTINGS
            };
            requestPermissions(perms, 101);
        }

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
                            if (audioManager != null) {
                                audioManager.setMode(android.media.AudioManager.MODE_IN_COMMUNICATION);
                                if ("speaker".equalsIgnoreCase(mode)) {
                                    audioManager.setSpeakerphoneOn(true);
                                } else if ("earpiece".equalsIgnoreCase(mode)) {
                                    audioManager.setSpeakerphoneOn(false);
                                }
                            }
                        } catch (Throwable ignored) {}
                    });
                }

                @android.webkit.JavascriptInterface
                public void showToast(String message) {
                    runOnUiThread(() -> android.widget.Toast.makeText(MainActivity.this, message, android.widget.Toast.LENGTH_SHORT).show());
                }
            }, "MobileAppBridge");
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
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, android.content.res.Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        if (bridge != null && bridge.getWebView() != null) {
            runOnUiThread(() -> {
                try {
                    if (bridge != null && bridge.getWebView() != null) {
                        bridge.getWebView().evaluateJavascript(
                            "window.__onNativePiPModeChanged && window.__onNativePiPModeChanged(" + isInPictureInPictureMode + ")",
                            null
                        );
                    }
                } catch (Throwable ignored) {}
            });
        }
    }
}
