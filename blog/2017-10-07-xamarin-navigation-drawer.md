---
title: Xamarin Navigation Drawer
tags: [xamarin, android, c#]
date: 2017-10-07
---

## The problem

Last week I was trying for the first time to write a simple app using Xamarin. I wanted a "material design" menu which after some research I understood to be a [navigation drawer](https://material.io/guidelines/patterns/navigation-drawer.html "Navigation drawer design guidelines"). 

<!-- truncate -->

## The solution

I googled "navigation drawer xamarin" and found out several pages and posts with tutorials and source code. However I was not able to make it work. After some research and anger I decided to download and install Android Studio in order to do it with the original tools. 

After the 2GB download and install I found out that Android Studio offers a template to do a navigation drawer, since I got what I wanted for free I decided to translate everything to Xamarin and my beloved Visual Studio.

### tl;dr

All the code is available at the [xamarin-templates repo](https://github.com/davidelettieri/xamarin-templates "Xamarin templates repo")

## The fun

My IDE is VS2017 and I created a "Blank App (Android)" project. I decided for:
* Minimum Android version: Android 5.0 (API Level 21 - Lollipop)
* Target Framework: Android 7.1 (Nougat)
* Target Android version: "Use compile using SDK version"

 From the import of the java project:

```java
import android.os.Bundle;
import android.support.design.widget.FloatingActionButton;
import android.support.design.widget.Snackbar;
import android.view.View;
import android.support.design.widget.NavigationView;
import android.support.v4.view.GravityCompat;
import android.support.v4.widget.DrawerLayout;
import android.support.v7.app.ActionBarDrawerToggle;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.Toolbar;
import android.view.Menu;
import android.view.MenuItem;
```

I decided which NuGet packages to install:

```xml
<?xml version="1.0" encoding="utf-8"?>
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
  <package id="Xamarin.Android.Support.v4" version="25.4.0.2" targetFramework="monoandroid71" />
  <package id="Xamarin.Android.Support.v7.AppCompat" version="25.4.0.2" targetFramework="monoandroid71" />
  <package id="Xamarin.Android.Support.v7.RecyclerView" version="25.4.0.2" targetFramework="monoandroid71" />
  <package id="Xamarin.Android.Support.Vector.Drawable" version="25.4.0.2" targetFramework="monoandroid71" />
</packages>
```

Then I copied all the resources files to my Xamarin Project into the folder:
* drawable
* layout: replaced the default mail.axml with the activity_mail.xml, all files renamed to .axml
* menu
* values: didn't ovveride String.xml, just updated it

**TIP** When you have compilation errors in your xamarin project close all editor windows and rebuild, sometimes there are no actual errors!

Just modifying the MainActivity.cs to the following code will make the app running. I tested on my Moto G3 (Lollipop) and on a Samsung S7 (Nougat)

```csharp
using Android.App;
using Android.OS;
using Android.Support.V7.App;

namespace Xamarin.NavigationDrawer
{
    [Activity(Label = "Xamarin.NavigationDrawer", MainLauncher = true, Theme = "@style/AppTheme.NoActionBar")]
    public class MainActivity : AppCompatActivity
    {
        protected override void OnCreate(Bundle savedInstanceState)
        {
            base.OnCreate(savedInstanceState);

            // Set our view from the "main" layout resource
            SetContentView(Resource.Layout.activity_main);
        }
    }
}
```

Now we have to translate all the java code to the magnificient C# equivalent.

The java bits 

```java
public class MainActivity extends AppCompatActivity
        implements NavigationView.OnNavigationItemSelectedListener {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        Toolbar toolbar = (Toolbar) findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        FloatingActionButton fab = (FloatingActionButton) findViewById(R.id.fab);
        fab.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Snackbar.make(view, "Replace with your own action", Snackbar.LENGTH_LONG)
                        .setAction("Action", null).show();
            }
        });

        DrawerLayout drawer = (DrawerLayout) findViewById(R.id.drawer_layout);
        ActionBarDrawerToggle toggle = new ActionBarDrawerToggle(
                this, drawer, toolbar, R.string.navigation_drawer_open, R.string.navigation_drawer_close);
        drawer.setDrawerListener(toggle);
        toggle.syncState();

        NavigationView navigationView = (NavigationView) findViewById(R.id.nav_view);
        navigationView.setNavigationItemSelectedListener(this);
    }

    @Override
    public void onBackPressed() {
        DrawerLayout drawer = (DrawerLayout) findViewById(R.id.drawer_layout);
        if (drawer.isDrawerOpen(GravityCompat.START)) {
            drawer.closeDrawer(GravityCompat.START);
        } else {
            super.onBackPressed();
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.main, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle action bar item clicks here. The action bar will
        // automatically handle clicks on the Home/Up button, so long
        // as you specify a parent activity in AndroidManifest.xml.
        int id = item.getItemId();

        //noinspection SimplifiableIfStatement
        if (id == R.id.action_settings) {
            return true;
        }

        return super.onOptionsItemSelected(item);
    }

    @SuppressWarnings("StatementWithEmptyBody")
    @Override
    public boolean onNavigationItemSelected(MenuItem item) {
        // Handle navigation view item clicks here.
        int id = item.getItemId();

        if (id == R.id.nav_camera) {
            // Handle the camera action
        } else if (id == R.id.nav_gallery) {

        } else if (id == R.id.nav_slideshow) {

        } else if (id == R.id.nav_manage) {

        } else if (id == R.id.nav_share) {

        } else if (id == R.id.nav_send) {

        }

        DrawerLayout drawer = (DrawerLayout) findViewById(R.id.drawer_layout);
        drawer.closeDrawer(GravityCompat.START);
        return true;
    }
}
```

The "translation" is pretty easy and I throwed in a bunch of var since the type are easy to understand. So here it is.

```csharp
[Activity(Label = "Xamarin.NavigationDrawer", MainLauncher = true, Theme = "@style/AppTheme.NoActionBar")]
public class MainActivity : AppCompatActivity, NavigationView.IOnNavigationItemSelectedListener
{
    protected override void OnCreate(Bundle savedInstanceState)
    {
        base.OnCreate(savedInstanceState);

        // Set our view from the "main" layout resource
        SetContentView(Resource.Layout.activity_main);

        var toolbar = FindViewById<Toolbar>(Resource.Id.toolbar);
        SetSupportActionBar(toolbar);

        var fab = FindViewById<FloatingActionButton>(Resource.Id.fab);

        fab.SetOnClickListener(new FabClickListener());

        var drawer = FindViewById<DrawerLayout>(Resource.Id.drawer_layout);
        var toggle = new ActionBarDrawerToggle(this, drawer, toolbar, Resource.String.navigation_drawer_open, Resource.String.navigation_drawer_close);

        // this is deprecated, don't know how to fix this yet
        drawer.SetDrawerListener(toggle);

        toggle.SyncState();

        NavigationView navigationView = FindViewById<NavigationView>(Resource.Id.nav_view);
        navigationView.SetNavigationItemSelectedListener(this);
    }

    public bool OnNavigationItemSelected(IMenuItem menuItem)
    {
        int id = menuItem.ItemId;

        if (id == Resource.Id.nav_camera)
        {
            // Handle the camera action
        }
        else if (id == Resource.Id.nav_gallery)
        {

        }
        else if (id == Resource.Id.nav_slideshow)
        {

        }
        else if (id == Resource.Id.nav_manage)
        {

        }
        else if (id == Resource.Id.nav_share)
        {

        }
        else if (id == Resource.Id.nav_send)
        {

        }

        DrawerLayout drawer = FindViewById<DrawerLayout>(Resource.Id.drawer_layout);
        drawer.CloseDrawer(GravityCompat.Start);
        return true;
    }

    public override void OnBackPressed()
    {
        var drawer = FindViewById<DrawerLayout>(Resource.Id.drawer_layout);

        if (drawer.IsDrawerOpen(GravityCompat.Start))
        {
            drawer.CloseDrawer(GravityCompat.Start);
        }
        else
        {
            base.OnBackPressed();
        }
    }

    public override bool OnCreateOptionsMenu(IMenu menu)
    {
        MenuInflater.Inflate(Resource.Menu.main, menu);
        return true;
    }

    public override bool OnOptionsItemSelected(IMenuItem item)
    {

        if(item.ItemId == Resource.Id.action_settings)
        {
            return true;
        }

        return base.OnOptionsItemSelected(item);
    }
}
```