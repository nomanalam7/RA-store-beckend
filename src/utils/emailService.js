const { EMAIL_USER, EMAIL_PASS, EMAIL_SERVICE } = process.env;
const nodemailer = require("nodemailer");
const path = require("path");

console.log(EMAIL_SERVICE, "EMAIL_SERVICE");

class EmailService {
  constructor(userEmail) {
    if (!EMAIL_USER || !EMAIL_PASS) {
      throw new Error("Email credentials are not configured");
    }

    this.to = userEmail;
    this.from = EMAIL_USER || "sinan.lakhani09@gmail.com";

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async sendEmail(subject, text) {
    try {
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject: subject,
        text: text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.messageId);
      return info;
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }
}

module.exports = EmailService;
