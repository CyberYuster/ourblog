require('dotenv').config();
const passport=require('passport');
const LocalStrategy=require('passport-local').Strategy;
const FacebookStrategy=require('passport-facebook').Strategy;
const GoogleStrategy=require('passport-google-oauth20').Strategy;

const User=require('../models/Users');

// serialization
passport.serializeUser((user,done)=>{
    console.log("serial user type : ",user.account[0].provider);
    console.log("serial user id : ",user._id);
    console.log("the profile id is : ",user.account[0].profile_id);
    done(null,{id:user._id,type:user.account[0].provider,profile_id:user.account[0].profile_id});
});
// deserialization
passport.deserializeUser(async(serialized,done)=>{
    try{
        console.log("Deserializing:", serialized);
        console.log("the serialized id : ",serialized.id);
        console.log("the serialized type is : ",serialized.type);
        if (!serialized) {
            console.log("No serialized user found");
            return done(null, false);
        }

        const user=serialized.type === "local"?await User.findById(serialized.id):await User.findByProvider(serialized.type,serialized.profile_id);
        if (!user) {
            console.log("User not found during deserialization");
            return done(null, false);
        }
        console.log("the user i expect : ",user);
        done(null,user);
    }catch(err){
        console.error("Deserialization error:", err);
        done(err);
    }
});

// local Strategy
passport.use(new LocalStrategy({
    usernameField:"email",
    passwordField:"password",
    
},async(email,password,done)=>{
    try{
        const user=await User.findByEmail(email);
        // console.log("local strategy user : ",user);
        if(!user) return done(null,false,{message:"Invalid Credentials no such user present"});
        const verifyPassword=await User.verifyPassword(user,password);
        // console.log("local strategy password : ",verifyPassword);
        if(!verifyPassword) return done(null,false,{message:"the password is not correct"});
        done(null,user);
    }catch(err){
        done(err);
    }
}));
// google strategy
const callback=process.env.NODE_ENV === 'production'?process.env.GOOGLE_CALLBACK:process.env.GOOGLE_CALLBACK_URI;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRETS,
    callbackURL: callback,
    passReqToCallback:true,
    proxy: true
},async(req,accessToken,refreshToken,profile,done)=>{
    try{
        console.log("Google profile received:", profile);
        profile.provider="google";
        const user=await User.findOrCreateSocialUser(profile);
        console.log("User after findOrCreate:", user);
        if (!user) {
            return done(null, false, { message: "Failed to create user" });
        }
        done(null,user);
    }catch(err){
        console.error("Google strategy error:", err);
        done(err);
    }
}));

// facebook strategy
const callbackURL = process.env.NODE_ENV === 'production'
  ? process.env.FACEBOOK_CALLBACK
  : process.env.FACEBOOK_CALLBACK_URI;

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRETS,
    callbackURL: callbackURL,
    profileFields: ['id', 'emails', 'name', 'displayName', 'photos']
},async(accessToken,refreshToken,profile,done)=>{
    try{
        profile.provider="facebook";
        const user=await User.findOrCreateSocialUser(profile);
        done(null,user);
    }catch(err){
        done(err);
    }
}));

module.exports=passport;