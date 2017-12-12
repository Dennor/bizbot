import runner from './runner';
import crypto from 'crypto';

async function newToken(data) {
  let token = crypto.randomBytes(32).toString('hex');
  // Loop while token is not unique
  // TODO: some kind of backoff. Though collisions shouldn't really happen
  return data.tm_tokens
    .where('token', token)
    .firstOrFail()
    .then(
      t => {
        return newToken(data).then(token => {
          return token;
        });
      },
      e => {
        return token;
      }
    );
}

function run(ctx, args, server) {
  const {data, response} = server;
  let {expire = 300} = args;
  return newToken(data).then(
    token => {
      let expireDate = new Date();
      expireDate.setSeconds(expireDate.getSeconds() + expire);
      return data.tm_tokens
        .create({
          token: token,
          expire: expireDate
        })
        .then(token => {
          return response.json({...token}, 200);
        });
    },
    e => {
      return response.json({message: 'internal server error'}, 500);
    }
  );
}

let middleware = {
  parallel: ['validator/validate']
};

export default ctx => {
  return runner(ctx, run, middleware);
};
