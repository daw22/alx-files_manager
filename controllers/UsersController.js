import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

async function postNew(req, res) {
  const { email, password } = req.body;
  if (!email) {
    return res.json({ error: 'Missing email' }).status(400);
  }
  if (!password) {
    return res.json({ error: 'Missing password' }).status(400);
  }
  const db = dbClient.client;
  const collection = db.db().collection('users');
  const userExist = await collection.findOne({ email });
  if (userExist) {
    return res.json({ error: 'Already exist' }).status(400);
  }
  const hashedPassword = sha1(password);
  const newUser = await collection.insertOne({
    email,
    password: hashedPassword,
  });
  return res.json({ id: newUser.insertedId, email }).status(201);
}

async function getMe(req, res) {
  const token = req.headers['x-token'];
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    return res.json({ error: 'Unauthorized' }).status(401);
  }
  const userColl = dbClient.client.db().collection('users');
  const user = await userColl.findOne({ _id: new ObjectId(userId) });
  if (!user) {
    return res.json({ error: 'Unauthirized' }).status(401);
  }
  return res.json({ id: user._id, email: user.email });
}

export default { postNew, getMe };
