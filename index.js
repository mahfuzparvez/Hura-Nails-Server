const express = require('express')
const app = express()
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}

const port = process.env.PORT || 5000;

const serviceAccount = require('./hura-nails-firebase-adminsdk.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wfh14.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const database = client.db('huraNails');
        const ordersCollection = database.collection('orders');
        const usersCollection = database.collection('users');
        const productsCollection = database.collection('products');
        const reviewsCollection = database.collection('reviews');

        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = reviewsCollection.insertOne(review);
            res.json(result);
        });
        app.get('/reviews', async (req, res) => {
            const cursor = reviewsCollection.find({});
            const review = await cursor.toArray();
            res.json(review);
        });

        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = productsCollection.insertOne(product);
            console.log(product);
            res.json(result)
        });
        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find({});
            const product = await cursor.toArray();
            res.json(product);
        });

        app.get('/orders', async (req, res) => {
            /* const email = req.query.email;
            const query ={email: email} */
            const cursor = ordersCollection.find({});/* query */
            const orders = await cursor.toArray();
            res.json(orders);
        });

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.json(result)
        });

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.json(result);
        })
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        /*  app.delete("/orders/:id", async (req, res) => {
             const id = req.params.id;
             const query = { _id: ObjectId(id) };
             const result = await ordersCollection.deleteOne(query);
             res.json(result);
         }); */

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            console.log(requester);
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you have not access for make an admin. ero badhor beshi calak oigeyus' })
            }

        })
    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello Tahsin')
})

app.listen(port, () => {
    console.log(`listening on ${port}`)
})