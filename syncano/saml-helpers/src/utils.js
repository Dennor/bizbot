import saml20 from 'saml20';
import {DOMParser} from 'xmldom';
import {SignedXml, xpath as select} from 'xml-crypto';

function validate(xml, cert, opts) {
  let doc = new DOMParser().parseFromString(xml);
  let signature =
    select(
      doc,
      "/*/*/*[local-name(.)='Signature' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']"
    )[0] ||
    select(
      doc,
      "/*/*[local-name(.)='Signature' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']"
    )[0];
  let signed = new SignedXml(null, {
    idAttribute: opts.idAttribute || 'AssertionID'
  });
  signed.keyInfoProvider = {
    getKey: keyInfo => {
      return cert;
    },
    getKeyInfo: keyInfo => {
      return '<X509Data></X509Data>';
    }
  };
  signed.loadSignature(signature.toString());
  return signed.checkSignature(xml);
}

function parse(ctx, server, xml) {
  const {error} = server.logger(ctx.meta.executor);
  return new Promise(resolve => {
    saml20.parse(xml, (err, profile) => {
      if (err) {
        error(err);
        error(err.message);
        return resolve({});
      }
      return resolve(profile);
    });
  });
}

function getXML(args) {
  return new Buffer(args.SAMLResponse, 'base64').toString();
}

export default {parse, validate, getXML};
