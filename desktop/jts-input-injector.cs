using System;
using System.IO;
using System.Text;
using System.Runtime.InteropServices;
using System.Threading;

namespace JtsInputInjector
{
    class Program
    {
        [DllImport("user32.dll", SetLastError = true)]
        static extern bool SetCursorPos(int X, int Y);

        [DllImport("user32.dll", SetLastError = true)]
        static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

        [DllImport("user32.dll")]
        static extern int GetSystemMetrics(int nIndex);

        [DllImport("user32.dll")]
        static extern bool SetProcessDPIAware();

        [DllImport("user32.dll")]
        static extern bool SetProcessDpiAwarenessContext(IntPtr dpiContext);

        const int SM_XVIRTUALSCREEN = 76;
        const int SM_YVIRTUALSCREEN = 77;
        const int SM_CXVIRTUALSCREEN = 78;
        const int SM_CYVIRTUALSCREEN = 79;

        const uint INPUT_MOUSE = 0;
        const uint INPUT_KEYBOARD = 1;

        const uint MOUSEEVENTF_MOVE = 0x0001;
        const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
        const uint MOUSEEVENTF_LEFTUP = 0x0004;
        const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
        const uint MOUSEEVENTF_RIGHTUP = 0x0010;
        const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
        const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
        const uint MOUSEEVENTF_WHEEL = 0x0800;
        const uint MOUSEEVENTF_VIRTUALDESK = 0x4000;
        const uint MOUSEEVENTF_ABSOLUTE = 0x8000;

        const uint KEYEVENTF_EXTENDEDKEY = 0x0001;
        const uint KEYEVENTF_KEYUP = 0x0002;
        const uint KEYEVENTF_UNICODE = 0x0004;

        [StructLayout(LayoutKind.Sequential)]
        struct INPUT
        {
            public uint type;
            public InputUnion u;
        }

        [StructLayout(LayoutKind.Explicit)]
        struct InputUnion
        {
            [FieldOffset(0)] public MOUSEINPUT mi;
            [FieldOffset(0)] public KEYBDINPUT ki;
            [FieldOffset(0)] public HARDWAREINPUT hi;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct MOUSEINPUT
        {
            public int dx;
            public int dy;
            public uint mouseData;
            public uint dwFlags;
            public uint time;
            public UIntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct KEYBDINPUT
        {
            public ushort wVk;
            public ushort wScan;
            public uint dwFlags;
            public uint time;
            public UIntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct HARDWAREINPUT
        {
            public uint uMsg;
            public ushort wParamL;
            public ushort wParamH;
        }

        static void ConvertToAbsoluteCoordinates(int x, int y, out int absX, out int absY)
        {
            int vLeft = GetSystemMetrics(SM_XVIRTUALSCREEN);
            int vTop = GetSystemMetrics(SM_YVIRTUALSCREEN);
            int vWidth = GetSystemMetrics(SM_CXVIRTUALSCREEN);
            int vHeight = GetSystemMetrics(SM_CYVIRTUALSCREEN);

            if (vWidth <= 0) vWidth = 1920;
            if (vHeight <= 0) vHeight = 1080;

            absX = (int)Math.Round(((double)(x - vLeft) * 65535.0) / (double)vWidth);
            absY = (int)Math.Round(((double)(y - vTop) * 65535.0) / (double)vHeight);
        }

        static void SendMouseMove(int x, int y)
        {
            SetCursorPos(x, y);
            int absX, absY;
            ConvertToAbsoluteCoordinates(x, y, out absX, out absY);

            INPUT[] inputs = new INPUT[1];
            inputs[0].type = INPUT_MOUSE;
            inputs[0].u.mi.dx = absX;
            inputs[0].u.mi.dy = absY;
            inputs[0].u.mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK | MOUSEEVENTF_MOVE;
            SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
        }

        static void SendMouseDown(int x, int y, int btn)
        {
            SetCursorPos(x, y);
            int absX, absY;
            ConvertToAbsoluteCoordinates(x, y, out absX, out absY);

            uint flag = btn == 2 ? MOUSEEVENTF_RIGHTDOWN : (btn == 1 ? MOUSEEVENTF_MIDDLEDOWN : MOUSEEVENTF_LEFTDOWN);

            INPUT[] inputs = new INPUT[1];
            inputs[0].type = INPUT_MOUSE;
            inputs[0].u.mi.dx = absX;
            inputs[0].u.mi.dy = absY;
            inputs[0].u.mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK | MOUSEEVENTF_MOVE | flag;
            SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
        }

        static void SendMouseUp(int x, int y, int btn)
        {
            SetCursorPos(x, y);
            int absX, absY;
            ConvertToAbsoluteCoordinates(x, y, out absX, out absY);

            uint flag = btn == 2 ? MOUSEEVENTF_RIGHTUP : (btn == 1 ? MOUSEEVENTF_MIDDLEUP : MOUSEEVENTF_LEFTUP);

            INPUT[] inputs = new INPUT[1];
            inputs[0].type = INPUT_MOUSE;
            inputs[0].u.mi.dx = absX;
            inputs[0].u.mi.dy = absY;
            inputs[0].u.mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK | MOUSEEVENTF_MOVE | flag;
            SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
        }

        static void SendMouseClick(int x, int y, int btn)
        {
            SendMouseDown(x, y, btn);
            Thread.Sleep(20);
            SendMouseUp(x, y, btn);
        }

        static void SendMouseDoubleClick(int x, int y)
        {
            SendMouseClick(x, y, 0);
            Thread.Sleep(50);
            SendMouseClick(x, y, 0);
        }

        static void SendMouseScroll(int delta)
        {
            INPUT[] inputs = new INPUT[1];
            inputs[0].type = INPUT_MOUSE;
            inputs[0].u.mi.mouseData = (uint)delta;
            inputs[0].u.mi.dwFlags = MOUSEEVENTF_WHEEL;
            SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
        }

        static void SendKey(byte vk, bool isUp, bool isExtended = false)
        {
            INPUT[] inputs = new INPUT[1];
            inputs[0].type = INPUT_KEYBOARD;
            inputs[0].u.ki.wVk = vk;
            inputs[0].u.ki.wScan = 0;
            inputs[0].u.ki.dwFlags = (isUp ? KEYEVENTF_KEYUP : 0) | (isExtended ? KEYEVENTF_EXTENDEDKEY : 0);
            SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
        }

        static void SendUnicodeChar(char c)
        {
            INPUT[] inputs = new INPUT[2];

            inputs[0].type = INPUT_KEYBOARD;
            inputs[0].u.ki.wVk = 0;
            inputs[0].u.ki.wScan = (ushort)c;
            inputs[0].u.ki.dwFlags = KEYEVENTF_UNICODE;

            inputs[1].type = INPUT_KEYBOARD;
            inputs[1].u.ki.wVk = 0;
            inputs[1].u.ki.wScan = (ushort)c;
            inputs[1].u.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;

            SendInput(2, inputs, Marshal.SizeOf(typeof(INPUT)));
        }

        static void SendUnicodeString(string text)
        {
            if (string.IsNullOrEmpty(text)) return;
            foreach (char c in text)
            {
                SendUnicodeChar(c);
                Thread.Sleep(4);
            }
        }

        static void TriggerHotkey(string hotkey)
        {
            switch (hotkey.ToUpper())
            {
                case "WIN":
                case "START":
                    // Windows Start Menu
                    SendKey(0x5B, false, true); // VK_LWIN down
                    Thread.Sleep(30);
                    SendKey(0x5B, true, true);  // VK_LWIN up
                    break;

                case "WIN_D":
                    // Show / Minimize Desktop (Win + D)
                    SendKey(0x5B, false, true);
                    Thread.Sleep(10);
                    SendKey(0x44, false); // D down
                    Thread.Sleep(20);
                    SendKey(0x44, true);
                    SendKey(0x5B, true, true);
                    break;

                case "WIN_E":
                    // Open File Explorer (Win + E)
                    SendKey(0x5B, false, true);
                    Thread.Sleep(10);
                    SendKey(0x45, false); // E down
                    Thread.Sleep(20);
                    SendKey(0x45, true);
                    SendKey(0x5B, true, true);
                    break;

                case "TASKMGR":
                    // Open Windows Task Manager (Ctrl + Shift + Esc)
                    SendKey(0x11, false); // Ctrl
                    SendKey(0x10, false); // Shift
                    Thread.Sleep(10);
                    SendKey(0x1B, false); // Esc down
                    Thread.Sleep(20);
                    SendKey(0x1B, true);  // Esc up
                    SendKey(0x10, true);  // Shift up
                    SendKey(0x11, true);  // Ctrl up
                    break;

                case "WIN_R":
                    // Open Windows Run Dialog (Win + R)
                    SendKey(0x5B, false, true);
                    Thread.Sleep(15);
                    SendKey(0x52, false); // R down
                    Thread.Sleep(25);
                    SendKey(0x52, true);  // R up
                    SendKey(0x5B, true, true);
                    break;

                case "ALT_TAB":
                    // Switch Application Window (Alt + Tab)
                    SendKey(0x12, false); // Alt
                    Thread.Sleep(10);
                    SendKey(0x09, false); // Tab down
                    Thread.Sleep(20);
                    SendKey(0x09, true);
                    SendKey(0x12, true);
                    break;
            }
        }

        static byte GetVirtualKeyCode(string keyName, out bool isExtended)
        {
            isExtended = false;
            switch (keyName.ToLower())
            {
                case "enter":
                case "return": return 0x0D;
                case "backspace": return 0x08;
                case "tab": return 0x09;
                case "escape":
                case "esc": return 0x1B;
                case "space":
                case " ": return 0x20;
                case "delete":
                case "del":
                    isExtended = true;
                    return 0x2E;
                case "arrowup":
                case "up":
                    isExtended = true;
                    return 0x26;
                case "arrowdown":
                case "down":
                    isExtended = true;
                    return 0x28;
                case "arrowleft":
                case "left":
                    isExtended = true;
                    return 0x25;
                case "arrowright":
                case "right":
                    isExtended = true;
                    return 0x27;
                case "home":
                    isExtended = true;
                    return 0x24;
                case "end":
                    isExtended = true;
                    return 0x23;
                case "pageup":
                    isExtended = true;
                    return 0x21;
                case "pagedown":
                    isExtended = true;
                    return 0x22;
                case "control":
                case "ctrl": return 0x11;
                case "alt": return 0x12;
                case "shift": return 0x10;
                case "meta":
                case "win":
                case "windows":
                    isExtended = true;
                    return 0x5B;
                case "f1": return 0x70;
                case "f2": return 0x71;
                case "f3": return 0x72;
                case "f4": return 0x73;
                case "f5": return 0x74;
                case "f6": return 0x75;
                case "f7": return 0x76;
                case "f8": return 0x77;
                case "f9": return 0x78;
                case "f10": return 0x79;
                case "f11": return 0x7A;
                case "f12": return 0x7B;
                default:
                    if (keyName.Length == 1)
                    {
                        char ch = char.ToUpperInvariant(keyName[0]);
                        if (ch >= 'A' && ch <= 'Z') return (byte)ch;
                        if (ch >= '0' && ch <= '9') return (byte)ch;
                    }
                    return 0;
            }
        }

        static void Main(string[] args)
        {
            // Configure DPI Awareness so coordinates match physical screen pixels on Windows 10/11
            try
            {
                // DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2 = -4
                SetProcessDpiAwarenessContext((IntPtr)(-4));
            }
            catch
            {
                try { SetProcessDPIAware(); } catch { }
            }

            try
            {
                Console.OutputEncoding = Encoding.UTF8;
            }
            catch { }

            try
            {
                using (var reader = new StreamReader(Console.OpenStandardInput(), Encoding.UTF8))
                {
                    string line;
                    while ((line = reader.ReadLine()) != null)
                    {
                        line = line.Trim();
                        if (string.IsNullOrEmpty(line)) continue;
                        if (line.Equals("EXIT", StringComparison.OrdinalIgnoreCase)) break;

                        try
                        {
                            string[] parts = line.Split(' ');
                            string cmd = parts[0].ToUpper();

                            if (cmd == "MOVE" && parts.Length >= 3)
                            {
                                int x = int.Parse(parts[1]);
                                int y = int.Parse(parts[2]);
                                SendMouseMove(x, y);
                            }
                            else if (cmd == "DOWN" && parts.Length >= 4)
                            {
                                int x = int.Parse(parts[1]);
                                int y = int.Parse(parts[2]);
                                int btn = int.Parse(parts[3]);
                                SendMouseDown(x, y, btn);
                            }
                            else if (cmd == "UP" && parts.Length >= 4)
                            {
                                int x = int.Parse(parts[1]);
                                int y = int.Parse(parts[2]);
                                int btn = int.Parse(parts[3]);
                                SendMouseUp(x, y, btn);
                            }
                            else if (cmd == "CLICK" && parts.Length >= 4)
                            {
                                int x = int.Parse(parts[1]);
                                int y = int.Parse(parts[2]);
                                int btn = int.Parse(parts[3]);
                                SendMouseClick(x, y, btn);
                            }
                            else if (cmd == "DBLCLICK" && parts.Length >= 3)
                            {
                                int x = int.Parse(parts[1]);
                                int y = int.Parse(parts[2]);
                                SendMouseDoubleClick(x, y);
                            }
                            else if (cmd == "CONTEXTMENU" && parts.Length >= 3)
                            {
                                int x = int.Parse(parts[1]);
                                int y = int.Parse(parts[2]);
                                SendMouseClick(x, y, 2);
                            }
                            else if (cmd == "SCROLL" && parts.Length >= 2)
                            {
                                int delta = int.Parse(parts[1]);
                                SendMouseScroll(delta);
                            }
                            else if (cmd == "HOTKEY" && parts.Length >= 2)
                            {
                                TriggerHotkey(parts[1]);
                            }
                            else if (cmd == "KEY" && parts.Length >= 3)
                            {
                                string action = parts[1].ToLower();
                                string key = parts[2];
                                bool isExtended;
                                byte vk = GetVirtualKeyCode(key, out isExtended);

                                if (vk != 0)
                                {
                                    SendKey(vk, action == "up", isExtended);
                                }
                                else if (action == "down" && key.Length == 1)
                                {
                                    SendUnicodeChar(key[0]);
                                }
                            }
                            else if (cmd == "TEXT" && parts.Length >= 2)
                            {
                                string b64 = parts[1];
                                byte[] bytes = Convert.FromBase64String(b64);
                                string text = Encoding.UTF8.GetString(bytes);
                                SendUnicodeString(text);
                            }
                            else if (cmd == "RUN" && parts.Length >= 2)
                            {
                                string target = line.Substring(4).Trim();
                                try
                                {
                                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                                    {
                                        FileName = target,
                                        UseShellExecute = true
                                    });
                                }
                                catch
                                {
                                    // Process launch failure ignored
                                }
                            }
                        }
                        catch
                        {
                            // Ignore transient command parsing error
                        }
                    }
                }
            }
            catch
            {
                // Process terminated or input closed
            }
        }
    }
}
