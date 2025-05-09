
const {ensureAuthenticated,showifUnauthenticated}={
    ensureAuthenticated:(req, res, next)=>{
    if (req.isAuthenticated()) {
      return next();
    }
    // res.status(400).json({error:"failed to proceed due to access control restrictions"});
    res.redirect('/signin');
  },
  showifUnauthenticated:(req, res, next)=>{
    if (!req.isAuthenticated()) {
      return next();
    }
    res.redirect('/');
  }
}
module.exports={ensureAuthenticated,showifUnauthenticated}