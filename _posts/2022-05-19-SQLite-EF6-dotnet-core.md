---
layout: post
title:  "Using EF6 with SQLite on dotnet core"
date:   2022-05-19 19:00:00 +0200
categories: EF6 SQLite 'C#' '.NET Core'
description: In this post we will see how to use EF6 (not EF Core) in a .NET Core application with SQLite
---

In this post we will see how to use EF6 (not EF Core) in a .NET Core application with SQLite. Why we would like to do this? Maybe we are migrating a project from the full framework to .NET Core but we are not ready to migrate also EF6 to EF Core. I will not show how to work with migrations.

First of all, we need to install two packages in our project:
- System.Data.SQLite.EF6
- System.Data.SQLite

I needed both of them and they need to have matching versions. Then we need to configure our DbContext. In a full framework application we would need to update the `app.config` or `web.config` with the appropriate sections for EF6. In a .NET Core project we won't have these files but we can configure EF6 directly in the code.

```csharp
public class MyConfiguration : DbConfiguration
{
    public MyConfiguration()
    {
        SetProviderServices("System.Data.SQLite.EF6",
            System.Data.SQLite.EF6.SQLiteProviderFactory.Instance.GetService(
                typeof(DbProviderServices)) as DbProviderServices);
        SetProviderServices("System.Data.SQLite",
            System.Data.SQLite.EF6.SQLiteProviderFactory.Instance.GetService(
                typeof(DbProviderServices)) as DbProviderServices);
        SetProviderFactory("System.Data.SQLite.EF6", System.Data.SQLite.EF6.SQLiteProviderFactory.Instance);
        SetProviderFactory("System.Data.SQLite", SQLiteFactory.Instance);
    }
}
```

Then we need to tell EF6 to use this configuration and pass the `SQLiteConnectionString`

```csharp
// here I'm setting the configuration
[DbConfigurationType(typeof(MyConfiguration))]
class MyContext : DbContext
{
    // I didn't find a better way to pass the connection to the context. 
    // You probably will need to pass che connection string 
    // via the MyContext constructor
    public MyContext() 
    : base(new SQLiteConnection() {ConnectionString = "Data Source=test.db"}, true)
    {
    }

    public DbSet<Foo> Foos { get; set; }
}
```

That's it. 
