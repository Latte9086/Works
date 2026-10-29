import ctypes
import time

user32 = ctypes.windll.user32

VK_CONVERT = 0x1C      # 変換 (かな / IME ON)
VK_NONCONVERT = 0x1D   # 無変換 (英数 / IME OFF)
KEYEVENTF_KEYUP = 0x0002

def send_key(vk):
    user32.keybd_event(vk, 0, 0, 0)
    time.sleep(0.01)
    user32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)

def set_ime_on():
    send_key(VK_CONVERT)
    print("Sent VK_CONVERT (IME ON)")

def set_ime_off():
    send_key(VK_NONCONVERT)
    print("Sent VK_NONCONVERT (IME OFF)")

if __name__ == "__main__":
    print("Testing IME control in 2 seconds...")
    time.sleep(2)
    set_ime_off()
    time.sleep(1)
    set_ime_on()
