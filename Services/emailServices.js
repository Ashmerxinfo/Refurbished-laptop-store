const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(to, subject, html) {
    try {

        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM,
            to: [to],
            subject: subject,
            html: html
        });

        if (error) {
            console.error("❌ Email Error:", error);
            return false;
        }

        console.log("✅ Email Sent Successfully:", data.id);
        return true;

    } catch (err) {
        console.error("❌ Email Error:", err);
        return false;
    }
}

module.exports = { sendEmail };