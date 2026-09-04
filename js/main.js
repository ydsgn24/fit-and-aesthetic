(function () {
  var preloader = document.getElementById('preloader');
  var counterEl = document.getElementById('preloaderCounter');
  var hero = document.querySelector('.hero');

  if (!preloader || !counterEl || !hero) return;

  var DURATION = 2200;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function reveal() {
    preloader.classList.add('is-hidden');
    hero.classList.add('is-revealed');

    var cleaned = false;
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      if (preloader.parentNode) {
        preloader.parentNode.removeChild(preloader);
      }
    }
    preloader.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, 1200);
  }

  if (prefersReducedMotion) {
    counterEl.textContent = '100%';
    reveal();
    return;
  }

  var start = null;

  function tick(now) {
    if (start === null) start = now;
    var elapsed = now - start;
    var progress = Math.min(elapsed / DURATION, 1);
    var eased = 1 - Math.pow(1 - progress, 3);
    var value = Math.round(eased * 100);

    counterEl.textContent = value + '%';

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      reveal();
    }
  }

  requestAnimationFrame(tick);
})();

/* === Scroll-driven word reveal (darkens grey text word by word) === */
(function () {
  var containers = Array.prototype.slice.call(document.querySelectorAll('.word-reveal'));
  if (!containers.length) return;

  var entries = containers
    .map(function (el) {
      return { el: el, words: Array.prototype.slice.call(el.querySelectorAll('.word')) };
    })
    .filter(function (entry) { return entry.words.length; });

  if (!entries.length) return;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    entries.forEach(function (entry) {
      entry.words.forEach(function (word) { word.classList.add('is-dark'); });
    });
    return;
  }

  var ticking = false;

  function update() {
    ticking = false;
    var startTrigger = window.innerHeight * 0.85;
    var endTrigger = window.innerHeight * 0.35;
    var maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
    var atBottom = window.scrollY >= maxScrollY - 1;

    entries.forEach(function (entry) {
      var rect = entry.el.getBoundingClientRect();
      var progress = (startTrigger - rect.top) / (startTrigger - endTrigger);
      progress = Math.max(0, Math.min(1, progress));

      // Near the end of the page there may not be enough scroll room left
      // to carry an element through the full trigger window — treat
      // reaching the bottom of the document as completion instead.
      if (atBottom && rect.top < startTrigger) {
        progress = 1;
      }

      var revealCount = Math.round(progress * entry.words.length);
      for (var i = 0; i < entry.words.length; i++) {
        if (i < revealCount) {
          entry.words[i].classList.add('is-dark');
        } else {
          entry.words[i].classList.remove('is-dark');
        }
      }
    });
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

/* === Reveal-on-scroll (blur-in for images) === */
(function () {
  var els = Array.prototype.slice.call(document.querySelectorAll('.reveal-io'));
  if (!els.length) return;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  // Cards inside a horizontally-scrolling gallery (.procedures__list) sit
  // clipped by their ancestor's overflow-x — dragging the gallery changes how
  // much of a card is inside that clip, which the IntersectionObserver reads
  // as an intersection-ratio change just like a vertical scroll would. Left
  // per-card, that replays the blur/translateY reveal on every drag, which
  // looks like the photo jumping. So the whole gallery reveals together, keyed
  // off the list's own (vertical) entry into view, instead of per-card.
  var singles = [];
  var galleries = [];

  els.forEach(function (el) {
    var list = el.closest('.procedures__list');
    if (!list) {
      singles.push(el);
      return;
    }
    var group = galleries.filter(function (g) { return g.list === list; })[0];
    if (!group) {
      group = { list: list, els: [] };
      galleries.push(group);
    }
    group.els.push(el);
  });

  var observer = new IntersectionObserver(function (observerEntries) {
    observerEntries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      var group = galleries.filter(function (g) { return g.list === entry.target; })[0];
      if (group) {
        group.els.forEach(function (el) { el.classList.add('is-visible'); });
      } else {
        entry.target.classList.add('is-visible');
      }
    });
  }, { threshold: 0.15 });

  singles.forEach(function (el) { observer.observe(el); });
  galleries.forEach(function (group) { observer.observe(group.list); });
})();

/* === CTA dark mark: draws the FA glyph in along its own outline, then fills —
   independent of the generic reveal-io fade running on the same element. === */
(function () {
  var marks = Array.prototype.slice.call(document.querySelectorAll('.cta-dark__mark'));
  if (!marks.length) return;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var instances = marks.map(function (svg) {
    var paths = Array.prototype.slice.call(svg.querySelectorAll('.cta-dark__mark-path'));
    paths.forEach(function (path) {
      var length = path.getTotalLength();
      path.style.strokeDasharray = length;
      path.style.strokeDashoffset = length;
    });
    return { svg: svg, paths: paths };
  });

  function draw(inst) {
    inst.svg.classList.add('is-drawn');
    inst.paths.forEach(function (path) { path.style.strokeDashoffset = 0; });
  }

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    instances.forEach(draw);
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      var inst = instances.filter(function (i) { return i.svg === entry.target; })[0];
      if (inst) draw(inst);
    });
  }, { threshold: 0.15 });

  instances.forEach(function (inst) { observer.observe(inst.svg); });
})();

/* === Carousels (procedures, specialists, ...): scroll progress bar === */
(function () {
  var carousels = Array.prototype.slice.call(document.querySelectorAll('.procedures'));

  carousels.forEach(function (carousel) {
    var list = carousel.querySelector('.procedures__list');
    var thumb = carousel.querySelector('.procedures__progress-thumb');
    if (!list || !thumb) return;

    var ticking = false;

    function update() {
      ticking = false;
      var scrollWidth = list.scrollWidth;
      var clientWidth = list.clientWidth;
      var scrollLeft = list.scrollLeft;
      var maxScroll = scrollWidth - clientWidth;

      var widthPercent = Math.min(100, (clientWidth / scrollWidth) * 100);
      var leftPercent = maxScroll > 0
        ? (scrollLeft / maxScroll) * (100 - widthPercent)
        : 0;

      thumb.style.width = widthPercent + '%';
      thumb.style.left = leftPercent + '%';
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    list.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  });
})();

/* === Filter chips: single-select toggle === */
(function () {
  var groups = Array.prototype.slice.call(document.querySelectorAll('.filters'));

  groups.forEach(function (group) {
    var chips = Array.prototype.slice.call(group.querySelectorAll('.filter-chip'));

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('is-selected'); });
        chip.classList.add('is-selected');
      });
    });
  });
})();

/* === Equipment carousel: infinite loop — sides are never empty === */
(function () {
  var track = document.getElementById('equipmentTrack');
  var nameEl = document.getElementById('equipmentName');
  var nextBtn = document.getElementById('equipmentNextBtn');
  if (!track || !nameEl) return;

  var slides = Array.prototype.slice.call(track.querySelectorAll('.equipment__slide'));
  var lists = Array.prototype.slice.call(document.querySelectorAll('.equipment__list'));
  var NAMES = { bbl: 'Soon BBL Hero', elixir: 'Elixir MD' };

  var BUFFER_SHIFT = 4; // half the slide count — same item repeats every 2, so this lands on an identical slide
  var EDGE_LOW = 1;
  var EDGE_HIGH = slides.length - 2;

  var activeIndex = 3; // a 'bbl' slide, roughly centered in the buffer
  var suppressScroll = false;

  function setActive(index) {
    activeIndex = index;
    var key = slides[index].getAttribute('data-item');
    slides.forEach(function (slide, i) {
      slide.classList.toggle('is-active', i === index);
    });
    nameEl.textContent = NAMES[key] || '';
    lists.forEach(function (list) {
      list.hidden = list.getAttribute('data-list-for') !== key;
    });
  }

  function stepWidth() {
    var a = slides[0].getBoundingClientRect();
    var b = slides[1].getBoundingClientRect();
    return (b.left + b.width / 2) - (a.left + a.width / 2);
  }

  function applyTransforms(live) {
    var trackRect = track.getBoundingClientRect();
    var centerX = trackRect.left + trackRect.width / 2;
    var closestIndex = activeIndex;
    var closestDist = Infinity;

    slides.forEach(function (slide, i) {
      var rect = slide.getBoundingClientRect();
      var slideCenter = rect.left + rect.width / 2;
      var dist = Math.abs(slideCenter - centerX);
      var maxDist = trackRect.width / 2 + rect.width / 2;
      var t = Math.min(1, dist / maxDist);
      var scale = 1 - t * 0.35;
      var blur = t * 3.25;

      // While the finger/wheel is actively driving scroll, applyTransforms
      // runs every rAF tick — with the CSS transition left on, each of those
      // per-frame updates restarts a fresh 0.35s ease on top of one still
      // playing, so scale/blur perpetually lag and rubber-band behind the
      // real scroll position instead of tracking it. Cut the transition for
      // these live updates; keep it for discrete jumps (recenter, click a
      // slide, the "Листай" button) where an eased settle looks intentional.
      slide.style.transition = live ? 'none' : '';

      // translateZ(0) keeps every slide on its own GPU layer from the very
      // first paint — without it, the browser only promotes a slide once a
      // transform/filter transition first actually runs, which is exactly
      // the (expensive, janky) first couple of scroll gestures.
      slide.style.transform = 'scale(' + scale.toFixed(3) + ') translateZ(0)';
      slide.style.filter = t < 0.02 ? 'blur(0)' : 'blur(' + blur.toFixed(2) + 'px)';

      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    });

    if (closestIndex !== activeIndex) {
      setActive(closestIndex);
    }
    return closestIndex;
  }

  function recenterIfNearEdge() {
    var index = applyTransforms();
    if (index <= EDGE_LOW || index >= EDGE_HIGH) {
      var shift = index <= EDGE_LOW ? BUFFER_SHIFT : -BUFFER_SHIFT;
      suppressScroll = true;
      // Scroll-snap fights an instant scrollLeft jump that doesn't land
      // exactly on a snap point, correcting itself right after and reading as
      // a second, jerky hop. Suspending it for the jump avoids that fight.
      track.style.scrollSnapType = 'none';
      track.scrollLeft += shift * stepWidth();
      setActive(index + shift);
      applyTransforms();
      requestAnimationFrame(function () {
        track.style.scrollSnapType = '';
        suppressScroll = false;
      });
    }
  }

  var ticking = false;
  var settleTimer = null;
  function scheduleRecenter() {
    clearTimeout(settleTimer);
    // Touch/trackpad momentum keeps moving scrollLeft well after the last
    // scroll event fires — recentering against the buffer while that's still
    // in flight fights the native inertia and jerks. Poll until scrollLeft
    // actually stops changing before doing the buffer math.
    var lastLeft = track.scrollLeft;
    function check() {
      if (suppressScroll) return;
      if (track.scrollLeft === lastLeft) {
        recenterIfNearEdge();
      } else {
        lastLeft = track.scrollLeft;
        settleTimer = setTimeout(check, 80);
      }
    }
    settleTimer = setTimeout(check, 100);
  }
  function onScroll() {
    if (suppressScroll) return;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        applyTransforms(true);
      });
    }
    scheduleRecenter();
  }

  var scrollAnimationId = 0;

  function animateScrollLeft(from, to, duration, onComplete) {
    var myId = ++scrollAnimationId;
    var start = null;
    function step(now) {
      if (myId !== scrollAnimationId) return; // a newer animation took over
      if (start === null) start = now;
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      track.scrollLeft = from + (to - from) * eased;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else if (onComplete) {
        onComplete();
      }
    }
    requestAnimationFrame(step);
  }

  function scrollToSlide(index) {
    var target = slides[index];
    if (!target) return;
    var trackRect = track.getBoundingClientRect();
    var targetRect = target.getBoundingClientRect();
    var delta = (targetRect.left + targetRect.width / 2) - (trackRect.left + trackRect.width / 2);
    var from = track.scrollLeft;
    var to = from + delta;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      track.scrollLeft = to;
      setActive(index);
      applyTransforms();
    } else {
      animateScrollLeft(from, to, 450, function () {
        setActive(index);
        applyTransforms();
      });
    }
  }

  track.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    suppressScroll = true;
    scrollToSlideInstant(activeIndex);
    suppressScroll = false;
    applyTransforms();
  });

  function scrollToSlideInstant(index) {
    var target = slides[index];
    if (!target) return;
    var trackRect = track.getBoundingClientRect();
    var targetRect = target.getBoundingClientRect();
    var delta = (targetRect.left + targetRect.width / 2) - (trackRect.left + trackRect.width / 2);
    track.scrollLeft += delta;
  }

  slides.forEach(function (slide, i) {
    slide.addEventListener('click', function () {
      if (i !== activeIndex) scrollToSlide(i);
    });
  });

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      scrollToSlide(activeIndex + 1);
    });
  }

  suppressScroll = true;
  scrollToSlideInstant(activeIndex);
  suppressScroll = false;
  setActive(activeIndex);
  applyTransforms();
})();

/* === FAQ accordion: classic single-open behavior === */
(function () {
  var list = document.getElementById('faqList');
  if (!list) return;

  var items = Array.prototype.slice.call(list.querySelectorAll('.faq-item'));

  function closeItem(item) {
    var answer = item.querySelector('.faq-item__answer');
    var button = item.querySelector('.faq-item__question');
    item.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    answer.style.height = '0px';
  }

  function openItem(item) {
    var answer = item.querySelector('.faq-item__answer');
    var button = item.querySelector('.faq-item__question');
    item.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    answer.style.height = answer.scrollHeight + 'px';
  }

  items.forEach(function (item) {
    var button = item.querySelector('.faq-item__question');
    button.addEventListener('click', function () {
      var isOpen = item.classList.contains('is-open');
      items.forEach(closeItem);
      if (!isOpen) {
        openItem(item);
      }
    });
  });
})();

