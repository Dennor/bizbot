import runner from './runner';

async function run(ctx, args, server) {
  const {
    email,
    method = 'nbid',
    lang = 'en',
    eventCb = 'redirect.root',
    eventData = {}
  } = args;
  let resp = await server.socket.post('signicat/get-proxy-url', {
    method,
    lang,
    target: 'profile/login',
    idAttribute: 'ResponseID',
    payload: {
      email,
      eventCb,
      eventData
    }
  });
  return server.response.json(resp);
}

export default async ctx => {
  return await runner(ctx, run);
};
