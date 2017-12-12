import runner from './runner';

function dumpValidCAs(server) {
  return server.data.ca_certs.list().then(caCerts => {
    let caCertsBundle = '';
    for (const cert of caCerts) {
      if (!cert.expire || new Date(cert.expire) > new Date()) {
        caCertsBundle += `\n${cert.cert}`;
      }
    }
    return caCertsBundle;
  });
}

function addNewCAs(server, ca_cert, description, expire) {
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

function run(ctx, args, server) {
  const {response, socket, logger} = server;
  const {debug} = logger(ctx.meta.executor);
  const {ca_cert, description, expire} = args;
  let dumpCAs = () => {
    return dumpValidCAs(server, debug).then(certBundle => {
      if (!certBundle) {
        return response.json({}, 200);
      }
      return response(
        certBundle.replace(/^\s*$/gm, ''),
        200,
        'application/octet-stream',
        {}
      );
    });
  };
  if (ca_cert) {
    return addNewCAs(server, ca_cert, description, expire).then(() =>
      dumpCAs()
    );
  }
  return dumpCAs();
}

let middleware = {
  parallel: ['validator/validate']
};

export default ctx => {
  return runner(ctx, run, middleware);
};
