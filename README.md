# fakeip-compat v2

`ctx.web` 的正规 fetch provider（id: `fakeip-http`），给两种本地网络现实开绿灯，
其余一律保持官方 `http` provider 的拒绝语义与错误码。

1. **TUN 代理 + Fake-IP DNS**（Mihomo/Clash）：系统解析返回假地址时，用可信
   DoH（直连 IP 字面量端点，无 shell、无子进程）复核域名确为公网，再把连接
   pin 到 DoH 验证过的**真实地址集**（官方同款 pin 机制，无二次解析）。
2. **内网调试例外**：`lanCidr`（默认 `192.168.0.0/16`，即全体 `192.168.*.*`）内的系统解析结果
   pin 住直连；默认保持 TLS 校验。

## 启用

本包只**注册** provider，不替你做选择（官方多 provider 规则：不显式选择会报
`WEB_PROVIDER_AMBIGUOUS`）。在你自己的 profile `cordis.patch.yml` 里写：

```yaml
- id: web
  name: '@deepseek-ai/dsh-web'
  config:
    searchProvider: tavily      # 保留你原来的 search 选择，不能省略！
    fetchProvider: fakeip-http
```

注意：patch 按 id 整体替换整行 config，只写 `fetchProvider` 会丢掉
`searchProvider`。或按进程指定：`DSH_WEB_FETCH_PROVIDER=fakeip-http`。
改完用 `dsh --profile <name> --dump-config | grep -A8 fakeip` 确认。

## 配置（见 `lib/index.js` 的 `Config`）

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `lanCidr` | `192.168.0.0/16` | 内网调试允许段（全体 `192.168.*.*`） |
| `fakeV4Cidr` / `fakeV6Cidr` | `198.18.0.0/16` / `fdfe:dcba:9876::/48` | 本机代理 Fake-IP 池，按 Clash Verge 配置改 |
| `dohEndpoints` | `1.1.1.1/dns-query`, `8.8.8.8/resolve` | 可信 DoH（JSON API），首个全成功者胜出 |
| `dohTimeoutMs` | `8000` | 单 DoH 查询预算 |
| `lanInsecure` | `false` | 仅 LAN 路径跳过 TLS 校验，自签设备才开 |
| `maxResponseBytes` / `maxBodyChars` / `timeoutMs` / `maxRedirects` / `userAgent` | `5000000` / `100000` / `30000` / `5` / 官方 UA | 与官方 provider 同语义 |

## 与 v1 的区别

- v1 直接改写 `web.fetch` 并经 shell 拼 `curl`/`getent` 命令：绕开 provider
  注册表（`--dump-config` 不可见）、model 可控 URL 可注入命令、抛无码错误、
  验证与传输用两套解析（TOCTOU）。v2 全部消除：`registerFetchProvider` +
  `node:dns/promises` + `undici` pin 传输 + 标准 `WebError` 码。
- hosts 把某域名钉到私网/LAN 时，系统解析呈现非假地址，v2 尊重该钉死，
  绝不经 DoH 绕过；混合应答（假+真并存）一律拒绝。
