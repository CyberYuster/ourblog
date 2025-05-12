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
app.set('trust proxy', 1); // Trust first proxy

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.APP_URI);
  res.header('Access-Control-Allow-Credentials', true);
  next();
});
// middleware

app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.json());

// Add this before session middleware
if(process.env.NODE_ENV === 'production') {
app.enable('trust proxy');
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
}
// session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URL }),
  ttl: 14 * 24 * 60 * 60, // = 14 days
  autoRemove: 'native' // Better session cleanup   
}),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' 
   }
}));

// Passport
require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  console.log('Passport session debug:');
  console.log('Session:', req.session);
  console.log('Passport data:', req.session?.passport);
  console.log('Is authenticated:', req.isAuthenticated());
  next();
});

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