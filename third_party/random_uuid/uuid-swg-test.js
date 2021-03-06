/**
 * Copyright 2018 The Subscribe with Google Authors. All Rights Reserved.
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

import {uuidFast} from './uuid-swg';

describe('uuidFast', function() {
  it('should generate a uuid', () => {
    const uuid = uuidFast();
    console.log('uuid:', uuid);
    const uuidArray = uuid.split('-');
    expect(uuidArray.length).to.equal(5);
    expect(uuidArray[0].length).to.equal(8);
    expect(uuidArray[1].length).to.equal(4);
    expect(uuid).to.not.be.undefined;
    expect(uuid.length).to.equal(36);
    const uuid2 = uuidFast();
    expect(uuid2).to.not.be.undefined;
    expect(uuid2.length).to.equal(36);
    expect(uuid2).to.not.equal(uuid);
    const uuid3 = uuidFast();
    expect(uuid3).to.not.be.undefined;
    expect(uuid3.length).to.equal(36);
    expect(uuid3).to.not.equal(uuid2);
    expect(uuid3).to.not.equal(uuid);

  });
});
