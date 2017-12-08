import runner from './runner';

async function dumpValidCAs(server) {
  let caCerts = await server.data.ca_certs.list();
  let caCertsBundle = '';
  for (const cert of caCerts) {
    if (!cert.expire || new Date(cert.expire) > new Date()) {
      caCertsBundle += `\n${cert.cert}`;
    }
  }
  return caCertsBundle;
}

async function addNewCAs(server, ca_cert, description, expire) {
  description = description || '';
  expire;
  let params = {
    cert: ca_cert,
    description
  };
  if (expire) {
    params.expire = new Date(expire);
  }
  return server.data.ca_certs.create(params);
}

async function run(ctx, args, server) {
  const {response, socket, logger} = server;
  const {debug} = logger(ctx.meta.executor);
  const {ca_cert, description, expire} = args;
  try {
    if (ca_cert) {
      await addNewCAs(server, ca_cert, description, expire);
    }
    let certBundle = await dumpValidCAs(server, debug);
    if (!certBundle) {
      return response.json({}, 200);
    }
    return response(
      certBundle.replace(/^\s*$/gm, ''),
      200,
      'application/octet-stream',
      {}
    );
  } catch (e) {
    debug(e.stack);
    return response(
      'internal server error',
      501,
      'application/octet-stream',
      {}
    );
  }
}

export default async ctx => {
  return await runner(ctx, run);
};
