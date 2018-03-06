const { State } = require('./state');
const { EventEmitter } = require('events');

class Log extends EventEmitter {
  constructor ({ prefix = 'log', node, id }) {
    super();

    this.prefix = prefix;
    this.id = id;
    this.node = node;
    this.entries = [];
    this.states = [];

    if (this.node) {
      this._onMessage = this._onMessage.bind(this);
      this.node.on('message', this._onMessage);
    }
  }

  get command () {
    return `${this.prefix}:${this.id}`;
  }

  get address () {
    return this.node ? this.node.identity.address : '';
  }

  async _onMessage (message) {
    if (message.command !== this.command) {
      return;
    }

    let { action, body } = JSON.parse(message.payload);
    // console.log(this.address, '| onmessage', action, JSON.stringify(body));
    if (action === 'sync') {
      let isAhead = Boolean(body.length === 0);
      let behindStates = [];
      body.forEach(peerState => {
        if (peerState.address === this.address) {
          return;
        }

        let state = this.getState(peerState.address);
        let delta = state.compare(peerState);
        if (delta < 0) {
          behindStates.push(state);
        } else if (delta > 0) {
          isAhead = true;
        }
      });

      if (behindStates.length) {
        await this._flightGetEntries(message.from, behindStates);
      }

      if (isAhead) {
        await this.sync(message.from);
      }
    } else if (action === 'getentries') {
      let entries = await this.tailUntil(body);
      this._flightEntries(message.from, entries);
    } else if (action === 'entries') {
      this.put(...body);
    } else {
      console.error(`Unimplemented action ${action}`);
    }
  }

  async _flightGetEntries (address, behindStates) {
    if (!behindStates.length) {
      return;
    }

    let command = this.command;
    let payload = JSON.stringify({
      action: 'getentries',
      body: this.states,
    });
    await this.node.send(address, { command, payload });
  }

  async _flightEntries (address, entries) {
    if (!entries.length) {
      return;
    }

    let command = this.command;
    let payload = JSON.stringify({
      action: 'entries',
      body: entries,
    });
    await this.node.send(address, { command, payload });
  }

  async sync (address) {
    let command = this.command;
    let payload = JSON.stringify({
      action: 'sync',
      body: this.states,
    });
    await this.node.send(address, { command, payload });
  }

  getState (address) {
    let state = this.states.find(state => state.address === address);
    if (!state) {
      state = new State({ address });
      this.states.push(state);
    }

    return state;
  }

  async append (data, options = {}) {
    let { address } = this;
    let { t, c } = this.getState(address).next();
    let entry = Object.assign({ address, t, c, data }, options);

    await this.put(entry);

    return entry;
  }

  put (...putEntries) {
    if (putEntries.length === 0) {
      return;
    }

    let { entries } = this;
    putEntries.forEach(entry => {
      if (entries.find(e => e.address === entry.address && e.t === entry.t && e.c === entry.c)) {
        return;
      }

      entries.push(entry);
      this.getState(entry.address).update(entry);

      this.emit('entry', entry);
    });

    this.entries = entries.sort((entry1, entry2) => State.compare(entry1, entry2));
  }

  async tail ({ limit = 100 } = {}) {
    let entries = await this.entries.slice(-limit);
    return entries;
  }

  tailUntil (states) {
    let stateMap = {};
    states.forEach(state => {
      stateMap[state.address] = state;
    });

    let entries = [];
    for (let i = this.entries.length - 1; i >= 0; i--) {
      let entry = this.entries[i];
      let state = stateMap[entry.address];
      if (state && State.compare(state, entry) < 0) {
        entries.unshift(entry);
      }
    }

    return entries;
  }
}

module.exports = { Log };
