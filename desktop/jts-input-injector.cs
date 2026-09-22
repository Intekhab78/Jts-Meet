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
        static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);

        [DllImport("user32.dll", SetLastError = true)]
        static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        [DllImport("user32.dll", SetLastError = true)]
        static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

        [DllImport("user32.dll")]
        static extern short VkKeyScan(char ch);

        const uint MOUSEEVENTF_MOVE = 0x0001;
        const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
        const uint MOUSEEVENTF_LEFTUP = 0x0004;
        const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
        const uint MOUSEEVENTF_RIGHTUP = 0x0010;
        const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
        const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
        const uint MOUSEEVENTF_WHEEL = 0x0800;
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

        static void SendUnicodeString(string text)
        {
            if (string.IsNullOrEmpty(text)) return;
            foreach (char c in text)
            {
                INPUT[] inputs = new INPUT[2];

                // Key down
                inputs[0].type = 1; // INPUT_KEYBOARD
                inputs[0].u.ki.wVk = 0;
                inputs[0].u.ki.wScan = (ushort)c;
                inputs[0].u.ki.dwFlags = KEYEVENTF_UNICODE;
                inputs[0].u.ki.time = 0;
                inputs[0].u.ki.dwExtraInfo = UIntPtr.Zero;

                // Key up
                inputs[1].type = 1;
                inputs[1].u.ki.wVk = 0;
                inputs[1].u.ki.wScan = (ushort)c;
                inputs[1].u.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;
                inputs[1].u.ki.time = 0;
                inputs[1].u.ki.dwExtraInfo = UIntPtr.Zero;

                SendInput(2, inputs, Marshal.SizeOf(typeof(INPUT)));
                Thread.Sleep(5);
            }
        }

        static byte GetVirtualKeyCode(string keyName)
        {
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
                case "del": return 0x2E;
                case "arrowup":
                case "up": return 0x26;
                case "arrowdown":
                case "down": return 0x28;
                case "arrowleft":
                case "left": return 0x25;
                case "arrowright":
                case "right": return 0x27;
                case "home": return 0x24;
                case "end": return 0x23;
                case "pageup": return 0x21;
                case "pagedown": return 0x22;
                case "control":
                case "ctrl": return 0x11;
                case "alt": return 0x12;
                case "shift": return 0x10;
                case "meta":
                case "win":
                case "windows": return 0x5B;
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
                        char ch = keyName.ToUpper()[0];
                        if (ch >= 'A' && ch <= 'Z') return (byte)ch;
                        if (ch >= '0' && ch <= '9') return (byte)ch;
                    }
                    return 0;
            }
        }

        static void Main(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            Console.WriteLine("JTS_INPUT_READY");

            string line;
            while ((line = Console.ReadLine()) != null)
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
                        SetCursorPos(x, y);
                    }
                    else if (cmd == "DOWN" && parts.Length >= 4)
                    {
                        int x = int.Parse(parts[1]);
                        int y = int.Parse(parts[2]);
                        int btn = int.Parse(parts[3]);
                        SetCursorPos(x, y);
                        uint flag = btn == 2 ? MOUSEEVENTF_RIGHTDOWN : (btn == 1 ? MOUSEEVENTF_MIDDLEDOWN : MOUSEEVENTF_LEFTDOWN);
                        mouse_event(flag, 0, 0, 0, UIntPtr.Zero);
                    }
                    else if (cmd == "UP" && parts.Length >= 4)
                    {
                        int x = int.Parse(parts[1]);
                        int y = int.Parse(parts[2]);
                        int btn = int.Parse(parts[3]);
                        SetCursorPos(x, y);
                        uint flag = btn == 2 ? MOUSEEVENTF_RIGHTUP : (btn == 1 ? MOUSEEVENTF_MIDDLEUP : MOUSEEVENTF_LEFTUP);
                        mouse_event(flag, 0, 0, 0, UIntPtr.Zero);
                    }
                    else if (cmd == "CLICK" && parts.Length >= 4)
                    {
                        int x = int.Parse(parts[1]);
                        int y = int.Parse(parts[2]);
                        int btn = int.Parse(parts[3]);
                        SetCursorPos(x, y);
                        uint downFlag = btn == 2 ? MOUSEEVENTF_RIGHTDOWN : (btn == 1 ? MOUSEEVENTF_MIDDLEDOWN : MOUSEEVENTF_LEFTDOWN);
                        uint upFlag = btn == 2 ? MOUSEEVENTF_RIGHTUP : (btn == 1 ? MOUSEEVENTF_MIDDLEUP : MOUSEEVENTF_LEFTUP);
                        mouse_event(downFlag, 0, 0, 0, UIntPtr.Zero);
                        Thread.Sleep(10);
                        mouse_event(upFlag, 0, 0, 0, UIntPtr.Zero);
                    }
                    else if (cmd == "DBLCLICK" && parts.Length >= 3)
                    {
                        int x = int.Parse(parts[1]);
                        int y = int.Parse(parts[2]);
                        SetCursorPos(x, y);
                        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
                        Thread.Sleep(20);
                        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
                        Thread.Sleep(50);
                        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
                        Thread.Sleep(20);
                        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
                    }
                    else if (cmd == "CONTEXTMENU" && parts.Length >= 3)
                    {
                        int x = int.Parse(parts[1]);
                        int y = int.Parse(parts[2]);
                        SetCursorPos(x, y);
                        mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, UIntPtr.Zero);
                        Thread.Sleep(20);
                        mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, UIntPtr.Zero);
                    }
                    else if (cmd == "SCROLL" && parts.Length >= 2)
                    {
                        int delta = int.Parse(parts[1]);
                        mouse_event(MOUSEEVENTF_WHEEL, 0, 0, (uint)delta, UIntPtr.Zero);
                    }
                    else if (cmd == "KEY" && parts.Length >= 3)
                    {
                        string action = parts[1].ToLower();
                        string key = parts[2];
                        byte vk = GetVirtualKeyCode(key);

                        if (vk != 0)
                        {
                            uint flag = action == "up" ? KEYEVENTF_KEYUP : 0;
                            keybd_event(vk, 0, flag, UIntPtr.Zero);
                        }
                        else if (action == "down" && key.Length == 1)
                        {
                            SendUnicodeString(key);
                        }
                    }
                    else if (cmd == "TEXT" && parts.Length >= 2)
                    {
                        string b64 = parts[1];
                        byte[] bytes = Convert.FromBase64String(b64);
                        string text = Encoding.UTF8.GetString(bytes);
                        SendUnicodeString(text);
                    }
                }
                catch (Exception ex)
                {
                    // Ignore transient errors
                }
            }
        }
    }
}
