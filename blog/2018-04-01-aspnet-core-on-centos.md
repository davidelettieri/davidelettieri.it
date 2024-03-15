---
title:  "ASPNET Core on CentOS"
date:   2018-04-01 13:50:00 +0200
tags: [aspnet-core linux centos digitalocean]
---
Today I experimented with the DigitalOcean Cloud and the aspnet core deploy on a linux server. Specifically I wanted to deploy a sample .net core web app on a CentOS 7 server using nginx as a web server. I have no experience in managing a linux server or using nginx or deploying aspnet core to linux in general, however I do have some experience with the bash and the linux environment. 

Anyone that could manage some bash commands and edit text files on the command line should be able to follow along easily. I would like to praise DigitalOcean since their documentation it's extensive and very useful.

## Prerequisites

* If you are on a windows machine you need to install the linux subsystem for windows and a distro of your choice from the windows store. I installed ubuntu and it served me well.
* A CentOS server somewhere. I created a 'droplet', which is their name for a virtual machine, on DigitalOcean. The smallest one is at 5$ at month, it's a very reasonable price for playing with a cloud linux instance. **I will describe briefly what I had to do**
* A working aspnet core web app. I suggest to install vs code with the latest aspnet core sdk on your working machine. We will not develop on our server. **We will see together what steps are needed to build for linux on a windows machine**

## CentOS

Creating a vm on digital ocean it's just a couple of clicks, I will not explain/screenshot what is needed. Let's talk about ssh, wikipedia says 

>Secure Shell (SSH) is a cryptographic network protocol for operating network services securely over an unsecured network. The best known example application is for remote login to computer systems by users.

So that's the tool we will use to log on our remote machine. 
* The native ssh client on windows (exists!) does not support, at the time of writing, the type of keys needed for digital ocean. That's why I used linux.
*  You can use putty and puttygen and there is a simple guide on digital ocean website, but I didn't like it and since I will be using a linux server I thought it was better to work with linux also on the client machine. I choose one easy way, installing the linux subsystem but you can use a linux live cd or install linux on your machine, that's up to you.
* There's a time sensitive operation on the ssh keys and the vm creation. DigitalOcean allows to add the key on the admin panel and if you do so before creating the vm then you can log on the vm with the ssh key (no passwords!) from your pc straight away. I was very eager to create the machine and start experimenting so I created the vm before the linux subsystem was installed on my machine and I had to add the keys later. **Please be aware that if you have multiple pcs you may need to generate the keys and add them to the vm anyway so it's useful to know how to do it**
* After successfully log into my vm I followed the recommended steps for a CentOS server:
    1. [Initial server setup with centos 7](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-centos-7 "Initial server setup with centos 7") 
    2. [Additional recommended steps for new centos 7 servers](https://www.digitalocean.com/community/tutorials/additional-recommended-steps-for-new-centos-7-servers "Additional recommended steps for new centos 7 servers")

From now on I will assume that you have
1. linux on your client machine
2. the vm up and running with a public ip

At this moment I was able to log into my vm as root with a password using 
```
ssh root@ip_vm
```

### How to generates the ssh keys and copy them on the server
This step could not be easier, just execute the following command in your linux environment
```
ssh-keygen -t rsa
```
I left the default option for the files position and I didn't use a passphrase. Now we will add our public key to the server using the following command
```
ssh-copy-id root@ip_vm
```
From now on you can log in your machine with no password from your linux environment.

### Server setup

It's the time to setup the server with the default configurations, so the only things I did different from the guides above are
1. I used nano instead of vi, because it's easier for me. It wasn't installed on the vm so I installed it using
```
yum install nano
```
2. I did not backup my machine, I'm just playing and I don't want to pay for a backup.
3. I called my non root user "aspnet"

### Install dotnet core on CentOS
We need to install the repository containing all the required packages and the install dotnet. Execute the following commands on the bash

```
sudo yum install centos-release-dotnet.noarch
sudo yum install rh-dotnet20
sudo scl enable rh-dotnet20 bash
```
Run
```
dotnet --version
```
to check that everything is working

### Nginx on CentOS

The nginx web server is not available in the default CentOS repository so we need to add the epel repository, please be aware that this repository in mantained by Fedora and this name will pop again later.

DigitalOcean has a documentation also for this [docs](https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-centos-7). You have to execute a couple of command to install it and then enable it at startup with **systemctl** and then open the 80 and 443 ports on the firewall with **firewall-cmd**. If you followed the guides above you should recognize these two tools.

#### Check that Nginx is working

Navigate on http://ip_vm and if everything is working you will see a sample page powered by *Fedora*.

### Creating the web app

I'm doing this with the latest stable version of the .NET Core sdk, execute the following command in a windows command shell
```
dotnet --version
```
If you got 2.1.103 or something later everything should work as expected. Create a folder on your working machine for your web app, open a cmd inside your this folder and run
```
dotnet new web
dotnet publish -c release -r centos.7-x64
```
These commands create a new sample web app and a publish folder with a self contained build of the app for centos 7.

### Copying files on the vm

Now it's time to copy our web application files to our vm, I used scp, google it for more informations. At first we have to open a linux shell in our web app publish directory. If you are using the linux subsystem your **C:\\** (or whatever you are using) directory will be in **/mnt/c**. Decide in what folder you want to deploy in your vm, I'm no expert on best practices so I just created a folder named "web-app" in the home folder of the aspnet user.

Run the following command in the publish folder of the web app and wait, it will take some time:
```
scp * aspnet@vm_ip:folder_web_app
```

### Run the app and check that is working

Using the dotnet command line and curl we can check if the app is working before configuring nginx as a reverse proxy. Run
```
dotnet [path to your dll]
curl http://localhost:5000
```
If the app is working you will see "Hello World!" printed in the console.

### Configure Nginx

At the beginning I was following the aspnet core [official documentation for nginx on ubuntu](https://docs.microsoft.com/en-us/aspnet/core/host-and-deploy/linux-nginx?tabs=aspnetcore2x), thinking that on CentOS would be the same. *I was wrong.* Ubuntu install a package that create for nginx a structure similar to apache and if your server is CentOS as mine you will not find it and creating it will not work by default. 

Whats works it's the server configuration that they provide
```
server {
    listen        80;
    server_name   _;
    location / {
        proxy_pass         http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection keep-alive;
        proxy_set_header   Host $http_host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Just update the default server configuration in /etc/nginx/nginx.conf with the content above. Last but not least, run
```
sudo setsebool httpd_can_network_connect on
```
or you will get an error. Then, as the documentation suggest, check the config file for errors and, if everythings looks good, reload it
```
sudo nginx -t
sudo nginx -s reload
```
At this point I am able to navigate to http://vm_ip and see the "Hello World!" string printed correctly. **AWESOME.**

### Final thoughts

The process seems long but it took more time to write than to execute it. It was fun, dotnet is cool, linux is super cool. The guide on the Microsoft Docs explain also how to make systemctl restart dotnet in case of crash, I didn't do it but I expect it to be pretty straightforward. If you try the same procedure feel free to drop me a line if something is wrong or missing.