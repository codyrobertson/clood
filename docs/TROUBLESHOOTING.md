# Troubleshooting Guide

This guide covers common issues encountered when using the Claude Code Dynamic Terminal UI (Clood TUI) and their solutions.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Startup Problems](#startup-problems)
- [Display and Rendering Issues](#display-and-rendering-issues)
- [Session and File Issues](#session-and-file-issues)
- [Performance Problems](#performance-problems)
- [Debug Mode](#debug-mode)
- [Log Locations](#log-locations)
- [Getting Help](#getting-help)

---

## Installation Issues

### npm install fails with permission errors

**Symptom:** `EACCES` or permission denied errors during installation.

**Solution:**
```bash
# Option 1: Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Option 2: Use nvm to manage Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### Node.js version too old

**Symptom:** Errors about unsupported syntax or missing features.

**Solution:**
Clood TUI requires Node.js 18.0.0 or higher.
```bash
node --version  # Check current version
# Install Node 18+ using nvm or your package manager
```

### Missing native dependencies (yoga-layout)

**Symptom:** Errors about native modules or yoga-layout failing to build.

**Solution:**
```bash
# Ensure build tools are installed

# On Ubuntu/Debian:
sudo apt-get install build-essential

# On macOS:
xcode-select --install

# On Windows:
npm install -g windows-build-tools

# Then reinstall:
rm -rf node_modules
npm install
```

---

## Startup Problems

### "Cannot find module" errors

**Symptom:** Module not found errors when starting the application.

**Solution:**
```bash
# Rebuild the project
npm run clean
npm run build
npm start
```

### Terminal hangs on startup

**Symptom:** Application starts but shows no output or freezes.

**Solution:**
1. Check if another instance is running
2. Try running in debug mode: `clood-tui --debug`
3. Ensure your terminal supports ANSI escape codes
4. Try a different terminal emulator

### "Invalid session file" errors

**Symptom:** Error messages about invalid or corrupted session files.

**Solution:**
```bash
# Verify the session file exists and is valid JSON Lines
head -n 5 /path/to/session.jsonl

# Check file permissions
ls -la /path/to/session.jsonl

# Try a fresh session
clood-tui  # Without --session flag
```

---

## Display and Rendering Issues

### UI appears garbled or misaligned

**Symptom:** Characters overlap, boxes don't render correctly, or layout is broken.

**Solution:**
1. Ensure your terminal supports Unicode and 256 colors
2. Try resizing your terminal window
3. Set `TERM=xterm-256color` in your environment
4. Use a modern terminal (iTerm2, Windows Terminal, Alacritty, etc.)

### Colors not displaying correctly

**Symptom:** Missing colors or wrong color scheme.

**Solution:**
```bash
# Check terminal color support
echo $TERM
tput colors

# Set appropriate TERM variable
export TERM=xterm-256color
```

### Box-drawing characters show as question marks

**Symptom:** UI borders and lines appear as `?` or other characters.

**Solution:**
1. Ensure your terminal uses a font with Unicode box-drawing support
2. Recommended fonts: JetBrains Mono, Fira Code, Cascadia Code, Nerd Fonts
3. Check locale settings:
```bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

### Terminal size detection issues

**Symptom:** UI doesn't fit the terminal or wraps incorrectly.

**Solution:**
- Resize your terminal to at least 80x24 characters
- The TUI adapts to terminal size automatically
- If issues persist, try: `stty size` to verify terminal size detection

---

## Session and File Issues

### Session file not updating

**Symptom:** New messages don't appear in the TUI.

**Solution:**
1. Verify the file is being written to: `tail -f /path/to/session.jsonl`
2. Check file watch permissions
3. Ensure no other process has an exclusive lock on the file
4. Try restarting with `--debug` to see file watcher activity

### Permission denied when watching files

**Symptom:** Errors about file access or watching.

**Solution:**
```bash
# Check file permissions
ls -la /path/to/session.jsonl

# Check directory permissions
ls -la /path/to/

# Ensure you own the file or have read access
chmod +r /path/to/session.jsonl
```

### Large session files causing slowness

**Symptom:** TUI becomes slow with large session files.

**Solution:**
1. The TUI streams the file, but very large files may cause initial delay
2. Consider archiving old sessions
3. Start a new session file for lengthy operations

---

## Performance Problems

### High CPU usage

**Symptom:** CPU spikes when running the TUI.

**Solution:**
1. Check for rapid file changes triggering many re-renders
2. Ensure you're running the production build: `npm run build:dist`
3. Try running with debug mode to identify the bottleneck

### Memory usage growing over time

**Symptom:** Application memory increases continuously.

**Solution:**
1. Very long sessions accumulate history - restart periodically
2. Check for memory leaks in debug mode
3. Report the issue if it persists with reproduction steps

### Slow rendering with long messages

**Symptom:** Lag when displaying long code blocks or output.

**Solution:**
- This is expected for very long content
- Consider using pagination if available
- Terminal rendering speed varies by terminal emulator

---

## Debug Mode

Debug mode provides verbose logging to help diagnose issues.

### Enabling Debug Mode

```bash
# Via command line flag
clood-tui --debug

# Or short form
clood-tui -d

# Combined with session file
clood-tui --debug --session /path/to/session.jsonl
```

### What Debug Mode Shows

When running in debug mode, you'll see:
- File watcher events (file changes, errors)
- Event stream parsing details
- Render cycle information
- State management updates
- Error stack traces

### Debug Output Format

Debug messages are prefixed with timestamps and categories:
```
[2024-01-15T10:30:45.123Z] [FileWatcher] File changed: /path/to/session.jsonl
[2024-01-15T10:30:45.125Z] [EventStream] Parsed 3 new events
[2024-01-15T10:30:45.130Z] [Render] Update triggered, 5 components affected
```

---

## Log Locations

Clood TUI logs are written to different locations depending on the operating system:

### Linux

```
~/.local/share/clood-tui/logs/
~/.config/clood-tui/
```

### macOS

```
~/Library/Logs/clood-tui/
~/Library/Application Support/clood-tui/
```

### Windows

```
%APPDATA%\clood-tui\logs\
%LOCALAPPDATA%\clood-tui\
```

### Temporary Debug Logs

When running with `--debug`, additional logs may be written to:
```
/tmp/clood-tui-debug-<timestamp>.log  # Linux/macOS
%TEMP%\clood-tui-debug-<timestamp>.log  # Windows
```

### Viewing Logs

```bash
# View latest log entries (Linux/macOS)
tail -f ~/.local/share/clood-tui/logs/latest.log

# View debug log
tail -f /tmp/clood-tui-debug-*.log
```

---

## Getting Help

### Before Reporting an Issue

1. Update to the latest version: `npm update clood-tui`
2. Clear cache and rebuild: `npm run clean && npm install && npm run build`
3. Try reproducing with `--debug` flag enabled
4. Gather relevant log files

### Information to Include in Bug Reports

When reporting issues, please include:

1. **Environment:**
   - Node.js version: `node --version`
   - npm version: `npm --version`
   - Operating system and version
   - Terminal emulator and version

2. **Steps to Reproduce:**
   - Exact commands run
   - Session file (if relevant, sanitized of sensitive data)
   - Terminal size: `stty size`

3. **Debug Output:**
   - Output from running with `--debug`
   - Relevant log files

4. **Expected vs Actual Behavior:**
   - What you expected to happen
   - What actually happened
   - Screenshots if applicable

### Useful Commands for Diagnostics

```bash
# System information
uname -a
node --version
npm --version
echo $TERM
echo $LANG

# Terminal capabilities
tput colors
tput cols
tput lines

# Check for running processes
ps aux | grep clood

# Test basic rendering
echo -e "\e[31mRed\e[0m \e[32mGreen\e[0m \e[34mBlue\e[0m"
echo "Box drawing: ┌─┐│└┘├┤┬┴┼"
```

---

## Common Error Messages

| Error Message | Likely Cause | Solution |
|---------------|--------------|----------|
| `ENOENT: no such file or directory` | Session file doesn't exist | Check the file path |
| `EACCES: permission denied` | Insufficient permissions | Check file/directory permissions |
| `EMFILE: too many open files` | File descriptor limit reached | Increase ulimit: `ulimit -n 4096` |
| `Cannot find module 'yoga-layout'` | Native dependency issue | Reinstall with build tools |
| `Invalid JSON at line X` | Corrupted session file | Check file integrity |

---

For additional help, consult the [README](../README.md) or open an issue on the project repository.
