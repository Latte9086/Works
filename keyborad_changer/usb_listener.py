import win32gui
import win32con
import win32api
import ctypes
from ctypes import wintypes
import sys
import threading
import time

# DBT constants
WM_DEVICECHANGE = 0x0219
DBT_DEVICEARRIVAL = 0x8000
DBT_DEVICEREMOVECOMPLETE = 0x8004
DBT_DEVNODES_CHANGED = 0x0007

class DeviceListener:
    def __init__(self, callback):
        self.callback = callback
        self.hwnd = None

    def _create_window(self):
        wc = win32gui.WNDCLASS()
        wc.hInstance = win32api.GetModuleHandle(None)
        wc.lpszClassName = "USBDeviceListenerClass"
        wc.lpfnWndProc = self._wnd_proc
        
        reg = win32gui.RegisterClass(wc)
        self.hwnd = win32gui.CreateWindow(
            reg, "USBDeviceListenerWindow",
            0, 0, 0, 0, 0,
            0, 0, wc.hInstance, None
        )

    def _wnd_proc(self, hwnd, msg, wparam, lparam):
        if msg == WM_DEVICECHANGE:
            if wparam == DBT_DEVICEARRIVAL:
                self.callback("CONNECTED", lparam)
            elif wparam == DBT_DEVICEREMOVECOMPLETE:
                self.callback("DISCONNECTED", lparam)
            elif wparam == DBT_DEVNODES_CHANGED:
                self.callback("NODES_CHANGED", lparam)
            return True
        return win32gui.DefWindowProc(hwnd, msg, wparam, lparam)

    def start(self):
        self._create_window()
        print("DeviceListener started. PumpMessages running...")
        win32gui.PumpMessages()

def on_change(event_type, lparam):
    print(f"[{time.strftime('%H:%M:%S')}] Event: {event_type}")

if __name__ == "__main__":
    listener = DeviceListener(on_change)
    listener.start()
