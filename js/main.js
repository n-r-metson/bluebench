
  // Nav scroll state — independent of the reveal system below.
  try {
    const nav = document.getElementById('nav');
    const onScroll = () => { nav.dataset.scrolled = window.scrollY > 40 ? 'true' : 'false'; };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  } catch (e) { /* nav still works without scrolled-state styling */ }

  // Deck request modal
  function openDeckModal() {
    try {
      const modal = document.getElementById('deckModal');
      const formView = document.getElementById('deckModalFormView');
      const successView = document.getElementById('deckModalSuccessView');
      formView.hidden = false;
      successView.hidden = true;
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      const firstInput = document.getElementById('deckName');
      if (firstInput) { setTimeout(() => firstInput.focus(), 50); }
    } catch (e) { /* if the modal can't open, the mailto fallback below still works */ }
  }

  function closeDeckModal() {
    try {
      const modal = document.getElementById('deckModal');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    } catch (e) { /* no-op */ }
  }

  // Paste the Apps Script Web App URL here once deployed (see Code.gs setup notes).
  // Leave as-is and the form will still show a success message locally, but
  // submissions won't be recorded or emailed until this is set.
  const SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxZakr47Gt1Qjut8Zav5yJaHzgEqFA4KgdJXfEmTo7SFhiDu1dbx6cASYrWdoy7SCuH/exec';

  function submitDeckForm(event) {
    event.preventDefault();
    try {
      const formView = document.getElementById('deckModalFormView');
      const successView = document.getElementById('deckModalSuccessView');
      const submitBtn = document.querySelector('#deckRequestForm .deck-modal__submit');

      const payload = {
        name: document.getElementById('deckName').value,
        email: document.getElementById('deckEmail').value,
        company: document.getElementById('deckCompany').value,
        source: window.location.hostname || 'bluebench.uk'
      };

      const isConfigured = SHEETS_WEBHOOK_URL && SHEETS_WEBHOOK_URL.indexOf('PASTE_YOUR') === -1;

      if (isConfigured) {
        if (submitBtn) { submitBtn.disabled = true; }
        // Apps Script web apps don't return CORS headers we can read from the
        // browser, so we fire with no-cors and treat the request as sent —
        // Apps Script still receives and processes it server-side either way.
        // Form-urlencoded (via URLSearchParams) is used instead of a JSON
        // string body: Apps Script reads this reliably into e.parameter,
        // whereas a raw JSON body in e.postData.contents can go missing
        // across the redirect a /exec URL issues under some browsers.
        const formBody = new URLSearchParams(payload);
        fetch(SHEETS_WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formBody.toString()
        }).catch(function () { /* no-cors gives no visibility into failures either */ })
          .finally(function () {
            if (submitBtn) { submitBtn.disabled = false; }
            formView.hidden = true;
            successView.hidden = false;
          });
      } else {
        // Webhook not configured yet — still show success so the UI can be
        // reviewed, but nothing is actually sent anywhere.
        formView.hidden = true;
        successView.hidden = false;
      }
    } catch (e) { /* no-op */ }
    return false;
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeDeckModal(); }
  });

  // Scroll-reveal: content is visible by default (see .reveal in CSS).
  // Only after confirming IntersectionObserver exists do we opt elements
  // into the hidden-then-revealed state, so a failure here never hides
  // real content — worst case, the animation simply doesn't play.
  try {
    if ('IntersectionObserver' in window) {
      const revealEls = document.querySelectorAll('.reveal');
      const STAGGER_MS = 80;

      revealEls.forEach(el => el.classList.add('reveal-ready'));

      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const siblings = Array.from(el.parentElement.children).filter(c => c.classList.contains('reveal'));
          const groupIndex = siblings.indexOf(el);
          const delay = groupIndex > 0 ? groupIndex * STAGGER_MS : 0;
          setTimeout(() => el.classList.add('is-visible'), delay);
          io.unobserve(el);
        });
      }, { threshold: 0.01, rootMargin: '0px 0px 120px 0px' });

      revealEls.forEach(el => io.observe(el));

      // process chain border/dot activation (visual only, not visibility)
      const processRows = document.querySelectorAll('.process__row');
      const pio = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            pio.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      processRows.forEach(el => pio.observe(el));
    }
  } catch (e) {
    // If anything above fails, elements never received .reveal-ready,
    // so they remain at their default visible state from CSS.
    console.warn('Scroll-reveal animation disabled:', e);
  }
