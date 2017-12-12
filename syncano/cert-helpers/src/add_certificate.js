import runner from './runner';
import pem from 'pem';
import thumbprint from 'thumbprint';

function run(ctx, args, server) {
  const {data, response, socket} = server;
  const {cert} = args;
  let validate = socket.post('cert-helpers/validate', {
    cert
  });
  let certInfo = new Promise((resolve, reject) => {
    pem.readCertificateInfo(cert, (err, info) => {
      if (err) {
        return reject(err);
      }
      return resolve(info);
    });
  });
  return certInfo.then(
    info => {
      for (const k in info) {
        args[k] = args[k] || info[k];
      }
      args.thumbprint = args.thumbprint || thumbprint.calculate(cert);
      return data.certificates
        .create({
          ...args
        })
        .then(newCert => {
          // If validation failed, delete it.
          return validate.then(valid => {
            if (valid.status !== 'valid') {
              data.certificates.delete(newCert.id);
              return response.json({status: 'failure'}, 400);
            }
            return response.json({status: 'success'}, 200);
          });
        });
    },
    e => {
      return response.json({status: 'failure'}, 400);
    }
  );
}

let middleware = {
  parallel: ['validator/validate']
};

export default async ctx => {
  return await runner(ctx, run, middleware);
};
