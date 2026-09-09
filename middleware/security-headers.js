const isProduction = process.env.NODE_ENV === "production";

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' https://cdnjs.cloudflare.com",
  "font-src 'self' https://cdnjs.cloudflare.com",
  "img-src 'self' data:",
  "connect-src 'self'",
];

if (isProduction) {
  CSP_DIRECTIVES.push("upgrade-insecure-requests");
}

const CONTENT_SECURITY_POLICY = CSP_DIRECTIVES.join("; ");

function securityHeaders(req, res, next) {
  res.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-XSS-Protection", "0");
  next();
}

module.exports = {
  CONTENT_SECURITY_POLICY,
  securityHeaders,
};
