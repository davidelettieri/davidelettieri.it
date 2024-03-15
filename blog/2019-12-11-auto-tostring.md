---
title:  "AutoToString Visual Studio Extension"
date:   2019-12-11 21:00:00 +0100
tags: [.NET VisualStudio 'Code Generation']
---
More than a year ago I built my very first Visual Studio extension and published it on the Visual Studio Marketplace. I was working on a web service that passed around a lot of data and in order to log input and output of the endpoints whenever needed I often wrote code like this

    log.Debug('Input of Method A is: {0}', inputObj);

This is useful only if the object has a sensible ToString() method. Since most of the times my object were simple DTOs I just needed to print all the public properties of the object itself. Writing such a ToString() is simple but boring so I decided to give it a try and finally came up with the VS extension.

Since that day I added support for VS 2019 and VB.NET and today I'm releasing a new version which improves the performances of the ToString() method. It was a mistake to not think about this before but I realized that, for all the structs, I was boxing the value in order to compute the ToString(). For example, in the snippet below the `Value` property is boxed

<script src="https://gist.github.com/davidelettieri/891f36098356d5273882da015c9f3e6a.js"></script>

While in the snippet below there is no boxing involved.

<script src="https://gist.github.com/davidelettieri/b3326ad2a7cb811c320037184529ab04.js"></script>

I also run some benchmark to see how much overhead the boxing is causing to the ToString() method and these are the results on my pc and the difference is quite important in particular using .NET Core.

<pre><code>BenchmarkDotNet=v0.11.5, OS=Windows 10.0.17134.1069 (1803/April2018Update/Redstone4)
Intel Core i5-2400 CPU 3.10GHz (Sandy Bridge), 1 CPU, 4 logical and 4 physical cores
Frequency=3036260 Hz, Resolution=329.3526 ns, Timer=TSC
.NET Core SDK=2.2.300
  [Host] : .NET Core 2.2.5 (CoreCLR 4.6.27617.05, CoreFX 4.6.27618.01), 64bit RyuJIT
  Clr    : .NET Framework 4.7.2 (CLR 4.0.30319.42000), 64bit RyuJIT-v4.8.3928.0
  Core   : .NET Core 2.2.5 (CoreCLR 4.6.27617.05, CoreFX 4.6.27618.01), 64bit RyuJIT</code></pre>


|                Method |  Job | Runtime |       Mean |      Error |     StdDev | Rank |
|---------------------- |----- |-------- |-----------:|-----------:|-----------:|-----:|
|    ToStringWithBoxing |  Clr |     Clr | 2,520.2 us | 29.9783 us | 28.0417 us |    4 |
| ToStringWithoutBoxing |  Clr |     Clr | 1,292.3 us |  1.1992 us |  1.0630 us |    2 |
|    ToStringWithBoxing | Core |    Core | 2,117.0 us |  3.3804 us |  3.1620 us |    3 |
| ToStringWithoutBoxing | Core |    Core |   763.2 us |  0.8797 us |  0.7346 us |    1 |


The benchmark source code can be found [here](https://github.com/davidelettieri/ToStringBenchmark "ToString benchmark repository") and the Visual Studio extension [here](https://marketplace.visualstudio.com/items?itemName=DavideLettieri.AutoToString), give it a try and let me know what you think!