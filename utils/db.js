import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '27017';
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}/${database}`;
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.client.connect();
  }

  isAlive() {
    return this.client.topology.isConnected();
  }

  async nbUsers() {
    const collection = this.client.db().collection('users');
    const nbusers = await collection.countDocuments();
    return nbusers;
  }

  async nbFiles() {
    const collection = this.client.db().collection('files');
    const nbfiles = await collection.countDocuments();
    return nbfiles;
  }
}

const dbClient = new DBClient();
export default dbClient;
