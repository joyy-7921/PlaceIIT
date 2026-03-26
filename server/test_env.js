require("./src/config/env");
const { sendWelcomeEmail } = require("./src/services/email.service");
console.log("EMAIL_USER is:", process.env.EMAIL_USER);
console.log("EMAIL_PASS length is:", process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);
