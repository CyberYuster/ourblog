require('dotenv').config();
const express=require('express');
const ejs=require("ejs");
const bodyParser=require("body-parser");
const passport=require("passport");
const FacebookStrategy=require("passport-facebook").Strategy;
const session = require('express-session');
const nodemailer=require("nodemailer");
const _=require("lodash");
const { MongoClient,ObjectId} = require("mongodb");

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

// let posts=[];
let loggedUser={};
let convertor={};

let allPosts=[];
// Session setup (required for Passport)
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
  }));

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

  const uri = "mongodb://127.0.0.1:27017";

  const client = new MongoClient(uri);
  
  async function run() {
    try {
      const ourblog = client.db('ourblog');
      const userr = ourblog.collection('users');

      let compare=await userr.find({username:user.email,"accounts.type":"facebook"}).toArray();
      console.log("compare from FB ",compare);

      if(compare.length>0){
        console.log("the username already exists, please create another one unique");
        // res.render("home",{posts});
      }else if(account_check.length>0){
        await userr.updateOne({username:user.email},{$push:{accounts:{type:"facebook",facebookId:user.facebookId}}});
        // res.render("home",{posts});
      }
      else{
        await userr.insertOne({username:user.email,accounts:[{type:"facebook",facebookId:user.facebookId}]});
        console.log("successfully saved data from FB to the DB");
        // res.render("home",{posts});
      }
    } finally {
      await client.close();
    }
  }
  run().catch(console.dir);
 

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
 
    const uri = "mongodb://127.0.0.1:27017";

    const client = new MongoClient(uri);
    
    async function run() {
      try {
        const ourblog = client.db('ourblog');
        const userr = ourblog.collection('users');
        loggedUser=await userr.findOne({"accounts.type":"facebook","accounts.facebookId":req.user.facebookId});

        convertor={_id:loggedUser._id.toString(),username:String(loggedUser.username),accounts:loggedUser.accounts};

        res.render('home',{convertor,allPosts});
      }finally{
await client.close();
      }  
    }
    run().catch(console.dir);
    
  }
);


app.get("/",async (req,res)=>{
const uri="mongodb://127.0.0.1/27017";
const client=new MongoClient(uri);
try{
const ourblog=client.db("ourblog");
const postsCollection=ourblog.collection("posts");

allPosts= await postsCollection.find().sort({createdAt:-1}).toArray();
res.render("home",{convertor,allPosts});

}catch(err){
console.log(err);
res.status(500).send("Error on retrieving posts");
}finally{
client.close();
}

});

app.get("/about",(req,res)=>{
    res.render("about");
});

app.get("/contact",(req,res)=>{
res.render("contact");
});

app.get("/signup",(req,res)=>{
    res.render("signup",{data:""});
});

app.post("/signup",(req,res)=>{
  const uri = "mongodb://127.0.0.1:27017";

  const client = new MongoClient(uri);
  
  async function run() {
    try {
      
      const ourblog = client.db('ourblog');
      const user = ourblog.collection('users');
  
      const {password,username}=req.body;
      console.log("pass,user ",{password,username});

      let compare=await user.find({username:{ $regex: new RegExp(`^${username}$`, "i") },accounts:[{type:"normal",password:password}]}).toArray();
      // console.log("compare ",compare);
      if(compare.length>0){
        res.render("signup",{data:"the user already exists, you can not signup !!!"});
        console.log("the user already exists, you can not signup");
      }else{
        await user.insertOne({username:username,accounts:[{type:"normal",password:password}]});
        // res.send("success");
        res.render("signup",{data:"well signed up !!!"});
        console.log("user saved to database successfully");
      }
    } finally {
      await client.close();
    }
  }
  run().catch(console.dir);
});

app.get("/signin",(req,res)=>{
  res.render("signin",{data:""});
});

app.post("/signin",(req,res)=>{
  const uri = "mongodb://127.0.0.1:27017";

  const client = new MongoClient(uri);
  async function run() {
    try {
      const {username,password}= req.body;

      const ourblog = client.db('ourblog');
      const userr = ourblog.collection('users');

      let user_existance=await userr.find({username:{ $regex: new RegExp(`^${username}$`, "i") },"accounts.type":"normal","accounts.password":password}).toArray();
     if(user_existance.length>0){
        console.log("the username already exists, login success");
        loggedUser=await userr.findOne({username:{ $regex: new RegExp(`^${username}$`, "i") },"accounts.type":"normal","accounts.password":password});

      convertor={_id:loggedUser._id.toString(),username:String(loggedUser.username),accounts:loggedUser.accounts};
 
      res.render("home",{convertor,allPosts});
      }
      else{
      console.log("user does not exist");
      res.render("signin",{data:"user does not exist !!!"});
      }
    } finally {
      await client.close();
    }
  }
  run().catch(console.dir);

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

        const uri = "mongodb://127.0.0.1:27017";

  const clients = new MongoClient(uri);
  
  async function run() {
    try {
      const ourblog = clients.db('ourblog');
      const userr = ourblog.collection('users');

      let compare=await userr.find({username:email,"accounts.type":"google"}).toArray();
     
      let account_check=await userr.find({username:email,"accounts.type":"facebook"}).toArray();
      
      if(compare.length>0){
        console.log("the username already exists, please create another one unique");
        loggedUser=await userr.findOne({username:email,"accounts.type":"google"});

        convertor={_id:loggedUser._id.toString(),username:String(loggedUser.username),accounts:loggedUser.accounts};
       console.log("convertor data : ",convertor);
        res.render("home",{convertor,allPosts});
      }else if(account_check.length>0){
        await userr.updateOne({username:email},{$push:{accounts:{type:"google",GoogleId:sub}}});
        loggedUser=await userr.findOne({username:email,"accounts.type":"facebook"});

        convertor={_id:loggedUser._id.toString(),username:String(loggedUser.username),accounts:loggedUser.accounts};

        res.render("home",{convertor,allPosts});
      }
      else{
        await userr.insertOne({username:email,accounts:[{type:"google",GoogleId:sub}]});
        loggedUser=await userr.findOne({username:email,"accounts.type":"google"});

        convertor={_id:loggedUser._id.toString(),username:String(loggedUser.username),accounts:loggedUser.accounts};

        res.render("home",{convertor,allPosts});

      }
    } finally {
      await clients.close();
    }
  }
  run().catch(console.dir);

    } catch (error) {
        console.error('Error during authentication:', error);
        res.status(500).send('Authentication failed');
    }
});

app.get("/compose",(req,res)=>{
  if(!convertor._id){ // checks if the user is logged in 
   return res.redirect("/signin");
  } 
res.render("compose");
});

app.post("/compose",async (req,res)=>{
if(!convertor._id) return res.redirect("/signin");
const uri="mongodb://127.0.0.1/27017";
const client=new MongoClient(uri);

try{
await client.connect();
const ourblog=client.db("ourblog");
const posts=ourblog.collection("posts");

const newPost={
title:req.body.subject,
body:req.body.body,
author:{
  id:convertor._id,
  username:convertor.username
},
createdAt:new Date()
};
await posts.insertOne(newPost);
res.redirect("/");

}catch(err){
  console.log(err);
  res.status(500).send("Error saving a post");
  }
  finally{
await client.close();
}

});

app.get("/posts/:id",async (req,res)=>{
const uri="mongodb://127.0.0.1/27017";
const client=new MongoClient(uri);
try{
  await client.connect();
const ourblog=client.db("ourblog");
const postCollection=ourblog.collection("posts");
const idvalue=new ObjectId(req.params.id);
const post=await postCollection.findOne({_id:idvalue});

res.render("postPage",{post});
}catch(err){
console.log(err);
}finally{
await client.close();
}
});

app.post("/edit",async (req,res)=>{
  const uri="mongodb://127.0.0.1/27017";
  const client=new MongoClient(uri);
  try{
await client.connect();
const ourblog=client.db("ourblog");
const editPostValue=ourblog.collection("posts");
// make changes to the database
const {subject,body,editid}=req.body;

const edit= await editPostValue.updateOne({_id:new ObjectId(editid)},{$set:{title:subject,body:body,createdAt:new Date()}});

res.redirect("/");
  }catch(err){
console.log(err);
res.status(500).send("unable to edit the post");
  }finally{
await client.close();
  }
});

app.get("/edits/:id",async (req,res)=>{
const uri="mongodb://127.0.0.1/27017";
const client=new MongoClient(uri);
try{
await client.connect();
const ourblog=client.db("ourblog");
const postEditing=ourblog.collection("posts");
// find data to edit
const fetchData= await postEditing.findOne({_id:new ObjectId(req.params.id)});
// check if the user wanting to edit is the owner of the content
if(convertor._id !==fetchData.author.id){
return res.status(404).send("unable to perform this function you are not the owner !!!");
}
res.render("edit",{fetchData});

}catch(err){
console.log(err);
res.status(500).send("Error on editing");
}finally{
await client.close();
}
});

app.get("/delete/:id",async (req,res)=>{
const uri="mongodb://127.0.0.1/27017";
const client=new MongoClient(uri);
try{
await client.connect();
const ourblog=client.db("ourblog");
const postsCollection=ourblog.collection("posts");

const checkItem=await postsCollection.findOne({_id:new ObjectId(req.params.id)});
// check if the user deleting a post is the owner
if(convertor._id !== checkItem.author.id) return res.status(403).send("unauthorized access");
await postsCollection.deleteOne({_id:new ObjectId(req.params.id)});

res.redirect("/");
}catch(err){
console.log(err);
res.status(500).send("Error on deleting an item");
}finally{
await client.close();
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