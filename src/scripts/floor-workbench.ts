import {
  FLOOR_DATES, FLOOR_DEFAULT_STEP, FLOOR_EXAMPLE_PACKAGE_KEY, FLOOR_PACKAGES, FLOOR_PACKAGE_BY_ELEMENT, FLOOR_STATUSES,
  getFloorMeasurement, getFloorSnapshot, getFloorTodoStatus,
  type FloorColorMode, type FloorPackage,
} from '../lib/floor-demo';
import type { FloorAxis, FloorScene } from './standard-floor';

const TODO_LABELS = { open: '待处理', due: '当日到期', overdue: '已逾期', closed: '已完成' };
const QUANTITY = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 });

export function bindFloorWorkbench(root: HTMLElement) {
  const get = <T extends HTMLElement = HTMLElement>(name: string) => root.querySelector<T>(`[data-floor-${name}]`)!;
  const all = <T extends HTMLElement = HTMLElement>(name: string) => [...root.querySelectorAll<T>(`[data-floor-${name}]`)];
  const load = get<HTMLButtonElement>('load');
  const modelUrl = root.dataset.model;
  const range = get<HTMLInputElement>('time');
  const play = get<HTMLButtonElement>('play');
  const isolate = get<HTMLButtonElement>('isolate');
  const color = get<HTMLSelectElement>('color');
  const axis = get<HTMLSelectElement>('axis');
  const section = get<HTMLInputElement>('section');
  const search = get<HTMLFormElement>('search');
  const searchField = search.querySelector<HTMLInputElement>('input')!;
  const dialog = get<HTMLDialogElement>('dialog');
  const dates = all<HTMLButtonElement>('day');
  const filters = all<HTMLButtonElement>('filter');
  const rows = all('row');
  const zones = all<HTMLDetailsElement>('zone');
  const mapButtons = all<HTMLButtonElement>('map');
  const tabs = all<HTMLButtonElement>('tab');
  const panels = all('panel');
  const setText = (name: string, text: string) => { get(name).textContent = text; };

  let scene: FloorScene | undefined;
  let disposed = false;
  let step: number = FLOOR_DEFAULT_STEP;
  let activePackage: FloorPackage | undefined;
  let elementId = '';
  let activeTab = 'progress';
  let isolated = false;
  let filter = 'all';
  let query = '';
  let timer: ReturnType<typeof setInterval> | undefined;

  function matches(item: FloorPackage) {
    if (filter === 'behind' && getFloorSnapshot(item, step).status !== 'behind') return false;
    const todo = getFloorTodoStatus(item, step);
    if (filter === 'due' && todo !== 'due' && todo !== 'overdue') return false;
    return !query || item.key.toLowerCase().includes(query) || item.label.toLowerCase().includes(query)
      || item.elementIds.some((id) => id.includes(query));
  }

  function renderDetails() {
    setText('selection', activePackage?.label ?? (elementId ? '构件详情' : '部位详情'));
    setText('element', elementId
      ? `构件 #${elementId}${activePackage ? '' : ' · 暂无关联记录'}`
      : activePackage ? `关联 ${activePackage.elementIds.length} 个构件` : '选择一个作业面查看记录。');
    get('tabs').hidden = !activePackage;
    tabs.forEach((tab) => tab.setAttribute('aria-pressed', String(tab.dataset.floorTab === activeTab)));
    panels.forEach((panel) => { panel.hidden = !activePackage || panel.dataset.floorPanel !== activeTab; });
    if (!activePackage) return;

    const { plan, actual, delta, status } = getFloorSnapshot(activePackage, step);
    setText('plan', `${plan}%`);
    setText('actual', `${actual}%`);
    setText('delta', `${delta > 0 ? '+' : ''}${delta} 个百分点`);
    get('delta').dataset.status = status;
    get<HTMLMeterElement>('meter').value = actual;
    setText('progress-note', FLOOR_STATUSES[status].label);

    const measurement = getFloorMeasurement(activePackage, step);
    setText('contract', QUANTITY.format(measurement.contract));
    setText('period', QUANTITY.format(measurement.period));
    setText('cumulative', QUANTITY.format(measurement.cumulative));

    const { document, todo } = activePackage;
    const hasDocument = document.date <= FLOOR_DATES[step];
    get('document').hidden = !hasDocument;
    setText('document-note', hasDocument ? `${document.title} · ${document.date}` : '截至此日期暂无归档资料。');
    setText('todo', todo.title);
    setText('todo-meta', `${TODO_LABELS[getFloorTodoStatus(activePackage, step)]} · ${todo.assignee} · 截止 ${todo.due}`);
  }

  function renderWorkbench(locate = false) {
    const matching = FLOOR_PACKAGES.filter(matches);
    const matchingKeys = new Set(matching.map((item) => item.key));
    const filtering = filter !== 'all' || !!query;
    if (filtering && (!activePackage || !matchingKeys.has(activePackage.key))) {
      activePackage = undefined;
      elementId = '';
      isolated = false;
    }

    rows.forEach((row) => {
      const item = FLOOR_PACKAGES.find(({ key }) => key === row.dataset.floorRow)!;
      const { status } = getFloorSnapshot(item, step);
      row.hidden = !matchingKeys.has(item.key);
      row.querySelector('button')!.setAttribute('aria-pressed', String(item === activePackage));
      const dot = row.querySelector<HTMLElement>('[data-floor-package-dot]')!;
      dot.style.setProperty('--swatch', FLOOR_STATUSES[status].color);
      row.querySelector('[data-floor-package-status]')!.textContent = FLOOR_STATUSES[status].label;
    });
    zones.forEach((zone) => {
      zone.hidden = !zone.querySelector('[data-floor-row]:not([hidden])');
      if (!zone.hidden && (filtering || zone.querySelector('[aria-pressed="true"]'))) zone.open = true;
    });
    filters.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.floorFilter === filter && !query)));
    get('results').hidden = !filtering;
    setText('results', matching.length ? `找到 ${matching.length} 个作业面。` : '该日期没有符合条件的作业面。');

    mapButtons.forEach((button) => {
      const item = FLOOR_PACKAGES.find(({ key }) => key === button.dataset.floorMap)!;
      const { actual, status } = getFloorSnapshot(item, step);
      button.disabled = !matchingKeys.has(item.key);
      button.setAttribute('aria-pressed', String(item === activePackage));
      button.style.setProperty('--swatch', FLOOR_STATUSES[status].color);
      button.querySelector('[data-floor-map-status]')!.textContent = FLOOR_STATUSES[status].label;
      button.querySelector('[data-floor-map-actual]')!.textContent = `实际 ${actual}%`;
    });
    get('record-link').hidden = !activePackage;

    const highlightIds = activePackage?.elementIds ?? (elementId ? [elementId] : []);
    const visibleIds = isolated ? highlightIds : filtering ? matching.flatMap((item) => item.elementIds) : null;
    scene?.setVisible(visibleIds ? new Set(visibleIds) : null);
    scene?.select(highlightIds, locate);
    isolate.disabled = !highlightIds.length;
    isolate.setAttribute('aria-pressed', String(isolated));
    isolate.lastChild!.textContent = isolated ? ' 取消隔离' : ' 隔离所选';
    get('highlight').hidden = !highlightIds.length;
    get('view-state').hidden = !scene || (!isolated && !filtering);
    setText('view-state', isolated ? '已隔离所选' : matching.length ? `当前显示 ${matching.length} 个匹配作业面` : '没有匹配构件，请切换日期或查询条件');
    renderDetails();
  }

  function setStep(value: number) {
    step = value;
    const date = FLOOR_DATES[step];
    range.value = String(step);
    range.setAttribute('aria-valuetext', date);
    const displayed = get<HTMLTimeElement>('date');
    displayed.dateTime = date;
    displayed.textContent = date;
    const behind = FLOOR_PACKAGES.filter((item) => getFloorSnapshot(item, step).status === 'behind').length;
    setText('summary', behind ? `${behind} 个作业面落后` : '所有作业面均未落后');
    dates.forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.floorDay) === step)));
    scene?.setStep(step);
    renderWorkbench();
  }

  function pause() {
    clearInterval(timer);
    timer = undefined;
    play.textContent = '播放进度';
  }

  play.addEventListener('click', () => {
    if (timer !== undefined) return pause();
    if (step === FLOOR_DATES.length - 1) setStep(0);
    play.textContent = '暂停播放';
    timer = setInterval(() => {
      setStep(step + 1);
      if (step === FLOOR_DATES.length - 1) pause();
    }, 1350);
  });

  function scrub(value: number) {
    pause();
    setStep(value);
  }

  range.addEventListener('input', () => scrub(range.valueAsNumber));
  dates.forEach((button) => button.addEventListener('click', () => scrub(Number(button.dataset.floorDay))));

  function choose(item: FloorPackage | undefined, id: string, locate: boolean) {
    activePackage = item;
    elementId = id;
    if (!item && !id) isolated = false;
    renderWorkbench(locate);
  }

  all<HTMLButtonElement>('package').forEach((button) => button.addEventListener('click', () => {
    choose(FLOOR_PACKAGES.find(({ key }) => key === button.dataset.floorPackage), '', true);
  }));
  mapButtons.forEach((button) => button.addEventListener('click', () => {
    choose(FLOOR_PACKAGES.find(({ key }) => key === button.dataset.floorMap), '', true);
  }));
  const exampleLink = document.querySelector<HTMLAnchorElement>('[data-floor-example]');
  exampleLink?.addEventListener('click', () => {
    pause();
    filter = 'all';
    query = '';
    searchField.value = '';
    isolated = false;
    activeTab = 'progress';
    activePackage = FLOOR_PACKAGES.find(({ key }) => key === FLOOR_EXAMPLE_PACKAGE_KEY);
    elementId = '';
    setStep(FLOOR_DEFAULT_STEP);
  });
  tabs.forEach((button) => button.addEventListener('click', () => {
    activeTab = button.dataset.floorTab!;
    renderDetails();
  }));
  filters.forEach((button) => button.addEventListener('click', () => {
    filter = button.dataset.floorFilter!;
    query = '';
    searchField.value = '';
    isolated = false;
    renderWorkbench();
  }));
  search.addEventListener('submit', (event) => {
    event.preventDefault();
    filter = 'all';
    isolated = false;
    query = searchField.value.trim().toLowerCase().replace(/^#/, '');
    const exact = FLOOR_PACKAGE_BY_ELEMENT.get(query);
    const results = query ? FLOOR_PACKAGES.filter(matches) : [];
    if (exact) choose(exact, query, true);
    else if (results.length === 1) choose(results[0], '', true);
    else renderWorkbench();
  });

  get('document').addEventListener('click', () => {
    const documentRecord = activePackage?.document;
    if (!documentRecord || documentRecord.date > FLOOR_DATES[step]) return;
    pause();
    setText('document-title', documentRecord.title);
    setText('document-date', `${documentRecord.date} · 演示资料`);
    const fields = documentRecord.fields.map(([label, content]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const value = document.createElement('dd');
      term.textContent = label;
      value.textContent = content;
      row.append(term, value);
      return row;
    });
    get('document-fields').replaceChildren(...fields);
    dialog.showModal();
  });

  color.addEventListener('change', () => {
    scene?.setColorMode(color.value as FloorColorMode);
    all('legend').forEach((legend) => { legend.hidden = legend.dataset.floorLegend !== color.value; });
  });
  isolate.addEventListener('click', () => {
    isolated = !isolated;
    renderWorkbench(isolated);
  });
  function applySection() {
    get('section-control').hidden = !axis.value;
    section.setAttribute('aria-valuetext', `${section.value}%`);
    scene?.setSection((axis.value || null) as FloorAxis | null, section.valueAsNumber / 100);
  }
  axis.addEventListener('change', applySection);
  section.addEventListener('input', applySection);
  get('reset').addEventListener('click', () => scene?.reset());

  load.addEventListener('click', async () => {
    if (!modelUrl) return;
    load.disabled = true;
    setText('feedback', '正在载入标准层模型…');
    try {
      const { mountStandardFloor } = await import('./standard-floor');
      if (disposed) return;
      scene = await mountStandardFloor(get('viewport'), modelUrl, (id) => {
        choose(FLOOR_PACKAGE_BY_ELEMENT.get(id), id, false);
      }, (event) => {
        if (event.lengthComputable) {
          const percent = Math.round(100 * event.loaded / event.total);
          setText('feedback', percent < 100 ? `正在下载模型 ${percent}%` : '正在准备三维场景…');
        }
      });
      if (disposed) {
        scene.dispose();
        return;
      }
      scene.setStep(step);
      scene.setColorMode(color.value as FloorColorMode);
      root.dataset.floorReady = '';
      get('start').hidden = true;
      get('tools').hidden = false;
      renderWorkbench();
      color.focus({ preventScroll: true });
    } catch (error) {
      console.warn('Standard floor model could not load', error);
      setText('feedback', '模型加载失败。请检查浏览器的 WebGL 支持后重试，或从示意图查看记录。');
      load.disabled = false;
    }
  });

  addEventListener('pagehide', (event) => {
    pause();
    if (event.persisted) return;
    disposed = true;
    scene?.dispose();
  });
  setStep(FLOOR_DEFAULT_STEP);
}
