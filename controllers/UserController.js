import sha1 from 'sha1';
import dbClient from '../utils/db';

async function postNew(req, res) {
  const { email, password } = req.body;
  if (!email) {
    return res.send({ error: 'Missing email' }).status(400);
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

export default { postNew };
