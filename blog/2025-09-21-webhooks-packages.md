---
title:  Webhooks packages to simplify 
date: 2025-09-21
tags: [c#, webhooks, ASP.NET Core]
---

A few weeks back I became aware of an attempt to create a technology agnostic standard to send and receive webhooks securely. The proposal is [here](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md). 

In my opinion, the standard is straightforward and non-controversial. The only part that is mandatory is the signing part, other parts are optional and somehow suggesting best practices. 

In the standard-webhooks repo you'll find multiple sample implementations and some links to community implementations including one for C#. I was researching webhooks standards to implement my own packages and to play a bit with copilot agent on github. So I decided to go ahead and do it.

<!-- truncate -->

The end result is this [repo](https://github.com/davidelettieri/webhooks/tree/main) which contains:
- two packages: one to send webhooks, one to receive it
- a sample aspire application to see how all of this works
- some tests to verify implementation and interoperability with existing community .NET implementation of standard webhooks

I used copilot agent mostly to iterate over security features and less known (to me!) cryptographic operations. Overall I'm happy with the result, it's a simple implementation, there are plenty of validations on header number, headers' values length, body length etc. 

Please note that it is a partial implementation because it supports only symmetric signature and it is based over a pre-shared key, but the packages do not provide any key management support.

Overall a small exercise and there are multiple pieces to be built in order to have a fully functional webhooks system. If we assume APIs to setup everything we should have
- [Publisher side] Configuration API: clients interested in receiving webhooks should be able to configure listening endpoints, possibly including the pre-shared key
- [Publisher side] Retry with backoff: we want to publish webhooks with a "at least once" semantic. Retries with reasonable backoff and persistence are a must. Regardless of backoff we probably want to stop after a certain number of retries. 
- [Publisher side] Webhooks history: we should provide a suitable endpoint to provide a list of webhooks published during a time window for cases when consumers are unable to consume webhooks for a long time or they become uncertain of which webhooks were processed correctly. 
- [Receiver side] Fast-ACK: when receiving webhooks we should be able to acknowledge as fast as possible to avoid timeout and automatic retries to be triggered. This means that if we need to trigger some business process when receiving webhooks we should do it asynchronously.
- [Receiver side] Idempotency, it will protect from replay attacks and it will avoid that unintended duplicated webhooks will be processed twice.

In my professional experience I worked on most (if not all) of the features in several companies. I will try to continue the work on the repo to implement all of this, with reasonable interfaces but selecting technologies I like.

If we need to store webhooks to be able to retry after application reboots, what kind of storage do we use? We could use a document db or a relational database, or something like [Hangfire](https://www.hangfire.io/).

Should we use event sourcing to store the webhook payload, something like a `WebhookReceived` event, acknowledge to the publisher and enable async processing? Can we use a distributed cache to implement idempotency? 

I think most of the remaining parts, if not all, will be strongly opinionated and possibly depending on the existing stack of the application we are working on. I will try to implement all using pieces that I like. 

If you are interested in seeing something in particular of if you think I missed something, let me know using the comment box below or sending me a message through email / linkedin.