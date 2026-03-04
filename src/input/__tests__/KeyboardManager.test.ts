/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KeyboardManager } from '../KeyboardManager';
import { InputMapper } from '../InputMapper';
import { DASManager } from '../DASManager';
import { GameAction } from '../../engine';

describe('KeyboardManager', () => {
  let inputMapper: InputMapper;
  let dasManager: DASManager;
  let actionCallback: ReturnType<typeof vi.fn>;
  let keyboardManager: KeyboardManager;

  beforeEach(() => {
    inputMapper = new InputMapper();
    dasManager = new DASManager();
    actionCallback = vi.fn();
    keyboardManager = new KeyboardManager(inputMapper, dasManager, actionCallback);
    keyboardManager.attach();
  });

  afterEach(() => {
    keyboardManager.detach();
  });

  function fireKeyDown(code: string, repeat = false): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      code,
      repeat,
      bubbles: true,
      cancelable: true,
    });
    vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);
    return event;
  }

  function fireKeyUp(code: string): KeyboardEvent {
    const event = new KeyboardEvent('keyup', {
      code,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
    return event;
  }

  // 1. Immediate actions fire callback directly
  it('fires callback directly for HARD_DROP (immediate action)', () => {
    fireKeyDown('Space');
    expect(actionCallback).toHaveBeenCalledWith(GameAction.HARD_DROP);
  });

  it('fires callback directly for ROTATE_CW (immediate action)', () => {
    fireKeyDown('ArrowUp');
    expect(actionCallback).toHaveBeenCalledWith(GameAction.ROTATE_CW);
  });

  it('fires callback directly for ROTATE_CCW (immediate action)', () => {
    fireKeyDown('KeyZ');
    expect(actionCallback).toHaveBeenCalledWith(GameAction.ROTATE_CCW);
  });

  it('fires callback directly for ROTATE_180 (immediate action)', () => {
    fireKeyDown('KeyA');
    expect(actionCallback).toHaveBeenCalledWith(GameAction.ROTATE_180);
  });

  it('fires callback directly for HOLD (immediate action)', () => {
    fireKeyDown('ShiftLeft');
    expect(actionCallback).toHaveBeenCalledWith(GameAction.HOLD);
  });

  it('fires callback directly for HOLD via KeyC (immediate action)', () => {
    fireKeyDown('KeyC');
    expect(actionCallback).toHaveBeenCalledWith(GameAction.HOLD);
  });

  it('fires callback directly for PAUSE (immediate action)', () => {
    fireKeyDown('Escape');
    expect(actionCallback).toHaveBeenCalledWith(GameAction.PAUSE);
  });

  // 2. DAS actions go through DASManager
  it('sends MOVE_LEFT to DASManager, not callback', () => {
    const spy = vi.spyOn(dasManager, 'onKeyDown');
    fireKeyDown('ArrowLeft');
    expect(spy).toHaveBeenCalledWith(GameAction.MOVE_LEFT);
    expect(actionCallback).not.toHaveBeenCalled();
  });

  it('sends MOVE_RIGHT to DASManager, not callback', () => {
    const spy = vi.spyOn(dasManager, 'onKeyDown');
    fireKeyDown('ArrowRight');
    expect(spy).toHaveBeenCalledWith(GameAction.MOVE_RIGHT);
    expect(actionCallback).not.toHaveBeenCalled();
  });

  it('sends SOFT_DROP to DASManager, not callback', () => {
    const spy = vi.spyOn(dasManager, 'onKeyDown');
    fireKeyDown('ArrowDown');
    expect(spy).toHaveBeenCalledWith(GameAction.SOFT_DROP);
    expect(actionCallback).not.toHaveBeenCalled();
  });

  it('calls DASManager.onKeyUp on key release for DAS actions', () => {
    const spy = vi.spyOn(dasManager, 'onKeyUp');
    fireKeyDown('ArrowLeft');
    fireKeyUp('ArrowLeft');
    expect(spy).toHaveBeenCalledWith(GameAction.MOVE_LEFT);
  });

  // 3. OS key repeat (e.repeat) is rejected
  it('ignores OS key repeat events (e.repeat=true)', () => {
    const spy = vi.spyOn(dasManager, 'onKeyDown');
    fireKeyDown('ArrowLeft', true);
    expect(spy).not.toHaveBeenCalled();
    expect(actionCallback).not.toHaveBeenCalled();
  });

  it('ignores OS key repeat for immediate actions too', () => {
    fireKeyDown('Space', true);
    expect(actionCallback).not.toHaveBeenCalled();
  });

  // 4. Unmapped keys are ignored
  it('ignores unmapped keys on keydown', () => {
    const spy = vi.spyOn(dasManager, 'onKeyDown');
    fireKeyDown('KeyQ');
    expect(spy).not.toHaveBeenCalled();
    expect(actionCallback).not.toHaveBeenCalled();
  });

  it('ignores unmapped keys on keyup', () => {
    const spy = vi.spyOn(dasManager, 'onKeyUp');
    fireKeyUp('KeyQ');
    expect(spy).not.toHaveBeenCalled();
  });

  // 5. preventDefault called for mapped keys
  it('calls preventDefault for mapped keys on keydown', () => {
    const event = fireKeyDown('ArrowLeft');
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('calls preventDefault for immediate mapped keys on keydown', () => {
    const event = fireKeyDown('Space');
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('does not call preventDefault for unmapped keys', () => {
    const event = fireKeyDown('KeyQ');
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  // 6. detach removes listeners and releases DAS
  it('detach removes keydown listener', () => {
    keyboardManager.detach();

    fireKeyDown('Space');
    expect(actionCallback).not.toHaveBeenCalled();
  });

  it('detach calls releaseAll on DASManager', () => {
    const spy = vi.spyOn(dasManager, 'releaseAll');
    keyboardManager.detach();
    expect(spy).toHaveBeenCalled();
  });

  it('detach removes keyup listener', () => {
    const spy = vi.spyOn(dasManager, 'onKeyUp');
    keyboardManager.detach();

    fireKeyUp('ArrowLeft');
    expect(spy).not.toHaveBeenCalled();
  });

  // 7. blur releases all DAS
  it('blur event calls releaseAll on DASManager', () => {
    const spy = vi.spyOn(dasManager, 'releaseAll');
    window.dispatchEvent(new Event('blur'));
    expect(spy).toHaveBeenCalled();
  });

  it('detach removes blur listener', () => {
    const spy = vi.spyOn(dasManager, 'releaseAll');
    keyboardManager.detach();
    spy.mockClear();

    window.dispatchEvent(new Event('blur'));
    // releaseAll was called once by detach, not by blur
    expect(spy).not.toHaveBeenCalled();
  });
});
