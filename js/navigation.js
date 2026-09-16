/**
 * navigation.js — Modul Navigasi Utama
 * Menangani Hamburger Menu, Dropdowns, Scroll Shadow, dan Active States
 */

export function initNavigation() {
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  // --- Hamburger Menu ---
  const hamburgerBtn = $('#hamburger-btn');
  const navMenu      = $('#nav-menu');
  const navOverlay   = $('#nav-overlay');

  if (hamburgerBtn && navMenu && navOverlay) {
    const openMenu = () => {
      hamburgerBtn.classList.add('is-active');
      hamburgerBtn.setAttribute('aria-expanded', 'true');
      navMenu.classList.add('is-open');
      navOverlay.classList.add('is-visible');
      document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      hamburgerBtn.classList.remove('is-active');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      navMenu.classList.remove('is-open');
      navOverlay.classList.remove('is-visible');
      document.body.style.overflow = '';

      $$('.navbar__item--dropdown.is-open').forEach(item => {
        item.classList.remove('is-open');
        const toggle = $('.navbar__dropdown-toggle', item);
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    };

    hamburgerBtn.addEventListener('click', () => {
      const isOpen = navMenu.classList.contains('is-open');
      isOpen ? closeMenu() : openMenu();
    });

    navOverlay.addEventListener('click', closeMenu);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('is-open')) {
        closeMenu();
        hamburgerBtn.focus();
      }
    });

    $$('.navbar__dropdown-link, .navbar__link:not(.navbar__dropdown-toggle)', navMenu)
      .forEach(link => {
        link.addEventListener('click', closeMenu);
      });
  }

  // --- Dropdown Toggle ---
  const dropdownItems = $$('.navbar__item--dropdown');
  dropdownItems.forEach(item => {
    const toggle = $('.navbar__dropdown-toggle', item);
    if (!toggle) return;

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = item.classList.contains('is-open');

      dropdownItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('is-open');
          const otherToggle = $('.navbar__dropdown-toggle', otherItem);
          if (otherToggle) otherToggle.setAttribute('aria-expanded', 'false');
        }
      });

      if (isOpen) {
        item.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar__item--dropdown')) {
      dropdownItems.forEach(item => {
        item.classList.remove('is-open');
        const toggle = $('.navbar__dropdown-toggle', item);
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // --- Navbar Scroll Shadow ---
  const header = $('#site-header');
  if (header) {
    let ticking = false;
    const updateNavbar = () => {
      if (window.scrollY > 10) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateNavbar);
        ticking = true;
      }
    }, { passive: true });

    updateNavbar();
  }

  // --- Smooth Scroll ---
  const NAVBAR_HEIGHT = 72;
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const targetId = link.getAttribute('href');
    if (targetId === '#' || targetId === '#!') return;

    const targetEl = document.querySelector(targetId);
    if (!targetEl) return;

    e.preventDefault();
    const targetTop = targetEl.getBoundingClientRect().top + window.scrollY - NAVBAR_HEIGHT - 16;
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });
  });

  // --- Active Section Highlight ---
  const sections = $$('main section[id]');
  const navLinks = $$('.navbar__link[href*="#"]');
  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(link => link.classList.remove('navbar__link--active'));
          const activeLink = navLinks.find(link => {
            const href = link.getAttribute('href');
            return href.includes(`#${entry.target.id}`);
          });
          if (activeLink) activeLink.classList.add('navbar__link--active');
        }
      });
    }, {
      rootMargin: '-30% 0px -65% 0px',
      threshold: 0,
    });

    sections.forEach(section => sectionObserver.observe(section));
  }
}
