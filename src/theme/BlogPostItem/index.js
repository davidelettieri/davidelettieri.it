import React from 'react';
import BlogPostItem from '@theme-original/BlogPostItem';
import GiscusComments from '@site/src/components/GiscusComments';
import { useBlogPost } from '@docusaurus/plugin-content-blog/client';
import { useLocation } from '@docusaurus/router';

export default function BlogPostItemWrapper(props) {
  const { isBlogPostPage } = useBlogPost();
  const location = useLocation();
  
  // Check if we're on an individual blog post page (not the main blog listing)
  // Blog post URLs have a pattern like /YYYY/MM/DD/post-name
  const isBlogPostPagePath = /^\/\d{4}\/\d{2}\/\d{2}\//.test(location.pathname);
  
  // Only show comments on individual blog post pages
  const showComments = isBlogPostPage && isBlogPostPagePath;
  
  return (
    <>
      <BlogPostItem {...props} />
      {showComments && (
        <div style={{ marginTop: '2rem' }}>
          <GiscusComments />
        </div>
      )}
    </>
  );
}