# FunHive Local Scheduler Setup

This directory contains macOS launchd configuration files for running scrapers locally.

## Installation

### 1. Copy plist files to LaunchAgents

```bash
cp /Users/jenniferkurtz/FunHive/backend/launchd/*.plist ~/Library/LaunchAgents/
```

### 2. Load the schedulers

```bash
# Load all three schedulers
launchctl load ~/Library/LaunchAgents/com.funhive.scrapers.plist
launchctl load ~/Library/LaunchAgents/com.funhive.eventseries.plist
launchctl load ~/Library/LaunchAgents/com.funhive.monitor.plist
```

### 3. Configure Mac to wake from sleep (optional but recommended)

```bash
# Wake Mac at 2:55 AM every day (5 minutes before scrapers run)
sudo pmset repeat wake MTWRFSU 02:55:00

# Verify the schedule
pmset -g sched
```

### 4. Enable "Wake for network access" (System Preferences)

1. Open **System Preferences** → **Battery** (or **Energy Saver**)
2. Click **Power Adapter** tab
3. Check **Wake for network access**
4. Optionally check **Prevent your Mac from automatically sleeping when the display is off**

## Schedule Overview

| Job | Schedule | Purpose |
|-----|----------|---------|
| com.funhive.scrapers | Daily 3:00 AM | Run day's scraper group |
| com.funhive.eventseries | Every 6 hours | Group events into series |
| com.funhive.monitor | Daily 8:00 AM | Generate monitoring report |

## Managing Schedulers

### Check if running
```bash
launchctl list | grep funhive
```

### Stop a scheduler
```bash
launchctl unload ~/Library/LaunchAgents/com.funhive.scrapers.plist
```

### Start a scheduler
```bash
launchctl load ~/Library/LaunchAgents/com.funhive.scrapers.plist
```

### Run manually (for testing)
```bash
launchctl start com.funhive.scrapers
```

### View logs
```bash
# Real-time log watching
tail -f /Users/jenniferkurtz/FunHive/backend/logs/scraper-stdout.log

# View recent errors
tail -100 /Users/jenniferkurtz/FunHive/backend/logs/scraper-stderr.log
```

## Uninstallation

```bash
# Unload all schedulers
launchctl unload ~/Library/LaunchAgents/com.funhive.scrapers.plist
launchctl unload ~/Library/LaunchAgents/com.funhive.eventseries.plist
launchctl unload ~/Library/LaunchAgents/com.funhive.monitor.plist

# Remove plist files
rm ~/Library/LaunchAgents/com.funhive.*.plist

# Remove wake schedule
sudo pmset repeat cancel
```

## Troubleshooting

### Scrapers not running

1. Check if loaded: `launchctl list | grep funhive`
2. Check logs: `cat ~/Library/LaunchAgents/com.funhive.scrapers.plist`
3. Verify Node.js path: `which node`
4. Test manually: `node /Users/jenniferkurtz/FunHive/backend/scripts/local-scraper-runner.js --dry-run`

### Mac not waking

1. Check wake schedule: `pmset -g sched`
2. Verify Power Adapter settings in System Preferences
3. Make sure Mac is plugged in (wake schedules don't work on battery)

### Permission issues

```bash
# Make scripts executable
chmod +x /Users/jenniferkurtz/FunHive/backend/scripts/*.js
```

## Files

| File | Purpose |
|------|---------|
| `com.funhive.scrapers.plist` | Main scraper scheduler (3 AM daily) |
| `com.funhive.eventseries.plist` | Event series creation (every 6 hours) |
| `com.funhive.monitor.plist` | Monitoring report (8 AM daily) |
