import ctypes
from ctypes import wintypes
import win32con
import win32api
import win32gui

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

WH_KEYBOARD_LL = 13
WM_KEYDOWN = 0x0100
WM_KEYUP = 0x0101
WM_SYSKEYDOWN = 0x0104
WM_SYSKEYUP = 0x0105

VK_LMENU = 0xA4       # Left Alt
VK_RMENU = 0xA5       # Right Alt
VK_CONVERT = 0x1C     # 変換 (IME ON / かな)
VK_NONCONVERT = 0x1D  # 無変換 (IME OFF / 英数)
KEYEVENTF_KEYUP = 0x0002

# KBDLLHOOKSTRUCT
class KBDLLHOOKSTRUCT(ctypes.Structure):
    _fields_ = [
        ("vkCode", wintypes.DWORD),
        ("scanCode", wintypes.DWORD),
        ("flags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_ulonglong)
    ]

HOOKPROC = ctypes.WINFUNCTYPE(ctypes.c_longlong, ctypes.c_int, wintypes.WPARAM, ctypes.POINTER(KBDLLHOOKSTRUCT))

class MacAltIMESwitcher:
    def __init__(self):
        self.hook = None
        self.proc = HOOKPROC(self._hook_callback)
        self.lalt_down = False
        self.ralt_down = False
        self.lalt_comb = False
        self.ralt_comb = False

    def send_key(self, vk):
        # Extra info to distinguish simulated keys
        user32.keybd_event(vk, 0, 0, 0)
        user32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)

    def _hook_callback(self, nCode, wParam, lParam):
        if nCode >= 0:
            kbd = lParam.contents
            vk = kbd.vkCode

            # Key Down
            if wParam in (WM_KEYDOWN, WM_SYSKEYDOWN):
                if vk == VK_LMENU:
                    if not self.lalt_down:
                        self.lalt_down = True
                        self.lalt_comb = False
                elif vk == VK_RMENU:
                    if not self.ralt_down:
                        self.ralt_down = True
                        self.ralt_comb = False
                else:
                    # 他のキーが押されたら組み合わせフラグを立てる
                    if self.lalt_down:
                        self.lalt_comb = True
                    if self.ralt_down:
                        self.ralt_comb = True

            # Key Up
            elif wParam in (WM_KEYUP, WM_SYSKEYUP):
                if vk == VK_LMENU:
                    if self.lalt_down:
                        self.lalt_down = False
                        if not self.lalt_comb:
                            # 単体で押して離された -> IME OFF (英数)
                            self.send_key(VK_NONCONVERT)
                            print("[IME] Left Alt tapped -> English (IME OFF)")
                elif vk == VK_RMENU:
                    if self.ralt_down:
                        self.ralt_down = False
                        if not self.ralt_comb:
                            # 単体で押して離された -> IME ON (かな)
                            self.send_key(VK_CONVERT)
                            print("[IME] Right Alt tapped -> Japanese (IME ON)")

        return user32.CallNextHookEx(self.hook, nCode, wParam, lParam)

    def start(self):
        if not self.hook:
            self.hook = user32.SetWindowsHookExW(
                WH_KEYBOARD_LL,
                self.proc,
                kernel32.GetModuleHandleW(None),
                0
            )
            print("MacAltIMESwitcher hook activated.")

    def stop(self):
        if self.hook:
            user32.UnhookWindowsHookEx(self.hook)
            self.hook = None
            print("MacAltIMESwitcher hook removed.")

if __name__ == "__main__":
    switcher = MacAltIMESwitcher()
    switcher.start()
    print("Press Ctrl+C to exit. Test pressing Left Alt and Right Alt...")
    try:
        win32gui.PumpMessages()
    except KeyboardInterrupt:
        switcher.stop()
