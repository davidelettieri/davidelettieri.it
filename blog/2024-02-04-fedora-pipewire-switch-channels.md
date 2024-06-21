---
title:  Fedora, switch audio channels with pipewire
date: 2024-02-11 18:00:00 +0100
tags: [linux, fedora, pipewire, wireplumber]
---

:::warning

The lua configuration files are valid only for wireplumber v\<0.5. Please [check here](2024-06-21-fedora-pipewire-switch-channels-wireplumber-0.5.md) for the configuration required on v=0.5. This post remains valid for what concerns retrieving the node name required in the config file. 

:::
I bought a pair <a target="_blank" href="https://www.amazon.it/dp/B09HGXDLX2?&_encoding=UTF8&tag=davidelettier-21&linkCode=ur2&linkId=a704b01f634642a6eaf02f1d538ef5e4&camp=3414&creative=21718">Creative Pebble V3</a>[^1] and given my desk setup and the cables of the 2 speakers, I needed to switch left and right audio channels in order to setup correctly the speakers.

Now, I'm running Fedora Workstation and I never had to troubleshoot, manage, or change any audio settings besides adjusting volume when needed. I found out this task is not as easy as it seems, probably for a mixture of lack of documentation and lack of skills on my side.

<!-- truncate -->

At first I tried some promising GUI tools:
- EasyEffects -> with this one I was able to visually obtain what I wanted, ie switch channels, however I was not able to apply the changes anyhow.
- qpwgraph -> with this one I just got some background noise in my speakers and quickly gave up after successfully reverting the changes I made.

After this I found the `wireplumber` tool and that indeed worked. This [Archlinux forum post](https://bbs.archlinux.org/viewtopic.php?id=285115) pointed me in the right direction, however the post sample was doing something more than just switch channels and it wasn't working for me as it is.

First off, be sure that wireplumber is installed and enabled in your system:

```bash title="command"
wpctl status
```

You should get an output similar to this:

```bash title="sample output"
PipeWire 'pipewire-0' [1.0.1, davide@home, cookie:3084944151]
 └─ Clients:
        31. uresourced                          [1.0.1, davide@home, pid:2636]
        32. WirePlumber                         [1.0.1, davide@home, pid:2666]
        33. WirePlumber [export]                [1.0.1, davide@home, pid:2666]
        56. gnome-shell                         [1.0.1, davide@home, pid:2699]
        57. pipewire                            [1.0.1, davide@home, pid:3375]
        58. GNOME Shell Volume Control          [1.0.1, davide@home, pid:2699]
        59. GNOME Volume Control Media Keys     [1.0.1, davide@home, pid:2914]
        60. xdg-desktop-portal                  [1.0.1, davide@home, pid:3461]
        61. Google Chrome input                 [1.0.1, davide@home, pid:5148]
        62. Mutter                              [1.0.1, davide@home, pid:2699]
        68. Boxes                               [1.0.1, davide@home, pid:6646]
        69. wpctl                               [1.0.1, davide@home, pid:7334]
        70. Boxes                               [1.0.1, davide@home, pid:6646]

Audio
 ├─ Devices:
 │      40. Pebble V3                           [alsa]
 │      41. Navi 31 HDMI/DP Audio               [alsa]
 │      42. Starship/Matisse HD Audio Controller [alsa]
 │  
 ├─ Sinks:
 # highlight-next-line
 │  *   43. Pebble V3 Analog Stereo             [vol: 1.00]
 │      44. Starship/Matisse HD Audio Controller Analog Stereo [vol: 1.00]

...
```

I tried this on a new VM running Fedora 39 Workstation image and it is working out of the box. The part that we are most interested in is the `Sinks` part. In my case it was the `Pebble V3 Analog Stereo` sink, the one I want to customize.

Let's use the ID to get more details:

```bash title="command"
wpctl inspect 43
```

Expect something like this:

```bash title="sample output"
id 43, type PipeWire:Interface:Node
    alsa.card = "0"
    alsa.card_name = "Pebble V3"
    alsa.class = "generic"
    alsa.device = "0"
    alsa.driver_name = "snd_usb_audio"
    alsa.id = "USB Audio"
    alsa.long_card_name = "ACTIONS Pebble V3 at usb-0000:03:00.0-9, full speed"
    alsa.name = "USB Audio"
    alsa.resolution_bits = "16"
    alsa.subclass = "generic-mix"
    alsa.subdevice = "0"
    alsa.subdevice_name = "subdevice #0"
    api.alsa.card.longname = "ACTIONS Pebble V3 at usb-0000:03:00.0-9, full speed"
    api.alsa.card.name = "Pebble V3"
    api.alsa.path = "front:0"
    api.alsa.pcm.card = "0"
    api.alsa.pcm.stream = "playback"
    audio.adapt.follower = ""
    audio.channels = "2"
    # highlight-next-line
    audio.position = "FR,FL"
    card.profile.device = "1"
  * client.id = "33"
    clock.quantum-limit = "8192"
    device.api = "alsa"
    device.class = "sound"
  * device.id = "40"
    device.profile.description = "Analog Stereo"
    device.profile.name = "analog-stereo"
    device.routes = "1"
  * factory.id = "18"
    factory.mode = "merge"
    factory.name = "api.alsa.pcm.sink"
    library.name = "audioconvert/libspa-audioconvert"
  * media.class = "Audio/Sink"
  * node.description = "Pebble V3 Analog Stereo"
    node.driver = "true"
  # highlight-next-line
  * node.name = "alsa_output.usb-ACTIONS_Pebble_V3-00.analog-stereo"
  * node.nick = "Pebble V3"
    node.pause-on-idle = "false"
  * object.path = "alsa:pcm:0:front:0:playback"
  * object.serial = "43"
  * priority.driver = "1009"
  * priority.session = "1009"
```

There are two parts that we care about: `node.name` and `audio.position`. The first one is needed as an identifier, the ID is not stable so we can forget about it, while `audio.position` which has `FR,FL` value is the one we want to change to `FL,FR` to switch the channels.

```lua title=".config/wireplumber/main.lua.d/51-change-channels.lua"
rule = {
    matches = {
      {
        { "node.name", "equals", "alsa_output.usb-ACTIONS_Pebble_V3-00.analog-stereo" },
      },
    },
    apply_properties = {
      ["audio.position"] = "FR,FL",
    },
  }
  
table.insert(alsa_monitor.rules, rule)
```

I saved this file as `.config/wireplumber/main.lua.d/51-change-channels.lua` (I got this filename checking samples and post online, not sure what the initial number is referring to and I suspect it's not that relevant unless you have multiple scripts in the folder) and run 

```bash title="command"
systemctl --user restart wireplumber pipewire pipewire-pulse
```

That should be enough to have your audio channel switched. If it is not working, double check that the file has the correct format and run `systemctl --user status pipewire*` to check for errors.

[^1]: this is an affiliate link, I genuinely like Creative products and bought their stuff since my first pc 25+ years ago when I got my Sound Blaster Live 1024. I'm thinking if I should invest more time in the blog and this is part of this experiment.