const { MongoClient } = require("mongodb");

// Replace the uri string with your connection string.
const uri = "mongodb://127.0.0.1:27017";

const client = new MongoClient(uri);

async function run() {
  try {
    const database = client.db('ourblog');
    const movies = database.collection('users');

    const query = { username: 'havana' };
    const movie = await movies.findOne(query);

    console.log(movie);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);