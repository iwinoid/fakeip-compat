import test from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../lib/index.js'

const DEFAULTS = {
  maxResponseBytes: 5000000,
  maxBodyChars: 100000,
  timeoutMs: 30000,
  maxRedirects: 5,
  userAgent: 'deepseek-harness/0.0.1',
  lanCidr: '192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, 100.64.0.0/10',
  fakeV4Cidr: '198.18.0.0/16',
  fakeV6Cidr: '2001:2::/48, fdfe:dcba:9876::/48',
  dohEndpoints: ['https://1.1.1.1/dns-query', 'https://8.8.8.8/resolve'],
  dohTimeoutMs: 8000,
  lanInsecure: false,
}

/** A loader-shaped config: every field is a Volatile-like { get() } box. */
function makeConfig(holder) {
  return Object.fromEntries(Object.entries(holder).map(([key]) => [key, { get: () => holder[key] }]))
}

function boot(holder) {
  let handler
  let provider
  const ctx = {
    on: (event, fn) => { if (event === 'loader/volatile-update') handler = fn },
    web: { registerFetchProvider: (p) => { provider = p } },
  }
  apply(ctx, makeConfig(holder))
  return { runtime: () => provider.getRuntime(), update: () => handler() }
}

test('a boot config that is invalid still fails loud', () => {
  const holder = { ...DEFAULTS, timeoutMs: 0 }
  assert.throws(() => boot(holder), /timeoutMs must be a positive finite number/)
})

test('a live edit applies valid fields and keeps the previous value for invalid ones', () => {
  const holder = { ...DEFAULTS }
  const { runtime, update } = boot(holder)
  const before = JSON.stringify(runtime().net.lanNets)

  holder.maxBodyChars = 42
  holder.timeoutMs = 3000000000
  holder.maxRedirects = 2
  holder.dohTimeoutMs = 9000
  holder.dohEndpoints = ['http://1.1.1.1/dns-query']
  holder.lanCidr = 'not-a-cidr'
  update()

  const limits = runtime().limits
  const net = runtime().net
  assert.equal(limits.maxBodyChars, 42, 'valid field takes effect')
  assert.equal(limits.maxRedirects, 2, 'valid integer takes effect')
  assert.equal(limits.timeoutMs, DEFAULTS.timeoutMs, 'overflowing timeout keeps previous value')
  assert.equal(net.dohTimeoutMs, 9000, 'valid DoH timeout takes effect')
  assert.deepEqual(net.dohEndpoints, DEFAULTS.dohEndpoints, 'non-https endpoint keeps the previous list')
  assert.equal(JSON.stringify(net.lanNets), before, 'invalid CIDR keeps the previous nets')
})

test('a live edit that is fully valid replaces every field', () => {
  const holder = { ...DEFAULTS }
  const { runtime, update } = boot(holder)

  holder.maxResponseBytes = 1234
  holder.maxBodyChars = 5678
  holder.timeoutMs = 60000
  holder.maxRedirects = 9
  holder.dohTimeoutMs = 15000
  holder.dohEndpoints = ['https://223.5.5.5/resolve']
  holder.fakeV4Cidr = '198.19.0.0/16'
  holder.lanInsecure = true
  update()

  const { limits, net } = runtime()
  assert.equal(limits.maxResponseBytes, 1234)
  assert.equal(limits.maxBodyChars, 5678)
  assert.equal(limits.timeoutMs, 60000)
  assert.equal(limits.maxRedirects, 9)
  assert.equal(net.dohTimeoutMs, 15000)
  assert.deepEqual(net.dohEndpoints, ['https://223.5.5.5/resolve'])
  assert.equal(net.lanInsecure, true)
  assert.equal(net.fakeV4Nets[0][1], 16)
})
