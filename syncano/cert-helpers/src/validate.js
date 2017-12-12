import runner from './runner';
import nodeFetch from 'node-fetch';
import pem from 'pem';

function run(ctx, args, server) {
  const {logger, response, socket} = server;
  const {debug} = logger(ctx.meta.executor);
  const {cert} = args;
  const {instanceName, spaceHost} = socket.instance;
  const fetch = socket.fetch.bind(socket);
  return nodeFetch(`https://${instanceName}.${spaceHost}/cert-helpers/ca/`, {
    method: 'GET'
  })
    .then(res => {
      return res.buffer().then(buf => {
        return buf;
      });
    })
    .then(ca => {
      return new Promise(resolve => {
        pem.verifySigningChain(cert, ca, (err, ok) => {
          if (err) {
            debug(err.message);
          }
          let status = ok ? 'valid' : 'invalid';
          return resolve(server.response.json({status}));
        });
      }).then(resp => {
        return resp;
      });
    });
}

let middleware = {
  parallel: ['validator/validate']
};

export default ctx => {
  return runner(ctx, run, middleware);
};
