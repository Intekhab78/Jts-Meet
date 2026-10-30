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

  constructor() {
    this.checkPermission();
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
