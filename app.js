require('dotenv').config();
const express=require('express');
const ejs=require("ejs");
const bodyParser=require("body-parser");
const passport=require("passport");
const FacebookStrategy=require("passport-facebook").Strategy;
const session = require('express-session');
const nodemailer=require("nodemailer");
const _=require("lodash");

const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRETS, // Add your client secret here
    process.env.GOOGLE_CALLBACK_URI
);

const app=express();
app.use(bodyParser.json());

app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));
app.set('view engine','ejs');

let posts=[];

// Session setup (required for Passport)
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
  }));
  // console.log('Session Secret:', process.env.SESSION_SECRET);
  // Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_CLIENT_ID, // Replace with your Facebook App ID
    clientSecret: process.env.FACEBOOK_CLIENT_SECRETS, // Replace with your Facebook App Secret
    callbackURL: process.env.FACEBOOK_CALLBACK_URI,
    profileFields: ['id', 'displayName', 'email', 'photos'], // Fields to retrieve
  }, (accessToken, refreshToken, profile, done) => {
    // This function is called when Facebook authentication is successful
    const { id, displayName, emails, photos } = profile;
    const user = {
      facebookId: id,
      name: displayName,
      email: emails ? emails[0].value : null,
      picture: photos ? photos[0].value : null,
    };

    // Save the user to your database or handle as needed
  console.log('User signed up with Facebook:', user);
  done(null, user);
}));

// Serialize and deserialize user (required for Passport)
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Facebook authentication routes
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/signup' }),
  (req, res) => {
    // Successful authentication, redirect to a success page
    res.redirect('/profile');
  }
);

app.get('/profile', (req, res) => {
    if (!req.user) {
      return res.redirect('/signup');
    }
    res.render('profile', { user: req.user });
  });
  

app.get("/",(req,res)=>{
  let array=req.body.title;
res.render("home",{posts});
});

app.get("/about",(req,res)=>{
    res.render("about");
});

app.get("/contact",(req,res)=>{
res.render("contact");
});

app.get("/signup",(req,res)=>{
    res.render("signup");
});

app.post("/signup",(req,res)=>{
    const { id, name, email, picture } = req.body;

    // Here you would typically save the user to your database
    console.log('User signed up success:', { id, name, email, picture });

    res.json({ success: true, message: 'User signed up successfully success' });
});

app.get("/signin",(req,res)=>{
  res.render("signin");
});

app.get('/auth/google', (req, res) => {
    const url = client.generateAuthUrl({
        access_type: 'offline',
        scope: ['profile', 'email'],
    });
    res.redirect(url);
});


app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send('Invalid request');
    }

    try {
        const { tokens } = await client.getToken(code);
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { sub, name, email, picture } = payload;

        console.log('User signed up well:', { sub, name, email, picture });
        // res.send('Authentication successful! well');
        res.send('successfully signed !!!');
    } catch (error) {
        console.error('Error during authentication:', error);
        res.status(500).send('Authentication failed');
    }
});

app.get("/compose",(req,res)=>{
res.render("compose");
});

app.post("/compose",(req,res)=>{
  // let {subject,body}=req.body;
let data={
subject:req.body.subject,body:req.body.body
};
posts.push(data);
  res.render("home",{posts});
});

app.get("/posts/:title",(req,res)=>{
const Title=_.lowerCase(req.params.title);
const checkData=posts.find(p=>_.lowerCase(p.subject)===Title);
console.log(checkData);
if(checkData){
res.render("postPage",{checkData});
}
else{
  console.log(404);
}
});

app.post("/edit",(req,res)=>{
  const {heading,body}=req.body;
posts.subject=heading;
posts.body=body;
console.log("edit post : ",posts);
res.render("home",{posts});
});

app.get("/edits/:title",(req,res)=>{
  const Title=_.lowerCase(req.params.title);
  const retrieve=posts.find(p=>_.lowerCase(p.subject)===Title);
  if(retrieve){
    console.log("the retrieve value is ",retrieve);
res.render("edit",{retrieve});
  }else{
    console.log(console.dir);
  }
});

app.post("/send-email",(req,res)=>{
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
            res.send('Thank you for contacting us! We will get back to you soon.');
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>{
console.log(`the server runs at port ${PORT}`);
});