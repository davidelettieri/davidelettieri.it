---
title: "Announcing the new comment system"
date: 2025-08-18
---

After thinking about it for some time I decided to add a comment system to the blog. What I hope is that I will get valuable feedback from readers, which will help me improve the content, my understanding of the topics I write about, and the overall quality of the blog.

### How It Was Built

I decided all of this while on a beach, in Italy and I didn't have access to a coding environment. So I decided to treat myself with a copilot pro license and try to get it implemented by the copilot agent.

Somehow it worked out, I realized quickly that I didn't give enough information to complete the task, but with some back-and-forth, we got there in the end.

<!-- truncate -->

The whole implementation took 4 iterations, [here's the PR](https://github.com/davidelettieri/davidelettieri.it/pull/69) with my requests to copilot, at first the comment box wasn't rendering and copilot chose some parameters that didn't match what I wanted for giscus. Strangely enough, I provided a `script` tag and asked copilot to extrapolate the values and use them in the code but it didn't work. Then I asked in the copilot chat to extrapolate the values to a table and I provided it to copilot. This worked well. Last point I asked copilot to reposition the comment box. It worked right away.

Key points:
- copilot introduced an error with a docusaurus component, it wasn't able to fix it in 2 iterations and it wasn't really needed. I asked to remove it.
- I forgot to include from the start the parameters and the position for the comment box. Maybe given at the beginning the result could have been  achieved faster.
- copilot changed my `yarn.lock` by replacing the registry `https://registry.yarnpkg.com` with `https://registry.npmjs.org`. I regenerated `yarn.lock` from scratch. I doesn't make any difference however I would have preferred not having a huge diff on the `yarn.lock` file wondering what might have happened.

### Caveats of the comments system.

The system I chose is [giscus](https://giscus.app/it) which is a github-based comment system, so anyone who wants to add a comment will need a github account. I know this won't work for all people however I hope it will work for most people.

Finally I can say: let me know what you think in the comment box!
