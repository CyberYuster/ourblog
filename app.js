require('dotenv').config();
const express=require('express');
const ejs=require("ejs");
const bodyParser=require("body-parser");
const passport=require("passport");
const session = require('express-session');
const MongoStore = require('connect-mongo');
const _=require("lodash");

const authRoutes = require('./routes/auth');
const commentRoutes = require('./routes/comments');
const emailRoutes = require('./routes/send_email');

const app=express();
// middleware

app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.json());

// session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb://127.0.0.1:27017/ourblog' }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1 * 60 * 60 * 1000 // 1 hour
  }
}));

// Passport
require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

//Routes
app.use("/",authRoutes);
app.use("/auth",authRoutes);
app.use("/comments",commentRoutes);
app.use(emailRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>{
console.log(`the server runs at port ${PORT}`);
});