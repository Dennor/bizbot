import runner from './runner';
import nodeFetch from 'node-fetch';
import pem from 'pem';

async function run(ctx, args, server) {
  const {logger, response, socket} = server;
  const {debug} = logger(ctx.meta.executor);
  const {cert} = args;
  const {instanceName, spaceHost} = socket.instance;
  const fetch = socket.fetch.bind(socket);
  const ca = await nodeFetch(
    `https://${instanceName}.${spaceHost}/cert-helpers/ca/`,
    {
      method: 'GET'
    }
  ).then(res => {
    return res.buffer().then(buf => {
      return buf;
    });
  });
  return new Promise(resolve => {
    pem.verifySigningChain(cert, ca, (err, ok) => {
      if (err) {
        debug(err.message);
      }
      resolve(ok);
    });
  });
}

export default async ctx => {
  return await runner(ctx, run);
};
