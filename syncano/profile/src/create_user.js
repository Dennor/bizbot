import runner from './runner';

function createUser(ctx, args, users) {
  return users
    .where('username', args.email)
    .create({username: args.email, password: 'p455w0rd'});
}

function createProfile(ctx, args, data) {
  return data.profile_data.where('nationalId', args.nationalId).updateOrCreate({
    nationalId: args.nationalId
  });
}

function profileExists(profile, user, server) {
  if (profile.revision !== 1) {
    server.users.delete(user.id);
    return server.response.json(
      {
        message: 'nationalId already in use'
      },
      409
    );
  }
  return;
}

function run(ctx, args, server) {
  const {data, response, users} = server;
  let user;
  return createUser(ctx, args, users).then(
    user => {
      return createProfile(ctx, args, data).then(profile => {
        var isProfileExists = profileExists(profile, user, server);
        if (isProfileExists) {
          return isProfileExists;
        }
        data.profile_data.where('id', profile.id).update({
          user: user.id
        });
        return response.json(user, 200);
      });
    },
    e => {
      if (e.response && e.response.status === 400) {
        response.json({message: 'user already exists'}, 400);
      }
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
