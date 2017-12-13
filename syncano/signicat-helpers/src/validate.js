import runner from './runner';
import utils from './utils';

function run(ctx, args, server) {
  const {data, response, socket} = server;
  return data.certificates
    .where('commonName', utils.getSignicatCertCN(ctx))
    .firstOrFail()
    .then(cert => {
      return socket
        .post('saml-helpers/get-assertion', {
          SAMLResponse: args.SAMLResponse,
          cert: cert.cert,
          idAttribute: args.idAttribute
        })
        .then(validationResult => {
          if (!validationResult || validationResult.status !== 'success') {
            return response.json(
              {message: 'could not validate SAMLResponse'},
              400
            );
          }
          let payload = JSON.parse(args.payload);
          socket
            .post(args.target, {
              assertion: validationResult.assertion,
              ...payload
            })
            .then(
              resp => {
                return response.json(resp);
              },
              e => {
                return response.json({message: e.message}, 500);
              }
            );
        });
    });
}

let middleware = {
  parallel: ['validator/validate']
};

export default ctx => {
  return runner(ctx, run);
};
