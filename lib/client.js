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

    // --- styles: same tokens and metrics as the shipped cards
    // (PluginCard.module.css / fields.module.css), so the theme (dark, light,
    // tinted) applies here exactly like the official cards. No CSS pipeline
    // for a hand-written file, hence inline styles referencing the vars.
    const S = {
      card: { listStyle: 'none', border: '0.5px solid var(--dsw-alias-border-l4)', borderRadius: 16, background: 'var(--dsw-alias-bg-layer-3)' },
      cardOpen: { listStyle: 'none', border: '0.5px solid var(--dsw-alias-label-dimmed)', borderRadius: 16, background: 'var(--dsw-alias-bg-layer-2)' },
      header: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', appearance: 'none', border: 0, background: 'none', font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer', padding: '14px 16px', borderRadius: 12 },
      headText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 },
      name: { fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: 'var(--dsw-alias-label-primary)' },
      desc: { fontSize: 13, lineHeight: 1.5, color: 'var(--dsw-alias-label-tertiary)' },
      chevron: { flex: 'none', color: 'var(--dsw-alias-label-tertiary)', transition: 'transform .16s', transform: 'none', display: 'inline-flex' },
      chevronOpen: { flex: 'none', color: 'var(--dsw-alias-label-tertiary)', transition: 'transform .16s', transform: 'rotate(180deg)', display: 'inline-flex' },
      pending: { flex: 'none', borderRadius: 999, padding: '1px 8px', fontSize: 11, lineHeight: '17px', fontWeight: 500, whiteSpace: 'nowrap', background: 'var(--dsw-alias-bg-module-platform)', color: 'var(--dsw-alias-label-secondary)' },
      body: { borderTop: '0.5px solid var(--dsw-alias-border-l2)', margin: '0 16px', paddingBottom: 8 },
      field: { display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 0' },
      fieldDivided: { display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 0', borderTop: '0.5px solid var(--dsw-alias-border-l2)' },
      head: { display: 'flex', alignItems: 'center', gap: 8 },
      label: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--dsw-alias-label-primary)' },
      badges: { display: 'inline-flex', alignItems: 'center', gap: 8 },
      badge: { borderRadius: 999, padding: '1px 8px', fontSize: 11, lineHeight: '17px', fontWeight: 500, whiteSpace: 'nowrap', background: 'var(--dsw-alias-bg-module-platform)', color: 'var(--dsw-alias-label-secondary)' },
      reset: { border: 'none', background: 'none', padding: 0, font: 'inherit', fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)', cursor: 'pointer' },
      input: { height: 34, padding: '0 12px', border: '0.5px solid var(--dsw-alias-border-l4)', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-3)', font: 'inherit', fontSize: 13, lineHeight: 1.5, color: 'var(--dsw-alias-label-primary)', width: '100%', boxSizing: 'border-box' },
      inputInvalid: { height: 34, padding: '0 12px', border: '0.5px solid var(--dsw-alias-label-error)', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-3)', font: 'inherit', fontSize: 13, lineHeight: 1.5, color: 'var(--dsw-alias-label-primary)', width: '100%', boxSizing: 'border-box' },
      inputDisabled: { color: 'var(--dsw-alias-label-tertiary)' },
      hint: { margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-tertiary)' },
      invalid: { margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-error)' },
      checkLabel: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--dsw-alias-label-primary)', cursor: 'pointer' },
      checkbox: { width: 15, height: 15, accentColor: 'var(--dsw-alias-brand-primary)', flex: 'none' },
      footer: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '12px 0 4px', borderTop: '0.5px solid var(--dsw-alias-border-l2)' },
      failed: { flex: 1, minWidth: 0, margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-error)' },
      discard: { appearance: 'none', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8, padding: '5px 14px', font: 'inherit', fontSize: 13, lineHeight: 1.5, cursor: 'pointer', background: 'none', color: 'var(--dsw-alias-label-secondary)' },
      save: { appearance: 'none', border: '1px solid transparent', borderRadius: 8, padding: '5px 14px', font: 'inherit', fontSize: 13, lineHeight: 1.5, cursor: 'pointer', background: 'var(--dsw-alias-label-primary)', color: 'var(--dsw-alias-bg-layer-3)' },
      btnDisabled: { opacity: 0.4, cursor: 'default' },
      readOnly: { margin: '12px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-tertiary)' },
    };

    // Official chevron glyph (IconChevronDownOutline14, 14x14, currentColor).
    function Chevron(p) {
      return React.createElement('svg', {
        width: 14, height: 14, viewBox: '0 0 14 14', fill: 'none',
        xmlns: 'http://www.w3.org/2000/svg', style: p.open ? S.chevronOpen : S.chevron, 'aria-hidden': true,
      }, React.createElement('path', {
        d: 'M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z',
        fill: 'currentColor',
      }));
    }

    // Official ValueField layout: head row (label + badge/reset), input,
    // then hint or invalid copy. `divided` draws the separator the official
    // `.field + .field` rule draws between siblings.
    function TextRow(p) {
      const invalid = p.state.invalid;
      return React.createElement('div', { style: p.divided ? S.fieldDivided : S.field },
        React.createElement('div', { style: S.head },
          React.createElement('label', { style: S.label, htmlFor: p.id }, p.label),
          p.state.overridden
            ? React.createElement('span', { style: S.badges },
              React.createElement('span', { style: S.badge }, p.overriddenLabel),
              React.createElement('button', {
                type: 'button', style: S.reset, disabled: p.disabled, onClick: p.onReset,
              }, p.resetLabel))
            : null),
        React.createElement('input', {
          id: p.id, style: invalid ? S.inputInvalid : S.input, type: 'text',
          ...(p.numeric ? { inputMode: 'numeric' } : {}),
          ...(invalid ? { 'aria-invalid': true } : {}),
          value: p.state.text, placeholder: '', disabled: p.disabled,
          onChange: (e) => { p.onEdit(e.target.value); },
        }),
        React.createElement('p', { style: invalid ? S.invalid : S.hint },
          invalid ? p.invalidLabel : p.hint));
    }

    function CheckRow(p) {
      const checked = p.state.text === 'true';
      return React.createElement('div', { style: p.divided ? S.fieldDivided : S.field },
        React.createElement('div', { style: S.head },
          React.createElement('label', { style: S.checkLabel, htmlFor: p.id },
            React.createElement('input', {
              id: p.id, type: 'checkbox', style: S.checkbox, checked, disabled: p.disabled,
              onChange: (e) => { p.onEdit(e.target.checked ? 'true' : 'false'); },
            }),
            p.label),
          p.state.overridden
            ? React.createElement('span', { style: S.badges },
              React.createElement('span', { style: S.badge }, p.overriddenLabel),
              React.createElement('button', {
                type: 'button', style: S.reset, disabled: p.disabled, onClick: p.onReset,
              }, p.resetLabel))
            : null),
        p.hint ? React.createElement('p', { style: S.hint }, p.hint) : null);
    }

    function FakeipCard(props) {
      const t = props.t;
      const state = props.useFakeipCard((s) => s);
      const disabled = !state.writable;
      const [open, setOpen] = React.useState(false);
      const saveStarted = React.useRef(false);
      // Collapse only after Host-confirmed settlement (official PluginCard
      // behavior); a rejected save keeps drafts visible for correction.
      React.useEffect(() => {
        if (state.saving) {
          saveStarted.current = true;
          return;
        }
        if (!saveStarted.current) return;
        saveStarted.current = false;
        if (!state.dirty && !state.failed) setOpen(false);
      }, [state.dirty, state.failed, state.saving]);
      if (!state.available) return null;
      const blocked = !state.dirty || state.invalid || state.saving;
      const title = t('title');
      const btn = (base, isDisabled) => isDisabled
        ? { ...base, ...S.btnDisabled }
        : base;
      const rows = [
        TextRow({ id: 'fakeip-lan', label: t('lanCidr'), hint: t('lanCidrHint'), state: state.lanCidr, disabled, divided: false, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidCidr'), onEdit: (v) => props.edit('lanCidr', v), onReset: () => props.resetField('lanCidr') }),
        TextRow({ id: 'fakeip-fakev4', label: t('fakeV4Cidr'), hint: t('fakeV4CidrHint'), state: state.fakeV4Cidr, disabled, divided: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidCidr'), onEdit: (v) => props.edit('fakeV4Cidr', v), onReset: () => props.resetField('fakeV4Cidr') }),
        TextRow({ id: 'fakeip-fakev6', label: t('fakeV6Cidr'), hint: t('fakeV6CidrHint'), state: state.fakeV6Cidr, disabled, divided: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => props.edit('fakeV6Cidr', v), onReset: () => props.resetField('fakeV6Cidr') }),
        TextRow({ id: 'fakeip-doh', label: t('dohEndpoints'), hint: t('dohEndpointsHint'), state: state.dohEndpoints, disabled, divided: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidEndpoints'), onEdit: (v) => props.edit('dohEndpoints', v), onReset: () => props.resetField('dohEndpoints') }),
        React.createElement(CheckRow, { key: 'lanInsecure', label: t('lanInsecure'), hint: t('lanInsecureHint'), state: state.lanInsecure, disabled, divided: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), onEdit: (v) => props.edit('lanInsecure', v), onReset: () => props.resetField('lanInsecure') }),
        TextRow({ id: 'fakeip-timeout', label: t('timeoutMs'), hint: '', state: state.timeoutMs, disabled, divided: true, numeric: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => props.edit('timeoutMs', v), onReset: () => props.resetField('timeoutMs') }),
        TextRow({ id: 'fakeip-maxbody', label: t('maxBodyChars'), hint: '', state: state.maxBodyChars, disabled, divided: true, numeric: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => props.edit('maxBodyChars', v), onReset: () => props.resetField('maxBodyChars') }),
        TextRow({ id: 'fakeip-maxresp', label: t('maxResponseBytes'), hint: '', state: state.maxResponseBytes, disabled, divided: true, numeric: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => props.edit('maxResponseBytes', v), onReset: () => props.resetField('maxResponseBytes') }),
        TextRow({ id: 'fakeip-redirects', label: t('maxRedirects'), hint: '', state: state.maxRedirects, disabled, divided: true, numeric: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => props.edit('maxRedirects', v), onReset: () => props.resetField('maxRedirects') }),
        TextRow({ id: 'fakeip-dohtimeout', label: t('dohTimeoutMs'), hint: '', state: state.dohTimeoutMs, disabled, divided: true, numeric: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => props.edit('dohTimeoutMs', v), onReset: () => props.resetField('dohTimeoutMs') }),
        TextRow({ id: 'fakeip-ua', label: t('userAgent'), hint: '', state: state.userAgent, disabled, divided: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => props.edit('userAgent', v), onReset: () => props.resetField('userAgent') }),
      ];
      return React.createElement('li', { style: open ? S.cardOpen : S.card },
        React.createElement('button', {
          type: 'button', style: S.header,
          'aria-expanded': open, 'aria-label': (open ? t('collapse') : t('expand')) + ': ' + title,
          onClick: () => { setOpen(!open); },
        },
          React.createElement('span', { style: S.headText },
            React.createElement('span', { style: S.name }, title),
            React.createElement('span', { style: S.desc }, t('description'))),
          state.dirty ? React.createElement('span', { style: S.pending }, t('unsaved')) : null,
          React.createElement(Chevron, { open })),
        open ? React.createElement('div', { style: S.body },
          !state.writable ? React.createElement('p', { style: S.readOnly, role: 'status' }, t('readOnly')) : null,
          ...rows,
          React.createElement('div', { style: S.footer },
            state.failed ? React.createElement('p', { style: S.failed, role: 'status' }, t('saveFailed')) : null,
            React.createElement('button', { type: 'button', style: btn(S.discard, !state.dirty || state.saving), disabled: !state.dirty || state.saving, onClick: props.discard }, t('discard')),
            React.createElement('button', { type: 'button', style: btn(S.save, blocked), disabled: blocked, onClick: props.save }, t(state.saving ? 'saving' : 'save'))))
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
