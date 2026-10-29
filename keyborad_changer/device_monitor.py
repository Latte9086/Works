"""
macOS USB Device Monitor Module
接続されているUSBデバイスを監視し、指定されたキーボード（例: "Rainy"）の
接続および切断イベントをコールバック通知します。
"""

import subprocess
import time
import threading


class DeviceMonitor:
    def __init__(self, target_keyword="Rainy", interval=1.0, on_connect=None, on_disconnect=None):
        """
        :param target_keyword: 検出対象のデバイス名（部分一致、大文字小文字無視）
        :param interval: ポーリング間隔（秒）
        :param on_connect: デバイス接続時のコールバック関数
        :param on_disconnect: デバイス切断時のコールバック関数
        """
        self.target_keyword = target_keyword.lower()
        self.interval = interval
        self.on_connect = on_connect
        self.on_disconnect = on_disconnect

        self.is_connected = False
        self.is_running = False
        self.thread = None

    def check_device_present(self):
        """macOS標準の ioreg コマンドで対象USB機器が接続されているか確認"""
        try:
            # ioreg で USB ツリー情報を取得
            output = subprocess.check_output(
                ["ioreg", "-p", "IOUSB", "-w0", "-l"],
                text=True,
                stderr=subprocess.DEVNULL
            )
            # 大文字小文字を区別せずに対象キーワードが含まれているか判定
            return self.target_keyword in output.lower()
        except Exception as e:
            # ioreg が使えない環境（Linux/Windowsでのテスト時）
            return False

    def _monitor_loop(self):
        print(f"[DeviceMonitor] Monitoring USB devices for '{self.target_keyword}'...")
        # 起動直後の初期状態チェック
        self.is_connected = self.check_device_present()
        if self.is_connected:
            print(f"[DeviceMonitor] Initial status: '{self.target_keyword}' is CONNECTED.")
            if self.on_connect:
                self.on_connect()
        else:
            print(f"[DeviceMonitor] Initial status: '{self.target_keyword}' is NOT connected.")

        while self.is_running:
            time.sleep(self.interval)
            current_status = self.check_device_present()

            if current_status and not self.is_connected:
                # 接続された！
                self.is_connected = True
                print(f"[DeviceMonitor] Device '{self.target_keyword}' CONNECTED.")
                if self.on_connect:
                    self.on_connect()

            elif not current_status and self.is_connected:
                # 切断された！
                self.is_connected = False
                print(f"[DeviceMonitor] Device '{self.target_keyword}' DISCONNECTED.")
                if self.on_disconnect:
                    self.on_disconnect()

    def start(self):
        """監視スレッドを開始"""
        if self.is_running:
            return
        self.is_running = True
        self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.thread.start()

    def stop(self):
        """監視を停止"""
        self.is_running = False
        print("[DeviceMonitor] Stopped.")


if __name__ == "__main__":
    def connected():
        print(">>> Callback: Rainy Connected!")

    def disconnected():
        print(">>> Callback: Rainy Disconnected!")

    monitor = DeviceMonitor(target_keyword="Rainy", interval=1.0, on_connect=connected, on_disconnect=disconnected)
    monitor.start()

    print("Monitoring... Press Ctrl+C to exit.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        monitor.stop()
