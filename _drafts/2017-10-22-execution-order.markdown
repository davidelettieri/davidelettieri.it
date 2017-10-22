---
layout: post
title:  "Exection Order"
date:   2017-10-22 21:00:07 +0200
categories: c# oop
description: I have a .NET console app which calls several methods and I want to be sure that I call them in the correct order. More precisely I want that the code doesn't compile if the order is not correct.
---

## The problem
I have a .NET console app which calls several methods and I want to be sure that I call them in the correct order. More precisely I want that the code doesn't compile if the order is not correct.

## The solution
We're going to leverage the OOP paradigm to force the execution order.