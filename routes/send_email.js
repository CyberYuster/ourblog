require('dotenv').config();
const express = require("express");
const nodemailer = require("nodemailer");
const router = express.Router();

router.post("/send_email",(req,res)=>{
    let { name, email, message } = req.body;

    // Create a Nodemailer transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Use your email service (e.g., Gmail, Outlook)
        auth: {
            user: process.env.EMAIL_USER, // Your email address
            pass: process.env.EMAIL_PASS, // Your email password or app-specific password
        },
});
    // Email options
    const mailOptions = {
        from: email, // Sender's email address
        to: process.env.EMAIL_USER, // Your email address
        subject: `New Message from ourblog by ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
    };
    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            res.status(500).send('Error sending email');
        } else {
            name=""; email=""; message= "";
            console.log('Email sent:', info.response);
         
            res.render("contact",{messages:"Thank you for contacting us! We will get back to you soon.",redirect:"/auth/contact",delay:3000,showFlash: true});
        }
    });
});

module.exports = router;