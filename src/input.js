// Design Ref: §10.3 — pointerdown/pointerup long-press pattern, longPressTriggered flag
// Plan SC: FR-04, FR-05, FR-06, FR-07, FR-08 — all button and keyboard bindings

const LONG_PRESS_MS = 500;

function bindButton(el, { onTap, onLongPress }) {
  let timer = null;
  let longPressTriggered = false;

  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    longPressTriggered = false;
    if (onLongPress) {
      timer = setTimeout(() => {
        longPressTriggered = true;
        el.classList.add('pressing');
        onLongPress();
      }, LONG_PRESS_MS);
    }
  });

  el.addEventListener('pointerup', () => {
    clearTimeout(timer);
    el.classList.remove('pressing');
    if (!longPressTriggered) onTap?.();
    longPressTriggered = false;
  });

  el.addEventListener('pointerleave', () => {
    clearTimeout(timer);
    el.classList.remove('pressing');
    longPressTriggered = false;
  });

  // Prevent context menu on long-press (mobile)
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

// callbacks: { onLeft, onRight, onRotate, onHardDrop, onSoftDrop, onPause }
export function initInput(callbacks) {
  const { onLeft, onRight, onRotate, onHardDrop, onSoftDrop, onPause } = callbacks;

  const btnLeft   = document.getElementById('btn-left');
  const btnRotate = document.getElementById('btn-rotate');
  const btnRight  = document.getElementById('btn-right');

  if (btnLeft)   bindButton(btnLeft,   { onTap: onLeft });
  if (btnRight)  bindButton(btnRight,  { onTap: onRight });
  if (btnRotate) bindButton(btnRotate, { onTap: onRotate, onLongPress: onHardDrop });

  // Keyboard — arrow keys + space + P/Escape
  document.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'ArrowLeft':  e.preventDefault(); onLeft?.();      break;
      case 'ArrowRight': e.preventDefault(); onRight?.();     break;
      case 'ArrowUp':    e.preventDefault(); onRotate?.();    break;
      case 'ArrowDown':  e.preventDefault(); onSoftDrop?.();  break;
      case 'Space':      e.preventDefault(); onHardDrop?.();  break;
      case 'KeyP':
      case 'Escape':     e.preventDefault(); onPause?.();     break;
    }
  });
}
