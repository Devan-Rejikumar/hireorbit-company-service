import { injectable } from "inversify";
import nodemailer from "nodemailer";

@injectable()
export class EmailService {
    constructor(){
          console.log("SMTP_HOST:", process.env.SMTP_HOST);
    }
  private transporter = nodemailer.createTransport({
    
    host: process.env.SMTP_HOST || "smtp.example.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || "your@email.com",
      pass: process.env.SMTP_PASS || "yourpassword",
    },
  });

  async sendOTP(email: string, otp: number): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Company Service" <no-reply@company.com>',
      to: email,
      subject: "Your Company OTP Code",
      text: `Your OTP code is: ${otp}`,
      html: `<p>Your OTP code is: <b>${otp}</b></p>`,
    };

    await this.transporter.sendMail(mailOptions);
  }
}