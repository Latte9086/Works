import ctypes
from ctypes import wintypes
import win32api
import win32gui
import win32process

user32 = ctypes.windll.user32

def get_foreground_layout():
    hwnd = win32gui.GetForegroundWindow()
    tid, pid = win32process.GetWindowThreadProcessId(hwnd)
    hkl = user32.GetKeyboardLayout(tid)
    # HKL is 32/64 bit integer, lower 16 bits is Language ID, upper 16 bits is Device Handle / Layout ID
    lang_id = hkl & 0xFFFF
    layout_id = (hkl >> 16) & 0xFFFF
    return hkl, lang_id, layout_id

print(f"Current Foreground Window: {win32gui.GetWindowText(win32gui.GetForegroundWindow())}")
hkl, lang_id, layout_id = get_foreground_layout()
print(f"HKL: {hex(hkl)}, LangID: {hex(lang_id)}, LayoutID: {hex(layout_id)}")

# システムにロードされているキーボードレイアウト一覧
size = user32.GetKeyboardLayoutList(0, None)
hkl_list = (wintypes.HKL * size)()
user32.GetKeyboardLayoutList(size, hkl_list)

print(f"Installed Layout count: {size}")
for i, h in enumerate(hkl_list):
    print(f"  [{i}] HKL: {hex(h)} (Lang: {hex(h & 0xFFFF)}, Layout: {hex((h >> 16) & 0xFFFF)})")
