require('dotenv').config();
const express=require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
// const router=express.Router();
const ejs=require("ejs");
const bodyParser=require("body-parser");
const passport=require("passport");
const FacebookStrategy=require("passport-facebook").Strategy;
const session = require('express-session');
const nodemailer=require("nodemailer");
const _=require("lodash");
const { MongoClient,ObjectId} = require("mongodb");

const { OAuth2Client, ClientAuthentication } = require('google-auth-library');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');

// Generate and store reset tokens
const crypto = require('crypto');
const resetTokens = new Map(); // In-memory store (use Redis in production)

const rateLimit = require('express-rate-limit');

// const commentRoutes = require('./routes/comments');


const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRETS, // Add your client secret here
    process.env.GOOGLE_CALLBACK_URI
);

const app=express();
app.use(bodyParser.json());

app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));
app.set('view engine','ejs');

app.use(cookieParser());


let loggedUser={};
let convertor={};

let allPosts=[];

// const uri="mongodb://127.0.0.1/27017";
const uri="mongodb+srv://hunteryuster854:vy5psoB313T1ApdH@cluster1.ixh85nb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1";
// Session setup (required for Passport)
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    // cookie: { secure: true } // Set to true if using HTTPS
    store: new (require('connect-pg-simple')(session))() // For production
  }));

  app.use((req, res, next) => {
   // Check if this is a logout request
   if (!req.session?.users) {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  }
  
  // Set user data for templates
  res.locals.users = req.session.users || null;
    next();
  });

  // Initialize Passport
app.use(passport.initialize());
app.use(passport.session());


// Allow 3 password-reset attempts per 15 minutes
const resetLimiter = rateLimit({
  // windowMs: 15 * 60 * 1000, // 15 minutes
  // max: 3,                   // Max 3 requests
   
  // message: "Too many attempts. Try again later."
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,                   // Max 3 requests
  handler: (req, res) => {  // Custom handler
    res.status(429).json({ 
      error: "Too many password reset attempts. Please try again later after 15 minutes." 
    });
  },
  standardHeaders: true,     // Return rate limit info in headers
  legacyHeaders: false       // Disable deprecated headers
});

app.use('/request-password-reset', resetLimiter);

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/'); // Create this directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and GIF images are allowed'), false);
  }
};

// Configure upload middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 // 1MB limit
  }
});


const callbackURL = process.env.NODE_ENV === 'production'
  ? 'https://fierce-garden-84788-b2e256f1b4ea.herokuapp.com/auth/facebook/callback'
  : process.env.FACEBOOK_CALLBACK_URI;
passport.use(
  new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_CLIENT_ID, // Replace with your Facebook App ID
    clientSecret: process.env.FACEBOOK_CLIENT_SECRETS, // Replace with your Facebook App Secret
    callbackURL: callbackURL,
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

  // const uri = "mongodb+srv://hunteryuster854:vy5psoB313T1ApdH@cluster1.ixh85nb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1";

  const client = new MongoClient(uri);
  
  async function run() {
    try {
      const ourblog = client.db('ourblog');
      const userr = ourblog.collection('users');

      let compare=await userr.find({username:user.email,"accounts.type":"facebook"}).toArray();
     
      let account_check=await userr.find({username:user.email,"accounts.type":"google"}).toArray();

      if(compare.length>0){
        console.log("the username already is registered, enjoy our services");
        // res.render("home",{posts});
      }else if(account_check.length>0){
        await userr.updateOne({username:user.email},{$push:{accounts:{type:"facebook",facebookId:user.facebookId}}});
        // res.render("home",{posts});
      }
      else{
        const displayname=user.email.split("@")[0];
        await userr.insertOne({displayName:displayname,username:user.email,accounts:[{type:"facebook",facebookId:user.facebookId}]});
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

app.use((req, res, next) => {
  if (!req.session.users) {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  }
  next();
});

// Facebook authentication routes
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/signup' }),
  (req, res) => {
    // Successful authentication, redirect to a success page
 
    // const uri = "mongodb://127.0.0.1:27017";

    const client = new MongoClient(uri);
    
    async function run() {
      try {
        const ourblog = client.db('ourblog');
        const userr = ourblog.collection('users');
        loggedUser=await userr.findOne({"accounts.type":"facebook","accounts.facebookId":req.user.facebookId});

        convertor={_id:loggedUser._id.toString(),displayName:String(loggedUser.displayName),username:String(loggedUser.username),accounts:loggedUser.accounts};
        console.log("facebook logged details : ",convertor);
        req.session.users=convertor;
        // res.render('home',{convertor,allPosts});
        res.redirect("/");
      }finally{
await client.close();
      }  
    }
    run().catch(console.dir);
    
  }
);



// comments area starts here
// POST route for adding comments
app.post('/posts/:id/comments', async (req, res) => {
  // const uri="mongodb://127.0.0.1/27017";
  const client=new MongoClient(uri);
  try {
    await client.connect();
      const postId = req.params.id;
      const { author, content } = req.body;
      
      const commentsCollection = client.db("ourblog").collection("comments");
      
      const newComment = {
          postId: new ObjectId(postId),
          author,
          content,
          createdAt: new Date()
      };
      
      await commentsCollection.insertOne(newComment);
      // res.redirect('back');
      res.redirect(req.get("Referrer") || "/");
  } catch (err) {
      console.error(err);
      res.status(500).send("Error adding comment");
  }finally{
    await client.close();
  }
});

// GET route to fetch comments for a post
app.get('/posts/:id/comments', async (req, res) => {
  // const uri="mongodb://127.0.0.1/27017";
  const client=new MongoClient(uri);
  try {
    await client.connect();
      const postId = req.params.id;

      // const { author, content } = req.body;

      const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 2;
        const skip = (page - 1) * limit;
      
      const commentsCollection = client.db("ourblog").collection("comments");
      
      // Get total count of comments for this post
      const total = await commentsCollection.countDocuments({
        postId: new ObjectId(postId),
        parentId: { $exists: false }
    });
    const pages = Math.ceil(total / limit);
      const comments = await commentsCollection.find({
          postId: new ObjectId(postId),
          parentId: { $exists: false }
      }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();

     const currentUser=res.locals.users;
       // Add canEdit flag (you might want to implement proper auth)
       const commentsWithEditFlag = comments.map(comment => ({
        ...comment,
        // canEdit: true // In a real app, check if current user is the author
       canEdit: currentUser && (currentUser.displayName === comment.author)
    }));

      res.json({comments:commentsWithEditFlag,total,page,pages});
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error fetching comments" });
  }finally{
await client.close();
  }
});

// POST comment reply
app.post('/posts/:postId/comments/:commentId/replies', async (req, res) => {
  // const uri="mongodb://127.0.0.1/27017";
  const client=new MongoClient(uri);
  try {
    await client.connect();
      const { postId, commentId } = req.params;
      const { author, content } = req.body;
      
      const commentsCollection = client.db("ourblog").collection("comments");
      
      const reply = {
          _id: new ObjectId(),
          author,
          content,
          createdAt: new Date(),
          parentId: new ObjectId(commentId)
      };
      
      // Add reply to the parent comment
      await commentsCollection.updateOne(
        { _id: new ObjectId(commentId) },
        { $push: { replies: reply } }
    );
    
    res.status(201).json(reply);
} catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error adding reply" });
}finally{
  await client.close();
}
});
// UPDATE comment
app.put('/comments/:commentId', async (req, res) => {
  // const uri="mongodb://127.0.0.1/27017";
  const client=new MongoClient(uri);
  try {
    await client.connect();
      const { commentId } = req.params;
      const { content } = req.body;
      
      const commentsCollection = client.db("ourblog").collection("comments");
      
      await commentsCollection.updateOne(
          { _id: new ObjectId(commentId) },
          { $set: { content, updatedAt: new Date() } }
      );
      
      res.status(200).json({ success: true });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error updating comment" });
    }finally{
      await client.close();
    }
});

// DELETE comment
app.delete('/comments/:commentId', async (req, res) => {
  // const uri="mongodb://127.0.0.1/27017";
  const client=new MongoClient(uri);
  try {
    await client.connect();
      const { commentId } = req.params;
      
      const commentsCollection = client.db("ourblog").collection("comments");
      
      // Delete comment or just mark as deleted
      await commentsCollection.deleteOne({ _id: new ObjectId(commentId) });
      
      res.status(200).json({ success: true });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error deleting comment" });
  }finally{
    await client.close();
  }
});



app.get("/",async (req,res)=>{
  res.set('Cache-Control', 'no-store');

// const uri="mongodb://127.0.0.1/27017";
const client=new MongoClient(uri);
try{
const ourblog=client.db("ourblog");
const postsCollection=ourblog.collection("posts");
const commentsCollection = ourblog.collection('comments');

// Get page number from query (default to 1 if not specified)
const page = parseInt(req.query.page) || 1;
const postsPerPage = 5;
const skip = (page - 1) * postsPerPage;

// Get total count of posts for pagination calculation
const totalPosts = await postsCollection.countDocuments();
const totalPages = Math.ceil(totalPosts / postsPerPage);

// Fetch posts with pagination
allPosts= await postsCollection.find().sort({createdAt:-1}).skip(skip).limit(postsPerPage).toArray();
req.session.users=convertor;

// Get comment counts for each post
const postsWithCounts = await Promise.all(allPosts.map(async post => {
  const count = await commentsCollection.countDocuments({ 
    postId: new ObjectId(post._id),
    parentId: { $exists: false } // Only count top-level comments
  });
  return { ...post, commentCount: count };
}));

res.render("home",{allPosts:postsWithCounts,currentPage: page,totalPages,hasNextPage: page < totalPages,hasPrevPage: page > 1,
// Pass the user's authentication status and info
isAuthenticated: !!req.session.users?._id,
currentUser: req.session.users || null
});

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
res.render("contact",{messages:"",redirect:"",delay:0,showFlash: false});
});

app.get("/signup",(req,res)=>{
    res.render("signup",{data:""});
});

app.post("/signup",(req,res)=>{
  // const uri = "mongodb://127.0.0.1:27017";

  const client = new MongoClient(uri);
  
  async function run() {
    try {
      
      const ourblog = client.db('ourblog');
      const user = ourblog.collection('users');
  
      const {password,username,displayname}=req.body;
       // generate a hash to password
       const saltRounds=10;
       const hashedPassword=await bcrypt.hash(password,saltRounds);

      let compare=await user.find({username:{ $regex: new RegExp(`^${username}$`, "i") },displayName:{ $regex: new RegExp(`^${displayname}$`, "i") },accounts:[{type:"normal",password:hashedPassword}]}).toArray();
      if(compare.length>0){
        res.render("signup",{data:"the user already exists, you can not signup !!!"});
        console.log("the user already exists, you can not signup");
      }else{
       
        await user.insertOne({displayName:displayname,username:username,accounts:[{type:"normal",password:hashedPassword}]});
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
  // const uri = "mongodb://127.0.0.1:27017";

  const client = new MongoClient(uri);
  async function run() {
    try {
      const {username,password}= req.body;
// authenticate user

      const ourblog = client.db('ourblog');
      const userr = ourblog.collection('users');

      let user_existance=await userr.find({username:{ $regex: new RegExp(`^${username}$`, "i") },"accounts.type":"normal"}).toArray();
      // if the user does not exists
      if(!(user_existance.length>0)){
        res.render("signin",{data:"the user does not exist !!!"});
      }else{
      // get account details specifically of type normal
      const normalAccount=user_existance[0].accounts.find(acc=>acc.type==="normal");
      // get the password to be compared with the user input password
      const getPassword=normalAccount.password;
      const checkAuthenticity=await bcrypt.compare(password,getPassword);

      if(checkAuthenticity){

      loggedUser=await userr.findOne({username:{ $regex: new RegExp(`^${username}$`, "i") },"accounts.type":"normal","accounts.password":getPassword});

      convertor={_id:loggedUser._id.toString(),displayName:String(loggedUser.displayName),username:String(loggedUser.username),accounts:loggedUser.accounts};
      req.session.users=convertor;
      // res.render("home",{user,allPosts});
      res.redirect("/");
      }
      else{
      console.log("user does not exist");
      res.render("signin",{data:"user does not exist !!!"});
      }
    }} finally {
      await client.close();
    }
  }
  run().catch(console.dir);

});

// Username availability check API
app.get('/api/check-username', async (req, res) => {
// const uri="mongodb://127.0.0.1/27017";
const client=new MongoClient(uri);
  try {
    await client.connect();
    const ourblog=client.db("ourblog");
    const userr=ourblog.collection("users");

    const username = req.query.username;
    
    if (!username || username.length < 3) {
      return res.json({ available: false });
    }

    const user = await userr.find({ 
    
      $text:{
        $search:username,
        $caseSensitive:false,
        $diacriticSensitive:false
      }
      
    }).toArray();
const SearchItem=user.length===0?"":user;
    res.json({ available: !SearchItem });
  } catch (err) {
    console.error('Username check error:', err);
    res.status(500).json({ error: 'Server error' });
  }finally{
await client.close();
  }
});

app.get("/api/check-displayname",async (req,res)=>{
  // const uri="mongodb://127.0.0.1/27017";
  const client=new MongoClient(uri);
  try{
await client.connect();
const db=client.db("ourblog");
const display=db.collection("users");
const displayname = req.query.displayname;
if (!displayname || displayname.length < 3) {
  return res.json({ available: false });
}
const displayNames= await display.find({

  $text:{
    $search:displayname,
    $caseSensitive:false,
    $diacriticSensitive:false
  }
}).toArray();
const mydisplay= displayNames.length === 0 ? "" : displayNames;
res.json({available:!mydisplay});

  }catch(err){
console.error("error on checking displayname ",err);
res.status(500).send("Error occured in displaying name");
  }finally{
await client.close();
  }
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

        // const uri = "mongodb://127.0.0.1:27017";

  const clients = new MongoClient(uri);
  
  async function run() {
    try {
      const ourblog = clients.db('ourblog');
      const userr = ourblog.collection('users');

      let compare=await userr.find({username:email,"accounts.type":"google"}).toArray();
     
      let account_check=await userr.find({username:email,"accounts.type":"facebook"}).toArray();

      const displayname=email.split("@")[0];
      if(compare.length>0){
        console.log("the username already exists, please create another one unique");
        loggedUser=await userr.findOne({username:email,"accounts.type":"google"});

        convertor={_id:loggedUser._id.toString(),displayName:displayname,username:String(loggedUser.username),accounts:loggedUser.accounts};
      req.session.users=convertor;
      res.redirect("/");
      }else if(account_check.length>0){
        await userr.updateOne({username:email},{$push:{accounts:{type:"google",GoogleId:sub}}});
        loggedUser=await userr.findOne({username:email,"accounts.type":"facebook"});

        convertor={_id:loggedUser._id.toString(),displayName:displayname,username:String(loggedUser.username),accounts:loggedUser.accounts};
        req.session.users=convertor;
        res.redirect("/");
      }
      else{
        
        await userr.insertOne({ displayName:displayname,username:email,accounts:[{type:"google",GoogleId:sub}]});
        loggedUser=await userr.findOne({username:email,"accounts.type":"google"});

        convertor={_id:loggedUser._id.toString(),displayName:displayname,username:String(loggedUser.username),accounts:loggedUser.accounts};
        req.session.users=convertor;
        res.redirect("/");
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

function ensureAuthenticated(req, res, next) {
  if (req.session.users?._id) {
    return next();
  }
  res.redirect('/signin');
}

app.get("/compose",ensureAuthenticated,(req,res)=>{
  if(!res.locals.users?._id){ // checks if the user is logged in 
   return res.redirect("/signin");
  } 
res.render("compose");
});

app.post("/compose",upload.single('image'),async (req,res)=>{
if(!res.locals.users?._id) return res.redirect("/signin");

// const uri="mongodb://127.0.0.1/27017";
const client=new MongoClient(uri);

try{
await client.connect();
const ourblog=client.db("ourblog");
const posts=ourblog.collection("posts");

const newPost={
title:req.body.subject,
body:req.body.body,
author:{
  id:res.locals.users._id,
  owner:res.locals.users.displayName
},
createdAt:new Date()
};
// Only add image field if a file was uploaded
if (req.file) {
  newPost.image =req.file.filename;
}

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
// const uri="mongodb://127.0.0.1/27017";
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

app.post("/edit",upload.single('image'),async (req,res)=>{
  // const uri="mongodb://127.0.0.1/27017";
  const client=new MongoClient(uri);
  try{
await client.connect();
const ourblog=client.db("ourblog");
const posts=ourblog.collection("posts");
// make changes to the database
const {subject,body,editid}=req.body;

// Get the existing post first
const existingPost = await posts.findOne({ 
  _id: new ObjectId(editid)
});

if (!existingPost) {
  return res.status(404).send("Post not found or unauthorized");
}

const updateData = {
  title: subject,
  body: body,
  updatedAt: new Date()
};

 // Handle image update
 if (req.file) {
  updateData.image = req.file.filename;
  
  // Delete old image if it exists
  if (existingPost.image) {
      const fs = require('fs');
      const oldImagePath = path.join(process.cwd(), 'public','uploads', existingPost.image);
      // console.log("old image path : ",oldImagePath);
      if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
      }
  }
} else if (req.body.removeImage === 'true') {
  // Handle image removal
  if (existingPost.image) {
    const fs = require('fs');
    const oldImagePath = path.join(process.cwd(), 'public','uploads', existingPost.image);
    
    if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
    }
}
}

await posts.updateOne(
  { _id: new ObjectId(editid) },
  { $set: updateData }
);


// await editPostValue.updateOne({_id:new ObjectId(editid)},{$set:{title:subject,body:body,createdAt:new Date()}});

res.redirect("/");
  }catch(err){
console.log(err);
res.status(500).send("unable to edit the post");
  }finally{
await client.close();
  }
});

app.get("/edits/:id",async (req,res)=>{
// const uri="mongodb://127.0.0.1/27017";
const client=new MongoClient(uri);
try{
await client.connect();
const ourblog=client.db("ourblog");
const postEditing=ourblog.collection("posts");
// find data to edit
const fetchData= await postEditing.findOne({_id:new ObjectId(req.params.id)});
// check if the user wanting to edit is the owner of the content
if(res.locals.users._id !==fetchData.author.id){
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
// const uri="mongodb://127.0.0.1/27017";
const client=new MongoClient(uri);
try{
await client.connect();
const ourblog=client.db("ourblog");
const postsCollection=ourblog.collection("posts");

const checkItem=await postsCollection.findOne({_id:new ObjectId(req.params.id)});
// check if the user deleting a post is the owner
if(res.locals.users?._id !== checkItem.author.id) return res.status(403).send("unauthorized access");

// delete the image storage
if(checkItem.image){
  const imagePath = path.join(process.cwd(), 'public','uploads', checkItem.image);
            
  if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log(`Deleted image: ${checkItem.image}`);
  } else {
      console.log(`Image not found: ${checkItem.image}`);
  }
}

// delete post from mongo database
await postsCollection.deleteOne({_id:new ObjectId(req.params.id)});

res.redirect("/");
}catch(err){
console.log(err);
res.status(500).send("Error on deleting an item");
}finally{
await client.close();
}
});

app.post("/logout",(req,res)=>{
req.session.destroy(err => {
  if (err) {
    console.error('Session destruction error:', err);
    return res.status(500).json({ error: 'Logout failed' });
  }

  // Clear the session cookie with strict options
  res.clearCookie('connect.sid', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0 // Immediately expire
  });

  // Add cache control headers
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
    // For API clients
    if (req.accepts('json')) {
      return res.json({ success: true });
    }
    
    // For web browsers - force a hard redirect with cache busting
    // res.redirect(302, '/?logout=' + Date.now());
    res.redirect(302, `/?logout=true&nocache=${Date.now()}`);

  });

});

// Auth status endpoint
app.get('/api/auth/status', (req, res) => {
  // Add cache control
  res.set('Cache-Control', 'no-store');
  
  res.json({
    authenticated: !!req.session?.users,
    user: req.session?.users || null
  });
});

app.get("/passwordreset",(req,res)=>{
res.render("resertpasswordrequest");
});

app.get("/reset-password",(req,res)=>{
res.render("reset-password",{token:req.query.token});
});

// Route to initiate password reset
app.post('/request-password-reset', async (req, res) => {
  const { username } = req.body;
  // const uri="mongodb://127.0.0.1/27017";
  const client=new MongoClient(uri);
  try {
    await client.connect();
    const db=client.db("ourblog");
    const user = await db.collection('users').findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') },
      "accounts.type": "normal"
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate a unique token
    const token = crypto.randomBytes(32).toString('hex');
    resetTokens.set(token, {
      username: user.username,
      expiresAt: Date.now() + 3600000 // 1 hour expiration
    });

    // In a real app, you'd send this link via SMS or other method
   
      const resetLink= `http://${req.headers.host}/reset-password?token=${token}`;
   
    
    // const resetLink
    res.json({ 
      message: "Password reset initiated",
      resetLink // For demonstration (in production, don't return this)
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }finally{
    await client.close();
  }
});

// Route to actually reset password
app.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  // const uri="mongodb://127.0.0.1/27017";
  const client=new MongoClient(uri);
  try {
    await client.connect();
    const db=client.db("ourblog");
    // Verify token
    const tokenData = resetTokens.get(token);
    if (!tokenData || tokenData.expiresAt < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.collection('users').updateOne(
      { username: tokenData.username, "accounts.type": "normal" },
      { $set: { "accounts.$.password": hashedPassword } }
    );

    // Clear token
    resetTokens.delete(token);
    
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Password reset failed" });
  }finally{
    await client.close();
  }
});

app.get("/api/search",async (req,res)=>{
// const uri="mongodb://127.0.0.1/27017";
const client=new MongoClient(uri);
try{
await client.connect();
const ourblog=client.db("ourblog");
const searchTerm = req.query.q;
    if (!searchTerm || searchTerm.trim() === '') {
      return res.json([]);
    }

    const posts = await ourblog.collection('posts').find({
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { body: { $regex: searchTerm, $options: 'i' } },
        {"author.username":{$regex: searchTerm, $options: 'i'}}
      ]
    }).limit(10).toArray();

    res.json(posts);

}catch(err){
console.error("search error : ",err);
res.status(500).send("searching failed");
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
         
            res.render("contact",{messages:"Thank you for contacting us! We will get back to you soon.",redirect:"/contact",delay:3000,showFlash: true});
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>{
console.log(`the server runs at port ${PORT}`);
});