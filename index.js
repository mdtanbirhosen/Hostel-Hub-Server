const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// 
// 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.swu9d.mongodb.net/?retryWrites=true&w=majority`;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w70mv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;



const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db("hostelDB").collection("users");
    const mealsCollection = client.db("hostelDB").collection("meals");
    const packegesCollection = client.db("hostelDB").collection("packeges");
    const paymentsCollection = client.db("hostelDB").collection("payments");
    const upcomingMealsCollection = client.db("hostelDB").collection("upcomingMeals");
    const reviewsCollection = client.db("hostelDB").collection("reviews");
    const requestMealCollection = client.db("hostelDB").collection("requestMeal");


    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result)
    })

    // middlewares 
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    app.get('/users/admin', verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result)
    })

    // user collection get one find query

    app.get('/users/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result)
    })
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.badges === 'admin';
      }
      res.send({ admin });
    })

    // user created in DB
    app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email if user doesnt exists: 
      // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          badges: 'admin'
        }
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    // review get operation in admin dashboard
    app.get('/review/admin', verifyToken, async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result)
    })


    // review get operation in admin dashboard
    app.get('/reviews/admin/:title', verifyToken, async (req, res) => {
      const title = req.params.title;
      const query = { mealTitle: title };
      const result = await reviewsCollection.find(query).toArray();
      res.send(result);
    })
    // review get operation 
    app.get('/reviews/:title', async (req, res) => {
      const title = req.params.title;
      const query = { mealTitle: title };
      const result = await reviewsCollection.find(query).toArray();
      res.send(result);
    })
    app.get('/reviews/admin/:title', async (req, res) => {
      const title = req.params.title;
      const query = { mealTitle: title };
      const result = await reviewsCollection.find(query).toArray();
      res.send(result);
    })

    // review post operation
    app.post('/reviews', verifyToken, async (req, res) => {
      const reviewData = req.body;
      const result = await reviewsCollection.insertOne(reviewData)
      res.send(result)
    })

    // review collection in delete operation
    app.get('/review/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log(email)
      const query = { userEmail: email };
      const result = await reviewsCollection.find(query).toArray();
      res.send(result)
    })

    // review collection in delete operation
    app.delete('/review/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await reviewsCollection.deleteOne(query);
      res.send(result)
    })


    // meals related work

    // meals get in this line
    app.get('/meals', async (req, res) => {
      const result = await mealsCollection.find().toArray();
      res.send(result)
    })
    app.get('/meals/admin', verifyToken, async (req, res) => {
      const result = await mealsCollection.find().toArray();
      res.send(result)
    })


    // মিলস কালেকশন থেকে আইডি দিয়ে ‍একটি ডাটা নেওয়া হলো
    app.get('/meals/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await mealsCollection.findOne(query);
      res.send(result);
    })

    app.get('/meals/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { mealAddedEmail: email };
      const result = await mealsCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/meals/admin', verifyToken, async (req, res) => {
      const mealData = req.body;
      const result = await mealsCollection.insertOne(mealData);
      res.send(result);
    })

    app.delete('/meals/admin/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await mealsCollection.deleteOne(query);
      res.send(result)
    })

    // like meal 
    app.patch('/meal/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const { email } = req.body;
      const filter = { _id: new ObjectId(id), likedBy: { $ne: email } };

      const updateDoc = {
        $inc: { likes: 1 },
        $push: { likedBy: email },
      };

      try {
        const result = await mealsCollection.updateOne(filter, updateDoc);
        if (result.modifiedCount > 0) {
          res.send({ success: true, message: "Meal liked successfully." });
        } else {
          res.status(400).send({ message: "You have already liked this meal." });
        }
      } catch (error) {
        console.error("Error updating likes:", error);
        res.status(500).send({ message: "Failed to update likes" });
      }
    });

    app.get('/requestMeal/admin', verifyToken, async (req, res) => {
      try {
        const result = await requestMealCollection.find({ status: 'pending' }).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: 'Something went wrong!' });
      }
    });


    // request-meal collection in get method 
    app.get('/requestMeal/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await requestMealCollection.find(query).toArray();
      res.send(result)
    })
    // request-meal collection in post 
    app.post('/requestMeal', verifyToken, async (req, res) => {
      const requestData = req.body;
      const result = await requestMealCollection.insertOne(requestData);
      res.send(result)
    })

    // request-meal collection delete operation per id
    app.delete('/requestMeal/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await requestMealCollection.deleteOne(query);
      res.send(result)
    })

    // upcoming meals collection in get operation 
    app.get('/upcomingMeals', async (req, res) => {
      const result = await upcomingMealsCollection.find().toArray();
      res.send(result)
    })


    app.post('/upcomingMeals/admin', async (req,res) => {
      const data = req.body
      const result = await upcomingMealsCollection.insertOne(data)
      res.send(result)
    })


    app.get('/upcomingMeals/admin', verifyToken, async (req, res) => {
      const result = await upcomingMealsCollection.find().toArray();
      res.send(result)
    })

    // upcoming meal collection in patch operation
    app.patch('/upcomingMeals/:id', async (req, res) => {
      const id = req.params.id;
      const { email } = req.body;
      const filter = { _id: new ObjectId(id), likedBy: { $ne: email } };

      const updateDoc = {
        $inc: { likes: 1 },
        $push: { likedBy: email },
      };

      try {
        const result = await upcomingMealsCollection.updateOne(filter, updateDoc);
        if (result.modifiedCount > 0) {
          res.send({ success: true, message: "Meal liked successfully." });
        } else {
          res.status(400).send({ message: "You have already liked this meal." });
        }
      } catch (error) {
        console.error("Error updating likes:", error);
        res.status(500).send({ message: "Failed to update likes" });
      }
    });

    app.patch('/request/admin/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "delivered"
        }
      };
      const result = await requestMealCollection.updateOne(query, updateDoc);
      res.send()
    })

    app.post('/request/admin/:id', async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      console.log(data)
      await mealsCollection.insertOne(data);
      const query = { _id: new ObjectId(id) };
      const result = await upcomingMealsCollection.deleteOne(query);
      res.send(result)
    })


    // packages collection work and get
    app.get('/packeges', async (req, res) => {
      const result = await packegesCollection.find().toArray();
      res.send(result);
    })

    // পেকেজেস কালেকশন থেকে কেটেগোরি দিয়ে ‍একটি ডাটা নেওয়া হলো
    app.get('/packeges/:category', async (req, res) => {
      const category = req.params.category;
      const query = { category: category };
      const result = await packegesCollection.findOne(query);
      res.send(result)
    })




    // payment related work
    app.post('/create-payment-intent', verifyToken, async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: [
          "card",
        ],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    })

    // payment collection get
    app.get('/payments/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await paymentsCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/payments', async (req, res) => {
      const payment = req.body;

      try {
        const paymentResult = await paymentsCollection.insertOne(payment);

        const email = payment.email;
        const query = { email: email };

        const updateDoc = {
          $set: {
            badges: payment.badges,
          },
        };
        const userUpdateResult = await userCollection.updateOne(query, updateDoc);

        res.send({
          success: true,
          paymentResult,
          userUpdateResult,
        });


      } catch (error) {
        console.error('Error updating user badges:', error);
        res.status(500).send({ success: false, message: 'Internal Server Error' });
      }
    });

    // 


  } finally {
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('boss is sitting')
})

app.listen(port, () => {
  console.log(`Bistro boss is sitting on port ${port}`);
})
