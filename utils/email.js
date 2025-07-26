const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail address
        pass: process.env.EMAIL_PASS, // App Password: nfefvevzqcumiteg
    },
});

const sendOtpEmail = async (to, mfaCode) => {
    try {
        const mailOptions = {
            from: `"SkillSwap Test" <${process.env.EMAIL_USER}>`,
            to, // Fake email like test@yopmail.com
            subject: 'Your SkillSwap OTP Code (Test)',
            html: `
        <h2>Your Test OTP Code</h2>
        <p>Your one-time password (OTP) is <strong>${mfaCode}</strong>.</p>
        <p>Use this code to complete your login in the SkillSwap test environment.</p>
        <p>This is a test email sent to a fake address (${to}).</p>
      `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Test OTP email sent to ${to}`);
    } catch (error) {
        console.error('Error sending test OTP email:', error);
        throw new Error('Failed to send test OTP email');
    }
};

module.exports = { sendOtpEmail };