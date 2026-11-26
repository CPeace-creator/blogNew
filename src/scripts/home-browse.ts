const browse = document.querySelector<HTMLElement>('[data-home-browse]');
if (browse) {
  const tabs = [...browse.querySelectorAll<HTMLAnchorElement>('[data-home-tab]')];
  const panels = [...browse.querySelectorAll<HTMLElement>('[data-home-panel]')];
  const list = browse.querySelector<HTMLElement>('[data-home-tabs]')!;
  const bar = browse.querySelector<HTMLElement>('.home-desk-bar')!;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';
  let current = '';

  function select(id: string, scroll = false) {
    if (!tabs.some(tab => tab.dataset.homeTab === id)) return;
    const changed = current !== id;
    current = id;
    tabs.forEach(tab => {
      const active = tab.dataset.homeTab === id;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.dataset.homePanel !== id; });
    if (changed) document.dispatchEvent(new CustomEvent('home-panel-change', { detail: { id } }));
    if (scroll) {
      // A single scroll target keeps the tabs in reach, including when the old
      // panel was taller than the new one. Normal document scrolling is retained.
      bar.scrollIntoView({ block: 'start', behavior: reduced() ? 'instant' : 'smooth' });
    }
  }
  list.setAttribute('role', 'tablist');
  tabs.forEach(tab => {
    const id = tab.dataset.homeTab!;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', id === 'studio' ? 'home-panel-studio' : 'articles');
    tab.addEventListener('keydown', event => {
      const index = tabs.indexOf(tab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : -1;
      if (next < 0) return;
      event.preventDefault();
      tabs[next].focus({ preventScroll: true });
      activate(tabs[next].dataset.homeTab!);
    });
  });
  panels.forEach(panel => {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `home-tab-${panel.dataset.homePanel}`);
    panel.tabIndex = 0;
  });
  function activate(id: string) {
    if (location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
    select(id, true);
  }
  // Welcome links, the reading cue, and navigation links all open the proper
  // panel before scrolling. Deep links and Back/Forward use the same state.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (!link || link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return;
    const id = url.hash.slice(1);
    if (id !== 'studio' && id !== 'articles') return;
    event.preventDefault();
    activate(id);
  });
  function restore() {
    if (location.hash === '#articles' || location.hash === '#studio') select(location.hash.slice(1), true);
    else select('studio');
  }
  window.addEventListener('hashchange', restore);
  window.addEventListener('popstate', restore);
  browse.dataset.enhanced = 'true';
  restore();
}
