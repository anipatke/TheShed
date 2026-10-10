# Real console Ctrl+C against a Windows-hosted Shed that has a Vite project running (T-011, TEST-03).
$ErrorActionPreference = 'Stop'
Add-Type @'
using System; using System.Runtime.InteropServices;
public static class K { 
 [DllImport("kernel32.dll")] public static extern bool AttachConsole(uint pid);
 [DllImport("kernel32.dll")] public static extern bool FreeConsole();
 [DllImport("kernel32.dll")] public static extern bool SetConsoleCtrlHandler(IntPtr h, bool add);
 [DllImport("kernel32.dll")] public static extern bool GenerateConsoleCtrlEvent(uint ev, uint grp); }
'@
$root = 'C:\Users\User\shed-t011'; $port = 4813; $vport = 5621
$env:SHED_PORT = "$port"; $env:SHED_CONFIG = "$env:TEMP\t011-windows-config.json"
$shed = Start-Process node.exe -ArgumentList 'server/index.ts' -WorkingDirectory "$root\shed" -PassThru
function Api($m, $p) { Invoke-RestMethod -Method $m -Uri "http://localhost:$port$p" -Headers @{ 'X-Shed' = '1' } -ContentType 'application/json' -Body $(if ($m -eq 'POST') { '{}' }) }
for ($i = 0; $i -lt 40; $i++) { try { Invoke-RestMethod "http://localhost:$port/api/health" | Out-Null; break } catch { Start-Sleep -Milliseconds 300 } }
Api POST '/api/projects/vite/start' | Out-Null
for ($i = 0; $i -lt 60; $i++) { $r = (Api GET '/api/state').runs | Where-Object projectId -eq 'vite'; if ($r.state -eq 'running') { break }; Start-Sleep -Milliseconds 500 }
Write-Output "run: state=$($r.state) leader pid=$($r.pid); Shed pid=$($shed.Id)"
$all = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name
$ids = [System.Collections.Generic.HashSet[uint32]]::new(); [void]$ids.Add([uint32]$r.pid)
do { $n = $ids.Count; foreach ($p in $all) { if ($ids.Contains([uint32]$p.ParentProcessId)) { [void]$ids.Add([uint32]$p.ProcessId) } } } while ($ids.Count -ne $n)
Write-Output "tree before Ctrl+C: $(($all | Where-Object { $ids.Contains([uint32]$_.ProcessId) } | ForEach-Object { "$($_.ProcessId):$($_.Name)" }) -join ' ')"
Write-Output "port $vport listening before: $([bool](Get-NetTCPConnection -LocalPort $vport -State Listen -ErrorAction SilentlyContinue))"
[void][K]::FreeConsole(); [void][K]::AttachConsole([uint32]$shed.Id); [void][K]::SetConsoleCtrlHandler([IntPtr]::Zero, $true)
[void][K]::GenerateConsoleCtrlEvent(0, 0)
Start-Sleep -Seconds 1; [void][K]::FreeConsole()
$shed.WaitForExit(15000) | Out-Null
Start-Sleep -Seconds 2
Write-Output "Shed exited: $($shed.HasExited) exit code: $($shed.ExitCode)"
$left = Get-CimInstance Win32_Process | Where-Object { $ids.Contains([uint32]$_.ProcessId) } | ForEach-Object { "$($_.ProcessId):$($_.Name)" }
Write-Output "processes left from tree: $(if ($left) { $left -join ' ' } else { '(none)' })"
Write-Output "port $vport listening after: $([bool](Get-NetTCPConnection -LocalPort $vport -State Listen -ErrorAction SilentlyContinue))"
foreach ($id in $ids) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
if (-not $shed.HasExited) { Stop-Process -Id $shed.Id -Force }
