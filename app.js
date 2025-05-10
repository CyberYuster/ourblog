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
  store: MongoStore.create({ mongoUrl: 'mongodb+srv://hunteryuster854:vy5psoB313T1ApdH@cluster1.ixh85nb.mongodb.net/ourblog?retryWrites=true&w=majority&appName=Cluster1',
  ttl: 14 * 24 * 60 * 60, // = 14 days
  autoRemove: 'native' // Better session cleanup   
}),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' 
   }
}));

// Passport
require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  console.log('----- REQUEST DEBUG -----');
  console.log('Session ID:', req.sessionID);
  console.log('Session:', req.session);
  console.log('Authenticated User:', req.user);
  console.log('------------------------');
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