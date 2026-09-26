// fakeip-compat browser half: the `fakeip-compat` config form on the row's
// Plugins page (view: 'summary' one-liner, view: 'page' editor). The page
// supplies `{ view, form }` as owner props; the Host half alone never shows
// a card.
// This file is intentionally hand-written in the loader's factory format
// (same shape as a built DSH client bundle): plain JS,
// React.createElement only, no build step. It requires only "react".
window.__ModuleLoader__.load({
  id: 'fakeip-compat',
  factory: (require) => {
    var module = { exports: {} };
    const React = require('react');

    // Served namespaces are Loader entry ids (settings describe(): ns =
    // entry.options.id), so the gate watches the bundle row's entry id, not
    // the package name.
    const ENTRY_ID = 'web-fetch-fakeip-compat';
    const DICT_NS = 'settings.fakeip-compat';

    const zh = {
      title: 'Fake-IP 兼容抓取',
      description: 'TUN 代理 Fake-IP 环境下的网页抓取与内网调试例外。',
      lanCidr: '内网允许段 (CIDR，可逗号分隔多个)',
      lanCidrHint: '该网段内的解析结果会被 pin 住直连。默认覆盖 192.168.*.*、10.*.*.* 与 Tailscale 网段。',
      fakeV4Cidr: 'Fake-IP 池 v4 (CIDR，可逗号分隔多个)',
      fakeV4CidrHint: '与本机 Clash Verge 的 fake-ip-range 一致。',
      fakeV6Cidr: 'Fake-IP 池 v6 (CIDR，可逗号分隔多个)',
      fakeV6CidrHint: '与本机 Clash Verge 的 fake-ip-range6 一致；Mihomo 常对 AAAA 返回 2001:2::/48。',
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
      invalidCidr: '不是有效的 CIDR（单个如 192.168.0.0/16，多个用逗号分隔）。',
      invalidEndpoints: '至少填写一个 https:// 开头的端点。',
    };
    const en = {
      title: 'Fake-IP compatible fetch',
      description: 'Web fetch for TUN Fake-IP environments plus a LAN exception.',
      lanCidr: 'LAN allowlist (CIDR, comma separated for several)',
      lanCidrHint: 'Resolved addresses inside it are pinned direct. Default covers 192.168.*.*, 10.*.*.*, and the Tailscale range.',
      fakeV4Cidr: 'Fake-IP pool v4 (CIDR, comma separated for several)',
      fakeV4CidrHint: 'Must match the local Clash Verge fake-ip-range.',
      fakeV6Cidr: 'Fake-IP pool v6 (CIDR, comma separated for several)',
      fakeV6CidrHint: 'Must match the local Clash Verge fake-ip-range6; Mihomo often answers AAAA from 2001:2::/48.',
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
      invalidCidr: 'Not valid CIDR(s) (e.g. 192.168.0.0/16; separate several with commas).',
      invalidEndpoints: 'Provide at least one https:// endpoint.',
    };

    const inject = ['slots', 'locale', 'configForms'];

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
    function cidrListSpec(field) {
      function isV4Cidr(s) {
        const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(s);
        if (!m) return false;
        for (let i = 1; i <= 4; i++) { if (Number(m[i]) > 255) return false; }
        return Number(m[5]) <= 32;
      }
      function isV6Cidr(s) {
        const m = /^([0-9a-fA-F:.]+)\/(\d{1,3})$/.exec(s);
        if (!m || m[1].indexOf(':') < 0) return false;
        return Number(m[2]) <= 128;
      }
      return {
        field,
        format: (v) => (typeof v === 'string' ? v : ''),
        parse: (text) => {
          const t = text.trim();
          if (t === '') return { kind: 'clear' };
          const parts = t.split(/[,，\s\n]+/).map((s) => s.trim()).filter((s) => s !== '');
          if (parts.length === 0) return undefined;
          for (const p of parts) { if (!isV4Cidr(p) && !isV6Cidr(p)) return undefined; }
          return { kind: 'set', value: parts.join(', ') };
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

    // --- staged drafts over the page-supplied form -------------------------
    // The Plugins page owns the Host form and renders this card with owner
    // props `{ view, form }`: `view: 'summary'` renders the one-liner,
    // `view: 'page'` the editor with `form = { state, mutate }`. Drafts stay
    // local (React state); save submits one atomic mutate fenced by the
    // revision the editor read.
    var SPECS = [
      cidrListSpec('lanCidr'),
      cidrListSpec('fakeV4Cidr'),
      cidrListSpec('fakeV6Cidr'),
      endpointsSpec('dohEndpoints'),
      boolSpec('lanInsecure'),
      numberSpec('timeoutMs', { max: MAX_TIMER }),
      numberSpec('maxBodyChars'),
      numberSpec('maxResponseBytes'),
      numberSpec('maxRedirects', { integer: true }),
      numberSpec('dohTimeoutMs'),
      textSpec('userAgent'),
    ];
    function specOf(field) {
      for (let i = 0; i < SPECS.length; i++) {
        if (SPECS[i].field === field) return SPECS[i];
      }
      throw new Error('fakeip-compat card has no field ' + field);
    }
    function sectionValue(snap, field) {
      return snap.value ? snap.value[field] : undefined;
    }
    function baseValue(snap, field) {
      return snap.base ? snap.base[field] : undefined;
    }
    function stored(snap, field) {
      const u = snap.user;
      return u !== undefined && u !== null && Object.prototype.hasOwnProperty.call(u, field);
    }
    function fieldState(snap, staged, field) {
      const edit = staged[field];
      const spec = specOf(field);
      if (edit === undefined) {
        return { text: spec.format(sectionValue(snap, field)), overridden: stored(snap, field), invalid: false };
      }
      if (edit.clear) {
        return { text: edit.text, overridden: false, invalid: false };
      }
      const write = spec.parse(edit.text);
      return { text: edit.text, overridden: write !== undefined && write.kind === 'set', invalid: write === undefined };
    }
    // Stage plan as wire ops: unset for clears, set for changed fields.
    // Returns { ops, invalid }: invalid when any draft fails to parse.
    function planOps(snap, staged) {
      const ops = [];
      let invalid = false;
      Object.keys(staged).forEach((field) => {
        const edit = staged[field];
        const spec = specOf(field);
        if (edit.clear) {
          if (stored(snap, field)) ops.push({ op: 'unset', path: [field] });
          return;
        }
        if (edit.text === spec.format(sectionValue(snap, field))) return;
        const write = spec.parse(edit.text);
        if (write === undefined) { invalid = true; return; }
        if (write.kind === 'clear') {
          if (stored(snap, field)) ops.push({ op: 'unset', path: [field] });
        } else {
          ops.push({ op: 'set', path: [field], value: write.value });
        }
      });
      return { ops, invalid };
    }

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

    // --- value rows: official ValueField layout (head row, input, hint) ---
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
      const view = props.view;
      const form = props.form;
      // Hooks run unconditionally: early returns below must never change the
      // hook count between renders (loading -> ready, summary <-> page).
      const [staged, setStaged] = React.useState({});
      const [saving, setSaving] = React.useState(false);
      const [failed, setFailed] = React.useState(false);
      // Summary one-liner under the row title: the active LAN allowlist.
      if (view === 'summary') {
        if (!form || !form.state || form.state.status !== 'ready') return null;
        const v = (form.state.value && form.state.value.lanCidr) || '';
        return React.createElement('span', null, String(v));
      }
      // Page view without a served namespace: the Host does not serve this
      // entry here, so there is nothing to edit.
      if (!form || !form.state || form.state.status !== 'ready') return null;
      const snap = form.state;
      const disabled = !snap.writable;
      const edit = (field, text) => {
        const next = { ...staged };
        next[field] = { text, clear: false };
        setFailed(false);
        setStaged(next);
      };
      const resetField = (field) => {
        const next = { ...staged };
        next[field] = { text: specOf(field).format(baseValue(snap, field)), clear: true };
        setFailed(false);
        setStaged(next);
      };
      const discard = () => {
        if (Object.keys(staged).length === 0 && !failed) return;
        setStaged({});
        setFailed(false);
      };
      const save = () => {
        const plan = planOps(snap, staged);
        if (plan.ops.length === 0 || saving || plan.invalid) return;
        setSaving(true);
        setFailed(false);
        let settled;
        try {
          settled = form.mutate(plan.ops, snap.revision);
        } catch (e) {
          setSaving(false);
          setFailed(true);
          return;
        }
        Promise.resolve(settled).then(
          (ok) => {
            setSaving(false);
            if (ok) setStaged({});
            else setFailed(true);
          },
          () => {
            setSaving(false);
            setFailed(true);
          },
        );
      };
      const plan = planOps(snap, staged);
      const dirty = plan.ops.length > 0 || plan.invalid;
      const blocked = !dirty || plan.invalid || saving;
      const fs = (field) => fieldState(snap, staged, field);
      const btn = (base, isDisabled) => isDisabled
        ? { ...base, ...S.btnDisabled }
        : base;
      const rows = [
        TextRow({ id: 'fakeip-lan', label: t('lanCidr'), hint: t('lanCidrHint'), state: fs('lanCidr'), disabled, divided: false, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidCidr'), onEdit: (v) => edit('lanCidr', v), onReset: () => resetField('lanCidr') }),
        TextRow({ id: 'fakeip-fakev4', label: t('fakeV4Cidr'), hint: t('fakeV4CidrHint'), state: fs('fakeV4Cidr'), disabled, divided: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidCidr'), onEdit: (v) => edit('fakeV4Cidr', v), onReset: () => resetField('fakeV4Cidr') }),
        TextRow({ id: 'fakeip-fakev6', label: t('fakeV6Cidr'), hint: t('fakeV6CidrHint'), state: fs('fakeV6Cidr'), disabled, divided: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidCidr'), onEdit: (v) => edit('fakeV6Cidr', v), onReset: () => resetField('fakeV6Cidr') }),
        TextRow({ id: 'fakeip-doh', label: t('dohEndpoints'), hint: t('dohEndpointsHint'), state: fs('dohEndpoints'), disabled, divided: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidEndpoints'), onEdit: (v) => edit('dohEndpoints', v), onReset: () => resetField('dohEndpoints') }),
        React.createElement(CheckRow, { key: 'lanInsecure', label: t('lanInsecure'), hint: t('lanInsecureHint'), state: fs('lanInsecure'), disabled, divided: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), onEdit: (v) => edit('lanInsecure', v), onReset: () => resetField('lanInsecure') }),
        TextRow({ id: 'fakeip-timeout', label: t('timeoutMs'), hint: '', state: fs('timeoutMs'), disabled, divided: true, numeric: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => edit('timeoutMs', v), onReset: () => resetField('timeoutMs') }),
        TextRow({ id: 'fakeip-maxbody', label: t('maxBodyChars'), hint: '', state: fs('maxBodyChars'), disabled, divided: true, numeric: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => edit('maxBodyChars', v), onReset: () => resetField('maxBodyChars') }),
        TextRow({ id: 'fakeip-maxresp', label: t('maxResponseBytes'), hint: '', state: fs('maxResponseBytes'), disabled, divided: true, numeric: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => edit('maxResponseBytes', v), onReset: () => resetField('maxResponseBytes') }),
        TextRow({ id: 'fakeip-redirects', label: t('maxRedirects'), hint: '', state: fs('maxRedirects'), disabled, divided: true, numeric: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => edit('maxRedirects', v), onReset: () => resetField('maxRedirects') }),
        TextRow({ id: 'fakeip-dohtimeout', label: t('dohTimeoutMs'), hint: '', state: fs('dohTimeoutMs'), disabled, divided: true, numeric: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => edit('dohTimeoutMs', v), onReset: () => resetField('dohTimeoutMs') }),
        TextRow({ id: 'fakeip-ua', label: t('userAgent'), hint: '', state: fs('userAgent'), disabled, divided: true, overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidText'), onEdit: (v) => edit('userAgent', v), onReset: () => resetField('userAgent') }),
      ];
      // The row page draws the title and crumb; the contribution renders the
      // form body with its save control.
      return React.createElement('div', { style: S.body },
        !snap.writable ? React.createElement('p', { style: S.readOnly, role: 'status' }, t('readOnly')) : null,
        dirty ? React.createElement('p', { style: S.hint, role: 'status' }, t('unsaved')) : null,
        ...rows,
        React.createElement('div', { style: S.footer },
          failed ? React.createElement('p', { style: S.failed, role: 'status' }, t('saveFailed')) : null,
          React.createElement('button', { type: 'button', style: btn(S.discard, !dirty || saving), disabled: !dirty || saving, onClick: discard }, t('discard')),
          React.createElement('button', { type: 'button', style: btn(S.save, blocked), disabled: blocked, onClick: save }, t(saving ? 'saving' : 'save'))));
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(DICT_NS, { zh, en }), 'fakeip-compat: dictionaries');
      // The row page exists while the Host serves this entry; the page
      // supplies `{ view, form }` as owner props. whileServed keeps the
      // registration alive exactly while the namespace is served.
      ctx.effect(() => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject(
        'plugins.row.config',
        () => ctx.slots.register({
          name: 'plugins.row.config',
          key: 'fakeip-compat#web-fetch-fakeip-compat',
          locale: DICT_NS,
          inject: () => ({}),
        }, FakeipCard),
      )), 'fakeip-compat: row page');
    }

    module.exports = { inject, apply };
    return module.exports;
  },
});
