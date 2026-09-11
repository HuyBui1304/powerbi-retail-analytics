Add-Type -Name N -Namespace W -MemberDefinition '[DllImport("user32.dll")]public static extern bool SetCursorPos(int x,int y);[DllImport("user32.dll")]public static extern void mouse_event(uint a,uint b,uint c,uint d,int e);[DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr h,int c);[DllImport("user32.dll")]public static extern bool SetForegroundWindow(IntPtr h);'
$p = Get-Process PBIDesktop | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($p) { [W.N]::ShowWindow($p.MainWindowHandle,3) | Out-Null; [W.N]::SetForegroundWindow($p.MainWindowHandle) | Out-Null; Start-Sleep -Seconds 3 }
[W.N]::SetCursorPos(1311,1078); Start-Sleep -Milliseconds 600
[W.N]::mouse_event(2,0,0,0,0); Start-Sleep -Milliseconds 100; [W.N]::mouse_event(4,0,0,0,0)
Start-Sleep -Seconds 4
