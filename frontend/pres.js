(function () {
  'use strict';

  /* ── Navbar: scroll shadow + active link ─────────────────── */
  const navbar = document.getElementById('navbar');

  function onScroll() {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Highlight active nav link
    const sections = ['quienes-somos', 'que-es', 'objetivos', 'descarga'];
    let current = '';
    sections.forEach(function (id) {
      const el = document.getElementById(id);
      if (el && window.scrollY >= el.offsetTop - 100) {
        current = id;
      }
    });
    document.querySelectorAll('.nav-link').forEach(function (link) {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Mobile hamburger ────────────────────────────────────── */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  hamburger.addEventListener('click', function () {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
  });

  // Close mobile menu on link click
  mobileMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
    });
  });

  /* ── Smooth scroll for all anchor links ──────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  /* ── Intersection Observer: fade-in on scroll ────────────── */
  const fadeEls = document.querySelectorAll('.fade-in');

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '-60px 0px' }
  );

  fadeEls.forEach(function (el) {
    observer.observe(el);
  });

  // Hero content is visible immediately (no scroll needed)
  document.querySelectorAll('.hero .fade-in').forEach(function (el) {
    el.classList.add('visible');
  });

  /* ── APK button: wire up download link ───────────────────── */
  const apkBtn = document.getElementById('apk-btn');
  // TODO: replace '#' with the actual APK download URL
  // apkBtn.href = 'https://your-cdn.com/zoom-explorer.apk';
  apkBtn.addEventListener('click', function (e) {
    if (apkBtn.getAttribute('href') === '#') {
      e.preventDefault();
      alert('El enlace de descarga estará disponible próximamente.');
    }
  });

})();