/* Publication search, year navigation, and full-figure viewing. */
(() => {
  'use strict';

  function initPublications() {
    const sections = [...document.querySelectorAll('.publication-year')];
    const papers = [...document.querySelectorAll('article.paper')];
    const yearLinks = [...document.querySelectorAll('.year-nav a[data-year]')];
    const search = document.querySelector('#paper-search');
    const clearSearch = document.querySelector('#search-clear');
    const noResults = document.querySelector('#no-results');
    const resetSearch = document.querySelector('#reset-search');
    const viewer = document.querySelector('#paper-viewer');
    if (!papers.length || !search || !viewer) return;

    const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const searchableText = new Map(papers.map(paper => [paper, normalize([
      paper.dataset.year,
      ...[...paper.querySelectorAll('.paper-title, .paper-authors, .paper-venues, .paper-award')]
        .map(element => element.textContent)
    ].join(' '))]));
    const back = viewer.querySelector('.viewer-back');
    const previous = viewer.querySelector('.viewer-previous');
    const next = viewer.querySelector('.viewer-next');
    const year = viewer.querySelector('.viewer-year');
    const figure = viewer.querySelector('.viewer-figure img');
    const details = viewer.querySelector('.viewer-details');
    const loading = viewer.querySelector('.viewer-loading');
    const error = viewer.querySelector('.viewer-error');
    let visiblePapers = papers;
    let currentIndex = -1;
    let opener = null;
    let activeYearFrame = 0;
    let imageRequest = 0;

    function updateActiveYear() {
      activeYearFrame = 0;
      const visibleSections = sections.filter(section => !section.hidden);
      let activeSection = visibleSections[0];
      for (const section of visibleSections) {
        if (section.getBoundingClientRect().top <= 180) activeSection = section;
        else break;
      }
      yearLinks.forEach(link => {
        const active = Boolean(activeSection && link.dataset.year === activeSection.dataset.year);
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }

    function scheduleActiveYear() {
      if (!activeYearFrame) activeYearFrame = requestAnimationFrame(updateActiveYear);
    }

    function filterPapers() {
      const query = normalize(search.value.trim());
      const words = query.split(/\s+/).filter(Boolean);
      const counts = new Map();
      visiblePapers = papers.filter(paper => {
        const matches = words.every(word => searchableText.get(paper).includes(word));
        paper.hidden = !matches;
        if (matches) counts.set(paper.dataset.year, (counts.get(paper.dataset.year) || 0) + 1);
        return matches;
      });
      sections.forEach(section => {
        const count = counts.get(section.dataset.year) || 0;
        section.hidden = !count;
      });
      yearLinks.forEach(link => {
        const count = counts.get(link.dataset.year) || 0;
        link.classList.toggle('is-disabled', count === 0);
        link.tabIndex = count ? 0 : -1;
        if (count) link.removeAttribute('aria-disabled');
        else link.setAttribute('aria-disabled', 'true');
      });
      clearSearch.hidden = !search.value;
      noResults.hidden = visiblePapers.length !== 0;
      scheduleActiveYear();
    }

    function resetFilter() {
      search.value = '';
      filterPapers();
      search.focus({ preventScroll: true });
    }

    function loadFigure(source, title) {
      const request = ++imageRequest;
      figure.hidden = true;
      figure.alt = title;
      loading.hidden = false;
      loading.textContent = 'Loading figure…';
      error.hidden = true;
      const image = new Image();
      image.onload = () => {
        if (request !== imageRequest) return;
        figure.src = image.src;
        figure.hidden = false;
        loading.hidden = true;
      };
      image.onerror = () => {
        if (request !== imageRequest) return;
        loading.hidden = true;
        error.textContent = 'This figure could not be loaded. Try reopening this figure.';
        error.hidden = false;
      };
      image.src = source;
    }

    function showPaper(index) {
      if (index < 0 || index >= visiblePapers.length) return;
      currentIndex = index;
      const paper = visiblePapers[index];
      const image = paper.querySelector('.paper-image img');
      const content = paper.querySelector('.paper-details').cloneNode(true);
      content.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
      const heading = content.querySelector('.paper-title');
      heading.id = 'viewer-title';
      const title = heading.textContent.trim();
      details.replaceChildren(content);
      viewer.setAttribute('aria-labelledby', 'viewer-title');
      year.textContent = paper.dataset.year;
      previous.disabled = index === 0;
      next.disabled = index === visiblePapers.length - 1;
      previous.setAttribute('aria-label', 'Previous publication');
      next.setAttribute('aria-label', 'Next publication');
      const source = image.dataset.fullImage || image.currentSrc || image.src;
      loadFigure(source, title);
      viewer.scrollTop = 0;
    }

    function openViewer(paper, button) {
      const index = visiblePapers.indexOf(paper);
      if (index === -1) return;
      opener = button;
      showPaper(index);
      document.body.classList.add('viewer-is-open');
      viewer.showModal();
      back.focus({ preventScroll: true });
    }

    papers.forEach(paper => {
      const button = paper.querySelector('button.paper-image');
      const thumbnail = button && button.querySelector('img');
      if (thumbnail) {
        const recover = () => {
          if (thumbnail.dataset.originalImage && !thumbnail.dataset.retried) {
            thumbnail.dataset.retried = 'true';
            thumbnail.src = thumbnail.dataset.originalImage;
          } else {
            thumbnail.style.visibility = 'hidden';
            button.classList.add('image-unavailable');
          }
        };
        thumbnail.addEventListener('error', recover);
        if (thumbnail.complete && !thumbnail.naturalWidth) recover();
      }
      if (button) button.addEventListener('click', () => openViewer(paper, button));
    });
    search.addEventListener('input', filterPapers);
    clearSearch.addEventListener('click', resetFilter);
    resetSearch.addEventListener('click', resetFilter);
    yearLinks.forEach(link => {
      link.addEventListener('click', event => {
        if (link.getAttribute('aria-disabled') === 'true') event.preventDefault();
      });
    });
    window.addEventListener('scroll', scheduleActiveYear, { passive: true });
    window.addEventListener('resize', scheduleActiveYear, { passive: true });
    back.addEventListener('click', () => viewer.close());
    previous.addEventListener('click', () => showPaper(currentIndex - 1));
    next.addEventListener('click', () => showPaper(currentIndex + 1));
    viewer.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
          event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'ArrowLeft' && currentIndex > 0) {
        event.preventDefault();
        showPaper(currentIndex - 1);
      } else if (event.key === 'ArrowRight' && currentIndex < visiblePapers.length - 1) {
        event.preventDefault();
        showPaper(currentIndex + 1);
      }
    });
    let pointerStartedOnBackdrop = false;
    function outsideDialog(event) {
      const rect = viewer.getBoundingClientRect();
      return event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom;
    }
    viewer.addEventListener('pointerdown', event => {
      pointerStartedOnBackdrop = event.target === viewer && outsideDialog(event);
    });
    viewer.addEventListener('click', event => {
      if (pointerStartedOnBackdrop && event.target === viewer && outsideDialog(event)) viewer.close();
      pointerStartedOnBackdrop = false;
    });
    viewer.addEventListener('close', () => {
      imageRequest += 1;
      document.body.classList.remove('viewer-is-open');
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      scheduleActiveYear();
    });
    filterPapers();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPublications, { once: true });
  else initPublications();
})();
