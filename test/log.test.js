const { Log } = require('..');
const { Node } = require('@twlv/core');
const MemoryDialer = require('@twlv/core/dialers/memory');
const MemoryListener = require('@twlv/core/listeners/memory');
const MemoryFinder = require('@twlv/core/finders/memory');
const assert = require('assert');

describe('Log', () => {
  before(() => {
    process.on('unhandledRejection', err => console.error('Unhandled', err));
  });

  after(() => {
    process.removeAllListeners('unhandledRejection');
  });

  describe('#append()', () => {
    it('push to entries', async () => {
      let log = new Log({ id: 'foo' });
      await log.append('foo');
      await log.append('bar');
      await log.append('baz');

      let entries = await log.tail({ limit: 2 });
      assert.equal(entries.length, 2);
      assert.equal(entries[0].data, 'bar');
      assert.equal(entries[1].data, 'baz');
    });
  });

  describe('cases', () => {
    it('sync', async () => {
      let node1 = createNode();
      let node2 = createNode();

      try {
        await node1.start();
        await node2.start();

        // console.log('started');

        let log1 = new Log({ node: node1, id: 'foo' });
        let log2 = new Log({ node: node2, id: 'foo' });

        log1.append('foo');
        log1.append('bar');

        log2.sync(node1.identity.address);

        await sleep(100);

        assert.deepEqual(log1.states, log2.states);
        assert.deepEqual(log1.entries, log2.entries);
      } finally {
        // console.log('stopping');

        try { await node1.stop(); } catch (err) {}
        try { await node2.stop(); } catch (err) {}
      }
    });
  });
});

function createNode () {
  let node = new Node();
  node.addDialer(new MemoryDialer());
  node.addListener(new MemoryListener(node));
  node.addFinder(new MemoryFinder(node));
  return node;
}

function sleep (t) {
  return new Promise(resolve => setTimeout(resolve, t));
}
