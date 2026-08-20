/* ============================================================
   HAOWEB — 바로웹 골격 이식판 동작
   레퍼런스에 있는 동작만 넣는다. 없는 효과는 만들지 않는다(2026-08-19 세영).

   ⭐ 등장 모션 전환은 레퍼런스가 `.4s ease-in` 하나로 통일해 뒀다(실측).
     여기서는 CSS 가 그 전환을 갖고 있고, JS 는 `.on` 만 붙였다 뗀다.
   ⚠ 레퍼런스는 화면 밖으로 나가면 클래스를 **다시 뗀다**(되감기). 그대로 맞췄다 —
     한 번만 붙이면 위로 스크롤했을 때 움직임이 죽어 레퍼런스와 달라진다.
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 1. 헤더 — 히어로 위에서는 투명 어둡게 ---------- */
  (function header() {
    var hd = $('.hd');
    if (!hd) return;
    var mv = $('.mv');
    function tick() {
      if (!mv) { hd.classList.remove('is-over'); return; }
      // 히어로가 헤더 아래를 아직 덮고 있으면 어두운 상태
      var over = mv.getBoundingClientRect().bottom > hd.offsetHeight + 10;
      hd.classList.toggle('is-over', over);
    }
    tick();
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
  })();

  /* ---------- 2. 모바일 메뉴 ---------- */
  (function menu() {
    var b = $('.hd__burger');
    if (!b) return;
    b.addEventListener('click', function () {
      var on = document.body.classList.toggle('is-menu');
      b.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
    $$('.mnav a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('is-menu');
        b.setAttribute('aria-expanded', 'false');
      });
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('is-menu')) b.click();
    });
  })();

  /* ---------- 3. 등장 모션 ---------- */
  (function reveal() {
    var els = $$('[data-ani]');
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('on'); });
      return;
    }
    var io = new IntersectionObserver(function (rows) {
      rows.forEach(function (r) {
        // 지연은 요소가 스스로 갖고 있다(data-delay="0.08"). 스태거를 CSS 로 못 박지 않기 위해서다.
        var d = r.target.getAttribute('data-delay');
        r.target.style.transitionDelay = d ? d + 's' : '';
        r.target.classList.toggle('on', r.isIntersecting);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- 4. 우측 제작상담 카드 닫기 ----------
     ⚠ 닫은 상태를 저장하지 않는다 — 레퍼런스도 새로고침하면 다시 열린다. */
  (function qpop() {
    var p = $('.qpop');
    if (!p) return;
    var c = $('.qpop__close', p);
    if (c) c.addEventListener('click', function () { p.classList.add('is-off'); });
  })();

  /* ---------- 5. 가로 슬라이더 ----------
     레퍼런스는 Swiper 를 쓰지만 여기서는 같은 동작을 스크롤 스냅으로 낸다
     (라이브러리를 얹지 않는 것이 이 사이트의 원칙이다 — 정적 HTML). */
  (function slider() {
    $$('.slider').forEach(function (s) {
      var track = $('.slider__track', s);
      if (!track) return;
      var bar = $('.slider__bar i', s);
      var prev = $('[data-prev]', s);
      var next = $('[data-next]', s);

      function step() {
        var first = track.firstElementChild;
        if (!first) return track.clientWidth;
        var r = first.getBoundingClientRect();
        var ms = parseFloat(getComputedStyle(first).marginRight) || 0;
        return r.width + ms;
      }
      function sync() {
        if (!bar) return;
        var max = track.scrollWidth - track.clientWidth;
        var seen = track.clientWidth / track.scrollWidth;
        bar.style.width = (seen * 100) + '%';
        bar.style.left = (max > 0 ? (track.scrollLeft / max) * (100 - seen * 100) : 0) + '%';
      }
      if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
      if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
      track.addEventListener('scroll', sync, { passive: true });
      window.addEventListener('resize', sync);
      sync();
    });
  })();

  /* ---------- 6. 숫자 카운트업 ----------
     레퍼런스는 counterup + waypoints 로 화면에 들어올 때 0 부터 센다. */
  (function count() {
    var els = $$('[data-count]');
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.textContent = fmt(+el.getAttribute('data-count')); });
      return;
    }
    // 원문이 「4,500건 이상」이라 세 자리마다 쉼표를 넣는다
    function fmt(n) { return n.toLocaleString('ko-KR'); }
    var io = new IntersectionObserver(function (rows) {
      rows.forEach(function (r) {
        if (!r.isIntersecting || r.target.dataset.done) return;
        r.target.dataset.done = '1';
        var to = +r.target.getAttribute('data-count') || 0;
        var t0 = null, dur = 1400;
        (function run(t) {
          if (t0 === null) t0 = t;
          var p = Math.min(1, (t - t0) / dur);
          // ease-out — 끝에서 부드럽게 멈춘다
          r.target.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(run);
        })(performance.now());
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { el.textContent = '0'; io.observe(el); });
  })();

  /* ---------- 7. 카테고리 칩 필터 ---------- */
  (function chips() {
    $$('[data-filter]').forEach(function (wrap) {
      var target = $(wrap.getAttribute('data-filter'));
      if (!target) return;
      var btns = $$('.chip', wrap);
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          var k = b.getAttribute('data-cat');
          $$('[data-cat]', target).forEach(function (it) {
            it.hidden = !(k === 'all' || it.getAttribute('data-cat') === k);
          });
        });
      });
    });
  })();

  /* ---------- 7-b. 옛 조각이 쓰는 두 가지 ----------
     이식 레이어(hao-legacy.css)로 살려 둔 화면이라 동작도 여기서 맡는다. */
  (function legacy() {
    // 실적 보기 전환 (카드 / 목록)
    $$('[data-workview]').forEach(function (w) {
      $$('[data-view-btn]', w).forEach(function (b) {
        b.addEventListener('click', function () {
          var v = b.getAttribute('data-view-btn');
          w.setAttribute('data-view', v);
          $$('[data-view-btn]', w).forEach(function (x) {
            x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
          });
        });
      });
    });
    // FAQ 주제 고르기
    $$('[data-faq]').forEach(function (w) {
      var btns = $$('.chip', w);
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          var k = b.getAttribute('data-cat');
          $$('.faq__item[data-cat]', w).forEach(function (it) {
            it.hidden = !(k === 'all' || it.getAttribute('data-cat') === k);
          });
        });
      });
    });
  })();

  /* ---------- 7-c. 목록 행의 영문 라벨 ----------
     ⭐ 2026-08-20 세영: "되살려줘."
     옛 디자인은 행 위로 흐르는 마퀴였고, 글자는 `data-marquee` **속성 안에만** 있었다.
     레퍼런스에 그 장치가 없어 마퀴는 걷어냈지만 글자까지 사라지면 안 된다 —
     속성 값을 실제 글자로 넣어 행 오른쪽에 조용히 세워 둔다. */
  (function rowLabel() {
    $$('[data-marquee]').forEach(function (el) {
      if (el.textContent.trim()) return;
      el.textContent = el.getAttribute('data-marquee') || '';
    });
  })();

  /* ---------- 8. 흐르는 텍스트 ----------
     CSS 애니메이션이 -50% 까지 밀기 때문에 **내용이 정확히 두 벌** 있어야 이어져 보인다.
     조각에 한 벌만 써 두고 여기서 복제한다 — 같은 문장을 조각에 두 번 적으면
     화면 낭독기가 두 번 읽는다. */
  (function marquee() {
    $$('.marq__in').forEach(function (m) {
      if (m.children.length !== 1) return;
      var clone = m.firstElementChild.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      m.appendChild(clone);
    });
  })();

  /* ---------- 9. 빠른상담 폼 ----------
     ⚠ 아직 받는 곳이 없다. 눌렀을 때 아무 일도 안 일어나면 고장으로 보이므로
       제작 문의 페이지로 넘긴다. 백엔드가 생기면 이 자리를 실제 전송으로 바꾼다. */
  (function quickform() {
    var f = $('.qbar__form');
    if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      location.href = 'inquiry.html';
    });
  })();

  /* ---------- 10. 준비 끝 표시 ----------
     ⚠ 검수 도구(_text.py·_check.py)가 **스크립트가 끝나기 전에 읽어** 여기서 만든 글자를
       놓치는 일이 있었다(2026-08-20 website 의 영문 라벨 6개). 신호를 남겨 기다리게 한다. */
  document.documentElement.setAttribute('data-hao-ready', '1');
})();
