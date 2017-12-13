import Server from 'syncano-server';
import utils from './utils';
import merge from 'lodash.merge';

export default ctx => {
  const {data, response, socket} = Server(ctx);
  let {SAMLResponse} = ctx.args.args;
  return data.certificates
    .where('commonName', utils.getSignicatCertCN(ctx))
    .firstOrFail()
    .then(
      cert => {
        return socket
          .post('saml-helpers/get-assertion', {
            SAMLResponse,
            cert: cert.cert,
            idAttribute: ctx.args.args.idAttribute
          })
          .then(
            validationResult => {
              if (!validationResult || validationResult.status !== 'success') {
                return response.json(
                  {message: 'could not validate SAMLResponse'},
                  400
                );
              }
              return response.json({
                args: merge(ctx.args.args, {
                  assertion: validationResult.assertion
                })
              });
            },
            e => {
              return response.json({message: 'internal server error'}, 500);
            }
          );
      },
      e => {
        return response.json({message: 'missing signicat certificate'}, 400);
      }
    );
};
