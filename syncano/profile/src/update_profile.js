import runner from './runner';

function run(ctx, args, server) {
  const {data, response, users, socket} = server;
  delete args['apiToken'];
  let email = args.email;
  delete args.email;
  let token = args.token;
  delete args['token'];
  return data.user_tokens
    .where('token', token.id)
    .firstOrFail()
    .then(
      userToken => {
        users.firstOrFail(userToken.user).then(
          user => {
            let promises = [];
            if (email) {
              promises.push(
                users.where('id', user.id).update({username: email})
              );
            }
            try {
              if (args.birthDate) {
                args.birthDate = new Date(args.birthDate);
              }
            } catch (e) {
              return response.json({message: e.message}, 400);
            }
            promises.push(
              data.profile_data.where('user', user.id).update(args)
            );
            return Promise.all(promises).then(
              values => {
                return socket
                  .post('profile/fetch-profile', {
                    apiToken: token.token
                  })
                  .then(
                    resp => {
                      return response.json(resp);
                    },
                    e => {
                      return response.json(e.response.data, e.response.status);
                    }
                  );
              },
              e => {
                return response.json(e.response.data, e.response.status);
              }
            );
          },
          e => {
            return response.json({message: 'user does not exist'}, 400);
          }
        );
      },
      e => {
        return response.json({message: 'token does not exist'}, 403);
      }
    );
  return Promise.resolve(response.json({}));
}

let middleware = {
  parallel: ['validator/validate', 'token-middleware/check-token-middleware']
};

export default ctx => {
  return runner(ctx, run, middleware);
};
