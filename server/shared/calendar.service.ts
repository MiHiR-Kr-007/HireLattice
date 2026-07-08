import { google, calendar_v3 } from 'googleapis';

export class CalendarService {
    private calendar: calendar_v3.Calendar;
    private oauth2Client;

    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        this.oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });

        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    }

    async createInterviewEvent(
        candidateEmail: string,
        interviewerEmail: string,
        startTime: Date,
        endTime: Date,
        jobTitle: string
    ): Promise<string | null> {
        try {
            const event: calendar_v3.Schema$Event = {
                summary: `Interview: ${jobTitle}`,
                description: `Technical interview for ${jobTitle}.\n\nPlease find the AI Match Report attached internally.`,
                start: {
                    dateTime: startTime.toISOString(), 
                    timeZone: 'UTC', // absolute UTC
                },
                end: {
                    dateTime: endTime.toISOString(),
                    timeZone: 'UTC',
                },
                attendees: [
                    { email: candidateEmail },
                    { email: interviewerEmail }
                ],
                conferenceData: {
                    createRequest: {
                        requestId: `hireflow-${Date.now()}`,
                        conferenceSolutionKey: { type: 'hangoutsMeet' }
                    }
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 }, // 24 hours before
                        { method: 'popup', minutes: 10 }       // 10 minutes before
                    ]
                }
            };

            const response = await this.calendar.events.insert({
                calendarId: 'primary',
                conferenceDataVersion: 1,
                requestBody: event
            });

            console.log(`Calendar event created: ${response.data.htmlLink}`);
            return response.data.hangoutLink || response.data.htmlLink || null;

        } catch (error) {
            console.error('Failed to create Google Calendar event:', error);
            throw new Error('Calendar Sync Failed');
        }
    }
}

export const calendarService = new CalendarService();