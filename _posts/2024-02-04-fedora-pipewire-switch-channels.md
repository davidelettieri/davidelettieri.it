---
layout: post
title:  "Fedora, switch audio channels with pipewire"
date:   2024-02-04 16:00:00 +0100
categories: linux fedora pipewire wireplumber
description: I bought a pair <a target="_blank" href="https://www.amazon.it/dp/B09HGXDLX2?&_encoding=UTF8&tag=davidelettier-21&linkCode=ur2&linkId=a704b01f634642a6eaf02f1d538ef5e4&camp=3414&creative=21718">Creative Pebble V3</a> and given my desk setup and the cables of the 2 speakes, I needed to switch left and right audio channels
---

I bought a pair <a target="_blank" href="https://www.amazon.it/dp/B09HGXDLX2?&_encoding=UTF8&tag=davidelettier-21&linkCode=ur2&linkId=a704b01f634642a6eaf02f1d538ef5e4&camp=3414&creative=21718">Creative Pebble V3</a> and given my desk setup and the cables of the 2 speakes, I needed to switch left and right audio channels in order to setup correctly the speakers.

Now, I'm running Fedora Workstation and I never had to troubleshoot, manage, or change any audio settings besides adjusting volume when needed. I found out this task is not as easy as it seems, probably for a mixture of lack of documentation and lack of skills on my side.

At first I tried some promising GUI tools:
- EasyEffects
- [TODO]

But I had very bad luck with those and I wasn't able to get them working. In the end I found the `wireplumber` tool and that indeed worked. This Archlinux forum post pointed me in the right direction, however the post sample was doing something more than just switch channels and it wasn't working for me as it is.