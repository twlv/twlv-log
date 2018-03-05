const assert = require('assert');
const { State } = require('../state');

describe('State', () => {
  describe('#next()', () => {
    it('change timestamp and counter', () => {
      let state = new State({ address: '' });

      assert.equal(state.t, 0);
      assert.equal(state.c, 0);

      let nextState = state.next();

      assert.equal(nextState, state);
      assert.notEqual(state.t, 0);
      assert.equal(state.c, 0);

      let { t, c } = state;

      state.next();
      assert(state.t !== t || state.c !== c);
    });
  });

  describe('#compare()', () => {
    it('result 0 when identical state', () => {
      let state1 = new State({ address: '' });
      let state2 = new State({ address: '' });

      assert.equal(state1.compare(state2), 0);
    });
  });
});
