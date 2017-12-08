import runner from './runner';
import utils from './utils';

async function run(ctx, args, server) {
  const {data, response, socket} = server;
  let cert = await data.certificates
    .where('commonName', utils.getSignicatCertCN(ctx))
    .firstOrFail();
  let validationResult = await socket.post('saml-helpers/get-assertion', {
    SAMLResponse: args.SAMLResponse,
    cert: cert.cert,
    idAttribute: args.idAttribute
  });
  if (!validationResult || validationResult.status !== 'success') {
    return response.json({message: 'could not validate SAMLResponse'}, 400);
  }
  let payload = JSON.parse(args.payload);
  return response.json(
    await socket.post(args.target, {
      assertion: validationResult.assertion,
      ...payload
    })
  );
}

export default async ctx => {
  return await runner(ctx, run);
};
