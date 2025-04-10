// middleware/auth.js
module.exports = {
    ensureAuthenticated: (req, res, next) => {
      if (req.isAuthenticated()) {  // If using Passport.js
      // OR if using session cookies:
      // if (req.session.user) {  
        return next();
      }
      res.redirect('/signin');  // Or return 401 for APIs
    }
  };