/* Momac Energy and Trading. Plain JS, no frameworks, no external scripts.
   Text shown by this script comes from data-* attributes in the HTML. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* Mobile nav */
  var toggle = $('#nav-toggle');
  if (toggle) {
    var setNav = function (open) {
      doc.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    toggle.addEventListener('click', function () { setNav(!doc.classList.contains('nav-open')); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && doc.classList.contains('nav-open')) { setNav(false); toggle.focus(); }
    });
    $$('#site-nav a').forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });
    /* Open menu: Tab cycles menu links and the toggle (the toggle follows the nav in DOM order,
       so plain Tab would leave the menu and land on the page under it). */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !doc.classList.contains('nav-open')) return;
      var links = $$('#site-nav a'), cur = document.activeElement;
      if (!links.length) return;
      var first = links[0], last = links[links.length - 1], go = null;
      if (cur === toggle) go = e.shiftKey ? last : first;
      else if (cur === last && !e.shiftKey) go = toggle;
      else if (cur === first && e.shiftKey) go = toggle;
      if (go) { e.preventDefault(); go.focus(); }
    });
  }

  /* Skip link: stay on this page even when a <base href> is set (production 404) */
  var skip = $('a.skip');
  if (skip) skip.addEventListener('click', function (e) {
    var m = $('#main');
    if (!m) return;
    e.preventDefault();
    if (!m.hasAttribute('tabindex')) m.tabIndex = -1;
    m.focus();
  });

  /* Home: trade brief ticket */
  var tButtons = $$('.t-tabs button');
  tButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      var p = b.getAttribute('data-p');
      tButtons.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      $$('.t-rows').forEach(function (ul) { ul.hidden = ul.getAttribute('data-rows') !== p; });
    });
  });

  /* How we trade: principal / broker tabs and the transfer-of-title diagram */
  var tabs = $$('[role=tab]');
  if (tabs.length) {
    var flow = $('#flow');
    var mode = 'principal', t0 = 0;
    var setText = function (el, m) { if (el) el.textContent = el.getAttribute('data-' + m) || ''; };
    var drawMode = function (m) {
      if (!flow) return;
      var br = m === 'broker';
      $('#momacG').style.transform = br ? 'translateY(-120px)' : 'none';
      $('#mBox').classList.toggle('hot', !br);
      var tag = $('#mTag');
      setText(tag, m); tag.classList.toggle('hot', !br);
      setText($('#mSub'), m);
      setText($('#mLabel'), m);
      $('#railA').style.opacity = br ? 0 : 1;
      $('#railB').style.opacity = br ? 0 : 1;
      $('#railDirect').style.opacity = br ? 1 : 0;
      $('#railDirect').classList.toggle('solid', br);
      $('#linkL').style.opacity = br ? 1 : 0;
      $('#linkR').style.opacity = br ? 1 : 0;
      t0 = window.performance ? performance.now() : 0;
    };
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      mode = tab.getAttribute('data-m');
      drawMode(mode);
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') n = tabs[0];
        else if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    var initial = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    select(initial, false);

    if (flow) {
      var tok = $('#tokTitle'), mBox = $('#mBox');
      var ease = function (x) { return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
      var frame = function (now) {
        /* The marker slides behind the boxes, so title visibly enters and leaves each party. */
        var t = ((now - t0) / 1000) % 4.6, x, inside = false;
        if (mode === 'principal') {
          if (t < 1.5) x = 110 + ease(t / 1.5) * 370;
          else if (t < 2.5) x = 480;
          else if (t < 4.0) x = 480 + ease((t - 2.5) / 1.5) * 370;
          else x = 850;
          inside = t > 1.25 && t < 2.75;
        } else {
          x = t < 3.6 ? 110 + ease(t / 3.6) * 740 : 850;
        }
        tok.setAttribute('transform', 'translate(' + x + ' 220)');
        mBox.style.strokeWidth = inside ? 3 : '';
        window.requestAnimationFrame(frame);
      };
      if (!reduce && window.requestAnimationFrame) window.requestAnimationFrame(frame);
    }
  }

  /* Process: progress line */
  var ps = $('#psteps'), pbar = $('#pbar');
  if (ps && pbar) {
    var lis = $$('li', ps);
    var prog = function () {
      var r = ps.getBoundingClientRect(), mid = window.innerHeight * .55;
      pbar.style.height = Math.min(Math.max(mid - r.top, 0), r.height - 16) + 'px';
      lis.forEach(function (li) { li.classList.toggle('lit', li.getBoundingClientRect().top + 10 < mid); });
    };
    window.addEventListener('scroll', prog, { passive: true });
    window.addEventListener('resize', prog);
    prog();
  }

  /* Preview only: Sources mode and placeholder navigation */
  var review = $('#review');
  if (review) {
    var facts = $$('[data-fact]'), gaps = $$('.tbd');
    var srcBtn = $('#sources-toggle'), panel = $('#review-panel'), tip = $('#review-tip');
    var nextBtn = $('#next-placeholder');
    var fc = $('[data-count=facts]', review), gc = $('[data-count=gaps]', review);
    if (fc) fc.textContent = String(facts.length);
    if (gc) gc.textContent = String(gaps.length);
    if (nextBtn) nextBtn.disabled = !gaps.length;

    var shownAt = 0;
    var hideTip = function () { tip.hidden = true; };
    var showTip = function (el) {
      if (!doc.classList.contains('sources-on')) return;
      tip.textContent = (tip.getAttribute('data-prefix') || '') + el.getAttribute('data-src');
      tip.hidden = false;
      shownAt = Date.now();
      var r = el.getBoundingClientRect();
      var top = r.bottom + 8;
      var left = Math.min(Math.max(12, r.left), window.innerWidth - tip.offsetWidth - 12);
      if (top + tip.offsetHeight > window.innerHeight - 12) top = Math.max(12, r.top - tip.offsetHeight - 8);
      tip.style.top = top + 'px'; tip.style.left = left + 'px';
    };
    srcBtn.addEventListener('click', function () {
      var on = doc.classList.toggle('sources-on');
      srcBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      panel.hidden = !on;
      facts.forEach(function (el, i) {
        if (on) { el.tabIndex = 0; el.setAttribute('aria-describedby', 'review-tip'); }
        else { el.removeAttribute('tabindex'); el.removeAttribute('aria-describedby'); }
      });
      if (!on) hideTip();
    });
    facts.forEach(function (el) {
      el.addEventListener('mouseenter', function () { showTip(el); });
      el.addEventListener('mouseleave', hideTip);
      el.addEventListener('focus', function () { showTip(el); });
      el.addEventListener('blur', hideTip);
    });
    /* focus can scroll the element into view: that scroll must not hide the tip it just opened */
    window.addEventListener('scroll', function () { if (Date.now() - shownAt > 400) hideTip(); }, { passive: true });

    var gi = 0;
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (!gaps.length) return;
      var el = gaps[gi % gaps.length]; gi++;
      if (!el.hasAttribute('tabindex')) el.tabIndex = -1;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    });
  }
})();
