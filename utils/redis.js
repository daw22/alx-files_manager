import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.connection_success = true;
    this.client.on('error', (err) => {
      console.log(err);
      this.connection_success = false;
    });
    this.client.on('connect', () => {
      this.connection_success = true;
    });
  }

  isAlive() {
    return this.connection_success;
  }

  async get(key) {
    return promisify(this.client.GET).bind(this.client)(key);
  }

  async set(key, value, duration) {
    await this.client.set(key, value, 'EX', duration);
  }

  async del(key) {
    await this.client.del(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
