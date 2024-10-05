import { expect } from '../test-helper';
import dbClient from '../../utils/db';

describe('DbClient', () => {
  let filesColl, usersColl;
  before(async () => {
    filesColl = dbClient.client.db().collection('files');
    usersColl = dbClient.client.db().collection('users');
    await filesColl.deleteMany({});
    await usersColl.deleteMany({});
  });

  it('dbClient isAlive', () => {
    expect(dbClient.isAlive()).to.equal(true);
  });

  it('dbClient nbUsers', async () => {
    expect(await dbClient.nbUsers()).to.equal(0);
  });

   it('dbClient nbFiles', async () => {
    expect(await dbClient.nbFiles()).to.equal(0);
  });

  it('dbClient nbUsers after adding user', async () => {
    await usersColl.insertOne({ email: 'email@email.com' });
    expect(await dbClient.nbUsers()).to.equal(1);
  });

  it('dbClient nbFiles after adding a file', async () => {
    await filesColl.insertOne({ name: 'a.txt', type: 'file' });
    expect(await dbClient.nbFiles()).to.equal(1);
  });

});
