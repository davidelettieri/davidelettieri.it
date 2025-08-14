import React from 'react';
import Giscus from '@giscus/react';
import { useColorMode } from '@docusaurus/theme-common';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function GiscusComments() {
  return (
    <BrowserOnly fallback={<div>Loading comments...</div>}>
      {() => {
        const { colorMode } = useColorMode();
        
        return (
          <Giscus
            id="comments"
            repo="davidelettieri/davidelettieri.it"
            repoId="R_kgDOHfVwxA"
            category="General"
            categoryId="DIC_kwDOHfVwxM4CZa_h"
            mapping="pathname"
            reactionsEnabled="1"
            emitMetadata="0"
            inputPosition="bottom"
            theme={colorMode}
            lang="en"
            loading="lazy"
          />
        );
      }}
    </BrowserOnly>
  );
}