"""
Main Application for macOS
Rainy 75 Pro 等の ANSI キーボードが接続された時だけ、
スペース左右の Alt (Option) 単押しによる「英数 / かな」切り替えを自動有効化します。
"""

import os
import sys
import json
import time
import signal

from device_monitor import DeviceMonitor
from key_hook import MacKeyHook


def load_config():
    config_path = os.path.join(os.path.dirname(__file__), "config.json")
    default_config = {
        "target_device_name": "Rainy",
        "use_option_key": True,
        "check_interval_seconds": 1.0,
    }
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {**default_config, **data}
        except Exception as e:
            print(f"[Warning] Failed to read config.json, using defaults: {e}")
    return default_config


def main():
    config = load_config()
    target_name = config.get("target_device_name", "Rainy")
    use_option = config.get("left_key", "Option").lower() == "option"
    interval = config.get("check_interval_seconds", 1.0)

    print("==================================================")
    print("  Mac ANSI Keyboard Switcher (for Rainy 75 Pro)   ")
    print("==================================================")
    print(f" Target Device: '{target_name}'")
    key_desc = "Alt (Option)" if use_option else "Win (Command)"
    print(f" Left  Key    : {key_desc} -> 英数 (English)")
    print(f" Right Key    : {key_desc} -> かな (Japanese)")
    print("==================================================")

    key_hook = MacKeyHook(use_option=use_option)

    def on_device_connected():
        print(f"\n[System] >>> '{target_name}' is connected. Activating Mac-style IME Switcher...")
        key_hook.start()

    def on_device_disconnected():
        print(f"\n[System] >>> '{target_name}' was disconnected. Deactivating Mac-style IME Switcher...")
        key_hook.stop()

    monitor = DeviceMonitor(
        target_keyword=target_name,
        interval=interval,
        on_connect=on_device_connected,
        on_disconnect=on_device_disconnected,
    )

    # 終了ハンドラ
    def shutdown(sig, frame):
        print("\n[System] Shutting down...")
        monitor.stop()
        key_hook.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # 監視開始
    monitor.start()

    print("\nRunning in background. Press Ctrl+C to stop.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown(None, None)


if __name__ == "__main__":
    main()
