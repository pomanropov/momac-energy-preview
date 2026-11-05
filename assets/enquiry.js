/* Momac Energy and Trading: enquiry form and live brief.
   Loaded on the Enquiry page only. No external requests except the form endpoint.
   All text shown here comes from data-* attributes rendered by the build.
   User input is written with textContent only, never innerHTML. */
(function () {
  'use strict';
  var form = document.getElementById('enquiry-form');
  if (!form) { return; }

  var preview = document.getElementById('brief-preview');
  var count = document.getElementById('brief-count');
  var submit = document.getElementById('enquiry-submit');
  var okBox = document.getElementById('enquiry-success');
  var errBox = document.getElementById('enquiry-error');
  var hint = document.getElementById('copy-hint');
  var copyBtn = document.getElementById('copy-brief');
  var REQUIRED = ['role', 'company', 'name', 'email'];
  var FIELDS = ['role', 'product', 'grade', 'volume', 'loading_point', 'destination',
    'delivery_window', 'company', 'name', 'email', 'message'];
  var TRADE = ['role', 'product', 'grade', 'volume', 'loading_point', 'destination', 'delivery_window'];
  var TIMEOUT_MS = 20000;
  var sending = false;

  function d(name) { return form.getAttribute('data-' + name) || ''; }

  function readValues() {
    var v = {};
    FIELDS.forEach(function (n) {
      var el = form.elements[n];
      v[n] = el ? String(el.value || '').trim() : '';
    });
    return v;
  }

  function pad(s) { return (s + '                ').slice(0, 16); }

  function buildBrief(values) {
    /* single-line fields: collapse newlines so a value cannot add brief rows */
    function row(k) {
      var one = String(values[k] || '').replace(/\s*[\r\n]+\s*/g, ' ').trim();
      return pad(d('l-' + k).toUpperCase()) + (one || '·');
    }
    var rule = new Array(35).join('-');
    var lines = [d('head'), rule]
      .concat(TRADE.map(row), [''], ['company', 'name', 'email'].map(row));
    if (values.message) { lines.push('', d('notes'), values.message); }
    return lines.join('\n');
  }

  function renderBrief(values) {
    var filled = TRADE.filter(function (k) { return values[k]; }).length;
    if (preview) { preview.textContent = buildBrief(values); }
    var label = filled + d('count');
    if (count && count.textContent !== label) { count.textContent = label; }
  }

  /* ---- validation ---- */
  function errEl(name) { return document.getElementById('err-' + name); }

  function setError(name, text) {
    var el = errEl(name), input = form.elements[name];
    if (el) { el.textContent = text; el.hidden = false; }
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      if (el) { input.setAttribute('aria-describedby', el.id); }
    }
  }

  function clearError(name) {
    var el = errEl(name), input = form.elements[name];
    if (el) { el.textContent = ''; el.hidden = true; }
    if (input) {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
  }

  function validate(values) {
    var firstBad = null;
    REQUIRED.forEach(function (n) {
      var bad = !values[n];
      var text = d('err-' + n);
      if (!bad && n === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        bad = true;
        text = d('err-email-bad');
      }
      if (bad) {
        setError(n, text);
        if (!firstBad) { firstBad = form.elements[n]; }
      } else {
        clearError(n);
      }
    });
    if (firstBad) { firstBad.focus(); }
    return !firstBad;
  }

  /* ---- states ---- */
  function show(box) {
    okBox.hidden = box !== okBox;
    errBox.hidden = box !== errBox;
    if (box) { box.focus(); }
  }

  function showSuccess(values) {
    var copy = document.getElementById('success-brief');
    if (copy) { copy.textContent = buildBrief(values); }
    show(okBox);
  }

  function setBusy(busy) {
    sending = busy;
    submit.disabled = busy;
    submit.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function post(url, payload) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT_MS) : null;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl ? ctl.signal : undefined
    }).then(function (res) {
      if (timer) { clearTimeout(timer); }
      if (!res.ok) { throw new Error('HTTP ' + res.status); }
    }, function (e) {
      if (timer) { clearTimeout(timer); }
      throw e;
    });
  }

  function submitEnquiry(f) {
    if (sending) { return Promise.resolve(); }
    var values = readValues();
    renderBrief(values);
    if (!validate(values)) { return Promise.resolve(); }

    var honeypot = f.elements._gotcha;
    if (honeypot && honeypot.value) {  /* bots only: pretend success, send nothing */
      showSuccess(values);
      return Promise.resolve();
    }
    var url = f.getAttribute('action');
    setBusy(true);
    if (!url) {  /* preview without an endpoint: show the email fallback */
      show(errBox);
      setBusy(false);
      return Promise.resolve();
    }
    var payload = {};
    FIELDS.forEach(function (n) { payload[n] = values[n]; });
    payload._subject = d('subject') + ': ' + (values.product || '-') + ' (' + values.role + ')';
    return post(url, payload).then(function () {
      showSuccess(values);   /* submit stays disabled: the brief was sent once */
    }, function () {
      show(errBox);
      setBusy(false);
    });
  }

  /* ---- copy ---- */
  function selectBrief() {
    var range = document.createRange();
    range.selectNodeContents(preview);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function say(text) {
    if (!hint) { return; }
    hint.textContent = text;
    hint.hidden = false;
  }

  function copyBrief() {
    var text = preview.textContent;
    var clip = navigator.clipboard;
    function manual() { selectBrief(); say(d('manual')); }
    if (!clip || typeof clip.writeText !== 'function') {
      manual();
      return Promise.resolve();
    }
    return clip.writeText(text).then(function () { say(d('copied')); }, manual);
  }

  /* ---- wiring ---- */
  form.noValidate = true;  /* JS shows the messages; without JS the browser validates */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submitEnquiry(form);
  });
  function onInput(e) {
    renderBrief(readValues());
    var n = e.target && e.target.name;
    if (n && REQUIRED.indexOf(n) !== -1 && e.target.value) { clearError(n); }
  }
  form.addEventListener('input', onInput);
  form.addEventListener('change', onInput);
  if (copyBtn) { copyBtn.addEventListener('click', function () { copyBrief(); }); }
  renderBrief(readValues());
})();
