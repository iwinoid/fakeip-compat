# fakeip-compat
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen?style=for-the-badge)](https://github.com/RichardLitt/standard-readme)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](https://spdx.org/licenses/MIT.html)
[![topic: dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-4D6BFE?style=for-the-badge)](https://github.com/topics/dsh-plugin)
[![powered by dsh](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=for-the-badge&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)

Fake-IP-aware web.fetch provider for TUN (Mihomo/Clash) DNS environments plus pinned LAN CIDR access

## Table of Contents

- [Background](#background)
- [Install](#install)
  - [Dependencies](#dependencies)
- [Usage](#usage)
  - [Configuration](#configuration)
  - [Settings UI](#settings-ui)
- [API](#api)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Background

The stock `http` fetch provider guards against SSRF. It rejects any hostname that resolves to a non-public address. Under a TUN proxy with Fake-IP DNS (Mihomo/Clash), every public site resolves to a fake address such as `198.18.0.11`. The guard then rejects all of them, although the traffic itself works. Local LAN debugging hits the same wall from the other side.

An earlier v1 approach patched `web.fetch` directly and shelled out to `curl`/`getent`. That bypassed the provider registry, hid from `--dump-config`, allowed command injection through the model-controlled URL, and validated with one resolver while transporting through another. v2 drops all of that. It registers a real provider through `ctx.web.registerFetchProvider`, uses only `node:dns/promises` plus `undici` (no shell, no subprocess), throws the stock `WebError` codes, and transports only to DoH-validated addresses.

## Install

### Dependencies

Runtime dependencies install with the package (`@deepseek-ai/schemastery`, `ipaddr.js`, `undici`, plus the DSH peers). A TUN proxy is only needed for the Fake-IP path. The LAN path needs no proxy.

```sh
dsh plugin --profile web add link:/path/to/fakeip-compat
# or:
dsh plugin --profile web add github:iwinoid/fakeip-compat
```

This package only registers the provider. It never selects itself. The official multi-provider rule applies: without an explicit choice the seam reports `WEB_PROVIDER_AMBIGUOUS`. Point the web seam at it from the profile layer:

```yaml
- id: web
  name: '@deepseek-ai/dsh-web'
  config:
    searchProvider: tavily      # keep your existing search choice, never drop it
    fetchProvider: fakeip-http
```

A patch replaces the whole row config, so always restate `searchProvider` next to `fetchProvider`. Or select per process:

```sh
DSH_WEB_FETCH_PROVIDER=fakeip-http
```

Verify after the change:

```sh
dsh --profile <name> --dump-config | grep -A8 fakeip
```

## Usage

### Configuration

| Key | Default | Notes |
| --- | --- | --- |
| `lanCidr` | `192.168.0.0/16` | LAN allowlist. System-resolved results inside it transport pinned. |
| `fakeV4Cidr` / `fakeV6Cidr` | `198.18.0.0/16` / `fdfe:dcba:9876::/48` | Local Fake-IP pools. Match them to the Clash Verge config. |
| `dohEndpoints` | `1.1.1.1/dns-query`, `8.8.8.8/resolve` | Trusted DoH (JSON API) over direct IP-literal endpoints. First fully successful endpoint wins. |
| `dohTimeoutMs` | `8000` | Budget for one DoH lookup. |
| `lanInsecure` | `false` | Skip TLS check on the LAN path only. Turn it on for self-signed devices. |
| `maxResponseBytes` / `maxBodyChars` / `timeoutMs` / `maxRedirects` / `userAgent` | `5000000` / `100000` / `30000` / `5` / official UA | Same meaning as the official provider. |

### Settings UI

The plugin registers a `fakeip-compat` settings section and a browser card of the same name (`lib/client.js`, hand-written, no build step). After a DSH restart the card shows under Settings → Plugins → Plugin configuration. Every field in the table above edits there. Saves apply at once with no restart. Invalid input (such as a bad CIDR) blocks the save. A bad runtime edit keeps the last valid value and never breaks an in-flight fetch. Environments without a settings service (such as headless) fall back to the merged config.

## API

Provider id: `fakeip-http`. Select it through `web.fetchProvider` or `DSH_WEB_FETCH_PROVIDER`.

The contract has two green lights and keeps the stock denial for the rest:

1. **TUN Fake-IP path.** When system resolution returns a fake address, the provider re-checks the name over trusted DoH, then pins transport to the DoH-validated real address set with the official pin mechanism. No second resolution happens at transport time.
2. **LAN path.** System-resolved results inside `lanCidr` transport pinned, with TLS checks kept by default.

Everything else keeps the official `http` provider refusal meaning and error codes: other private ranges, mixed answers (fake plus real together), hosts-pinned names outside the LAN allowlist, and non-allowlisted literals. A hosts entry that pins a name to LAN stays pinned. The provider never bypasses it through DoH.

## Maintainers

- [iwinoid](https://github.com/iwinoid) — iwinoid@outlook.com

## Contributing

Bug reports and questions are welcome on the [GitHub Issues](https://github.com/iwinoid/fakeip-compat/issues) page. Pull requests are accepted. The browser card is hand-written with no build step. Keep it that way.

## License

[MIT](LICENSE) © iwinoid
