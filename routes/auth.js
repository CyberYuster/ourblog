const express = require('express');
const router=express.Router();
const Users=require("../models/Users");
const passport = require("passport");
const bcrypt = require('bcrypt');

const multer = require('multer');
const fs = require('fs');
const path = require('path');

// const {ensureAuthenticated} = require("../middleware/auth");
const {ensureAuthenticated,showifUnauthenticated} = require("../middleware/auth");
const { MongoClient,ObjectId} = require("mongodb");

// Generate and store reset tokens
const crypto = require('crypto');
const resetTokens = new Map(); // In-memory store (use Redis in production)

const rateLimit = require('express-rate-limit');

// const uri = "mongodb://127.0.0.1:27017";
const uri=process.env.MONGODB_URI;
const client=new MongoClient(uri);
let allPosts=[];
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

router.get("/",async(req,res)=>{
//   res.set('Cache-Control', 'no-store');

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

// Get comment counts for each post
const postsWithCounts = await Promise.all(allPosts.map(async post => {
  const count = await commentsCollection.countDocuments({ 
    postId: new ObjectId(post._id),
    parentId: { $exists: false } // Only count top-level comments
  });
  return { ...post, commentCount: count };
}));

res.render("home",{allPosts:postsWithCounts,currentPage: page,totalPages,hasNextPage: page < totalPages,hasPrevPage: page > 1,

});

}catch(err){
console.log(err);
res.status(500).send("Error on retrieving posts");
}finally{
client.close();
}
});

router.get("/about",(req,res)=>{
    res.render("about");
});

router.get("/contact",(req,res)=>{
res.render("contact",{messages:"",redirect:"",delay:0,showFlash: false});
});

router.get("/signup",showifUnauthenticated,(req,res)=>{
    res.render("signup",{data:""});
});

router.post("/signup",async(req,res)=>{
  
    try {
        const {password,username,displayname}=req.body;
        const user=await Users.findByEmail(username);
        // checks if user is already registered
        if(user) return res.render("signup",{data:"this email is already registered"});
    // register the user
        const newUser=await Users.createLocalUser({displayname,username,password});
        console.log("newly registered user is : ",newUser);
        // req.flash("success","You have successfully registered a new user");
        req.logIn(newUser, (err) => {
            if (err) throw err;
            req.session.lastActivity = Date.now();
            // res.status(201).json({ message: 'User created', user:newUser });
            res.render("signup",{data:"well signed up !!!"});
          });
       
    }catch(error){
        console.log("error is : ",error);
        res.status(500).send("Error on registering a user");

    }
});

router.get("/signin",(req,res)=>{
    res.render("signin",{data:""});
  });

router.post("/signin",(req,res,next)=>{
passport.authenticate("local",(err,user,info)=>{
  if(err) return next(err);
  // console.log("my user after login : ",user);
  if(!user) return res.status(401).json({error:info.message});
 
  req.logIn(user,(err)=>{
if(err) return next(err);
req.session.lastActivity=Date.now();
// return res.json({message:"logged in successfully"});
req.session.save(() => {
  return res.redirect('/');
});
  });

})(req,res,next);
});

// Facebook Auth
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback', 
  passport.authenticate('facebook', { 
    failureRedirect: '/signup',
    session: true 
  }),
  (req, res) => {
    req.session.lastActivity = Date.now();
    res.redirect('/');
  }
);

// Google Auth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/signup',
    session: true 
  }),
  (req, res) => {
    req.session.lastActivity = Date.now();
    res.redirect('/');
  }
);

// Username availability check API
router.get('/api/check-username', async (req, res) => {
   
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
    
    router.get("/api/check-displayname",async (req,res)=>{
        
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

      router.get("/posts/:id",async (req,res)=>{
      
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

        router.post("/edit",upload.single('image'),async (req,res)=>{
           
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
                    
          res.redirect("/");
            }catch(err){
          console.log(err);
          res.status(500).send("unable to edit the post");
            }finally{
          await client.close();
            }
          });

          router.get("/edits/:id",async (req,res)=>{
          
            try{
            await client.connect();
            const ourblog=client.db("ourblog");
            const postEditing=ourblog.collection("posts");
            // find data to edit
            const fetchData= await postEditing.findOne({_id:new ObjectId(req.params.id)});
            // check if the user wanting to edit is the owner of the content
            if(String(req.user?._id) !== String(fetchData.author.id)){
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
            router.get("/delete/:id",async (req,res)=>{
               
                try{
                await client.connect();
                const ourblog=client.db("ourblog");
                const postsCollection=ourblog.collection("posts");
                
                const checkItem=await postsCollection.findOne({_id:new ObjectId(req.params.id)});
                // check if the user deleting a post is the owner
                if(String(res.locals.user?._id) !== String(checkItem.author.id)) return res.status(403).send("unauthorized access");
                
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

                router.post("/logout",(req,res)=>{

                    req.logout((err) => {
                      if (err) {
                        console.error('Logout error:', err);
                        return res.status(500).json({ error: 'Logout failed' });
                      }
                      
                      req.session.destroy((err) => {
                        if (err) {
                          console.error('Session destruction error:', err);
                          return res.status(500).json({ error: 'Logout failed' });
                        }
                        
                        res.clearCookie('connect.sid');
                        res.json({ message: 'Logged out successfully' });
                    
                      });
                    });
                    });
                    const resetLimiter = rateLimit({
  
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
                      
                      router.use('/request-password-reset', resetLimiter);
                      
                    router.get("/passwordreset",(req,res)=>{
                        res.render("resertpasswordrequest");
                        });
                        
                        router.get("/reset-password",(req,res)=>{
                        res.render("reset-password",{token:req.query.token});
                        });
    // Route to handle password reset request
    router.post('/request-password-reset', async (req, res) => {
        const { username } = req.body;
      
        try {
          await client.connect();
          const db=client.db("ourblog");
          const user = await db.collection('users').findOne({ 
            username: { $regex: new RegExp(`^${username}$`, 'i') },
            "account.type": "local"
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
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
  
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
        { username: tokenData.username, "account.type": "local" },
        { $set: { "account.$.password": hashedPassword } }
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


  router.get("/api/search",async (req,res)=>{
   
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

    router.get("/compose",ensureAuthenticated,(req,res)=>{
        res.render("compose");
        });
      
      router.post("/compose",upload.single('image'),async (req,res)=>{
          if(!res.locals.user?._id) return res.redirect("/signin");
          
        
          try{
          await client.connect();
          const ourblog=client.db("ourblog");
          const posts=ourblog.collection("posts");
          
          const newPost={
          title:req.body.subject,
          body:req.body.body,
          author:{
            id:res.locals.user._id,
            owner:res.locals.user.displayName
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

    module.exports=router;