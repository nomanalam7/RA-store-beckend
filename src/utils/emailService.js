const { EMAIL_USER, EMAIL_PASS, EMAIL_SERVICE, SUPPORT_EMAIL, FRONTEND_URL, ADMIN_URL } = process.env;

// Customer-support inbox shown on replies regardless of the SMTP sender.
const SUPPORT_INBOX = SUPPORT_EMAIL || "rastoresupport@gmail.com";
const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");

const VIEWS_DIR = path.join(__dirname, "..", "views", "emails");

console.log(EMAIL_SERVICE, "EMAIL_SERVICE");

class EmailService {
  constructor(userEmail) {
    if (!EMAIL_USER || !EMAIL_PASS) {
      throw new Error("Email credentials are not configured");
    }

    this.to = userEmail;
    this.from = `"RA STORE" <${EMAIL_USER || SUPPORT_INBOX}>`;

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

  /**
   * Render an EJS template and send as HTML email with plain-text fallback.
   * @param {string} subject - Email subject
   * @param {Object} options - { template: 'template-name', data: {...}, text?: string }
   *   If text is not provided, a basic plain-text version is generated from the template name + data
   */
  async sendEmail(subject, options) {
    try {
      let html = "";
      let text = "";

      if (options.template) {
        const templatePath = path.join(VIEWS_DIR, `${options.template}.ejs`);
        const templateData = {
          ...options.data,
          settings: options.data.settings || {},
          FRONTEND_URL: FRONTEND_URL || "https://ra-store-web.vercel.app",
          ADMIN_URL: ADMIN_URL || "https://ra-store-admin.vercel.app",
        };
        html = await ejs.renderFile(templatePath, templateData);
        // Generate plain-text fallback if not provided
        text = options.text || this._generateTextFallback(options.template, templateData);
      } else if (typeof options === "string") {
        // Backward compatibility: plain-text only
        text = options;
      } else {
        // Object with explicit text/html
        text = options.text || "";
        html = options.html || "";
      }

      const mailOptions = {
        from: this.from,
        to: this.to,
        replyTo: SUPPORT_INBOX,
        subject: subject,
        text: text,
        html: html || undefined,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.messageId);
      return info;
    } catch (error) {
      console.error("Error sending email:", error);
      // Don't throw — email failures should not break the request
      return null;
    }
  }

  _generateTextFallback(template, data) {
    const lines = [];
    switch (template) {
      case "order-confirmation":
        lines.push(`Order Confirmed #${data.order?.orderNumber}`);
        lines.push(`Hi ${data.customer?.fullName},`);
        lines.push(`Your order #${data.order?.orderNumber} has been placed.`);
        lines.push(`Total: Rs. ${data.order?.total?.toLocaleString()}`);
        lines.push(`Delivery Estimate: ${data.order?.deliveryEstimate?.min}-${data.order?.deliveryEstimate?.max} business days`);
        lines.push(`Track: ${data.FRONTEND_URL}/order/${data.order?.orderNumber}`);
        break;
      case "order-status-update":
        lines.push(`Order #${data.order?.orderNumber} Status Update: ${data.statusLabel}`);
        lines.push(`Hi ${data.customer?.fullName},`);
        lines.push(`Your order status is now: ${data.statusLabel}`);
        if (data.note) lines.push(`Note: ${data.note}`);
        lines.push(`Track: ${data.FRONTEND_URL}/order/${data.order?.orderNumber}`);
        break;
      case "new-order-admin":
        lines.push(`New Order #${data.orderNumber}`);
        lines.push(`Customer: ${data.customer?.fullName}`);
        lines.push(`Phone: ${data.customer?.phone}`);
        lines.push(`Total: Rs. ${data.total?.toLocaleString()}`);
        lines.push(`Items: ${data.itemsCount}`);
        lines.push(`View in Admin: ${data.ADMIN_URL}/orders`);
        break;
      case "new-review-admin":
        lines.push(`New Review on ${data.productName}`);
        lines.push(`Rating: ${data.rating}/5`);
        lines.push(`Verified: ${data.isVerified ? "Yes" : "No"}`);
        lines.push(`Auto-approved: ${data.autoApproved ? "Yes" : "No"}`);
        if (data.title) lines.push(`Title: ${data.title}`);
        lines.push(`Comment: ${data.comment}`);
        lines.push(`Moderate: ${data.ADMIN_URL}/reviews`);
        break;
      case "review-approved":
        lines.push(`Your review has been approved!`);
        lines.push(`Hi ${data.customerName},`);
        lines.push(`Your review for ${data.productName} is now live.`);
        lines.push(`View: ${data.FRONTEND_URL}/product/${data.productSlug}`);
        break;
      default:
        lines.push("RA Store notification");
    }
    return lines.join("\n\n");
  }
}

module.exports = EmailService;