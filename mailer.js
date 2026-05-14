const nodemailer = require("nodemailer");

/**
 * Create reusable transporter
 * Uses Gmail SMTP (requires App Password, not normal password)
 */
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Send verification email
 * @param {string} to - recipient email
 * @param {string} code - verification code
 */
async function sendVerificationEmail(to, code) {
    try {
        await transporter.sendMail({
            from: `"CubeWorld" <${process.env.EMAIL_USER}>`,
            to,
            subject: "CubeWorld Email Verification",
            text: `Your verification code is: ${code}`,
            html: `
                <div style="font-family:Arial;padding:10px">
                    <h2>CubeWorld Verification</h2>
                    <p>Your code is:</p>
                    <h1 style="letter-spacing:4px">${code}</h1>
                    <p>If you did not request this, ignore this email.</p>
                </div>
            `
        });

        return true;
    } catch (err) {
        console.error("Email error:", err);
        return false;
    }
}

module.exports = {
    sendVerificationEmail
};
