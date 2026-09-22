import { Meeting, IMeeting } from '../meeting/meeting.model'

export interface DialInNumber {
    country: string
    countryCode: string
    flag: string
    phoneNumber: string
    rawNumber: string
    isTollFree?: boolean
}

export const GLOBAL_DIAL_IN_NUMBERS: DialInNumber[] = [
    {
        country: 'United States',
        countryCode: 'US',
        flag: '🇺🇸',
        phoneNumber: '+1 (888) 555-4633',
        rawNumber: '+18885554633',
        isTollFree: true
    },
    {
        country: 'India',
        countryCode: 'IN',
        flag: '🇮🇳',
        phoneNumber: '+91 11 4080 5871',
        rawNumber: '+911140805871',
        isTollFree: false
    },
    {
        country: 'United Kingdom',
        countryCode: 'GB',
        flag: '🇬🇧',
        phoneNumber: '+44 20 7946 0991',
        rawNumber: '+442079460991',
        isTollFree: false
    },
    {
        country: 'Singapore',
        countryCode: 'SG',
        flag: '🇸🇬',
        phoneNumber: '+65 6701 1892',
        rawNumber: '+6567011892',
        isTollFree: false
    },
    {
        country: 'Germany',
        countryCode: 'DE',
        flag: '🇩🇪',
        phoneNumber: '+49 30 2000 8912',
        rawNumber: '+493020008912',
        isTollFree: false
    }
]

export function getDialInNumbers(): DialInNumber[] {
    if (process.env.PSTN_DIAL_IN_NUMBERS) {
        try {
            const parsed = JSON.parse(process.env.PSTN_DIAL_IN_NUMBERS)
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed
            }
        } catch {
            // ignore JSON parse error, fallback
        }
    }
    return GLOBAL_DIAL_IN_NUMBERS
}

export class TelephonyService {
    /**
     * Get or generate conference dial-in PIN and phone access numbers for a meeting
     */
    public async getDialInDetails(meetingId: string): Promise<{
        meetingId: string
        pin: string
        formattedPin: string
        phoneNumbers: DialInNumber[]
        oneClickTelUri: string
    }> {
        let meeting = await Meeting.findOne({
            $or: [{ meetingId }, { customId: meetingId }]
        })

        let pin = meeting?.dialInPin

        if (!pin) {
            // Generate a 6-digit conference PIN (e.g. 784291)
            pin = String(Math.floor(100000 + Math.random() * 900000))
            if (meeting) {
                meeting.dialInPin = pin
                await meeting.save()
            }
        }

        const formattedPin = `${pin.slice(0, 3)} ${pin.slice(3)}#`
        const numbers = getDialInNumbers()
        const primaryNumber = numbers[0]?.rawNumber || '+18885554633'
        // 1-Click mobile dial string pauses twice with commas, then enters PIN followed by hash
        const oneClickTelUri = `tel:${primaryNumber},,${pin}#`

        return {
            meetingId,
            pin,
            formattedPin,
            phoneNumbers: numbers,
            oneClickTelUri
        }
    }

    /**
     * Verify a 6-digit phone dial-in PIN entered on a phone keypad
     */
    public async verifyPin(enteredPin: string): Promise<IMeeting | null> {
        const cleanPin = enteredPin.replace(/\D/g, '')
        if (!cleanPin || cleanPin.length < 4) return null

        const meeting = await Meeting.findOne({ dialInPin: cleanPin })
        return meeting
    }

    /**
     * Generate TwiML Voice IVR welcome XML prompting caller for 6-digit Conference PIN
     */
    public generateWelcomeTwiML(actionUrl: string): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather action="${actionUrl}" method="POST" numDigits="6" finishOnKey="#" timeout="12">
        <Say voice="Polly.Joanna" language="en-US">
            Welcome to JTS Meet Enterprise Audio Bridge. Please enter your six digit conference PIN on your keypad, followed by the pound key.
        </Say>
    </Gather>
    <Say voice="Polly.Joanna" language="en-US">
        We did not receive your conference PIN. Thank you for calling JTS Meet. Goodbye.
    </Say>
    <Hangup/>
</Response>`
    }

    /**
     * Generate TwiML Voice XML connecting caller to live WebRTC audio stream bridge
     */
    public generateBridgeTwiML(meetingTitle: string, streamWebSocketUrl: string): string {
        const safeTitle = (meetingTitle || 'Conference Room').replace(/[<>&"]/g, '')
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" language="en-US">
        PIN verified. Connecting you to ${safeTitle}. You are now unmuted and live on the audio bridge.
    </Say>
    <Connect>
        <Stream url="${streamWebSocketUrl}" />
    </Connect>
</Response>`
    }

    /**
     * Generate TwiML Voice XML for invalid PIN rejection
     */
    public generateInvalidPinTwiML(): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" language="en-US">
        The conference PIN you entered is invalid or the meeting has ended. Please check your meeting invite and try again. Goodbye.
    </Say>
    <Hangup/>
</Response>`
    }
}

export const telephonyService = new TelephonyService()
