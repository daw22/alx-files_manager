import { request, expect }  from '../test-helper';
import redisClient from '../../utils/redis';
import dbClient from '../../utils/db';
import { Buffer } from 'buffer';
import sha1 from 'sha1';

describe ('AuthController ', () => {
  let usersColl, userToken;
  before((done) => {
    const encPasswd = sha1('test123');
    usersColl = dbClient.client.db().collection('users');
    usersColl.insertOne({ email: 'test@user.com', password: encPasswd });
    done();
  });

  after((done) => {
    usersColl.deleteMany({});
    done();
  });

  describe('GET /connect', () => {
    
    it('should authenticate successfully', (done) => {
      const email = 'test@user.com';
      const password = 'test123';
      const encodedCredentials = Buffer.from(`${email}:${password}`)
        .toString('base64');
      request.get('/connect')
        .set('Authorization', `Basic ${encodedCredentials}`)
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('token');
          userToken = res.body.token;
          done();
        });
    });

    it('should have userId: auth_token saved in redis', async () => {
      const token = `auth_${userToken}`;
      const userId = await redisClient.get(token);
      expect(userId).to.not.be.null;
    });

    it('tries to authenticate with a missing Authorization header', (done) => {
      request.get('/connect')
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(401);
          expect(res.body).to.deep.equal({ error: 'Authorization header missing' });
          done();
        });
    });

    it('tries to authenticate with wrong authorization type', (done) => {
      const email = 'test@user.com';
      const password = 'test123';
      const encodedCredentials = Buffer.from(`${email}:${password}`)
        .toString('base64');
      request.get('/connect')
        .set('Authorization', `Bearer ${encodedCredentials}`)
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(401);
          expect(res.body).to.deep.equal({ error: 'Authorization type error' });
          done();
        });
    });

    it('tries to authenticate with wrong/unregisterd email', (done) => {
      const email = 'test@user1.com';
      const password = 'test123';
      const encodedCredentials = Buffer.from(`${email}:${password}`)
        .toString('base64');
      request.get('/connect')
        .set('Authorization', `Basic ${encodedCredentials}`)
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(401);
          expect(res.body).to.deep.equal({ error: 'Unauthorized' });
          done();
        });
    });

    it('tries to authenticate with wrong password', (done) => {
      const email = 'test@user.com';
      const password = 'test1234';
      const encodedCredentials = Buffer.from(`${email}:${password}`)
        .toString('base64');
      request.get('/connect')
        .set('Authorization', `Basic ${encodedCredentials}`)
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(401);
          expect(res.body).to.deep.equal({ error: 'Unauthorized' });
          done();
        });
    });

  });

  describe('GET /disconnect', () => {

    it('tries to logout with wrong token', (done) => {
      request.get('/disconnect')
        .set('X-Token', `userToken${0}`)
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(401);
          expect(res.body).to.deep.equal({ error: 'Unauthorized' });
          done();
	});
    });

    it('should logout successfully', (done) => {
      request.get('/disconnect')
        .set('x-token', userToken)
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(204);
          done();
        });
    });

    it('should delete user from redis after logout', async () => {
      const userId = await redisClient.get(`auth_${userToken}`);
      expect(userId).to.be.null;
    });

  });

});
