import React from 'react';
import BlogPostPage from '@theme-original/BlogPostPage';
import GiscusComments from '@site/src/components/GiscusComments';
import { useLocation } from '@docusaurus/router';

export default function BlogPostPageWrapper(props) {
  const location = useLocation();
  
  // Check if we're on an individual blog post page (not the main blog listing)
  // Blog post URLs have a pattern like /YYYY/MM/DD/post-name
  const isBlogPostPage = /^\/\d{4}\/\d{2}\/\d{2}\//.test(location.pathname);
  
  return (
    <>
      <BlogPostPage {...props} />
      {isBlogPostPage && (
        <div style={{ marginTop: '2rem' }}>
          <GiscusComments />
        </div>
      )}
    </>
  );
}
