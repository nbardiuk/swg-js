/**
 * Copyright 2019 The Subscribe with Google Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {PropensityServer} from './propensity-server';
import {Xhr} from '../utils/xhr';
import * as PropensityApi from '../api/propensity-api';
import {parseQueryString} from '../utils/url';
import * as ServiceUrl from './services';

describes.realWin('PropensityServer', {}, env => {
  let win;
  let propensityServer;
  const serverUrl = 'http://localhost:31862';

  beforeEach(() => {
    win = env.win;
    propensityServer = new PropensityServer(win, 'pub1');
    sandbox.stub(ServiceUrl, 'adsUrl', url => serverUrl + url);
  });

  it('should test sending subscription state', () => {
    let capturedUrl;
    let capturedRequest;
    sandbox.stub(Xhr.prototype, 'fetch',
        (url, init) => {
          capturedUrl = url;
          capturedRequest = init;
          return Promise.reject(new Error('Publisher not whitelisted'));
        });
    const entitlements = {'product': ['a', 'b', 'c']};
    return propensityServer.sendSubscriptionState(
        PropensityApi.SubscriptionState.SUBSCRIBER,
        JSON.stringify(entitlements)).then(() => {
          throw new Error('must have failed');
        }).catch(reason => {
          const path = new URL(capturedUrl);
          expect(path.pathname).to.equal('/subopt/data');
          const queryString = capturedUrl.split('?')[1];
          const queries = parseQueryString(queryString);
          expect(queries).to.not.be.null;
          expect('cookie' in queries).to.be.true;
          expect(queries['cookie']).to.equal('noConsent');
          expect('v' in queries).to.be.true;
          expect(parseInt(queries['v'], 10)).to.equal(
              propensityServer.version_);
          expect('states' in queries).to.be.true;
          const userState = 'pub1:' + queries['states'].split(':')[1];
          expect(userState).to.equal('pub1:subscriber');
          const products = decodeURIComponent(queries['states'].split(':')[2]);
          expect(products).to.equal(JSON.stringify(entitlements));
          expect(capturedRequest.credentials).to.equal('include');
          expect(capturedRequest.method).to.equal('GET');
          expect(() => {throw reason;}).to.throw(/Publisher not whitelisted/);
        });
  });

  it('should test sending event', () => {
    let capturedUrl;
    let capturedRequest;
    sandbox.stub(Xhr.prototype, 'fetch',
        (url, init) => {
          capturedUrl = url;
          capturedRequest = init;
          return Promise.reject(new Error('Not sent from allowed origin'));
        });
    const eventParam = {'is_active': false, 'offers_shown': ['a', 'b', 'c']};
    return propensityServer.sendEvent(
        PropensityApi.Event.IMPRESSION_PAYWALL,
        JSON.stringify(eventParam)
      ).then(() => {
        throw new Error('must have failed');
      }).catch(reason => {
        const path = new URL(capturedUrl);
        expect(path.pathname).to.equal('/subopt/data');
        const queryString = capturedUrl.split('?')[1];
        const queries = parseQueryString(queryString);
        expect(queries).to.not.be.null;
        expect('cookie' in queries).to.be.true;
        expect(queries['cookie']).to.equal('noConsent');
        expect('v' in queries).to.be.true;
        expect(parseInt(queries['v'], 10)).to.equal(propensityServer.version_);
        expect('events' in queries).to.be.true;
        const events = decodeURIComponent(queries['events'].split(':')[2]);
        expect(events).to.equal(JSON.stringify(eventParam));
        expect(capturedRequest.credentials).to.equal('include');
        expect(capturedRequest.method).to.equal('GET');
        expect(() => {
          throw reason;
        }).to.throw(/Not sent from allowed origin/);
      });
  });

  it('should test get propensity request failure', () => {
    let capturedUrl;
    let capturedRequest;
    sandbox.stub(Xhr.prototype, 'fetch',
        (url, init) => {
          capturedUrl = url;
          capturedRequest = init;
          return Promise.reject(new Error('Invalid request'));
        });
    return propensityServer.getPropensity('/hello',
        PropensityApi.PropensityType.GENERAL).then(() => {
          throw new Error('must have failed');
        }).catch(reason => {
          const queryString = capturedUrl.split('?')[1];
          const queries = parseQueryString(queryString);
          expect(queries).to.not.be.null;
          expect('cookie' in queries).to.be.true;
          expect(queries['cookie']).to.equal('noConsent');
          expect('v' in queries).to.be.true;
          expect(parseInt(queries['v'], 10)).to.equal(
              propensityServer.version_);
          expect('products' in queries).to.be.true;
          expect(queries['products']).to.equal('pub1');
          expect('type' in queries).to.be.true;
          expect(queries['type']).to.equal('general');
          expect(capturedRequest.credentials).to.equal('include');
          expect(capturedRequest.method).to.equal('GET');
          expect(() => {throw reason;}).to.throw(/Invalid request/);
        });
  });

  it('should test get propensity', () => {
    const propensityResponse = {
      'header': {'ok': true},
      'scores': [
        {
          'product': 'pub1',
          'score': 90,
        },
        {
          'product': 'pub1:premium',
          'error_message': 'not available',
        },
      ],
    };
    const response = new Response();
    const mockResponse = sandbox.mock(response);
    mockResponse.expects('json').returns(
        Promise.resolve(propensityResponse)).once();
    sandbox.stub(Xhr.prototype, 'fetch',
        () => {
          return Promise.resolve(response);
        });
    return propensityServer.getPropensity('/hello',
        PropensityApi.PropensityType.GENERAL).then(response => {
          expect(response).to.not.be.null;
          const header = response['header'];
          expect(header).to.not.be.null;
          expect(header['ok']).to.be.true;
          const body = response['body'];
          expect(body).to.not.be.null;
          expect(body['result']).to.equal(90);
        });
  });

  it('should test only get propensity score for pub', () => {
    const propensityResponse = {
      'header': {'ok': true},
      'scores': [
        {
          'product': 'pub2',
          'score': 90,
        },
        {
          'product': 'pub1:premium',
          'error_message': 'not available',
        },
      ],
    };
    const response = new Response();
    const mockResponse = sandbox.mock(response);
    mockResponse.expects('json').returns(
        Promise.resolve(propensityResponse)).once();
    sandbox.stub(Xhr.prototype, 'fetch',
        () => {
          return Promise.resolve(response);
        });
    return propensityServer.getPropensity('/hello',
        PropensityApi.PropensityType.GENERAL).then(response => {
          expect(response).to.not.be.null;
          const header = response['header'];
          expect(header).to.not.be.null;
          expect(header['ok']).to.be.false;
          const body = response['body'];
          expect(body).to.not.be.null;
          expect(body['result']).to.equal('No score available for pub1');
        });
  });

  it('should test no propensity score available', () => {
    const propensityResponse = {
      'header': {'ok': false},
      'error': 'Service not available',
    };
    const response = new Response();
    const mockResponse = sandbox.mock(response);
    mockResponse.expects('json').returns(
        Promise.resolve(propensityResponse)).once();
    sandbox.stub(Xhr.prototype, 'fetch',
        () => {
          return Promise.resolve(response);
        });
    return propensityServer.getPropensity('/hello',
        PropensityApi.PropensityType.GENERAL).then(response => {
          expect(response).to.not.be.null;
          const header = response['header'];
          expect(header).to.not.be.null;
          expect(header['ok']).to.be.false;
          const body = response['body'];
          expect(body).to.not.be.null;
          expect(body['result']).to.equal('Service not available');
        });
  });

  it('should test getting right clientID with user consent', () => {
    let capturedUrl;
    let capturedRequest;
    sandbox.stub(Xhr.prototype, 'fetch',
        (url, init) => {
          capturedUrl = url;
          capturedRequest = init;
          return Promise.reject(new Error('Invalid request'));
        });
    PropensityServer.prototype.getDocumentCookie_ = () => {
      return '__gads=aaaaaa';
    };
    propensityServer.setUserConsent(true);
    return propensityServer.getPropensity(
        '/hello', PropensityApi.PropensityType.GENERAL).then(() => {
          throw new Error('must have failed');
        }).catch(reason => {
          const queryString = capturedUrl.split('?')[1];
          const queries = parseQueryString(queryString);
          expect(queries).to.not.be.null;
          expect('cookie' in queries).to.be.true;
          expect(queries['cookie']).to.equal('aaaaaa');
          expect('v' in queries).to.be.true;
          expect(parseInt(queries['v'], 10)).to.equal(
              propensityServer.version_);
          expect('products' in queries).to.be.true;
          expect(queries['products']).to.equal('pub1');
          expect('type' in queries).to.be.true;
          expect(queries['type']).to.equal('general');
          expect(capturedRequest.credentials).to.equal('include');
          expect(capturedRequest.method).to.equal('GET');
          expect(() => {throw reason;}).to.throw(/Invalid request/);
        });
  });

  it('should test getting right clientID without cookie', () => {
    let capturedUrl;
    let capturedRequest;
    sandbox.stub(Xhr.prototype, 'fetch',
        (url, init) => {
          capturedUrl = url;
          capturedRequest = init;
          return Promise.reject(new Error('Invalid request'));
        });
    PropensityServer.prototype.getDocumentCookie_ = () => {
      return '__someonelsescookie=abcd';
    };
    propensityServer.setUserConsent(true);
    return propensityServer.getPropensity(
        '/hello', PropensityApi.PropensityType.GENERAL).then(() => {
          throw new Error('must have failed');
        }).catch(reason => {
          const path = new URL(capturedUrl);
          expect(path.pathname).to.equal('/subopt/pts');
          const queryString = capturedUrl.split('?')[1];
          const queries = parseQueryString(queryString);
          expect(queries).to.not.be.null;
          expect('cookie' in queries).to.be.false;
          expect('v' in queries).to.be.true;
          expect(parseInt(queries['v'], 10)).to.equal(
              propensityServer.version_);
          expect('products' in queries).to.be.true;
          expect(queries['products']).to.equal('pub1');
          expect('type' in queries).to.be.true;
          expect(queries['type']).to.equal('general');
          expect(capturedRequest.credentials).to.equal('include');
          expect(capturedRequest.method).to.equal('GET');
          expect(() => {throw reason;}).to.throw(/Invalid request/);
        });
  });
});
