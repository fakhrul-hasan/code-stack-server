const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: "./.env" });
const app = express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.d9amltv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db("codeStack").collection("users");
    const questionsCollection = client.db("codeStack").collection("questions");
    const answerCollection = client.db("codeStack").collection("answers");
    const saveCollection = client.db("codeStack").collection("saves");

    //JWT
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "30d",
      });
      res.send({ token });
    });

    // Get all users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().sort({ _id: -1 }).toArray();
      res.send(result);
    });

    //Post users data to database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists" });
      }
      user.role = user.role || 'normalUser'; // Default to normalUser if no role is provided
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Get Google user by email
    app.get("/users/google/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const user = await usersCollection.findOne({ email, entryPoint: "google" });
    
        if (!user) {
          return res.status(404).send({ message: "User not found with this Google account" });
        }
    
        res.send(user);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
      }
    });

    //Get admin using email query  
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.status(403).send({ admin: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    // Change user role
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const newRole = req.body.role;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: newRole,
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/users/normalUser/:id", async (req, res) => {
      const id = req.params.id;
      const newRole = req.body.role;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: newRole,
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
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
      try {
        const result = await questionsCollection.find().sort({ _id: -1 }).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
      }
    });

    // Check valid or non valid username
    app.get("/check-username", async (req, res) => {
      const username = req.query.username;
  
      const query = { username: username };
      const existingUser = await usersCollection.findOne(query);
  
      if (existingUser) {
          res.send({ success: false, message: "Username already exists!" });
      } else {
          res.send({ success: true, message: "You can take it!" });
      }
  });  

    //Update question details
    app.put('/update-question/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedQuestion = req.body;
      const newQuestionData = {
        $set: {
          title: updatedQuestion.title,
          body: updatedQuestion.body,
          selected: updatedQuestion.selected,
          problemImages: updatedQuestion.problemImages,
        }
      }
      const result = await questionsCollection.updateOne(filter, newQuestionData, options);
      res.send(result)
    })

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

    //Delete Questions
    app.delete('/delete-question/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await questionsCollection.deleteOne(query)
      res.send(result);
    })

    //Email query for the get Answers
    app.get('/answers/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await answerCollection.find(query).toArray();
      res.send(result);
    })

    //Vote api
    app.post('/vote/:id', async (req, res) => {
      const queId = req.params.id;
      const user = req.body.email;
      const filter = { _id: new ObjectId(queId) }
      const updateDoc = {
        $addToSet: { QuestionsVote: user }
      };
      const updateResult = await questionsCollection.updateOne(filter, updateDoc);
      res.send({ updateResult });
    })

    // Get all tag
    app.get("/tags", async (req, res) => {
      try {
        const questions = await questionsCollection.find().toArray();
        const selectedItemsCounts = {};

        questions.forEach((question) => {
          if (question.selected && Array.isArray(question.selected)) {
            question.selected.forEach((item) => {
              const lowercaseItem = item.toLowerCase();
              if (selectedItemsCounts[lowercaseItem]) {
                selectedItemsCounts[lowercaseItem]++;
              } else {
                selectedItemsCounts[lowercaseItem] = 1;
              }
            });
          }
        });

        const tagArray = Object.keys(selectedItemsCounts).map((key) => ({
          name: key,
          count: selectedItemsCounts[key],
        }));

        res.json(tagArray);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
      }
    });

    //Save the questions
    app.post("/saves", async (req, res) => {
      const savesData = req.body;
      const result = await saveCollection.insertOne(savesData);
      res.send(result);
    });

    //Get Save data with email query
    app.get('/save/:email', async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email }
      const result = await saveCollection.find(query).toArray();
      res.send(result);
    })

    //Get All Saves Data
    app.get("/saves", async (req, res) => {
      const result = await saveCollection.find().toArray();
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
