import runner from './runner';

function run(ctx, args, server) {
  const {
    email,
    method = 'nbid',
    lang = 'en',
    eventCb = 'redirect.root',
    eventData = {}
  } = args;
  return server.socket
    .post('signicat/get-endpoint-url', {
      method,
      lang,
      target: 'profile/login',
      idAttribute: 'ResponseID',
      payload: {
        email,
        eventCb,
        eventData
      }
    })
    .then(resp => {
      return server.response.json(resp);
    });
}

let middleware = {
  parallel: ['validator/validate']
};

export default ctx => {
  return runner(ctx, run, middleware);
};
