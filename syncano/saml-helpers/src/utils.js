import saml20 from 'saml20';

async function validateAndParse(ctx, args, server) {
  const {error} = server.logger(ctx.meta.executor);
  return new Promise(resolve => {
    saml20.validate(
      new Buffer(args.SAMLResponse, 'base64').toString(),
      {publicKey: args.cert},
      (err, profile) => {
        if (err) {
          error(err);
          error(err.message);
          return resolve([false, {}]);
        }
        return resolve([true, profile]);
      }
    );
  });
}

async function parse(ctx, args, server) {
  const {error} = server.logger(ctx.meta.executor);
  return new Promise(resolve => {
    saml20.parse(
      new Buffer(args.SAMLResponse, 'base64').toString(),
      (err, profile) => {
        if (err) {
          error(err);
          error(err.message);
          return resolve({});
        }
        return resolve(profile);
      }
    );
  });
}

export {parse, validateAndParse};
