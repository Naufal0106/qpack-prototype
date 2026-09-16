/**
 * animations.js — Modul Animasi Scroll
 * Menambahkan kelas .anim-fade-up pada elemen-elemen kunci dan memicu visibilitasnya saat di-scroll
 */

export function initScrollAnimations() {
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  // Daftar selektor elemen yang ingin diberi animasi
  const animTargets = [
    '.section-header',
    '.visi-misi-card',
    '.staff-card',
    '.layanan-card',
    '.content-card'
  ];

  animTargets.forEach(selector => {
    $$(selector).forEach(el => el.classList.add('anim-fade-up'));
  });

  if (!('IntersectionObserver' in window)) {
    $$('.anim-fade-up').forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  $$('.anim-fade-up').forEach(el => observer.observe(el));
}
