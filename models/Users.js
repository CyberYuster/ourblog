const bcrypt=require("bcryptjs");
const { MongoClient,ObjectId} = require("mongodb");
const uri=process.env.MONGODB_URI;
// const uri="mongodb://127.0.0.1:27017";
const client=new MongoClient(uri);
class User{
  
static async findById(id){
  
        try{
            await client.connect();
         console.log("gotten id : ",new ObjectId(id));
            const user=await client.db("ourblog").collection("users").findOne({_id:new ObjectId(id)});
            // const user=await client.db("verify").collection("users").findOne({_id:id});
            console.log("the user at id is : ",user);
            if(!user){
console.log("user is not present");
                return null;
            }
           console.log("the findById user : ",user);
            return user;
        }catch(err){
console.log(err);
        }finally{
await client.close();
        }


    }
static async findByEmail(email){
        // for local users

        try{
            await client.connect();
            const user=await client.db("ourblog").collection("users").findOne({username:email});
            if(!user) {
                console.log("user's name is not present");
                return null;
            }
            
            return user;
        }catch(err){
console.log(err);
        }finally{
await client.close();
        }


    }
    static async findByProvider(provider,id){
        console.log("received provider : ",provider);
        console.log("received provider id : ",id);

        // for social users
      
        try{
         await client.connect();
            const user=await client.db("ourblog").collection("users").findOne({account:{$elemMatch:{provider:provider,profile_id:id}}});
         console.log("output the user : ",user);
            return user;
        }catch(err){
console.log(err);
        }finally{
await client.close();
        }
    }

    static async verifyPassword(user,password){
        try{
            // const present={user,passwords:password};
            console.log("verify password user is : ",user);
           
            if (!user) {
                // throw new Error("User or password hash missing");
                console.log("user and password are not present");
                return null;
            }
           return await bcrypt.compare(password,user.account[0].password);
        }catch(err){
console.log(err);
        }
    
    }  
static async createLocalUser({displayname,username,password}){
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    console.log("salt is : ",salt);
const savedUser={
    // id: new ObjectId(),
    displayName:displayname,
    username:username,
    account:[
        {
            provider:"local",
            password:passwordHash,
        }
    ],
    createdAt:new Date()
}
// save data to mongoDB

try{
    await client.connect();
    const user= await client.db("ourblog").collection("users").insertOne(savedUser);
    console.log("newly saved user is : ",user);
    return savedUser;
}catch(err){
console.log(err);
}finally{
await client.close();
}
}
static async findOrCreateSocialUser(profile){
        console.log("provider is : ",profile.provider);
        console.log("provider id is : ",profile.id);

const user=await this.findByProvider(profile.provider,profile.id);
console.log("user data : ",user);
if(user)return user;

const newuser={
    // id:profile.id,
    displayName: profile.displayName,
    username: profile.emails[0].value,
    account:[
        {
            provider:profile.provider, 
            profile_id:profile.id,
        }
    ],
    createdAt: new Date()
};
// save data to the database

try{
    await client.connect();
    const users=await client.db("ourblog").collection("users").insertOne(newuser);
    console.log("inserted data : ",users);
return newuser;
    
}catch(err){
console.log(err);
}finally{
await client.close();
}
}
}

module.exports=User;