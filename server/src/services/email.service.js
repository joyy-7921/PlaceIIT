const nodemailer = require("nodemailer");

const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;
console.log(`[Email Config] EMAIL_USER initialized: ${user ? user.substring(0, 3) + '***' : 'MISSING'}`);
console.log(`[Email Config] EMAIL_PASS initialized: ${pass ? '***' : 'MISSING'}`);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: user,
    pass: pass,
  },
});

/**
 * Send an OTP email to the given address.
 * @param {string} to  - recipient email
 * @param {string} otp - 6-digit OTP code
 */
const sendOtpEmail = async (to, otp) => {
  const mailOptions = {
    from: `"PlaceIIT" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your PlaceIIT Password Reset OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #4338ca; margin-bottom: 8px;">Password Reset Request</h2>
        <p style="color: #374151;">Use the OTP below to reset your PlaceIIT account password. It is valid for <strong>10 minutes</strong>.</p>
        <div style="text-align: center; margin: 32px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #1e1b4b; background: #eef2ff; padding: 16px 28px; border-radius: 8px;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 13px;">If you didn't request this, please ignore this email. Your password won't be changed.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send a welcome email with credentials to a newly onboarded student.
 * @param {string} to        - student email
 * @param {string} name      - student name 
 * @param {string} roll      - student roll number
 * @param {string} password  - auto-generated password
 */
const sendWelcomeEmail = async (to, name, roll, username, password) => {
  const mailOptions = {
    from: `"PlaceIIT" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Welcome to PlaceIIT - Your Login Credentials",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #4338ca; margin-bottom: 16px;">Welcome to PlaceIIT!</h2>
        <p style="color: #374151;">Hi ${name},</p>
        <p style="color: #374151;">Your student account has been successfully created. You can now log into the placement portal using the credentials below:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0 0 12px 0; color: #111827;"><strong>Name:</strong> ${name}</p>
          <p style="margin: 0 0 12px 0; color: #111827;"><strong>Roll Number:</strong> ${roll}</p>
          <p style="margin: 0 0 12px 0; color: #111827;"><strong>Email ID:</strong> ${to}</p>
          <p style="margin: 0 0 12px 0; color: #111827;"><strong>Username:</strong> <span style="font-family: monospace; background: #fff; padding: 4px 8px; border-radius: 4px; border: 1px solid #d1d5db;">${username}</span></p>
          <p style="margin: 0; color: #111827;"><strong>Temporary Password:</strong> <span style="font-family: monospace; background: #fff; padding: 4px 8px; border-radius: 4px; border: 1px solid #d1d5db;">${password}</span></p>
        </div>

        <p style="color: #b91c1c; font-weight: bold;">Important: You will be required to change this temporary password the first time you log in.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">Best regards,<br/>The PlaceIIT Admin Team</p>
      </div>
    `,
  };

  try {
    console.log(`[Email] Sending welcome email to: ${to}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Welcome email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[Email Error] Failed to send welcome email to ${to}:`, error);
    throw error;
  }
};

/**
 * Send a welcome email with credentials to a newly onboarded Co-Co.
 */
const sendCocoWelcomeEmail = async (to, name, username, password) => {
  const mailOptions = {
    from: `"APC Portal" <${process.env.EMAIL_USER}>`,
    to,
    subject: "APC Portal - Co-Co Account Created",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #4338ca; margin-bottom: 16px;">Welcome to the APC Portal!</h2>
        <p style="color: #374151;">Hello ${name},</p>
        <p style="color: #374151;">Your Co-Co account has been created successfully.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0 0 12px 0; color: #111827;"><strong>Username:</strong> <span style="font-family: monospace; background: #fff; padding: 4px 8px; border-radius: 4px; border: 1px solid #d1d5db;">${username}</span></p>
          <p style="margin: 0; color: #111827;"><strong>Temporary Password:</strong> <span style="font-family: monospace; background: #fff; padding: 4px 8px; border-radius: 4px; border: 1px solid #d1d5db;">${password}</span></p>
        </div>

        <p style="color: #b91c1c; font-weight: bold;">Please login and change your password immediately.</p>
      </div>
    `,
  };

  try {
    console.log(`[Email] Sending Co-Co welcome email to: ${to}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Co-Co Welcome email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[Email Error] Failed to send Co-Co welcome email to ${to}:`, error);
    throw error;
  }
};

module.exports = { sendOtpEmail, sendWelcomeEmail, sendCocoWelcomeEmail };
