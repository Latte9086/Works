import subprocess
import json

def get_devices():
    ps_cmd = """
    Get-PnpDevice -Class Keyboard | Where-Object { $_.Present -eq $true } | Select-Object FriendlyName, InstanceId, Status | ConvertTo-Json
    """
    res = subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; " + ps_cmd],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace"
    )
    if res.returncode == 0 and res.stdout.strip():
        try:
            return json.loads(res.stdout)
        except Exception as e:
            print(f"JSON parse error: {e}")
            print(res.stdout)
    else:
        print(f"Error or empty: {res.stderr}")
    return []

if __name__ == "__main__":
    devices = get_devices()
    print("=== Connected Keyboards ===")
    if isinstance(devices, dict):
        devices = [devices]
    for d in devices:
        print(f"Name: {d.get('FriendlyName')}")
        print(f"ID:   {d.get('InstanceId')}")
        print(f"Status: {d.get('Status')}")
        print("-" * 40)
