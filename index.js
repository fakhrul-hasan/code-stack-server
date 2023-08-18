const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: "./.env" });
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.Access_token_secret, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.d17riyo.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    
    const usersCollection = client.db("codeStack").collection("users");
    const questionsCollection = client.db("codeStack").collection("questions");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.Access_token_secret, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/users/:id', verifyJWT, async(req,res)=>{
      const id = req.params.id;
      const data = req.body;
      const filter = {_id: new ObjectId(id)};
      const updateDoc ={
        $set:{
          name: data.name,
          photo: data.photo
        }
      }
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // add a questions api

    app.post("/queries", async (req, res) => {
      const queriesData = req.body;
      const result = await queriesCollection.insertOne(queriesData);
      res.send(result);
    });
    app.get("/questions", async (req, res) => {
      const result = await questionsCollection.find().toArray();
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running");
});
app.listen(port, () => {
  console.log(`app is running on port: ${port}`);
});
