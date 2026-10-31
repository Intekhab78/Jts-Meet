import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { API_BASE, getStoredToken } from '../config';

// Mobile Real-time High-Priority Notification & Ringing Service

export interface IncomingCallPayload {
  callerName: string;
  callerId?: string;
  meetingId: string;
  callType?: 'audio' | 'video';
  callerAvatar?: string;
}

export interface MeetingReminderPayload {
  title: string;
  meetingId: string;
  scheduledTime: string;
  startsInMinutes: number;
}

class MobileNotificationService {
  private hasPermission: boolean = false;
  private ringtoneInterval: any = null;
  private hasInitializedPush: boolean = false;

  constructor() {
    this.checkPermission();
    this.initNativePush();
  }

  public async checkPermission(): Promise<boolean> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        this.hasPermission = true;
      } else if (Notification.permission !== 'denied') {
        try {
          const perm = await Notification.requestPermission();
          this.hasPermission = perm === 'granted';
        } catch (_) {
          this.hasPermission = false;
        }
      }
    }
    return this.hasPermission;
  }

  /**
   * Initializes native Android Firebase Cloud Messaging (FCM) Push Notifications
   */
  public async initNativePush(): Promise<void> {
    if (!Capacitor.isNativePlatform() || this.hasInitializedPush) return;
    this.hasInitializedPush = true;

    try {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('[FCM] Push notification permission not granted');
        return;
      }

      await PushNotifications.register();

      // Create High-Priority Notification Channels for Android 8.0+
      try {
        await PushNotifications.createChannel({
          id: 'incoming_calls',
          name: 'Incoming Calls',
          description: 'High-priority incoming voice and video calls with ringtone',
          importance: 5, // MAX importance (Heads-up banner + ring + screen turn on)
          visibility: 1, // Public on lockscreen
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#2563eb',
        });

        await PushNotifications.createChannel({
          id: 'chat_messages',
          name: 'Messages',
          description: 'Direct messages and team channel chats',
          importance: 4, // HIGH importance
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#2563eb',
        });
      } catch (channelErr) {
        console.warn('[FCM] Error registering notification channels:', channelErr);
      }

      // Listen for FCM Device Token Registration
      PushNotifications.addListener('registration', async (token) => {
        console.log('[FCM] Native Device Registered. Token:', token.value);
        localStorage.setItem('jts_fcm_token', token.value);

        // Sync FCM token to backend
        try {
          const authKey = getStoredToken() || localStorage.getItem('jts_access_token') || localStorage.getItem('jts_auth_key') || localStorage.getItem('jts_token');
          if (authKey) {
            const res = await fetch(`${API_BASE}/api/notifications/fcm-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authKey}`,
              },
              body: JSON.stringify({ fcmToken: token.value, platform: 'android' }),
            });
            const resJson = await res.json().catch(() => ({}));
            console.log('[FCM] Successfully registered device token on server:', resJson);
          }
        } catch (err) {
          console.warn('[FCM] Error saving token to backend:', err);
        }
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('[FCM] Registration Error:', err);
      });

      // When push notification arrives while app is open or backgrounded
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[FCM] Push Received:', notification);
        const data = notification.data || {};
        if (data.type === 'incoming_call' || data.type === 'call_incoming') {
          // Vibrate in phone call rhythm
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
              navigator.vibrate([800, 400, 800, 400, 1200]);
            } catch (_) {}
          }
          window.dispatchEvent(new CustomEvent('jts:incoming-call-push', { detail: data }));
        } else if (data.type === 'chat_message') {
          window.dispatchEvent(new CustomEvent('jts:chat-message-push', { detail: data }));
        }
      });

      // When user clicks the push notification (call or chat message) from lock screen or status bar
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('[FCM] Push Action Performed:', notification);
        const data = notification.notification?.data || {};
        const actionId = notification.actionId;

        const payload = { ...data, actionId };
        try {
          localStorage.setItem('jts_pending_notification', JSON.stringify(payload));
        } catch (_) {}

        window.dispatchEvent(new CustomEvent('jts:notification-action', { detail: payload }));
      });
    } catch (e) {
      console.warn('[FCM] Failed to setup native push:', e);
    }
  }

  /**
   * Explicitly syncs the locally stored FCM token with the backend whenever user logs in
   */
  public async syncStoredFcmToken(token?: string): Promise<void> {
    try {
      if (Capacitor.isNativePlatform() && !this.hasInitializedPush) {
        await this.initNativePush();
      }
      const fcmToken = localStorage.getItem('jts_fcm_token');
      const authKey = token || getStoredToken() || localStorage.getItem('jts_access_token') || localStorage.getItem('jts_auth_key') || localStorage.getItem('jts_token');
      if (fcmToken && authKey) {
        const res = await fetch(`${API_BASE}/api/notifications/fcm-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authKey}`,
          },
          body: JSON.stringify({ fcmToken, platform: 'android' }),
        });
        const resJson = await res.json().catch(() => ({}));
        console.log('[FCM] Successfully synced FCM device token to user account:', resJson);
      }
    } catch (err) {
      console.warn('[FCM] Error in syncStoredFcmToken:', err);
    }
  }

  /**
   * Dispatches a high-priority Full-Screen Call notification
   * Vibrates device in repeating phone-call pattern
   */
  public notifyIncomingCall(call: IncomingCallPayload): void {
    // 1. Device Vibration Pattern (Ringing phone pattern)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([500, 300, 500, 300, 1000]);
      } catch (_) {}
    }

    // 2. System Push / Local Notification
    if (this.hasPermission && typeof Notification !== 'undefined') {
      try {
        const notif = new Notification(`Incoming ${call.callType === 'video' ? 'Video' : 'Audio'} Call`, {
          body: `${call.callerName} is calling you on JTS Meet`,
          icon: '/favicon.ico',
          tag: `call-${call.meetingId}`,
          requireInteraction: true,
          silent: false,
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (_) {}
    }
  }

  /**
   * Stop incoming call vibration
   */
  public stopCallVibration(): void {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(0);
      } catch (_) {}
    }
  }

  /**
   * Dispatches a 10-minute Pre-Meeting Calendar Reminder
   */
  public notifyMeetingReminder(meeting: MeetingReminderPayload): void {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch (_) {}
    }

    if (this.hasPermission && typeof Notification !== 'undefined') {
      try {
        const notif = new Notification(`Meeting in ${meeting.startsInMinutes} minutes`, {
          body: `"${meeting.title}" starts at ${meeting.scheduledTime}. Tap to 1-click Join.`,
          icon: '/favicon.ico',
          tag: `meeting-${meeting.meetingId}`,
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (_) {}
    }
  }

  /**
   * Dispatches an Enterprise Chat Message Notification
   */
  public notifyChatMessage(sender: string, text: string, channelName?: string): void {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(120);
      } catch (_) {}
    }

    if (this.hasPermission && typeof Notification !== 'undefined') {
      try {
        new Notification(channelName ? `#${channelName} • ${sender}` : sender, {
          body: text,
          icon: '/favicon.ico',
          tag: 'chat-message',
        });
      } catch (_) {}
    }
  }
}

export const mobileNotificationService = new MobileNotificationService();
export default mobileNotificationService;
