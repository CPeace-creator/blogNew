type AvatarState = 'loading' | 'ready' | 'error';

/** Keep the placeholder, interaction and accessibility states in sync. */
export function setAvatarPresentation(companion: HTMLElement, state: AvatarState) {
  const ready = state === 'ready';
  companion.dataset.state = state;
  companion.setAttribute('aria-busy', String(state === 'loading'));
  companion.querySelector<HTMLButtonElement>('[data-avatar-greet]')!.disabled = !ready;
  companion.querySelector<HTMLElement>('[data-avatar-actions]')!.hidden = !ready;
  companion.querySelector<HTMLButtonElement>('[data-avatar-retry]')!.hidden = state !== 'error';
  if (ready) return;

  companion.querySelector<HTMLElement>('[data-avatar-loading-title]')!.textContent = state === 'error'
    ? '车模暂未加载成功' : '车模正在准备中';
  companion.querySelector<HTMLElement>('[data-avatar-loading-detail]')!.textContent = state === 'error'
    ? '可以重新加载，或继续逛逛。' : '稍等片刻，马上停靠。';
}
