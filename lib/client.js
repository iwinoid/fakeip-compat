// fakeip-compat browser half: the `fakeip-compat` card on the Plugins page
// (Settings → Plugins → Plugin configuration).
//
// DSH 0.2.x client contract:
//   * required services are `slots`, `locale`, and `configForms` — the 0.1.x
//     `settingsScope` service no longer exists, and a plugin whose `inject`
//     names a service nobody provides never activates (which stalls the boot
//     gate on "Loading plugins…" forever rather than failing loudly);
//   * the card registers into the Plugins page's `plugins.item` slot while the
//     Host serves this plugin's settings namespace;
//   * staged edits go through the shared SettingsFormModel over that
//     namespace, and the frame and controls come from the shipped primitives.
//
// The settings namespace is the loader ROW ID, which this package keeps equal
// to its own name and to the host plugin's `name` (`fakeip-compat`, see
// cordis.patch.yml), so every derivation of that id lands on the same string.
//
// Hand-written in the loader's factory format (same shape as a built DSH client
// bundle): plain JS, React.createElement only, no build step.
window.__ModuleLoader__.load({
  id: 'fakeip-compat',
  factory: (require) => {
    var module = { exports: {} };
    const React = require('react');
    const {
      SettingsForm,
      SettingsValueField,
      SettingsFormModel,
    } = require('@deepseek-ai/dsh-client-ui-primitives');

    /** Settings namespace of this plugin: the loader row id. */
    const NS = 'fakeip-compat';
    /** Dictionary namespace owned by this plugin. */
    const DICT_NS = 'settings.fakeip-compat';

    const zh = {
      title: 'Fake-IP 兼容抓取',
      description: 'TUN 代理 Fake-IP 环境下的网页抓取与内网调试例外。',
      lanCidr: '内网允许段 (CIDR)',
      lanCidrHint: '该网段内的解析结果会被 pin 住直连。默认全体 192.168.*.*。',
      fakeV4Cidr: 'Fake-IP 池 v4 (CIDR)',
      fakeV4CidrHint: '与本机 Clash Verge 的 fake-ip-range 一致。',
      fakeV6Cidr: 'Fake-IP 池 v6 (CIDR)',
      fakeV6CidrHint: '与本机 Clash Verge 的 fake-ip-range6 一致。',
      dohEndpoints: '可信 DoH 端点（逗号分隔）',
      dohEndpointsHint: '直连 IP 字面量的 DNS-JSON 服务，用于复核公网身份。',
      lanInsecure: '内网跳过 TLS 校验',
      lanInsecureHint: '仅对内网路径关闭证书校验，自签设备才开。',
      maxResponseBytes: '响应上限（字节）',
      maxBodyChars: '正文上限（字符）',
      timeoutMs: '抓取超时（毫秒）',
      maxRedirects: '同源重定向上限',
      dohTimeoutMs: '单次 DoH 超时（毫秒）',
      userAgent: 'User-Agent',
      save: '保存',
      discard: '放弃修改',
      saving: '保存中…',
      reset: '恢复默认',
      overridden: '已覆盖',
      unsaved: '未保存',
      expand: '展开设置',
      collapse: '收起设置',
      readOnly: '设置文档只读，无法保存修改。',
      saveFailed: '保存未完全生效，请检查输入后重试。',
      unavailable: '该插件当前未加载，暂时无法配置。',
      invalidText: '输入无效，请修正后再保存。',
      invalidCidr: '不是有效的 CIDR（如 192.168.0.0/16）。',
      invalidEndpoints: '至少填写一个 https:// 开头的端点。',
    };
    const en = {
      title: 'Fake-IP compatible fetch',
      description: 'Web fetch for TUN Fake-IP environments plus a LAN exception.',
      lanCidr: 'LAN allowlist (CIDR)',
      lanCidrHint: 'Resolved addresses inside it are pinned direct. Default covers all 192.168.*.*.',
      fakeV4Cidr: 'Fake-IP pool v4 (CIDR)',
      fakeV4CidrHint: 'Must match the local Clash Verge fake-ip-range.',
      fakeV6Cidr: 'Fake-IP pool v6 (CIDR)',
      fakeV6CidrHint: 'Must match the local Clash Verge fake-ip-range6.',
      dohEndpoints: 'Trusted DoH endpoints (comma separated)',
      dohEndpointsHint: 'IP-literal DNS-JSON services used to verify public identity.',
      lanInsecure: 'Skip TLS verification on LAN',
      lanInsecureHint: 'Only for the LAN path; enable for self-signed devices.',
      maxResponseBytes: 'Response cap (bytes)',
      maxBodyChars: 'Body cap (chars)',
      timeoutMs: 'Fetch timeout (ms)',
      maxRedirects: 'Same-origin redirect limit',
      dohTimeoutMs: 'Per-query DoH timeout (ms)',
      userAgent: 'User-Agent',
      save: 'Save',
      discard: 'Discard',
      saving: 'Saving…',
      reset: 'Reset',
      overridden: 'Overridden',
      unsaved: 'Unsaved',
      expand: 'Expand',
      collapse: 'Collapse',
      readOnly: 'Settings document is read-only; cannot save.',
      saveFailed: 'Save did not fully land; check the inputs and retry.',
      unavailable: 'This plugin is not loaded, so it cannot be configured right now.',
      invalidText: 'Invalid input; fix it before saving.',
      invalidCidr: 'Not a valid CIDR (e.g. 192.168.0.0/16).',
      invalidEndpoints: 'Provide at least one https:// endpoint.',
    };

    // ---------------------------------------------------------------------
    // Field specs. `SettingsFormModel` takes open `{ field, format, parse }`
    // specs, so the boolean and the array field convert here even though the
    // shipped helpers only cover text and whole numbers. `parse` returns
    // undefined to block the save, { kind: 'clear' } to drop the override, or
    // { kind: 'set', value } with any JSON value the section schema accepts.
    // ---------------------------------------------------------------------
    function textSpec(field) {
      return {
        field,
        format: (v) => (typeof v === 'string' ? v : ''),
        parse: (text) => {
          const t = text.trim();
          return t === '' ? { kind: 'clear' } : { kind: 'set', value: t };
        },
      };
    }
    function numberSpec(field, opts) {
      const o = opts || {};
      return {
        field,
        format: (v) => (typeof v === 'number' ? String(v) : ''),
        parse: (text) => {
          const t = text.trim();
          if (t === '') return { kind: 'clear' };
          const n = Number(t);
          if (!Number.isFinite(n) || n <= 0) return undefined;
          if (o.integer && !Number.isInteger(n)) return undefined;
          if (o.max !== undefined && n > o.max) return undefined;
          return { kind: 'set', value: n };
        },
      };
    }
    function boolSpec(field) {
      return {
        field,
        format: (v) => (v === true ? 'true' : 'false'),
        parse: (text) => {
          const t = text.trim().toLowerCase();
          if (t === 'true') return { kind: 'set', value: true };
          if (t === 'false') return { kind: 'set', value: false };
          return undefined;
        },
      };
    }
    function v4CidrSpec(field) {
      return {
        field,
        format: (v) => (typeof v === 'string' ? v : ''),
        parse: (text) => {
          const t = text.trim();
          if (t === '') return { kind: 'clear' };
          const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(t);
          if (!m) return undefined;
          for (let i = 1; i <= 4; i++) { if (Number(m[i]) > 255) return undefined; }
          if (Number(m[5]) > 32) return undefined;
          return { kind: 'set', value: t };
        },
      };
    }
    function endpointsSpec(field) {
      return {
        field,
        format: (v) => (Array.isArray(v) ? v.join(', ') : ''),
        parse: (text) => {
          const t = text.trim();
          if (t === '') return { kind: 'clear' };
          const parts = t.split(/[,，\s\n]+/).map((s) => s.trim()).filter((s) => s !== '');
          if (parts.length === 0) return { kind: 'clear' };
          for (const p of parts) { if (!/^https?:\/\/\S+$/.test(p)) return undefined; }
          return { kind: 'set', value: parts };
        },
      };
    }

    const MAX_TIMER = 2147483647;
    const FIELD_NAMES = [
      'lanCidr',
      'fakeV4Cidr',
      'fakeV6Cidr',
      'dohEndpoints',
      'lanInsecure',
      'timeoutMs',
      'maxBodyChars',
      'maxResponseBytes',
      'maxRedirects',
      'dohTimeoutMs',
      'userAgent',
    ];

    /** The frame's copy, read from this page's dictionary. */
    function formLabels(t) {
      return {
        unavailable: t('unavailable'),
        readOnly: t('readOnly'),
        saveFailed: t('saveFailed'),
        save: t('save'),
        saving: t('saving'),
      };
    }

    // The one boolean field. The primitives export no staged switch/checkbox,
    // so it renders here with the same tokens and metrics as the shipped
    // fields and stages through the shared actions like every other control.
    const BOOL = {
      field: { display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 0', borderTop: '0.5px solid var(--dsw-alias-border-l2)' },
      head: { display: 'flex', alignItems: 'center', gap: 8 },
      label: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--dsw-alias-label-primary)', cursor: 'pointer' },
      checkbox: { width: 15, height: 15, accentColor: 'var(--dsw-alias-brand-primary)', flex: 'none' },
      badges: { display: 'inline-flex', alignItems: 'center', gap: 8 },
      badge: { borderRadius: 999, padding: '1px 8px', fontSize: 11, lineHeight: '17px', fontWeight: 500, whiteSpace: 'nowrap', background: 'var(--dsw-alias-bg-module-platform)', color: 'var(--dsw-alias-label-secondary)' },
      reset: { border: 'none', background: 'none', padding: 0, font: 'inherit', fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)', cursor: 'pointer' },
      hint: { margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-tertiary)' },
    };

    function BooleanRow(props) {
      const { t } = props;
      const checked = props.state.text === 'true';
      return React.createElement('div', { style: BOOL.field },
        React.createElement('div', { style: BOOL.head },
          React.createElement('label', { style: BOOL.label, htmlFor: props.id },
            React.createElement('input', {
              id: props.id,
              type: 'checkbox',
              style: BOOL.checkbox,
              checked,
              disabled: props.disabled,
              onChange: (event) => { props.onEdit(event.target.checked ? 'true' : 'false'); },
            }),
            props.label),
          props.state.overridden
            ? React.createElement('span', { style: BOOL.badges },
              React.createElement('span', { style: BOOL.badge }, t('overridden')),
              React.createElement('button', {
                type: 'button', style: BOOL.reset, disabled: props.disabled, onClick: props.onReset,
              }, t('reset')))
            : null),
        props.hint ? React.createElement('p', { style: BOOL.hint }, props.hint) : null);
    }

    /** The Plugins page's row body: the one-liner it asks for, or the form. */
    function FakeipCard(props) {
      const t = props.t;
      const state = props.useFakeipCard((snapshot) => snapshot);
      if (props.view === 'summary') return t('description');
      const disabled = !state.writable;
      const valueField = (id, name, label, hint, options) => {
        const o = options || {};
        return React.createElement(SettingsValueField, {
          key: id,
          id,
          label,
          hint,
          overriddenLabel: t('overridden'),
          resetLabel: t('reset'),
          invalidLabel: o.invalidLabel === undefined ? t('invalidText') : o.invalidLabel,
          disabled,
          ...(o.numeric === true ? { numeric: true } : {}),
          ...state[name],
          onEdit: (text) => { props.edit(name, text); },
          onReset: () => { props.resetField(name); },
        });
      };
      return React.createElement(SettingsForm, {
        labels: formLabels(t),
        state,
        onSave: props.save,
        onDiscard: props.discard,
      }, [
        valueField('fakeip-lan', 'lanCidr', t('lanCidr'), t('lanCidrHint'), { invalidLabel: t('invalidCidr') }),
        valueField('fakeip-fakev4', 'fakeV4Cidr', t('fakeV4Cidr'), t('fakeV4CidrHint'), { invalidLabel: t('invalidCidr') }),
        valueField('fakeip-fakev6', 'fakeV6Cidr', t('fakeV6Cidr'), t('fakeV6CidrHint')),
        valueField('fakeip-doh', 'dohEndpoints', t('dohEndpoints'), t('dohEndpointsHint'), { invalidLabel: t('invalidEndpoints') }),
        React.createElement(BooleanRow, {
          key: 'lanInsecure',
          id: 'fakeip-lan-insecure',
          t,
          label: t('lanInsecure'),
          hint: t('lanInsecureHint'),
          state: state.lanInsecure,
          disabled,
          onEdit: (text) => { props.edit('lanInsecure', text); },
          onReset: () => { props.resetField('lanInsecure'); },
        }),
        valueField('fakeip-timeout', 'timeoutMs', t('timeoutMs'), '', { numeric: true }),
        valueField('fakeip-maxbody', 'maxBodyChars', t('maxBodyChars'), '', { numeric: true }),
        valueField('fakeip-maxresp', 'maxResponseBytes', t('maxResponseBytes'), '', { numeric: true }),
        valueField('fakeip-redirects', 'maxRedirects', t('maxRedirects'), '', { numeric: true }),
        valueField('fakeip-dohtimeout', 'dohTimeoutMs', t('dohTimeoutMs'), '', { numeric: true }),
        valueField('fakeip-ua', 'userAgent', t('userAgent'), ''),
      ]);
    }

    /** Required services: slot registration, this page's copy, its settings transport. */
    const inject = ['slots', 'locale', 'configForms'];

    /** Client plugin body: mount the settings card while the Host serves its namespace. */
    function apply(ctx) {
      const t = ctx.locale.bind(DICT_NS);
      ctx.effect(() => ctx.locale.register(DICT_NS, { zh, en }), 'fakeip-compat: dictionaries');
      const form = new SettingsFormModel(ctx.configForms.get(NS), [
        v4CidrSpec('lanCidr'),
        v4CidrSpec('fakeV4Cidr'),
        textSpec('fakeV6Cidr'),
        endpointsSpec('dohEndpoints'),
        boolSpec('lanInsecure'),
        numberSpec('timeoutMs', { max: MAX_TIMER }),
        numberSpec('maxBodyChars'),
        numberSpec('maxResponseBytes'),
        numberSpec('maxRedirects', { integer: true }),
        numberSpec('dohTimeoutMs'),
        textSpec('userAgent'),
      ]);
      const store = form.bind(() => {
        const projection = { ...form.shell() };
        for (const name of FIELD_NAMES) projection[name] = form.field(name);
        return projection;
      });
      ctx.effect(() => () => { form.dispose(); }, 'fakeip-compat: form subscription');
      ctx.effect(() => ctx.configForms.whileServed([NS], () => ctx.slots.inject('plugins.item', () => ctx.slots.register({
        name: 'plugins.item',
        id: 'fakeip-compat',
        order: 60,
        label: () => t('title'),
        locale: DICT_NS,
        inject: () => ({ hooks: { fakeipCard: store }, ...form.actions() }),
      }, FakeipCard))), 'fakeip-compat: settings card');
    }

    module.exports = { NS, inject, apply };
    return module.exports;
  },
});
