// fakeip-compat browser half: the `fakeip-compat` card inside Settings →
// 插件 → 插件配置. The tab renders the intersection of (namespaces the Host
// serves) and (cards registered into `settings.plugin.item` keyed by
// namespace) — the Host half alone (like dsh-web-search-tavily) never shows.
// This file is intentionally hand-written in the loader's factory format
// (same shape as dsh-plugin-manager's built client.js): plain JS,
// React.createElement only, no build step. It requires only "react".
window.__ModuleLoader__.load({
  id: 'fakeip-compat',
  factory: (require) => {
    var module = { exports: {} };
    const React = require('react');

    const NS = 'fakeip-compat';
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
      invalidText: 'Invalid input; fix it before saving.',
      invalidCidr: 'Not a valid CIDR (e.g. 192.168.0.0/16).',
      invalidEndpoints: 'Provide at least one https:// endpoint.',
    };

    const inject = ['slots', 'locale', 'settingsScope'];

    // --- tiny snapshot store (HostObservable shape the renderer binds) ---
    function createStore(initial) {
      let snapshot = initial;
      const listeners = new Set();
      return {
        getSnapshot: () => snapshot,
        subscribe: (fn) => {
          listeners.add(fn);
          return () => { listeners.delete(fn); };
        },
        set: (next) => {
          snapshot = next;
          listeners.forEach((fn) => { fn(); });
        },
      };
    }

    // --- field specs: stored value <-> draft text ---
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

    // --- staged form over one settings namespace (port of CardForm) ---
    function CardForm(scope, specs) {
      this.scope = scope;
      this.specs = {};
      specs.forEach((s) => { this.specs[s.field] = s; });
      this.staged = {};
      this.listeners = [];
      this.saving = false;
      this.failed = false;
      const self = this;
      scope.subscribe(() => { self.publish(); });
    }
    CardForm.prototype.sectionValue = function (field) {
      const v = this.scope.getSnapshot().value;
      return v ? v[field] : undefined;
    };
    CardForm.prototype.baseValue = function (field) {
      const b = this.scope.getSnapshot().base;
      return b ? b[field] : undefined;
    };
    CardForm.prototype.userLayer = function () {
      return this.scope.getSnapshot().user;
    };
    CardForm.prototype.stored = function (field) {
      const u = this.userLayer();
      return u !== undefined && u !== null && Object.prototype.hasOwnProperty.call(u, field);
    };
    CardForm.prototype.spec = function (field) {
      const s = this.specs[field];
      if (!s) throw new Error('fakeip-compat card has no field ' + field);
      return s;
    };
    CardForm.prototype.shell = function () {
      const snap = this.scope.getSnapshot();
      const plan = this.plan();
      return {
        available: snap.status === 'ready',
        writable: !!snap.writable,
        dirty: plan.length > 0,
        invalid: plan.some((p) => p.run === undefined),
        saving: this.saving,
        failed: this.failed,
      };
    };
    CardForm.prototype.fieldState = function (field) {
      const staged = this.staged[field];
      const spec = this.spec(field);
      if (staged === undefined) {
        return { text: spec.format(this.sectionValue(field)), overridden: this.stored(field), invalid: false };
      }
      if (staged.clear) {
        return { text: staged.text, overridden: false, invalid: false };
      }
      const write = spec.parse(staged.text);
      return { text: staged.text, overridden: write !== undefined && write.kind === 'set', invalid: write === undefined };
    };
    CardForm.prototype.plan = function () {
      const self = this;
      const plan = [];
      Object.keys(this.staged).forEach((field) => {
        const staged = self.staged[field];
        const spec = self.spec(field);
        if (staged.clear) {
          if (self.stored(field)) plan.push({ field, run: () => self.clear(field) });
          return;
        }
        if (staged.text === spec.format(self.sectionValue(field))) return;
        const write = spec.parse(staged.text);
        if (write === undefined) { plan.push({ field, run: undefined }); return; }
        if (write.kind === 'clear') plan.push({ field, run: () => self.clear(field) });
        else plan.push({ field, run: () => self.store(field, write.value) });
      });
      return plan;
    };
    CardForm.prototype.clear = async function (field) {
      await this.scope.unset(field);
      return !this.stored(field);
    };
    CardForm.prototype.store = async function (field, value) {
      await this.scope.set(field, value);
      const u = this.userLayer();
      return u !== undefined && u !== null && u[field] === value;
    };
    CardForm.prototype.stage = function (field, edit) {
      this.staged[field] = edit;
      this.failed = false;
      this.publish();
    };
    CardForm.prototype.actions = function () {
      const self = this;
      return {
        edit: (field, text) => { self.stage(field, { text, clear: false }); },
        resetField: (field) => {
          self.stage(field, { text: self.spec(field).format(self.baseValue(field)), clear: true });
        },
        save: () => { void self.save(); },
        discard: () => {
          if (Object.keys(self.staged).length === 0 && !self.failed) return;
          self.staged = {};
          self.failed = false;
          self.publish();
        },
      };
    };
    CardForm.prototype.save = async function () {
      const plan = this.plan();
      const writes = plan.filter((p) => p.run !== undefined).map((p) => p.run);
      if (plan.length === 0 || this.saving || writes.length !== plan.length) return;
      this.saving = true;
      this.failed = false;
      this.publish();
      let landed = true;
      for (const w of writes) { landed = (await w()) && landed; }
      if (landed) this.staged = {};
      this.saving = false;
      this.failed = !landed;
      this.publish();
    };
    CardForm.prototype.bind = function (project) {
      const store = createStore(project());
      this.listeners.push(() => { store.set(project()); });
      return store;
    };
    CardForm.prototype.publish = function () {
      this.listeners.forEach((fn) => { fn(); });
    };

    // --- inline styles (dark card look, no CSS pipeline for hand-written file) ---
    const S = {
      card: { listStyle: 'none', background: '#16202b', border: '1px solid #2a3644', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
      header: { display: 'flex', alignItems: 'center', width: '100%', background: 'transparent', border: 0, cursor: 'pointer', padding: '16px 20px', textAlign: 'left', color: '#e6edf3' },
      headText: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 },
      name: { fontSize: 16, fontWeight: 600 },
      desc: { fontSize: 13, color: '#8b98a5' },
      chevron: { color: '#8b98a5', fontSize: 14 },
      pending: { fontSize: 12, color: '#d29922', marginRight: 8 },
      body: { padding: '4px 20px 16px' },
      field: { marginBottom: 12 },
      label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 4 },
      hint: { fontSize: 12, color: '#8b98a5', marginTop: 4 },
      input: { width: '100%', boxSizing: 'border-box', background: '#0d141b', border: '1px solid #2a3644', borderRadius: 8, color: '#e6edf3', padding: '8px 10px', fontSize: 13 },
      row: { display: 'flex', alignItems: 'center', gap: 8 },
      badge: { fontSize: 11, color: '#d29922', border: '1px solid #d29922', borderRadius: 4, padding: '1px 6px' },
      reset: { fontSize: 12, background: 'transparent', border: '1px solid #2a3644', borderRadius: 6, color: '#8b98a5', cursor: 'pointer', padding: '2px 8px' },
      invalid: { fontSize: 12, color: '#f85149', marginTop: 4 },
      checkRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e6edf3' },
      footer: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
      save: { background: '#1f6feb', border: 0, borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '8px 18px', fontSize: 13 },
      saveDisabled: { background: '#2a3644', border: 0, borderRadius: 8, color: '#8b98a5', padding: '8px 18px', fontSize: 13 },
      discard: { background: 'transparent', border: '1px solid #2a3644', borderRadius: 8, color: '#e6edf3', cursor: 'pointer', padding: '8px 14px', fontSize: 13 },
      failed: { fontSize: 12, color: '#f85149' },
    };

    function TextRow(p) {
      return React.createElement('div', { style: S.field },
        React.createElement('label', { style: S.label, htmlFor: p.id }, p.label),
        React.createElement('div', { style: S.row },
          React.createElement('input', {
            id: p.id, style: S.input, value: p.state.text, disabled: p.disabled,
            onChange: (e) => { p.onEdit(e.target.value); },
          }),
          p.state.overridden ? React.createElement('span', { style: S.badge }, p.overriddenLabel) : null,
          p.state.overridden && !p.disabled
            ? React.createElement('button', { type: 'button', style: S.reset, onClick: p.onReset }, p.resetLabel)
            : null),
        p.hint ? React.createElement('div', { style: S.hint }, p.hint) : null,
        p.state.invalid ? React.createElement('div', { style: S.invalid }, p.invalidLabel) : null);
    }

    function CheckRow(p) {
      const checked = p.state.text === 'true';
      return React.createElement('div', { style: S.field },
        React.createElement('label', { style: S.checkRow },
          React.createElement('input', {
            type: 'checkbox', checked, disabled: p.disabled,
            onChange: (e) => { p.onEdit(e.target.checked ? 'true' : 'false'); },
          }),
          p.label,
          p.state.overridden ? React.createElement('span', { style: S.badge }, p.overriddenLabel) : null,
          p.state.overridden && !p.disabled
            ? React.createElement('button', { type: 'button', style: S.reset, onClick: p.onReset }, p.resetLabel)
            : null),
        p.hint ? React.createElement('div', { style: S.hint }, p.hint) : null);
    }

    function FakeipCard(props) {
      const t = props.t;
      const state = props.useFakeipCard((s) => s);
      const disabled = !state.writable;
      const [open, setOpen] = React.useState(false);
      if (!state.available) return null;
      const blocked = !state.dirty || state.invalid || state.saving;
      const title = t('title');
      return React.createElement('li', { style: S.card },
        React.createElement('button', {
          type: 'button', style: S.header,
          'aria-expanded': open, 'aria-label': (open ? t('collapse') : t('expand')) + ': ' + title,
          onClick: () => { setOpen(!open); },
        },
          React.createElement('span', { style: S.headText },
            React.createElement('span', { style: S.name }, title),
            React.createElement('span', { style: S.desc }, t('description'))),
          state.dirty ? React.createElement('span', { style: S.pending }, t('unsaved')) : null,
          React.createElement('span', { style: S.chevron }, open ? '▴' : '▾')),
        open ? React.createElement('div', { style: S.body },
          TextRow({ id: 'fakeip-lan', label: t('lanCidr'), hint: t('lanCidrHint'), state: state.lanCidr, disabled, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidCidr'), onEdit: (v) => props.edit('lanCidr', v), onReset: () => props.resetField('lanCidr') }),
          TextRow({ id: 'fakeip-fakev4', label: t('fakeV4Cidr'), hint: t('fakeV4CidrHint'), state: state.fakeV4Cidr, disabled, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidCidr'), onEdit: (v) => props.edit('fakeV4Cidr', v), onReset: () => props.resetField('fakeV4Cidr') }),
          TextRow({ id: 'fakeip-fakev6', label: t('fakeV6Cidr'), hint: t('fakeV6CidrHint'), state: state.fakeV6Cidr, disabled, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => props.edit('fakeV6Cidr', v), onReset: () => props.resetField('fakeV6Cidr') }),
          TextRow({ id: 'fakeip-doh', label: t('dohEndpoints'), hint: t('dohEndpointsHint'), state: state.dohEndpoints, disabled, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidEndpoints'), onEdit: (v) => props.edit('dohEndpoints', v), onReset: () => props.resetField('dohEndpoints') }),
          React.createElement(CheckRow, { label: t('lanInsecure'), hint: t('lanInsecureHint'), state: state.lanInsecure, disabled, overriddenLabel: t('overridden'), resetLabel: t('reset'), onEdit: (v) => props.edit('lanInsecure', v), onReset: () => props.resetField('lanInsecure') }),
          TextRow({ id: 'fakeip-timeout', label: t('timeoutMs'), hint: '', state: state.timeoutMs, disabled, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => props.edit('timeoutMs', v), onReset: () => props.resetField('timeoutMs') }),
          TextRow({ id: 'fakeip-maxbody', label: t('maxBodyChars'), hint: '', state: state.maxBodyChars, disabled, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => props.edit('maxBodyChars', v), onReset: () => props.resetField('maxBodyChars') }),
          TextRow({ id: 'fakeip-maxresp', label: t('maxResponseBytes'), hint: '', state: state.maxResponseBytes, disabled, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => props.edit('maxResponseBytes', v), onReset: () => props.resetField('maxResponseBytes') }),
          TextRow({ id: 'fakeip-redirects', label: t('maxRedirects'), hint: '', state: state.maxRedirects, disabled, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => props.edit('maxRedirects', v), onReset: () => props.resetField('maxRedirects') }),
          TextRow({ id: 'fakeip-doh timeout', label: t('dohTimeoutMs'), hint: '', state: state.dohTimeoutMs, disabled, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => props.edit('dohTimeoutMs', v), onReset: () => props.resetField('dohTimeoutMs') }),
          TextRow({ id: 'fakeip-ua', label: t('userAgent'), hint: '', state: state.userAgent, disabled, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => props.edit('userAgent', v), onReset: () => props.resetField('userAgent') }),
          React.createElement('div', { style: S.footer },
            state.failed ? React.createElement('span', { style: S.failed }, t('saveFailed')) : null,
            React.createElement('button', { type: 'button', style: S.discard, disabled: !state.dirty || state.saving, onClick: props.discard }, t('discard')),
            React.createElement('button', { type: 'button', style: blocked ? S.saveDisabled : S.save, disabled: blocked, onClick: props.save }, t(state.saving ? 'saving' : 'save'))))
        : null);
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(DICT_NS, { zh, en }), 'fakeip-compat: dictionaries');
      const scope = ctx.settingsScope.bind({ namespace: NS });
      const form = new CardForm(scope, [
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
      const store = form.bind(() => ({
        available: form.shell().available,
        writable: form.shell().writable,
        dirty: form.shell().dirty,
        invalid: form.shell().invalid,
        saving: form.shell().saving,
        failed: form.shell().failed,
        lanCidr: form.fieldState('lanCidr'),
        fakeV4Cidr: form.fieldState('fakeV4Cidr'),
        fakeV6Cidr: form.fieldState('fakeV6Cidr'),
        dohEndpoints: form.fieldState('dohEndpoints'),
        lanInsecure: form.fieldState('lanInsecure'),
        timeoutMs: form.fieldState('timeoutMs'),
        maxBodyChars: form.fieldState('maxBodyChars'),
        maxResponseBytes: form.fieldState('maxResponseBytes'),
        maxRedirects: form.fieldState('maxRedirects'),
        dohTimeoutMs: form.fieldState('dohTimeoutMs'),
        userAgent: form.fieldState('userAgent'),
      }));
      const actions = form.actions();
      ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
        name: 'settings.plugin.item',
        key: NS,
        locale: DICT_NS,
        inject: () => ({
          hooks: { fakeipCard: store },
          save: actions.save,
          discard: actions.discard,
          edit: actions.edit,
          resetField: actions.resetField,
        }),
      }, FakeipCard));
    }

    module.exports = { inject, apply };
    return module.exports;
  },
});
