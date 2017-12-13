import runner from './runner';

function getUserToken(server, user, args) {
  return server.socket.post('token-middleware/create-new-token').then(token => {
    return server.data.user_tokens
      .create({
        user: user.id,
        token: token.id
      })
      .then(userToken => {
        return server.response.json({
          token: token.token,
          eventCb: args.eventCb,
          eventData: args.eventData
        });
      });
  });
}

function createUser(data, socket, args) {
  let claims = args.assertion.claims;
  return socket
    .post('profile/create-user', {
      email: args.email,
      nationalId: claims['signicat/national-id']
    })
    .then(user => {
      let fullName =
        claims['bankid.certificate/firstname'] +
        ' ' +
        claims['bankid.certificate/lastname'];
      data.profile_data
        .where('user', user.id)
        .update({
          lastLoginAt: new Date(),
          updatedAt: new Date(),
          fullName,
          birthDate: new Date(claims['bankid.certificate/date-of-birth'])
        })
        .then(() => {}, e => console.log(e.response));
      return user;
    });
}

function run(ctx, args, server) {
  const {data, response, socket, users} = server;
  return users
    .where('username', args.email)
    .firstOrFail()
    .then(
      user => {
        return user;
      },
      e => createUser(data, socket, args)
    )
    .then(
      user => {
        return data.profile_data
          .where('user', user.id)
          .update({
            lastLoginAt: new Date()
          })
          .then(
            profile => {
              return getUserToken(server, user, args);
            },
            e => console.log(e)
          );
      },
      e => {
        if (e.response) {
          return response.json(e.response.data, e.response.status);
        }
        return response.json({details: e, message: e.message}, 500);
      }
    );
}

let middleware = {
  parallel: ['validator/validate', 'signicat-helpers/validate-middleware']
};

export default ctx => {
  // Unmarshal eventData from URI
  if (ctx.args.eventData) {
    ctx.args.eventData = JSON.parse(ctx.args.eventData);
  }
  return runner(ctx, run, middleware);
};
