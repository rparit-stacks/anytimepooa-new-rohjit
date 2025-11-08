import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function sendOTP(email: string, otp: string): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: "Your AstroTalk OTP Code",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; background-color: #f9fafb; border-radius: 8px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Verify Your Email</h2>
          <p style="color: #6b7280; margin-bottom: 30px;">Your one-time password is:</p>
          <div style="background-color: #fff; padding: 20px; border-radius: 8px; border: 2px solid #FF6F1E; margin-bottom: 30px;">
            <p style="font-size: 32px; font-weight: bold; color: #FF6F1E; letter-spacing: 4px; margin: 0;">${otp}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">AstroTalk Team</p>
        </div>
      `,
    })
    console.log("[v0] OTP sent successfully to", email)
    return true
  } catch (error) {
    console.error("[v0] Failed to send OTP email:", error)
    return false
  }
}
