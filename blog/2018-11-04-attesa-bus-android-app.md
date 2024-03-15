---
title:  "Attesa Bus Android App"
date:   2018-11-04 15:00:00 +0000
tags: [android, dart, flux]
---
Today I tried flux and the dart language from Google, it was easy and fast, I was able to develop a simple app with material UI in a couple of hours. The app fetch informations about bus waiting time using the bus stop id from Rome transportation operator ATAC. There is no API for that so the app just fetch the web page and parse it to retrieve the informations.

## Dart and Flux

[Dart](https://www.dartlang.org/ "Dart home page") is a general programming language developed by Google, I had no previous experience but coding was very limited for this application so it was pretty straightforward to do it.

[Flutter](https://flutter.io "Flutter home page") is a cross platform mobile sdk to develop app for Android and IOS, also this is developed by Google. In order to build a Flutter Android app, Android Studio is required however is possible to develop with VS Code.

Be aware that along with Flutter installation comes Dart. In Android Studio is needed to properly configure the Dart sdk location, you can use the one you get with Flutter just point to the right path, look into the \bin\cache\dart-sdk inside the flutter folder.

## Development

Development was very easy and fast, actually I tried to develop the same app with Java and Android Studio and my productivity was way below compared to the Flutter app.
In a few hours I have everything set up and running and I was able to publish to the Play Store the app very easily. 

For this simple app from start to publishing it was less than a day of work with no previous experience in publishing an app or developing with Android Studio or Dart. I was able to use [App Bundle](https://developer.android.com/platform/technology/app-bundle/) but sadly no Crashlytics.

If you want to work with Flutter but necessarily need Crashlytics vote [here](https://github.com/flutter/flutter/issues/14765) to ask for an implementation.

[Here the listing](https://play.google.com/store/apps/details?id=it.davidelettieri.attesabusatac "Attesa Bus play store page") :)
Source code is in the [attesa_bus repo](https://github.com/davidelettieri/attesa_bus)