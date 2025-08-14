import React from 'react';
import Giscus from '@giscus/react';
import BrowserOnly from '@docusaurus/BrowserOnly';

function GiscusCommentsInternal() {
  return (
    <Giscus
      id="comments"
      repo="davidelettieri/davidelettieri.it"
      repoId="MDEwOlJlcG9zaXRvcnkxMDMwNTcwMDM="
      category="Announcements"
      categoryId="DIC_kwDOBiSGa84CuIrP"
      mapping="pathname"
      strict="0"
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="top"
      theme="light"
      lang="en"
      loading="lazy"
    />
  );
}

export default function GiscusComments() {
  return (
    <BrowserOnly fallback={<div>Loading comments...</div>}>
      {() => <GiscusCommentsInternal />}
    </BrowserOnly>
  );
}