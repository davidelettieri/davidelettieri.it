---
title:  Fedora, switch audio channels with pipewire and wireplumber 0.5
date: 2024-06-21 18:00:00 +0200
tags: [linux, fedora, pipewire, wireplumber]
---

Update on [this post](2024-02-04-fedora-pipewire-switch-channels.md), with the update to wireplumber v0.5 lua configuration files are not supported anymore. To switch channels on v0.5 you have to create the following file

```spa title=".config/wireplumber/wireplumber.conf.d/51-change-channels.conf"
monitor.alsa.rules = [
  {
    matches = [
      {
        node.name = "<name of the node>"
      }
    ]
    actions = {
      update-props = {
        audio.position = "FR,FL"
      }
    }
  }
]
```

Check the previous post to understand how to retrieve the name of the node, if needed.
