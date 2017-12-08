import Server from 'syncano-server';

function verifySAMLResponse(saml, options) {
  let nationalId;
}

const rules = {
  SAMLResponse: [{rule: 'string'}, {rule: 'custom', arg: verifySAMLResponse}],
  eventCb: [{rule: 'string'}],
  eventData: [{rule: 'object'}]
};

const required_args = ['SAMLResponse'];

export default async ctx => {
  const {response, socket} = Server(ctx);
  const {args, validationErrors} = await socket.post('validator/validate', {
    args: ctx.args,
    rules,
    required_args
  });
  if (validationErrors.length != 0) {
    return response.json({details: {validationErrors}}, 400);
  }
  return response.json({tt: typeof ctx.args.oo, oo: ctx.args.oo});
};
