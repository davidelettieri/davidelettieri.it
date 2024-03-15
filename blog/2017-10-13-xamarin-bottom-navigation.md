---
title:  "Xamarin Bottom Navigation"
date:   2017-10-13 21:00:07 +0200
tags: [xamarin android c#]
---

## The problem

The bottom navigation is a very simple and easy template from Android Studio, the porting took 15 minutes at most and the result is quite appealing.

## The solution

Ported from the Android Studio template, quick and easy the [Navigation Drawer](2017-10-07-xamarin-navigation-drawer.md "Navigation Drawer porting from Android Studio") was way harder than this.

### tl;dr

All the code is available at the [xamarin-templates repo](https://github.com/davidelettieri/xamarin-templates "Xamarin templates repo")

## The fun

My IDE is VS2017 and I created a "Blank App (Android)" project. I decided for:
* Minimum Android version: Android 5.0 (API Level 21 - Lollipop)
* Target Framework: Android 7.1 (Nougat)
* Target Android version: "Use compile using SDK version"

All the NuGet packages installed, be aware that I only choose a couple of them, the other are dependencies.

```xml
<packages>
  <package id="Xamarin.Android.Support.Animated.Vector.Drawable" version="25.4.0.2" targetFramework="monoandroid71" />
  <package id="Xamarin.Android.Support.Annotations" version="25.4.0.2" targetFramework="monoandroid71" />
  <package id="Xamarin.Android.Support.Compat" version="25.4.0.2" targetFramework="monoandroid71" />
  <package id="Xamarin.Android.Support.Core.UI" version="25.4.0.2" targetFramework="monoandroid71" />
  <package id="Xamarin.Android.Support.Core.Utils" version="25.4.0.2" targetFramework="monoandroid71" />
  <package id="Xamarin.Android.Support.Design" version="25.4.0.2" targetFramework="monoandroid71" />
  <package id="Xamarin.Android.Support.Fragment" version="25.4.0.2" targetFramework="monoandroid71" />
  <package id="Xamarin.Android.Support.Media.Compat" version="25.4.0.2" targetFramework="monoandroid71" />
  <package id="Xamarin.Android.Support.Transition" version="25.4.0.2" targetFramework="monoandroid71" />
  <package id="Xamarin.Android.Support.v7.AppCompat" version="25.4.0.2" targetFramework="monoandroid71" />
  <package id="Xamarin.Android.Support.v7.RecyclerView" version="25.4.0.2" targetFramework="monoandroid71" />
  <package id="Xamarin.Android.Support.Vector.Drawable" version="25.4.0.2" targetFramework="monoandroid71" />
</packages>
```

**TIP** Always look at the Android Manifest for the theme of the app, in Xamarin I opted for the Theme Attribute on the Activity. Don't know if there are other options.

**TIP** There are several resources to copy in order to make the project work. Look at the source code for the details.

The java source code

```java
import android.os.Bundle;
import android.support.annotation.NonNull;
import android.support.design.widget.BottomNavigationView;
import android.support.v7.app.AppCompatActivity;
import android.view.MenuItem;
import android.widget.TextView;

public class MainActivity extends AppCompatActivity {

    private TextView mTextMessage;

    private BottomNavigationView.OnNavigationItemSelectedListener mOnNavigationItemSelectedListener
            = new BottomNavigationView.OnNavigationItemSelectedListener() {

        @Override
        public boolean onNavigationItemSelected(@NonNull MenuItem item) {
            switch (item.getItemId()) {
                case R.id.navigation_home:
                    mTextMessage.setText(R.string.title_home);
                    return true;
                case R.id.navigation_dashboard:
                    mTextMessage.setText(R.string.title_dashboard);
                    return true;
                case R.id.navigation_notifications:
                    mTextMessage.setText(R.string.title_notifications);
                    return true;
            }
            return false;
        }

    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        mTextMessage = (TextView) findViewById(R.id.message);
        BottomNavigationView navigation = (BottomNavigationView) findViewById(R.id.navigation);
        navigation.setOnNavigationItemSelectedListener(mOnNavigationItemSelectedListener);
    }

}
```

The C# version, I think that the C# properties give a better readability to the code.

```csharp
using Android.App;
using Android.Widget;
using Android.OS;
using Android.Support.V7.App;
using Android.Support.Design.Widget;
using Android.Views;

namespace Xamarin.BottomNavigation
{
    [Activity(Label = "Xamarin.BottomNavigation", MainLauncher = true, Theme = "@style/AppTheme")]
    public class MainActivity : AppCompatActivity, BottomNavigationView.IOnNavigationItemSelectedListener
    {
        private TextView _textMessage;

        public bool OnNavigationItemSelected(IMenuItem item)
        {
            switch (item.ItemId)
            {
                case Resource.Id.navigation_home:
                    _textMessage.Text = GetString(Resource.String.title_home);
                    return true;
                case Resource.Id.navigation_dashboard:
                    _textMessage.Text = GetString(Resource.String.title_dashboard);
                    return true;
                case Resource.Id.navigation_notifications:
                    _textMessage.Text = GetString(Resource.String.title_notifications);
                    return true;
            }
            return false;
        }

        protected override void OnCreate(Bundle savedInstanceState)
        {
            base.OnCreate(savedInstanceState);

            SetContentView(Resource.Layout.Main);

            _textMessage = FindViewById<TextView>(Resource.Id.message);

            var navigation = FindViewById<BottomNavigationView>(Resource.Id.navigation);

            navigation.SetOnNavigationItemSelectedListener(this);
        }
    }
}
```

That's it :)