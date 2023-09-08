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

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    // await client.connect();

    const usersCollection = client.db("codeStack").collection("users");
    const questionsCollection = client.db("codeStack").collection("questions");
    const answerCollection = client.db("codeStack").collection("answers");

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

    //Get User With Email Query
    app.get('/user', async (req, res) => {
      const userEmail = req.query.email;
      const query = { email: userEmail };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // Update user info
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email: email }
      const options = { upsert: true };
      const updatedUser = req.body;
      const newUser = {
        $set: {
          name: updatedUser.name,
          imgURL: updatedUser.imgURL,
          age: updatedUser.age,
          gender: updatedUser.gender,
          portfolioURL: updatedUser.portfolioURL,
          country: updatedUser.country,
          city: updatedUser.city,
          facebookURL: updatedUser.facebookURL,
          twitterURL: updatedUser.twitterURL,
          githubURL: updatedUser.githubURL,
          selected: updatedUser.selected,
          aboutMe: updatedUser.aboutMe,
        }
      }
      const result = await usersCollection.updateOne(filter, newUser, options);
      res.send(result)
    })

    // add a questions api
    app.post("/questions", async (req, res) => {
      const quesData = req.body;
      const result = await questionsCollection.insertOne(quesData);
      res.send(result);
    });

    //Get the Questions
    app.get("/questions", async (req, res) => {
      const result = await questionsCollection.find().toArray();
      res.send(result);
    })

    // Check valid or non valid username
    app.get("/check-username", async (req, res) => {
      const username = req.query.username;

      if (!username) {
        return res.status(400).send({ error: true, message: "Username is required" });
      }

      const query = { username: username };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        res.send({ message: "Username already exists!" });
      } else {
        res.send({ message: "You can take it!" });
      }
    });

    //Get Details with id
    app.get('/question-details/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await questionsCollection.findOne(query);
      res.send(result);
    })

    //Post Answers
    app.post("/answers", async (req, res) => {
      const ansData = req.body;
      const result = await answerCollection.insertOne(ansData);
      res.send(result);
    });

    //Get Answers
    app.get("/answers", async (req, res) => {
      const result = await answerCollection.find().toArray();
      res.send(result);
    })

    //Set the answer id in the questions
    app.patch('/question/:id', async (req, res) => {
      const id = req.params.id;
      console.log('Received data:', req.body);

      const filter = { _id: new ObjectId(id) }
      const updatedUser = req.body;
      const newData = {
        $set: {
          answersId: updatedUser.answersId,
        }
      }
      const result = await questionsCollection.updateOne(filter, newData);
      res.send(result)
    })

    //ID query for the get answer
    app.get('/answer/:id', async (req, res) => {
      const id = req.params.id;
      const query = { questionID: id }
      const result = await answerCollection.find(query).toArray();
      res.send(result);
    })

    //Email query for the get questions
    app.get('/questions/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await questionsCollection.find(query).toArray();
      res.send(result);
    })

    //Email query for the get Answers
    app.get('/answers/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await answerCollection.find(query).toArray();
      res.send(result);
    })

    // Add questions view count to database
    app.put('/question-detail/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedQuestion = req.body;
      const newDetails = {
        $set: {
          totalViews: updatedQuestion.clickCount,
        }
      }
      const result = await questionsCollection.updateOne(filter, newDetails, options);
      res.send(result)
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
