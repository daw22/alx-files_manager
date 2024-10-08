import { request, expect } from '../test-helper';
import dbClient from '../../utils/db';
import redisClient from '../../utils/redis';
import sha1 from 'sha1';

describe('UsersController', () => {
  let usersColl, userId;
  before((done) => {
    const userColl = dbClient.client.db().collection('users');
    userColl.deleteMany({})
    .then((res) => done());
  });

  describe('POST /users - Adds new user', () => {
    it('correctyly adds a new user', (done) => {
      request.post('/users')
        .set('Content-Type', 'application/json')
        .send({ email: 'test@user.com', password: 'test123' })
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('id');
	  expect(res.body).to.have.property('email');
          userId = res.body.id;
          done();
        });
    });

    it('tries to add user with a missing email', (done) => {
      request.post('/users')
        .set('Content-Type', 'application/json')
        .send({ password: 'test123' })
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(400);
          expect(res.body).to.deep.equal({ error: 'Missing email' });
          done();
        });
    });

    it('tries to add user with a missing password', (done) => {
      request.post('/users')
        .set('Content-Type', 'application/json')
        .send({ email: 'test2@email.com' })
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(400);
          expect(res.body).to.deep.equal({ error: 'Missing password' });
          done();
        });
    });

    it('tries to add an already existing user', (done) => {
      request.post('/users')
        .set('Content-Type', 'application/json')
        .send({ email: 'test@user.com', password: 'test123' })
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(400);
          expect(res.body).to.deep.equal({ error: 'Already exist' });
          done();
        });
    });
  });

  describe('GET /users/me', () => {
    before(async () => {
      await redisClient.set('auth_faketoken', userId, 60);
    });

    after(async () => {
      await redisClient.del('auth_faketoken');
    });

    it('tries retrieve user based on token', (done) => {
      request.get('/users/me')
        .set('x-token', 'faketoken')
        .set('Content-Type', 'application/json')
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res.body).to.have.property('id');
          expect(res.body).to.have.property('email');
          expect(res.body.email).to.equal('test@user.com');
          expect(res.body.id).to.equal(userId);
          done();
        });
    });

    it('tries retrieve user based on wrong token', (done) => {
      request.get('/users/me')
        .set('x-token', 'wrongtoken')
        .set('Content-Type', 'application/json')
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(401);
          expect(res.body).to.deep.equal({ error: 'Unauthorized' });
          done();
        });
    });

  });
	
});
