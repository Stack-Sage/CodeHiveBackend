import emailjs from "@emailjs/browser";


const sendOtpEmail = (toEmail, otp) => {
  return emailjs.send(
    "service_nfq1gql",         // Your EmailJS service ID
    "template_yzukbeh",            // Your OTP template ID (set this up in EmailJS)
    {
      email: toEmail,
      otp: otp,
      owner_email: "official.adirajpu@gmail.com", // or your admin email
    },
    "Yt7duJ8PkQlj2j1w7"        // Your EmailJS public key
  );
}

export { sendOtpEmail };