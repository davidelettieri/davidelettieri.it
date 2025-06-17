---
title:  Ray tracing in one weekend in go
date: 2025-06-16 14:00:00 +0200
tags: [go, ray-tracing]
---

I had the [_Ray Tracing in One Weekend_](https://raytracing.github.io/books/RayTracingInOneWeekend.html) book in my todo list for a long time and I had finally the time to go through it. 

There is not much to say, except than rather unusually I used go instead of C# to go through the book. The code is a rather simple port from the C++ original, my only addition was a render method that used goroutines and channels to speed up the execution. It works fairly well and tops up the CPUs on my desktop machine.

The [repo](https://github.com/davidelettieri/raytracing-one-weekend-go) contains the image with 10 samples per pixel and the image with 100 samples per pixel. The quality difference is evident! To check it out you need to clone the repo, or download the raw files, and have a ppm image viewer installed.

