/* HAOWEB — 레퍼런스 골격 이식판 공통 스크립트
   모션 값은 레퍼런스 실측 기준:
   · 글자 등장 = translateX(+20px) → 0 + 페이드, 랜덤 스태거, 0.7s ease-out
   · 스크롤 리빌 = 'HAO' 글자 마스크가 중앙에서 scale 0.4→56.4 + 배경 사본 0→0.6 + 1px 룰 scaleX
*/
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* 화면 모드 전환(다크/라이트 토글)은 2026-08-12 세영 지시로 제거했다.
     사이트는 <html data-theme="dark"> 고정으로 나간다.
     base.css 의 :root[data-theme='light'] 블록은 되살릴 때를 위해 남겨 뒀다(현재 미사용). */

  /* ---------- 메인 히어로: 스크롤하면 배경이 어두워진다 ----------
     interwise.co.kr 실측 이식 (2026-08-16 세영 지시 — "레퍼런스의 모션을 100% 똑같이").

     실측 방법: `scratchpad/probe_motion.py` 로 스크롤 y 마다 계산된 값을 읽어 변한 것만 추렸다.
     레퍼런스는 GSAP ScrollTrigger 로 `div.main-inner` 의 **배경색 알파**를 올리고 있었고,
     값이 정확히 선형이었다 — 150=0.25 · 300=0.5 · 450=0.75 · 600=1.0 (이후 유지).
     → alpha = min(1, scrollY / 600). **이징 없음.** 눈대중으로 ease 를 넣지 말 것.

     ⚠ 레퍼런스는 히어로를 pin(고정)한 채 이 구간을 진행한다. 우리는 아직 pin 이 아니라
       히어로가 같이 스크롤된다 — 어두워지는 곡선만 같고 고정 여부는 다르다(세영님 확인 대기). */
  function initHeroDim() {
    var hero = document.querySelector('.hero--iw');
    var dim = hero && hero.querySelector('.hero__dim');
    if (!dim) return;
    var END = 600;               // 실측값. 여기만 고치면 어두워지는 속도가 바뀐다
    var zone = document.querySelector('[data-darkzone]');
    var raf = 0;
    var apply = function () {
      raf = 0;
      var p = window.scrollY / END;
      dim.style.opacity = p < 0 ? 0 : (p > 1 ? 1 : p);
      // 어두운 구간을 지나면 **고정 배경을 끈다.** 안 끄면 fixed 라 화면에 계속 붙어 있고,
      // 아래 섹션은 배경이 투명해서 검은 막이 그대로 비친다(메인 전체가 어두워졌던 원인).
      if (zone) zone.classList.toggle('is-past', zone.getBoundingClientRect().bottom <= 0);
    };
    apply();
    window.addEventListener('scroll', function () {
      // 스크롤마다 스타일을 직접 쓰면 프레임이 밀린다 → rAF 로 한 프레임에 한 번만
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
  }

  /* ---------- 워드마크 밴드: 두 줄이 항상 반대로 흐른다 ----------
     eimokdesign.com 이식 (2026-08-16 세영 지시 — "모션은 알다시피 동일하게").

     ⚠⚠ 처음에 **스크롤 기반으로 잘못 만들었다.** 세영 지적: "레퍼런스 사이트는 스크롤로
        움직이지 않고 항상 움직이고 있어." 스크롤 위치별로 값을 재니 매번 달라 보였던 것은
        재는 동안에도 계속 흐르고 있었기 때문이다.

     스크롤을 고정하고 **시간에 따라** 다시 쟀다(scratchpad/eimok_time.py):
       text1  -87.2 px/s (왼쪽) · text2  +87.2 px/s (오른쪽) — 부호만 반대, 속도는 같다
       -1440 에 닿으면 순환한다 → 이동량 = 화면 폭(1440), 주기 = 1440 / 87.2 ≒ 16.5초
       속도는 24초 넘게 재는 동안 -87.0 ~ -87.8 로 **일정**했다(이징 없음, linear).

     구현은 CSS 애니메이션이고 여기서는 **길이에 맞는 duration 만 넣는다** —
     화면이 좁아도 초당 이동 거리가 같아야 원본과 같은 속도로 보이기 때문이다. */
  function initWordband() {
    var sec = document.querySelector('.txtsec');
    if (!sec) return;
    var lines = Array.prototype.slice.call(sec.querySelectorAll('[data-wb]'));
    if (!lines.length) return;
    var SPEED = 87.2;                    // 실측 px/s
    var apply = function () {
      var w = window.innerWidth || 1440;
      var dur = (w / SPEED).toFixed(2) + 's';
      lines.forEach(function (el) { el.style.animationDuration = dur; });
    };
    apply();
    window.addEventListener('resize', apply);

    /* 배경 캡처를 한 장씩 넘긴다 (2026-08-16 세영: "하나의 이미지를 깔자 · 모션이 들어가며
       다른 이미지로 바뀌고"). 레퍼런스는 영상 한 편이라 그 등가물로 전환을 쓴다.
       ⚠ 두 줄은 **같은 사진**을 공유한다 — 배경은 섹션에 하나뿐이다. */
    var bgs = Array.prototype.slice.call(sec.querySelectorAll('.txtsec__bg'));
    if (bgs.length > 1 && !reduced) {
      var i = 0;
      setInterval(function () {
        // 화면 밖이면 굳이 돌리지 않는다(모바일 배터리·CPU)
        var r = sec.getBoundingClientRect();
        if (r.bottom < 0 || r.top > (window.innerHeight || 900)) return;
        bgs[i].classList.remove('is-on');
        i = (i + 1) % bgs.length;
        // 확대 애니메이션을 매번 처음부터 재생시키려면 클래스를 뗐다 붙이는 것만으로는 부족하다
        var n = bgs[i];
        n.style.animation = 'none';
        void n.offsetWidth;              // 리플로를 한 번 강제해야 애니메이션이 리셋된다
        n.style.animation = '';
        n.classList.add('is-on');
      }, 4200);
    }
  }

  /* ---------- 업종별 제작 행: 방향 인식 마퀴 ----------
     myz-studio.com Works 이식 (2026-08-16 세영 지시). 로컬 클론의 번들에서 원본 로직을 그대로 읽었다.

       const v = { duration: .6, ease: "expo" };
       function x(mx, my, w, h) {                       // 커서가 위/아래 어느 변에 가까운가
         const top = (mx - w/2)**2 + my**2, bot = (mx - w/2)**2 + (my - h)**2;
         return top < bot ? "top" : "bottom";
       }
       mouseenter: .set(mq,{y:dir==="top"?"-101%":"101%"}).set(track,{y:dir==="top"?"101%":"-101%"})
                   .to([mq,track],{y:"0%"})
       mouseleave: .to(mq,{y:dir==="top"?"-101%":"101%"}).to(track,{y:dir==="top"?"101%":"-101%"})
       흐름:       gsap.to(track,{x:-partWidth, duration:15, ease:"none", repeat:-1})
       파트 수:    Math.max(4, Math.ceil(innerWidth / partWidth) + 2)

     ⚠ 마퀴 컨테이너와 트랙이 **서로 반대 방향**에서 출발해 동시에 0 으로 온다. 같은 방향으로 맞추면
       그냥 미끄러져 올라오는 평범한 전환이 되고, 원본의 겹쳐 밀리는 느낌이 사라진다.
     ⚠ GSAP 의 "expo"(=expo.out) 대응 CSS 이징은 cubic-bezier(.16,1,.3,1) 이다. */
  function initBizRows() {
    var rows = Array.prototype.slice.call(document.querySelectorAll('[data-wrow]'));
    if (!rows.length) return;
    var EASE = 'transform .6s cubic-bezier(.16,1,.3,1)';

    var dirOf = function (ev, el) {
      var r = el.getBoundingClientRect();
      var mx = ev.clientX - r.left, my = ev.clientY - r.top;
      var top = Math.pow(mx - r.width / 2, 2) + Math.pow(my, 2);
      var bot = Math.pow(mx - r.width / 2, 2) + Math.pow(my - r.height, 2);
      return top < bot ? 'top' : 'bottom';
    };

    rows.forEach(function (row) {
      var mq = row.querySelector('.wrow__mq');
      // ⚠ 세로 이동은 .wrow__shift 가 맡는다. .wrow__track 은 CSS 애니메이션이 가로 흐름에
      //   쓰고 있어서, 여기에 translateY 를 쓰면 흐름이 통째로 멈춘다(transform 은 한 속성).
      var shift = row.querySelector('.wrow__shift');
      var track = row.querySelector('.wrow__track');
      if (!mq || !shift || !track) return;

      // 파트를 화면 폭이 채워질 만큼 복제한다(원본과 같은 식). 최소 4개.
      var part = track.querySelector('.wrow__part');
      var fill = function () {
        if (!part) return;
        var pw = part.offsetWidth;
        if (!pw) return;
        var need = Math.max(4, Math.ceil(window.innerWidth / pw) + 2);
        while (track.children.length < need) track.appendChild(part.cloneNode(true));
        track.style.setProperty('--parts', track.children.length);
        track.classList.add('wrow__track--run');
      };
      fill();
      window.addEventListener('resize', fill);

      row.addEventListener('mouseenter', function (ev) {
        var d = dirOf(ev, row), a = d === 'top' ? '-101%' : '101%', b = d === 'top' ? '101%' : '-101%';
        mq.style.transition = shift.style.transition = 'none';
        mq.style.transform = 'translateY(' + a + ')';
        shift.style.transform = 'translateY(' + b + ')';
        // 값을 세팅한 프레임과 같은 프레임에서 0 으로 보내면 전환이 생략된다 → 다음 프레임에
        requestAnimationFrame(function () {
          mq.style.transition = shift.style.transition = EASE;
          mq.style.transform = shift.style.transform = 'translateY(0%)';
        });
      });

      row.addEventListener('mouseleave', function (ev) {
        var d = dirOf(ev, row);
        mq.style.transition = shift.style.transition = EASE;
        mq.style.transform = 'translateY(' + (d === 'top' ? '-101%' : '101%') + ')';
        shift.style.transform = 'translateY(' + (d === 'top' ? '101%' : '-101%') + ')';
      });
    });
  }

  /* ---------- 모바일 메뉴 ---------- */
  function initNav() {
    // 스크롤하면 내비에 어두운 띠 (레퍼런스 동작)
    var nav = document.querySelector('.nav');
    if (nav) {
      var onScroll = function () {
        nav.classList.toggle('is-stuck', window.scrollY > 40);
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    // 2뎁스 드롭다운 — 그룹 hover/focus 로 열고, 내비 밖으로 나가면 닫는다
    var groups = Array.prototype.slice.call(document.querySelectorAll('[data-navgroup]'));
    if (nav && groups.length) {
      var openT, closeT;

      var setOpen = function (g) {
        groups.forEach(function (o) {
          var on = o === g;
          o.setAttribute('data-open', on ? 'true' : 'false');
          var a = o.querySelector('.nav__link');
          if (a) a.setAttribute('aria-expanded', on ? 'true' : 'false');
        });
        nav.classList.toggle('is-open', !!g);
      };

      groups.forEach(function (g) {
        g.addEventListener('mouseenter', function () {
          clearTimeout(closeT);
          openT = setTimeout(function () { setOpen(g); }, 60);
        });
        g.addEventListener('focusin', function () {
          clearTimeout(closeT); setOpen(g);
        });
      });

      nav.addEventListener('mouseleave', function () {
        clearTimeout(openT);
        closeT = setTimeout(function () { setOpen(null); }, 180);
      });
      nav.addEventListener('focusout', function (e) {
        if (!nav.contains(e.relatedTarget)) setOpen(null);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        var open = groups.filter(function (g) { return g.getAttribute('data-open') === 'true'; })[0];
        if (!open) return;
        setOpen(null);
        var a = open.querySelector('.nav__link');
        if (a) a.focus();
      });
    }

    var burger = document.querySelector('[data-burger]');
    var panel = document.querySelector('[data-navpanel]');
    if (!burger || !panel) return;
    burger.addEventListener('click', function () {
      var open = panel.getAttribute('data-open') === 'true';
      panel.setAttribute('data-open', open ? 'false' : 'true');
      burger.setAttribute('aria-expanded', open ? 'false' : 'true');
      document.body.style.overflow = open ? '' : 'hidden';
    });
    panel.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        panel.setAttribute('data-open', 'false');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ---------- 텍스트 분해 ---------- */
  // 글자 단위 — 공백은 텍스트 노드로 보존해 "하오웹은" → "하오웹 은" 버그 방지
  function splitChars(el) {
    if (el.dataset.split === 'done') return;
    // <br> 는 줄바꿈으로 보존한다 (통째로 textContent 를 쓰면 사라짐)
    var chunks = el.innerHTML.split(/<br\s*\/?>/i);
    var frag = document.createDocumentFragment();
    chunks.forEach(function (chunk, ci) {
      var tmp = document.createElement('div');
      tmp.innerHTML = chunk;
      var text = tmp.textContent.replace(/\s+/g, ' ').trim();
      text.split(' ').forEach(function (word, wi, arr) {
        var w = document.createElement('span');
        w.style.display = 'inline-block';
        w.style.whiteSpace = 'nowrap';
        Array.prototype.forEach.call(word, function (ch) {
          var s = document.createElement('span');
          s.className = 'ta-char';
          s.textContent = ch;
          w.appendChild(s);
        });
        frag.appendChild(w);
        if (wi < arr.length - 1) frag.appendChild(document.createTextNode(' '));
      });
      if (ci < chunks.length - 1) frag.appendChild(document.createElement('br'));
    });
    el.textContent = '';
    el.appendChild(frag);
    el.dataset.split = 'done';

    var chars = el.querySelectorAll('.ta-char');
    chars.forEach(function (c, i) {
      // 랜덤 스태거(레퍼런스와 동일한 인상) — 순서 기반 + 소량 랜덤
      c.style.transitionDelay = (i * 0.016 + Math.random() * 0.09).toFixed(3) + 's';
    });
  }

  // 줄 단위 — 단어를 감싼 뒤 offsetTop으로 줄을 묶고 마스크 처리
  function splitLines(el) {
    if (el.dataset.splitBase === undefined) el.dataset.splitBase = el.textContent;
    var text = el.dataset.splitBase.replace(/\s+/g, ' ').trim();
    el.textContent = '';

    var probes = [];
    text.split(' ').forEach(function (word, wi, arr) {
      var w = document.createElement('span');
      w.style.display = 'inline-block';
      w.textContent = word;
      el.appendChild(w);
      probes.push(w);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });

    var lines = [];
    var top = null;
    probes.forEach(function (w) {
      var t = w.offsetTop;
      if (top === null || Math.abs(t - top) > 3) { lines.push([]); top = t; }
      lines[lines.length - 1].push(w.textContent);
    });

    el.textContent = '';
    lines.forEach(function (words) {
      var mask = document.createElement('span');
      mask.className = 'ta-mask';
      var line = document.createElement('span');
      line.className = 'ta-line';
      line.textContent = words.join(' ');
      mask.appendChild(line);
      el.appendChild(mask);
    });
    el.querySelectorAll('.ta-line').forEach(function (l, i) {
      l.style.transitionDelay = (i * 0.055).toFixed(3) + 's';
    });
  }

  /* ---------- 등장 관찰 ---------- */
  function initReveal() {
    var animEls = Array.prototype.slice.call(document.querySelectorAll('[data-anim]'));
    var fadeEls = Array.prototype.slice.call(document.querySelectorAll('[data-fade]'));

    if (reduced) {
      animEls.concat(fadeEls).forEach(function (el) { el.dataset.played = 'true'; });
      return;
    }

    animEls.forEach(function (el) {
      if (el.dataset.anim === 'lines') splitLines(el); else splitChars(el);
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var delay = parseFloat(el.dataset.delay || '0');
        setTimeout(function () { el.dataset.played = 'true'; }, delay * 1000);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });

    animEls.concat(fadeEls).forEach(function (el) { io.observe(el); });

    // 히어로는 로드 직후 0.9s 뒤 (레퍼런스 실측). data-delay 가 있으면 그만큼 더 늦춘다.
    // ※ 히어로 요소를 IntersectionObserver 에만 맡기면 안 된다 —
    //   rootMargin 이 화면 하단 12% 를 관찰에서 빼기 때문에, 첫 화면 맨 아래에 있는
    //   CTA 는 threshold(0.15) 를 못 넘겨 스크롤하기 전까지 나타나지 않는다.
    window.addEventListener('load', function () {
      document.querySelectorAll('[data-anim-hero]').forEach(function (el) {
        var d = parseFloat(el.dataset.delay || '0');
        setTimeout(function () { el.dataset.played = 'true'; }, 900 + d * 1000);
      });
    });

    // 줄 분해는 폭이 바뀌면 다시 계산
    var t;
    var lastW = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(t);
      t = setTimeout(function () {
        document.querySelectorAll('[data-anim="lines"]').forEach(function (el) {
          var was = el.dataset.played;
          splitLines(el);
          el.dataset.played = was || 'true';
        });
      }, 220);
    });
  }

  /* ---------- 히어로 캔버스 (방사형 선) ---------- */
  function initHeroCanvas() {
    var cv = document.querySelector('[data-hero-canvas]');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, raf = 0, t0 = performance.now();

    function resize() {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(now) {
      var el = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      var css = getComputedStyle(document.documentElement);
      var fg = css.getPropertyValue('--fg').trim() || '#f4f4f2';
      // 소실점 — 아주 느리게 표류
      var cx = W * 0.5 + Math.sin(el * 0.16) * W * 0.05;
      var cy = H * 0.5 + Math.cos(el * 0.12) * H * 0.05;
      var step = 30;
      var maxD = Math.sqrt(W * W + H * H) / 2;
      ctx.strokeStyle = fg;
      ctx.lineWidth = 1;
      for (var x = step / 2; x < W; x += step) {
        for (var y = step / 2; y < H; y += step) {
          var dx = x - cx, dy = y - cy;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < 6) continue;
          var ux = dx / d, uy = dy / d;
          var len = 5 + (d / maxD) * 26;
          var a = 0.08 + Math.min(d / maxD, 1) * 0.34;
          ctx.globalAlpha = a;
          ctx.beginPath();
          ctx.moveTo(x - ux * len / 2, y - uy * len / 2);
          ctx.lineTo(x + ux * len / 2, y + uy * len / 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', function () { resize(); if (reduced) draw(performance.now()); });
    if (reduced) { draw(performance.now()); } else { raf = requestAnimationFrame(draw); }
  }

  /* ---------- 스크롤 고정 리빌 ---------- */
  function initStickyReveal() {
    var secs = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if (!secs.length) return;

    /* 레퍼런스(myz-studio) clipPath 확대 곡선 — 2026-08-16 **다시 실측**했다.
       ⚠ 예전 값 [[0,.40],[.086,1.98],…] 은 시작이 너무 가팔라(스크롤 8.6% 에 이미 화면 2배)
         첫 화면부터 글자가 꽉 차 보였다. 실제 레퍼런스는 **앞에서 한참 기다린다.**
       실측(scratchpad/myz_curve.py — clipPathUnits=objectBoundingBox 의 path transform):
         p 0.003→0.26 · 0.031→0.26 · 0.114→3.53 · 0.308→14.41 · 0.503→25.29
         0.697→36.18 · 0.892→47.07 · 1.0→53.30
       p≥0.114 구간은 기울기 56.17 의 **정확한 직선**이다(계산으로 확인). */
    var CURVE = [[0, .26], [.031, .26], [.114, 3.53], [.308, 14.41], [.503, 25.29],
                 [.697, 36.18], [.892, 47.07], [1, 53.30]];
    var maskText = document.querySelector('[data-hao-mask]');
    /* 'HAO'(Pretendard 800) 의 글자폭 ÷ font-size. **상수로 박는다.**
       ⚠⚠ 예전에는 매번 getBBox() 로 쟀는데 **값이 불안정했다** — font-size 를 200 으로 고정해
         두었는데도 bbox 가 421 → 208 → 104 로 줄어들며 ratio 를 오염시켰고, 그 결과 scale 이
         1.8 → 186 으로 튀어 글자가 과도하게 커졌다(2026-08-16 실측).
         clip-path 로 쓰이는 요소라 getBBox 가 신뢰할 수 없다. 한 번 제대로 잰 값을 쓴다. */
    var ratio = 2.105;   // font-size 200 에서 실측한 폭 421px */

    function tick() {
      secs.forEach(function (sec) {
        var r = sec.getBoundingClientRect();
        var span = sec.offsetHeight - window.innerHeight;
        var p = clamp(-r.top / (span || 1), 0, 1);

        var frame = sec.querySelector('[data-reveal-frame]');
        var bg = sec.querySelector('[data-reveal-bg]');
        var rule = sec.querySelector('[data-reveal-rule]');
        var copy = sec.querySelector('[data-reveal-copy]');
        var flow = sec.querySelector('[data-reveal-flow]');

        // 'HAO' 글자 마스크가 중앙에서 커진다 — 레퍼런스 clipPath scale 곡선 실측값을 구간 보간
        if (frame && maskText) {
          var s = CURVE[CURVE.length - 1][1];
          for (var i = 1; i < CURVE.length; i++) {
            if (p <= CURVE[i][0]) {
              var a = CURVE[i - 1], b = CURVE[i];
              s = a[1] + (b[1] - a[1]) * ((p - a[0]) / (b[0] - a[0] || 1));
              break;
            }
          }
          var fr = frame.getBoundingClientRect();
          /* ⚠⚠ 예전에는 font-size 를 키웠다. **브라우저 상한에 걸려 깨진다** —
             2026-08-16 실측: font-size 13,198 부터 실제 글자 높이가 11,933 에서 멈추는데
             baseline(y) 은 fs×0.365 로 계속 내려가, 글자 세로 중앙이 515 → 10,987 로
             **아래로 훅 떨어지고** 끝에는 화면(0~900) 밖으로 나가 이미지가 사라졌다
             (세영 지적 "HAO 가 갑자기 아래로 떨어지고, 마지막에 이미지가 남지 않아").
             → 글자 크기는 BASE 로 **고정**하고 **transform scale** 로 키운다.
               레퍼런스도 clipPath 를 scale 하는 방식이라 원리도 같아진다.
             변환 순서: translate(중앙) → scale → translate(0, BASE×.365)
             이러면 확대해도 글자의 세로 중앙이 항상 프레임 중앙에 머문다(수식으로 상쇄된다). */
          var BASE = 200;                       // 마스크 텍스트의 고정 font-size
          var cx = fr.width / 2, cy = fr.height / 2;
          var sc = clamp((fr.width * s) / (BASE * ratio), 0.001, 100000);
          maskText.setAttribute('font-size', BASE);
          maskText.setAttribute('x', 0);
          maskText.setAttribute('y', 0);
          /* ⚠⚠ 확대 중심이 중요하다. 글자 정중앙은 **'A' 의 삼각형 구멍**이라, 커질수록 그 빈
             공간이 화면을 통째로 덮어 **마지막에 이미지가 사라졌다**(세영 지적, 2026-08-16).
             그래서 확대 기준점을 'H' 의 왼쪽 세로획 위로 옮긴다 — 획은 채워진 면이라
             아무리 키워도 화면이 이미지로 남는다.
             OX 는 글자 로컬 좌표(text-anchor:middle 이라 0 이 중앙)에서 그 획까지의 거리다. */
          /* 'HAO'(fs 200)의 폭은 421 이고 text-anchor:middle 이라 글자는 -210~+210 에 놓인다.
             'H' 왼쪽 세로획의 중심은 약 -190 → 그 점을 화면 중앙에 두려면 OX = +190 이다.
             (transform 이 translate(cx,cy)·scale·translate(OX,OY) 순서라
              화면 중앙에 오는 글자 좌표는 px = -OX 가 된다.) */
          var OX = 0.95 * BASE;               // = 190 (BASE 200 기준)
          /* ⚠⚠ 아주 큰 배율에서는 SVG text 를 clip-path 로 쓰는 것이 **렌더링 한계에 부딪혀
             도형이 통째로 사라진다**(2026-08-16: clip 을 끄면 사진이 나오는데 켜면 흰 화면).
             다행히 그 구간에서는 'H' 세로획 하나가 이미 화면을 다 덮는다 —
               획 폭 ≈ 40 × sc  → 1440 을 넘으려면 sc > 36
               글자 높이 238 × sc → 900 을 넘으려면 sc > 3.8
             그래서 sc 가 LIMIT 을 넘으면 마스크를 놓아주고 사진을 그대로 보여 준다.
             화면에 보이는 결과는 같고(이미 획으로 꽉 차 있다) 사진이 사라지지 않는다. */
          var LIMIT = 40;
          if (sc > LIMIT) {
            frame.style.clipPath = 'none';
            frame.style.webkitClipPath = 'none';
          } else {
            frame.style.clipPath = '';
            frame.style.webkitClipPath = '';
          }
          maskText.setAttribute('transform',
            'translate(' + cx.toFixed(1) + ',' + cy.toFixed(1) + ') ' +
            'scale(' + sc.toFixed(4) + ') ' +
            'translate(' + OX.toFixed(1) + ',' + (BASE * 0.365).toFixed(1) + ')');
        }
        // 배경 사본 0 → 0.6
        if (bg) bg.style.opacity = (clamp(p / 0.86, 0, 1) * 0.6).toFixed(3);
        // 1px 룰 중앙에서 확장 (.5 → .85)
        if (rule) rule.style.transform = 'scaleX(' + clamp((p - 0.5) / 0.35, 0, 1).toFixed(3) + ')';
        // 본문 (.68 이후)
        if (copy) copy.dataset.in = p > 0.68 ? 'true' : 'false';
        // 공정 표시는 사진이 다 열린 뒤 (.9 이후) — 본문보다 늦게, 마지막에 한 단계씩
        if (flow) flow.dataset.in = p > 0.9 ? 'true' : 'false';
      });
      raf = requestAnimationFrame(tick);
    }

    var raf = requestAnimationFrame(tick);
  }

  /* ---------- 병원 페이지 — BEFORE DESIGN 블록 등장 (2026-08-14) ----------
     ⚠ `hospital.html` 의 한 섹션 전용. `[data-hosp-row]` 가 없으면 즉시 반환하므로
        나머지 42개 페이지에는 영향이 없다.
     WACUS 는 블록이 화면에 들어올 때 텍스트가 올라오고 이미지가 아래에서 열린다.
     같은 타이밍을 IntersectionObserver 로 재현한다(한 번만). */
  function initHospitalRows() {
    var rows = [].slice.call(document.querySelectorAll('[data-hosp-row]'));
    if (!rows.length) return;
    if (!('IntersectionObserver' in window)) {
      rows.forEach(function (r) { r.dataset.in = 'true'; });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.dataset.in = 'true';
        io.unobserve(e.target);
      });
    }, { threshold: 0.18 });
    rows.forEach(function (r) {
      io.observe(r);
      var b = r.getBoundingClientRect();
      if (b.top < window.innerHeight && b.bottom > 0) { r.dataset.in = 'true'; io.unobserve(r); }
    });
  }

  /* ---------- 병원 페이지 진입 모션 (2026-08-14) ----------
     레퍼런스 이식: soijeong 의 WOW fadeInUp(1s, delay 0.1s 간격) + bravomedi 의 차오르는 축.
     ⚠ `hospital.html` 전용. [data-hin] 이 없으면 즉시 반환하므로 다른 42개 페이지는 영향받지 않는다.
     ⚠ 숨김(opacity:0)은 `html.js-hin` 이 붙었을 때만 걸린다 — JS 가 죽거나 관찰자가 빗나가도
       섹션이 통째로 사라지지 않게 하기 위한 것이다(예전에 실제로 겪은 사고). */
  function initHospital() {
    var els = [].slice.call(document.querySelectorAll('[data-hin]'));
    if (!els.length) return;

    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.setAttribute('data-in', 'true'); });
      return;
    }

    document.documentElement.classList.add('js-hin');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.setAttribute('data-in', 'true');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 한 줄 진단 진입 (2026-08-14) ----------
     업종 페이지의 `[data-quick]` 에 사이트 주소를 넣으면 그대로 무료 제안 폼으로 넘긴다.
     레퍼런스(pointweb)의 "URL만 주시면 담당자가 직접 봅니다" 를 우리 방식으로 옮긴 것이다.
     ⚠ 접수 기능이 아직 없으므로 **여기서 접수하는 척하지 않는다** — 값을 들고 폼으로 이동만 한다.
     받는 쪽(`free-proposal`)에서는 같은 함수가 ?site= 를 읽어 '현재 홈페이지 주소'를 채운다.
     두 요소 모두 없으면 즉시 반환하므로 다른 페이지에는 영향이 없다. */
  function initQuick() {
    var forms = [].slice.call(document.querySelectorAll('[data-quick]'));
    // 받는 쪽은 두 곳이다 — 무료 진단(diagnosis) 과 무료 제안(free-proposal).
    // 둘은 다른 서비스다: 진단은 검색·AI 노출을 보고, 제안은 제작 방향과 범위를 잡는다.
    var site = document.getElementById('dg-site') || document.getElementById('fp-site');
    if (!forms.length && !site) return;

    forms.forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = f.querySelector('input');
        var v = input && input.value ? input.value.trim() : '';
        var url = f.getAttribute('data-quick') || 'free-proposal.html';
        window.location.href = v ? url + '?site=' + encodeURIComponent(v) : url;
      });
    });

    if (site && !site.value) {
      var m = /[?&]site=([^&]*)/.exec(window.location.search);
      if (m && m[1]) {
        try { site.value = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (err) { /* 잘못된 인코딩은 무시 */ }
      }
    }
  }

  /* ---------- 리스트 행 마퀴 ---------- */
  function initMarquee() {
    document.querySelectorAll('[data-marquee]').forEach(function (m) {
      var label = m.dataset.marquee;
      if (!label) return;
      var html = '';
      for (var i = 0; i < 8; i++) html += '<span>' + label + '</span>';
      m.innerHTML = html;
    });
  }

  /* ---------- 푸터 워드마크 ---------- */
  function initFooterMark() {
    document.querySelectorAll('[data-mark]').forEach(function (mark) {
      var text = mark.dataset.mark || mark.textContent.trim();
      mark.innerHTML = Array.prototype.map.call(text, function (ch) {
        return '<span>' + ch + '</span>';
      }).join('');
      if (reduced) return;
      var spans = mark.querySelectorAll('span');
      mark.addEventListener('pointermove', function (e) {
        var mr = mark.getBoundingClientRect();
        spans.forEach(function (s) {
          var b = s.getBoundingClientRect();
          var d = Math.abs((b.left + b.width / 2) - e.clientX);
          var f = clamp(1 - d / (mr.width * 0.34), 0, 1);
          s.style.fontWeight = String(Math.round(200 + f * 500));
        });
      });
      mark.addEventListener('pointerleave', function () {
        spans.forEach(function (s) { s.style.fontWeight = ''; });
      });
    });
  }

  /* ---------- 폼 (전송 없음 — 준비 중 고지) ---------- */
  function initForm() {
    document.querySelectorAll('[data-form]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var note = f.querySelector('[data-form-note]');
        if (note) note.hidden = false;
      });
    });
  }

  /* ---------- 고정 상담 탭 ----------
     히어로에는 이미 CTA 두 개가 있으므로 첫 화면에서는 내보내지 않고,
     스크롤이 히어로를 지난 뒤에만 꺼낸다. 푸터에 닿으면 다시 숨긴다 —
     푸터에도 같은 링크가 있어 중복이고, 푸터 위에 겹쳐 뜨는 것도 막는다. */
  function initConsultTab() {
    var tab = document.querySelector('[data-ctab]');
    if (!tab) return;

    var hasIO = 'IntersectionObserver' in window;
    var hero = document.querySelector('.hero, .subhero');
    var useHero = !!(hero && hasIO);
    var heroIn = useHero;       // 히어로가 보이는 동안은 안 꺼낸다 (히어로에 같은 CTA 가 이미 있다)
    var main = document.querySelector('main');

    /* 푸터는 `position: sticky; bottom: 0` 라 항상 화면 안에 걸려 있다.
       그래서 푸터를 IntersectionObserver 로 보면 첫 화면부터 '푸터에 닿음'이 참이 되어
       탭이 영영 안 나왔다 (2026-08-13 발견·수정). 실제로 푸터가 '드러나는' 시점은
       본문(main)이 화면 아래로 다 지나간 때다 — 그 조건으로 바꾼다. */
    function footerShown() {
      return !!main && main.getBoundingClientRect().bottom <= window.innerHeight + 4;
    }

    function sync() {
      var past = useHero ? !heroIn : window.scrollY > 400;
      tab.setAttribute('data-show', past && !footerShown() ? 'true' : 'false');
    }

    if (hasIO && hero) {
      new IntersectionObserver(function (entries) {
        heroIn = entries[0].isIntersecting;
        sync();
      }).observe(hero);
    }

    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
  }

  /* ---------- 단계 타임라인 ----------
     haoc.co.kr 실측: IntersectionObserver(threshold .15) 로 발동해서 250ms 뒤 시작 →
     스텝마다 420ms 간격으로 is-on 을 붙이고 진행선을 그 단계 점 중심까지 채운다.

     ⚠ 원본(haoc)과 다른 점 = **볼 때마다 다시 재생한다** (2026-08-14 세영 지시).
     원본은 `io.unobserve` 로 1회만 재생하고 끝이라, 한 번 지나친 뒤 다시 올라오면
     이미 완성된 상태로 멈춰 있었다. 지금은 화면에서 완전히 벗어나면(ratio 0) 초기화하고
     다시 15% 들어오면 처음부터 재생한다. 되돌리려면 reset() 호출을 빼고 unobserve 를 되살리면 된다.

     초기화를 '완전히 벗어났을 때'로 잡은 이유 — 15% 아래로 내려갈 때 지우면 타임라인이
     화면에 조금 걸쳐 있는 동안 눈앞에서 글자가 사라진다. 안 보이는 동안에만 지워야 한다.
     ※ 1180 이하에서는 CSS 가 `.tstep{opacity:1!important}` 로 모션을 끄므로 화면상 변화가 없다. */
  function initTimeline() {
    var tls = [].slice.call(document.querySelectorAll('[data-timeline]'));
    if (!tls.length) return;

    var reduce = window.matchMedia &&
                 window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var make = function (tl) {
      var steps = [].slice.call(tl.querySelectorAll('.tstep'));
      var fill = tl.querySelector('.timeline__line i');
      var at = -1;
      var timers = [];
      var playing = false;

      /* 원본(haoc)은 마지막 단계에서 선을 100% 까지 채우는데, 점은 각 칸의 왼쪽에 있어서
         마지막 점 오른쪽으로 빈 선이 남는다. 하오웹은 칸 간격이 더 넓어 그게 눈에 띄므로
         채움을 '그 단계 점의 중심'까지로 맞춘다. (점: left 2px + 지름 12 → 중심 +8) */
      var paint = function () {
        if (!fill || at < 0) return;
        fill.style.width = (steps[at].offsetLeft + 8) + 'px';
      };

      var tip = function (s) {
        steps.forEach(function (o) { o.classList.remove('is-tip'); });
        s.classList.add('is-tip');        /* 지금 도달한 단계 = 레드 점 */
      };

      /* 재생 중 화면 밖으로 나가면 남은 타이머가 다음 재생과 겹친다 — 반드시 끊는다 */
      var stop = function () {
        for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
        timers = [];
      };

      var reset = function () {
        if (reduce || !playing) return;    /* reduce 는 모션이 없으니 켜 둔 채로 */
        stop();
        playing = false;
        at = -1;
        steps.forEach(function (s) {
          s.classList.remove('is-on');
          s.classList.remove('is-tip');
        });
        if (fill) fill.style.width = '0px';
      };

      var play = function () {
        if (playing) return;               /* 스크롤 중 콜백이 여러 번 와도 한 번만 */
        playing = true;
        if (reduce) {
          steps.forEach(function (s) { s.classList.add('is-on'); });
          at = steps.length - 1;
          tip(steps[at]);
          paint();
          return;
        }
        stop();
        steps.forEach(function (s, i) {
          timers.push(setTimeout(function () {
            s.classList.add('is-on');
            tip(s);
            at = i;
            paint();
          }, 250 + i * 420));
        });
      };

      /* 예전엔 run() 안에서 붙여 재생할 때마다 리스너가 쌓였다 — 타임라인당 한 번만 붙인다 */
      window.addEventListener('resize', paint);
      return { el: tl, play: play, reset: reset };
    };

    var list = tls.map(make);
    var ctl = function (el) {
      for (var i = 0; i < list.length; i++) if (list[i].el === el) return list[i];
      return null;
    };

    if (!('IntersectionObserver' in window)) {
      list.forEach(function (o) { o.play(); });
      return;
    }
    /* 0 = 완전히 벗어남(초기화), .15 = 발동 — 두 지점 모두에서 콜백을 받아야 한다 */
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var c = ctl(e.target);
        if (!c) return;
        if (!e.isIntersecting) c.reset();
        else if (e.intersectionRatio >= .15) c.play();
      });
    }, { threshold: [0, .15] });
    list.forEach(function (o) { io.observe(o.el); });
  }

  /* ---------- 작업 카드 등장 ----------
     interwise 는 부모에 .on 을 붙여 자식 .motion-1 을 한꺼번에 올린다(스태거 없음). 같은 방식. */
  function initWork() {
    var grids = [].slice.call(document.querySelectorAll('[data-work]'));
    if (!grids.length) return;
    var on = function (g) { g.setAttribute('data-on', 'true'); };
    if (!('IntersectionObserver' in window)) { grids.forEach(on); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        on(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: .15 });
    grids.forEach(function (g) { io.observe(g); });
  }

  /* ---------- 보기 전환 (카드 / 목록) ----------
     interwise 의 그리드·리스트 스위치를 응용했다. 목록 모드는 카드 도입 전의
     리스트 행(.rows + 마퀴)을 그대로 쓴다 — 마크업 두 벌이 다 들어있고 CSS 로 전환한다. */
  function initWorkView() {
    [].slice.call(document.querySelectorAll('[data-workview]')).forEach(function (wrap) {
      var btns = [].slice.call(wrap.querySelectorAll('[data-view-btn]'));
      btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          wrap.setAttribute('data-view', btn.getAttribute('data-view-btn'));
          btns.forEach(function (o) {
            o.setAttribute('aria-pressed', o === btn ? 'true' : 'false');
          });
        });
      });
    });
  }

  /* ---------- FAQ 카테고리 칩 ----------
     아코디언 자체는 <details> 라 JS 가 필요 없다. 여기서는 거르기만 한다. */
  function initFaq() {
    var wrap = document.querySelector('[data-faq]');
    if (!wrap) return;
    var chips = [].slice.call(wrap.querySelectorAll('[data-cat]'));
    var items = [].slice.call(wrap.querySelectorAll('.faq__item'));
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var cat = chip.getAttribute('data-cat');
        chips.forEach(function (c) {
          c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
        });
        items.forEach(function (item) {
          var show = cat === 'all' || item.getAttribute('data-cat') === cat;
          item.hidden = !show;
          if (!show) item.removeAttribute('open');   // 접어두고 숨긴다
        });
      });
    });
  }

  /* ---------- AI VISIBILITY 장면 전환 (SEO / AEO / GEO) ---------- */
  function initViz() {
    [].slice.call(document.querySelectorAll('[data-viz]')).forEach(function (viz) {
      var tabs = [].slice.call(viz.querySelectorAll('[data-viz-tab]'));
      var panels = [].slice.call(viz.querySelectorAll('[data-viz-panel]'));
      var show = function (key) {
        tabs.forEach(function (t) {
          t.setAttribute('aria-pressed', t.getAttribute('data-viz-tab') === key ? 'true' : 'false');
        });
        panels.forEach(function (p) {
          p.setAttribute('data-on', p.getAttribute('data-viz-panel') === key ? 'true' : 'false');
        });
      };
      tabs.forEach(function (t) {
        t.addEventListener('click', function () { show(t.getAttribute('data-viz-tab')); });
      });

      /* 노드가 위에서 아래로 이어지는 모션은 '화면에 들어왔을 때' 한 번 돈다.
         첫 패널은 로드 시점부터 열려 있어서, 이 표시가 없으면 스크롤해 내려오기 전에
         애니메이션이 끝나 버린다. 탭 전환 때는 display:none→block 이 다시 재생시킨다.
         관찰이 안 되는 환경에서는 그냥 켜 둔다 — 애니메이션이 없어도 내용은 다 보인다. */
      if (!('IntersectionObserver' in window)) { viz.setAttribute('data-seen', 'true'); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          viz.setAttribute('data-seen', 'true');
          io.unobserve(e.target);
        });
      }, { threshold: .2 });
      io.observe(viz);
    });
  }

  /* 포트폴리오 필터 (graphic-design · studio). FAQ 칩과 같은 방식이고,
     항목이 많아 숨김은 hidden 속성으로만 한다 — 지우거나 다시 그리지 않는다.
     JS 가 없거나 실패해도 전부 보이는 상태가 기본값이다. */
  function initDesignWork() {
    var wrap = document.querySelector('[data-dwork]');
    if (!wrap) return;
    var chips = [].slice.call(wrap.querySelectorAll('.chip[data-cat]'));
    var items = [].slice.call(wrap.querySelectorAll('.dwork__item'));
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var cat = chip.getAttribute('data-cat');
        chips.forEach(function (c) {
          c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
        });
        items.forEach(function (it) {
          it.hidden = !(cat === 'all' || it.getAttribute('data-cat') === cat);
        });
      });
    });
  }

  /* 포트폴리오 라이트박스 — 카드를 누르면 크게 보이고 오른쪽에 설명이 붙는다.
     ⚠ 이동은 '지금 보이는 카드' 안에서만 한다. 필터를 걸어 놓고 다음으로 넘겼을 때
        숨긴 항목이 튀어나오면 필터가 걸린 것처럼 보이지 않는다. */
  function initLightbox() {
    var grid = document.querySelector('[data-lbox]');
    if (!grid) return;

    var lb = null, imgEl, catEl, titleEl, descEl, rowsEl;
    var list = [], idx = -1, opener = null;

    /* ⚠ 처음부터 DOM 에 넣어 두지 않는다. 빈 `src` 인 <img> 가 검수에서 깨진 이미지로 잡히고,
       모바일에서 문서 폭도 밀었다(2026-08-15 실제로 QA 가 잡아냈다). 열 때 한 번만 만든다. */
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
      '<button type="button" class="lbox__btn lbox__btn--prev" aria-label="이전 작업">&#8249;</button>' +
      '<button type="button" class="lbox__btn lbox__btn--next" aria-label="다음 작업">&#8250;</button>';
    document.body.appendChild(lb);

    imgEl = lb.querySelector('.lbox__img');
    catEl = lb.querySelector('.lbox__cat');
    titleEl = lb.querySelector('.lbox__title');
    descEl = lb.querySelector('.lbox__desc');
    rowsEl = lb.querySelector('.lbox__rows');

    lb.querySelector('.lbox__close').addEventListener('click', close);
    lb.querySelector('.lbox__btn--prev').addEventListener('click', function () { show(idx - 1); });
    lb.querySelector('.lbox__btn--next').addEventListener('click', function () { show(idx + 1); });
    // 배경(어두운 여백)을 눌러도 닫힌다. 이미지·설명 위 클릭은 통과시키지 않는다.
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('lbox__wrap') ||
          e.target.classList.contains('lbox__figure')) close();
    });
    }

    /* 이동 범위 = **그 카드가 놓인 레일 하나**. 분류별로 레일이 나뉘어 있으므로
       다음/이전은 같은 분류 안에서만 돈다(2026-08-16 가로 레일로 바꾸며 정리).
       레일이 없는 구조(예전 그리드)에서는 섹션 전체가 범위가 된다. */
    function shown(card) {
      var scope = (card && card.closest) ? (card.closest('[data-rail]') || grid) : grid;
      return [].slice.call(scope.querySelectorAll('.dwork__item')).filter(function (c) {
        return !c.hidden;
      });
    }

    function row(label, value) {
      return value ? '<div><b>' + label + '</b><span>' + value + '</span></div>' : '';
    }

    function show(i) {
      if (!list.length) return;
      idx = (i % list.length + list.length) % list.length;
      var c = list[idx];
      var img = c.querySelector('img');
      imgEl.src = c.getAttribute('data-large') || img.getAttribute('src');
      imgEl.alt = img.getAttribute('alt') || '';
      catEl.textContent = (c.querySelector('.dwork__c') || {}).textContent || '';
      titleEl.textContent = (c.querySelector('.dwork__t') || {}).textContent || '';
      descEl.textContent = c.getAttribute('data-desc') || '';
      rowsEl.innerHTML =
        row('제작물', c.getAttribute('data-deliver')) +
        row('작업 범위', c.getAttribute('data-scope')) +
        row('진행', '하오웹에서 직접 제작') +
        '<div><b>문의</b><span><a href="inquiry.html">제작 문의하기 &rarr;</a></span></div>';
      lb.querySelector('.lbox__info').scrollTop = 0;
    }

    function open(card) {
      if (!lb) build();
      list = shown(card);
      var i = list.indexOf(card);
      if (i < 0) return;
      opener = card;
      lb.classList.add('is-open');
      document.body.classList.add('lbox-open');
      show(i);
      lb.querySelector('.lbox__close').focus();
    }

    function close() {
      if (!lb) return;
      lb.classList.remove('is-open');
      document.body.classList.remove('lbox-open');
      if (opener) opener.focus();
      opener = null;
    }

    grid.addEventListener('click', function (e) {
      var card = e.target.closest ? e.target.closest('.dwork__item') : null;
      if (card) open(card);
    });
    document.addEventListener('keydown', function (e) {
      if (!lb || !lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  function start() {
    initNav();
    initHeroDim();
    initBizRows();
    initWordband();
    initReveal();
    initHeroCanvas();
    initStickyReveal();
    initMarquee();
    initFooterMark();
    initForm();
    initConsultTab();
    initTimeline();
    initHospitalRows();
    initHospital();
    initQuick();
    initWork();
    initWorkView();
    initDesignWork();
    initLightbox();
    initFaq();
    initViz();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
