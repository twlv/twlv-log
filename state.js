const assert = require('assert');

class State {
  static compare (state1, state2) {
    if (state1.t < state2.t) {
      return -1;
    } else if (state1.t > state2.t) {
      return 1;
    } else if (state1.c < state2.c) {
      return -1;
    } else if (state1.c > state2.c) {
      return 1;
    } else if (state1.address < state2.address) {
      return -1;
    } else if (state1.address > state2.address) {
      return 1;
    }

    return 0;
  }
  constructor ({ address, t = 0, c = 0 }) {
    this.address = address;
    this.t = t;
    this.c = c;
  }

  next () {
    let t = Math.floor(new Date().getTime() / 1000);
    let c = 0;
    if (this.t === t) {
      c = this.c + 1;
    }

    this.t = t;
    this.c = c;

    return this;
  }

  compare (state) {
    return State.compare(this, state);
  }

  update (state) {
    assert.equal(state.address, this.address, 'Mismatch state address');

    if (this.compare(state) < 0) {
      this.t = state.t;
      this.c = state.c;
    }
  }
}

module.exports = { State };
