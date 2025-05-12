const express = require('express');
const router = express.Router();
const { MongoClient,ObjectId} = require("mongodb");
// const uri=process.env.LOCAL_MONGO_URL;
const uri=process.env.MONGODB_URI;
const client=new MongoClient(uri);
// POST route for adding comments
router.post('/posts/:id/comments', async (req, res) => {
    
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
  router.get('/posts/:id/comments', async (req, res) => {
 
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
  
       const currentUser=res.locals.user;
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
  router.post('/posts/:postId/comments/:commentId/replies', async (req, res) => {
   
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
  router.put('/comments/:commentId', async (req, res) => {

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
  router.delete('/comments/:commentId', async (req, res) => {
 
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
  
  module.exports = router;