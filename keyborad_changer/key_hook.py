"""
macOS Key Hook Module
CGEventTap を使用して、左右の Alt (Option) または Command キーの単押し（空打ち）を検知し、
macOS標準の「英数（0x66）」および「かな（0x68）」キーイベントを生成・送信します。
"""

import sys
import threading

try:
    from Quartz import (
        CGEventTapCreate,
        CGEventTapEnable,
        CFMachPortCreateRunLoopSource,
        CFRunLoopGetCurrent,
        CFRunLoopAddSource,
        CFRunLoopRun,
        CFRunLoopStop,
        kCFRunLoopCommonModes,
        kCGSessionEventTap,
        kCGHeadInsertEventTap,
        kCGEventTapOptionDefault,
        kCGEventFlagsChanged,
        kCGEventKeyDown,
        kCGEventKeyUp,
        kCGEventMaskBit,
        CGEventGetFlags,
        CGEventGetIntegerValueField,
        CGEventCreateKeyboardEvent,
        CGEventPost,
        kCGHIDEventTap,
        kCGKeyboardEventKeycode,
        kCGEventFlagMaskAlternate,
        kCGEventFlagMaskCommand,
    )
except ImportError:
    # macOS以外の環境（Windows等でコード閲覧・編集時）のフォールバック定義
    # エディタの未定義警告（赤線エラー）を防止します
    CGEventTapCreate = None
    CGEventTapEnable = None
    CFMachPortCreateRunLoopSource = None
    CFRunLoopGetCurrent = None
    CFRunLoopAddSource = None
    CFRunLoopRun = None
    CFRunLoopStop = None
    kCFRunLoopCommonModes = None
    kCGSessionEventTap = 0
    kCGHeadInsertEventTap = 0
    kCGEventTapOptionDefault = 0
    kCGEventFlagsChanged = 12
    kCGEventKeyDown = 10
    kCGEventKeyUp = 11
    kCGEventMaskBit = lambda x: 1 << x
    CGEventGetFlags = lambda e: 0
    CGEventGetIntegerValueField = lambda e, f: 0
    CGEventCreateKeyboardEvent = None
    CGEventPost = None
    kCGHIDEventTap = 0
    kCGKeyboardEventKeycode = 9
    kCGEventFlagMaskAlternate = 0x00080000
    kCGEventFlagMaskCommand = 0x00100000

# macOS JIS Keyboard Codes
VK_JIS_EISU = 0x66  # 英数キー
VK_JIS_KANA = 0x68  # かなキー

# Modifier Key Codes
VK_LEFT_OPTION = 0x3A   # 左 Alt (Option)
VK_RIGHT_OPTION = 0x3D  # 右 Alt (Option)
VK_LEFT_COMMAND = 0x37  # 左 Win (Command)
VK_RIGHT_COMMAND = 0x36 # 右 Win (Command)


class MacKeyHook:
    def __init__(self, use_option=True):
        """
        :param use_option: Trueなら左右Alt(Option)キーを英数/かなに割り当て。
                           Falseなら左右Win(Command)キーを割り当て。
        """
        self.use_option = use_option
        self.target_left_vk = VK_LEFT_OPTION if use_option else VK_LEFT_COMMAND
        self.target_right_vk = VK_RIGHT_OPTION if use_option else VK_RIGHT_COMMAND

        self.target_flag_mask = (
            kCGEventFlagMaskAlternate if use_option else kCGEventFlagMaskCommand
        )

        self.left_down = False
        self.right_down = False
        self.left_comb = False
        self.right_comb = False

        self.tap = None
        self.run_loop_source = None
        self.run_loop = None
        self.thread = None
        self.is_running = False

    def send_key(self, vk_code):
        """英数 (0x66) または かな (0x68) のキーイベントを送信"""
        try:
            # Key Down
            event_down = CGEventCreateKeyboardEvent(None, vk_code, True)
            CGEventPost(kCGHIDEventTap, event_down)

            # Key Up
            event_up = CGEventCreateKeyboardEvent(None, vk_code, False)
            CGEventPost(kCGHIDEventTap, event_up)
        except Exception as e:
            print(f"[Error] Failed to post key event: {e}")

    def _event_callback(self, proxy, event_type, event, refcon):
        try:
            keycode = CGEventGetIntegerValueField(event, kCGKeyboardEventKeycode)
            flags = CGEventGetFlags(event)

            # 他のキーが押された（同時押し・ショートカット）
            if event_type == kCGEventKeyDown:
                if self.left_down:
                    self.left_comb = True
                if self.right_down:
                    self.right_comb = True
                return event

            # 修飾キーの状態変化 (FlagsChanged)
            if event_type == kCGEventFlagsChanged:
                is_flag_active = bool(flags & self.target_flag_mask)

                # 左キー (左Alt / Option)
                if keycode == self.target_left_vk:
                    if is_flag_active:
                        # 押された
                        self.left_down = True
                        self.left_comb = False
                    else:
                        # 離された
                        if self.left_down:
                            self.left_down = False
                            if not self.left_comb:
                                # 単押し判定 -> 英数に切り替え
                                self.send_key(VK_JIS_EISU)
                                print("[KeyHook] Left Alt tapped -> Switched to Eisu (English)")

                # 右キー (右Alt / Option)
                elif keycode == self.target_right_vk:
                    if is_flag_active:
                        # 押された
                        self.right_down = True
                        self.right_comb = False
                    else:
                        # 離された
                        if self.right_down:
                            self.right_down = False
                            if not self.right_comb:
                                # 単押し判定 -> かなに切り替え
                                self.send_key(VK_JIS_KANA)
                                print("[KeyHook] Right Alt tapped -> Switched to Kana (Japanese)")

        except Exception as e:
            print(f"[Error in callback] {e}")

        return event

    def _run(self):
        mask = (
            kCGEventMaskBit(kCGEventFlagsChanged)
            | kCGEventMaskBit(kCGEventKeyDown)
            | kCGEventMaskBit(kCGEventKeyUp)
        )

        self.tap = CGEventTapCreate(
            kCGSessionEventTap,
            kCGHeadInsertEventTap,
            kCGEventTapOptionDefault,
            mask,
            self._event_callback,
            None,
        )

        if not self.tap:
            print("[Error] Failed to create CGEventTap. Please grant Accessibility permissions.")
            self.is_running = False
            return

        self.run_loop_source = CFMachPortCreateRunLoopSource(None, self.tap, 0)
        self.run_loop = CFRunLoopGetCurrent()
        CFRunLoopAddSource(self.run_loop, self.run_loop_source, kCFRunLoopCommonModes)
        CGEventTapEnable(self.tap, True)

        self.is_running = True
        key_name = "Alt (Option)" if self.use_option else "Win (Command)"
        print(f"[KeyHook] Started monitoring: Left {key_name} -> Eisu / Right {key_name} -> Kana")
        CFRunLoopRun()

    def start(self):
        """別スレッドでイベントループを開始"""
        if self.is_running:
            return
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def stop(self):
        """イベントループを停止"""
        if not self.is_running:
            return
        if self.tap:
            CGEventTapEnable(self.tap, False)
        if self.run_loop:
            CFRunLoopStop(self.run_loop)
        self.is_running = False
        print("[KeyHook] Stopped.")


if __name__ == "__main__":
    import time
    hook = MacKeyHook(use_option=True)
    hook.start()
    print("Testing MacKeyHook for 30 seconds. Tap Left Alt or Right Alt...")
    try:
        time.sleep(30)
    except KeyboardInterrupt:
        pass
    finally:
        hook.stop()
