declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    ADMIN_EMAIL?: string;
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
  }
}
