import ctypes
from ctypes import wintypes
import win32api
import win32gui
import win32con

user32 = ctypes.windll.user32
KLF_ACTIVATE = 0x00000001
KLF_SETFORPROCESS = 0x00000100

print("Trying LoadKeyboardLayout('00000409')...")
hkl_us = user32.LoadKeyboardLayoutW("00000409", KLF_ACTIVATE)
print(f"Loaded US HKL: {hex(hkl_us)}")

# 再度リスト確認
size = user32.GetKeyboardLayoutList(0, None)
hkl_list = (wintypes.HKL * size)()
user32.GetKeyboardLayoutList(size, hkl_list)
print(f"Installed Layout count: {size}")
for i, h in enumerate(hkl_list):
    print(f"  [{i}] HKL: {hex(h)}")
