const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

async function testSMTP() {
    console.log('Testing SMTP connection with:');
    console.log('User:', SMTP_USER);
    console.log('Pass:', SMTP_PASS ? '********' : 'MISSING');

    if (!SMTP_USER || !SMTP_PASS) {
        console.error('SMTP credentials missing in .env.local');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    });

    try {
        console.log('Verifying transporter...');
        await transporter.verify();
        console.log('✅ SMTP connection is verified!');

        console.log('Sending test email to abhiram@intersmart.in...');
        const info = await transporter.sendMail({
            from: `"SMTP Test" <${SMTP_USER}>`,
            to: 'abhiram@intersmart.in',
            subject: 'SMTP Test - Intersmart Team Tracker',
            text: 'This is a test email to verify SMTP configuration.',
            html: '<b>This is a test email to verify SMTP configuration.</b>'
        });

        console.log('✅ Test email sent:', info.messageId);
    } catch (error) {
        console.error('❌ SMTP Error:', error);
    }
}

testSMTP();
