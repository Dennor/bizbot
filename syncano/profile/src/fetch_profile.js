import runner from './runner';

function run(ctx, args, server) {
  const {data, response, users} = server;
  let user;
  return data.user_tokens
    .where('token', args.token.id)
    .firstOrFail()
    .then(
      userToken => {
        users.firstOrFail(userToken.user).then(user => {
          data.profile_data
            .where('user', user.id)
            .firstOrFail()
            .then(
              profile => {
                let badFields = ['links', 'revision', 'channel_room'];
                for (const f of badFields) {
                  delete profile[f];
                }
                return response.json({
                  email: user.username,
                  ...profile
                });
              },
              e => {
                return response.json({
                  message: `missing profile for ${user.username}`
                });
              }
            );
        });
      },
      e => {
        return response.json({message: 'Forbidden'}, 403);
      }
    );
}

let middleware = {
  parallel: ['validator/validate', 'token-middleware/check-token-middleware']
};

export default ctx => {
  return runner(ctx, run, middleware);
};
