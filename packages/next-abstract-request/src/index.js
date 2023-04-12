import nx from '@jswork/next';

import '@jswork/next-stub-singleton';
import '@jswork/next-parse-request-args';
import '@jswork/next-interceptor';
import '@jswork/next-abstract-request';
import '@jswork/next-content-type';
import '@jswork/next-data-transform';

const MSG_IMPL = 'Must be implement.';
const GET_STYLE_ACTION = ['get', 'delete', 'head', 'options'];
const isGetStyle = (inMethod) => GET_STYLE_ACTION.includes(inMethod);

const defaults = {
  dataType: 'json',
  responseType: 'json',
  interceptors: [],
  transformRequest: nx.stubValue,
  transformResponse: nx.stubValue,
  transformError: nx.stubValue
};

const NxAbstractRequest = nx.declare('nx.AbstractRequest', {
  statics: nx.mix(null, nx.stubSingleton()),
  methods: {
    init: function (inOptions) {
      this.opts = nx.mix(null, defaults, this.defaults(), inOptions);
      this.interceptor = new nx.Interceptor({ items: this.opts.interceptors });
      this.initClient();
    },
    initClient: function () {
      this.httpRequest = null;
      nx.error(MSG_IMPL);
    },
    defaults: function () {
      return null;
    },
    request: function (inMethod, inUrl, inData, inOptions) {
      const { transformRequest, transformResponse, transformError, ...others } = this.opts;
      const { dataType, ...options } = { ...others, ...inOptions };
      const interceptor = this.interceptor;
      const contentType = nx.contentType(dataType);
      const headers = dataType && contentType ? { 'Content-Type': contentType } : {};
      const data = dataType && inData ? nx.DataTransform[dataType](inData) : inData;
      const payload = isGetStyle(inMethod) ? { params: inData } : { data };
      const requestConfig = { url: inUrl, method: inMethod, headers, ...payload, ...options };
      const _transformRequest = options.transformRequest || transformRequest;
      const _transformResponse = options.transformResponse || transformResponse;

      // compose request:
      const requestTransformConfig = _transformRequest(requestConfig);
      const requestComposeConfig = interceptor.compose(requestTransformConfig, 'request');

      return this.httpRequest(requestComposeConfig)
        .then((res) => {
          const responseTransformConfig = _transformResponse(res);
          const compose4response = { config: requestComposeConfig, ...responseTransformConfig };
          const { config, ...result } = interceptor.compose(compose4response, 'response');
          return result;
        })
        .catch((err) => {
          // compose error:
          const errorComposeConfig = interceptor.compose(err, 'error');
          return transformError(errorComposeConfig);
        });
    },
    'get,post,put,patch,delete,head,options': function (inMethod) {
      return function () {
        const inputArgs = [inMethod].concat(nx.slice(arguments));
        const args = nx.parseRequestArgs(inputArgs, true);
        return this.request.apply(this, args);
      };
    }
  }
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NxAbstractRequest;
}

export default NxAbstractRequest;
