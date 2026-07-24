import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

interface EmailPayload {
    to: string;
    subject: string;
    body: string;
    html?: string;
}

export const sendEmail = async ({ to, subject, body, html }: EmailPayload): Promise<void> => {
    try {
        const info = await transporter.sendMail({
            from: process.env.FROM_EMAIL || '"HireLattice" <noreply@hirelattice.com>',
            to,
            subject,
            text: body,
            html: html || `<div>${body}</div>`,
        });

        console.log(`[Mailer] Message sent successfully to ${to} (Message ID: ${info.messageId})`);
    } catch (error) {
        console.error(`[Mailer] Failed to send email to ${to}:`, error);
        throw error;
    }
};