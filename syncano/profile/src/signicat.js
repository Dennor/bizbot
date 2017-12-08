import Server from 'syncano-server';

function buildURI(base, args, options) {
  const {method = 'https'} = options ? options : {};
  let argString = '';
  for (const aName in args) {
    argString = argString + `${aName}=${encodeURIComponent(args[aName])}&`;
  }
  argString = argString.replace(/&$/, '');
  return `${method}://${base}?${argString}`;
}

const rules = {
  email: ['string', 'email'],
  method: [
    {
      rule: 'inclusion',
      arg: ['nbid', 'nbid-mobile']
    },
    'notEmpty'
  ],
  lang: [{rule: 'inclusion', arg: ['en', 'no']}, 'notEmpty'],
  eventCb: [{rule: 'notEmpty'}]
};

const required_args = ['email'];

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
  const {
    email,
    method = 'nbid',
    lang = 'en',
    eventCb = 'redirect.root',
    eventData = {}
  } = args;
  let target = buildURI('api.bizbot.no/v1/profile/login/', {
    email,
    eventCb,
    eventData: JSON.stringify(eventData)
  });
  return response.json({
    url: buildURI('preprod.signicat.com/std/method/demo', {
      id: `${method}:DEMO:${lang}`,
      target
    })
  });
};
