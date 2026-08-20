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

  /* ---------- 9-b. 업종 페이지의 빠른 문의 ----------
     주소만 받아 무료 제안/진단 폼으로 값을 들고 넘어간다.
     ⚠ 접수 기능이 아직 없다 — **여기서 접수하는 척하지 않는다.** 이동만 시킨다. */
  (function quick() {
    var forms = $$('[data-quick]');
    var site = document.getElementById('dg-site') || document.getElementById('fp-site');
    if (!forms.length && !site) return;
    forms.forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = f.querySelector('input');
        var v = input && input.value ? input.value.trim() : '';
        var url = f.getAttribute('data-quick') || 'free-proposal.html';
        location.href = v ? url + '?site=' + encodeURIComponent(v) : url;
      });
    });
    if (site && !site.value) {
      var m = /[?&]site=([^&]*)/.exec(location.search);
      if (m && m[1]) {
        try { site.value = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (err) { /* 잘못된 인코딩은 무시 */ }
      }
    }
  })();

  /* ---------- 9-c. 문의 폼 ----------
     ⚠ 받는 곳이 아직 없다. 보낸 척하지 말고 **안내 문구만** 띄운다. */
  (function forms() {
    $$('[data-form]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var note = $('[data-form-note]', f);
        if (note) { note.hidden = false; note.scrollIntoView({block: 'nearest'}); }
      });
    });
  })();

  /* ---------- 9-d. 작업물 크게 보기 ----------
     촬영·편집디자인 실적 189칸은 누르면 크게 열린다. 새 골격으로 오면서 이 동작이
     빠져 **눌러도 아무 일이 없었다**(2026-08-20 검수에서 잡았다).
     이동 범위는 그 칸이 놓인 레일 하나 — 분류가 섞이지 않는다. */
  (function lightbox() {
    var grid = $('[data-lbox]');
    if (!grid) return;
    var lb = null, imgEl, catEl, titleEl, descEl, rowsEl;
    var list = [], idx = -1, opener = null;

    // ⚠ 미리 만들어 두지 않는다. 빈 src 인 <img> 가 검수에서 깨진 이미지로 잡힌다.
    function build() {
      lb = document.createElement('div');
      lb.className = 'lbox';
      lb.setAttribute('role', 'dialog');
      lb.setAttribute('aria-modal', 'true');
      lb.innerHTML =
        '<div class="lbox__wrap">' +
          '<div class="lbox__figure"><img class="lbox__img" src="" alt=""></div>' +
          '<div class="lbox__info">' +
            '<span class="lbox__cat"></span>' +
            '<h3 class="lbox__title"></h3>' +
            '<p class="lbox__desc"></p>' +
            '<p class="lbox__label">PROJECT INFO</p>' +
            '<div class="lbox__rows"></div>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="lbox__close" aria-label="닫기">&times;</button>' +
        '<button type="button" class="lbox__nav lbox__nav--prev" aria-label="이전 작업">&#8249;</button>' +
        '<button type="button" class="lbox__nav lbox__nav--next" aria-label="다음 작업">&#8250;</button>';
      document.body.appendChild(lb);
      imgEl = $('.lbox__img', lb); catEl = $('.lbox__cat', lb);
      titleEl = $('.lbox__title', lb); descEl = $('.lbox__desc', lb); rowsEl = $('.lbox__rows', lb);
      $('.lbox__close', lb).addEventListener('click', close);
      $('.lbox__nav--prev', lb).addEventListener('click', function () { show(idx - 1); });
      $('.lbox__nav--next', lb).addEventListener('click', function () { show(idx + 1); });
      lb.addEventListener('click', function (e) {
        if (e.target === lb || e.target.classList.contains('lbox__wrap') ||
            e.target.classList.contains('lbox__figure')) close();
      });
    }
    function scope(card) {
      var rail = (card && card.closest) ? (card.closest('[data-rail]') || grid) : grid;
      return $$('.dwork__item', rail).filter(function (c) { return !c.hidden; });
    }
    function row(label, value) {
      return value ? '<div><b>' + label + '</b><span>' + value + '</span></div>' : '';
    }
    function show(i) {
      if (!list.length) return;
      idx = (i % list.length + list.length) % list.length;
      var c = list[idx], img = c.querySelector('img');
      imgEl.src = c.getAttribute('data-large') || (img && img.getAttribute('src')) || '';
      imgEl.alt = (img && img.getAttribute('alt')) || '';
      catEl.textContent = ($('.dwork__c', c) || {}).textContent || '';
      titleEl.textContent = ($('.dwork__t', c) || {}).textContent || '';
      descEl.textContent = c.getAttribute('data-desc') || '';
      rowsEl.innerHTML =
        row('제작물', c.getAttribute('data-deliver')) +
        row('작업 범위', c.getAttribute('data-scope')) +
        row('진행', '하오웹에서 직접 제작') +
        '<div><b>문의</b><span><a href="inquiry.html">제작 문의하기 &rarr;</a></span></div>';
      $('.lbox__info', lb).scrollTop = 0;
    }
    function close() {
      if (!lb) return;
      lb.classList.remove('is-open');
      document.body.classList.remove('is-lbox');
      if (opener) opener.focus();
      opener = null;
    }
    grid.addEventListener('click', function (e) {
      var card = e.target.closest ? e.target.closest('.dwork__item') : null;
      if (!card) return;
      if (!lb) build();
      list = scope(card);
      var i = list.indexOf(card);
      if (i < 0) return;
      opener = card;
      lb.classList.add('is-open');
      document.body.classList.add('is-lbox');
      show(i);
      $('.lbox__close', lb).focus();
    });
    window.addEventListener('keydown', function (e) {
      if (!lb || !lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
    });
  })();

  /* ---------- 9-e. 워드마크 밴드 (옛 디자인에서 되가져옴) ----------
     ⭐ 2026-08-20 세영 지시. 글자 안으로 사진이 비치는 그 밴드다.
     ⚠ 흐르는 속도는 **화면 폭과 상관없이 일정**해야 한다(실측 87.2px/s) —
       duration 을 CSS 에 못 박으면 넓은 화면에서 훨씬 빨라진다. */
  (function wordband() {
    var sec = $('.txtsec');
    if (!sec) return;
    var lines = $$('[data-wb]', sec);
    if (lines.length) {
      var SPEED = 87.2;
      var apply = function () {
        var d = ((window.innerWidth || 1440) / SPEED).toFixed(2) + 's';
        lines.forEach(function (el) { el.style.animationDuration = d; });
      };
      apply();
      window.addEventListener('resize', apply);
    }
    // 배경 사진을 한 장씩 넘긴다. 두 줄은 **같은 사진**을 공유한다(섹션에 배경은 하나뿐이다).
    var bgs = $$('.txtsec__bg', sec);
    if (bgs.length > 1 && !reduce) {
      var i = 0;
      setInterval(function () {
        var r = sec.getBoundingClientRect();
        if (r.bottom < 0 || r.top > (window.innerHeight || 900)) return;   // 화면 밖이면 쉰다
        bgs[i].classList.remove('is-on');
        i = (i + 1) % bgs.length;
        var n = bgs[i];
        n.style.animation = 'none';
        void n.offsetWidth;          // ⚠ 리플로를 강제해야 흐름 애니메이션이 처음부터 다시 돈다
        n.style.animation = '';
        n.classList.add('is-on');
      }, 4200);
    }
  })();

  /* ---------- 9-f. 스크롤바 폭 ----------
     화면을 꽉 채우는 블록(`.fullbleed`)이 `100vw` 를 쓰면 **스크롤바 폭만큼 삐져나가**
     가로로 밀린다. 실제 폭을 재서 CSS 에 넘긴다(2026-08-20 데스크톱에서 8px 밀렸다). */
  (function scrollbar() {
    var set = function () {
      var w = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.setProperty('--sbw', (w > 0 ? w : 0) + 'px');
    };
    set();
    window.addEventListener('resize', set);
  })();

  /* ---------- 10. 준비 끝 표시 ----------
     ⚠ 검수 도구(_text.py·_check.py)가 **스크립트가 끝나기 전에 읽어** 여기서 만든 글자를
       놓치는 일이 있었다(2026-08-20 website 의 영문 라벨 6개). 신호를 남겨 기다리게 한다. */
  document.documentElement.setAttribute('data-hao-ready', '1');
})();
