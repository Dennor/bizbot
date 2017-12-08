import runner from './runner';
import pem from 'pem';
import thumbprint from 'thumbprint';

async function run(ctx, args, server) {
  const {data, response, socket} = server;
  const {cert} = args;
  let validateCert = socket.post('cert-helpers/validate', {
    cert
  });
  try {
    let certInfo = await new Promise((resolve, reject) => {
      pem.readCertificateInfo(cert, (err, info) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(info);
      });
    });
    for (const k in certInfo) {
      args[k] = args[k] || certInfo[k];
    }
    args.thumbprint = args.thumbprint || thumbprint.calculate(cert);
    let newCert = await data.certificates.create({
      ...args
    });
    // If validation failed, delete it.
    validateCert = await validateCert;
    if (validateCert.status !== 'valid') {
      data.certificates.delete(newCert.id);
    }
    return response.json({status: 'success'}, 200);
  } catch (e) {
    return response.json({status: 'failure'}, 500);
  }
}

export default async ctx => {
  return await runner(ctx, run);
};
