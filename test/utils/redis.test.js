import { expect } from '../test-helper';
import redisClient from '../../utils/redis.js';

describe('redisClient', () => {

  it('isAlive', () => {
    expect(redisClient.isAlive()).to.equal(true);
  });

  it('redis set and get', async () => {
    await redisClient.set('holberton', 'school', 10);
    expect(await redisClient.get('holberton')).to.equal('school');
  });

  it('set and get after and before expire time', async () => {
    await redisClient.set('myKey', 'myValue', 1);
    expect(await redisClient.get('myKey')).to.equal('myValue');
    setTimeout(async () => {
     expect(await redisClient.get('myKey')).to.be.null;
    }, 1500);
  });

  it('after delete', async () => {
    await redisClient.del('holberton');
    expect(await redisClient.get('holberton')).to.be.null;
  });

});
