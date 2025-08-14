# Giscus Comment System Setup

This project now includes Giscus comments on individual blog posts.

## What was added

1. **@giscus/react package** - React component for Giscus comments
2. **GiscusComments component** - Custom wrapper component in `src/components/GiscusComments.js`
3. **BlogPostPage wrapper** - Swizzled component in `src/theme/BlogPostPage/index.js` to add comments to blog posts

## Configuration

The current Giscus configuration in `src/components/GiscusComments.js` uses placeholder values. To properly set up Giscus:

1. Visit [giscus.app](https://giscus.app/) 
2. Enable Discussions in your GitHub repository settings
3. Install the Giscus app on your repository
4. Configure Giscus settings and copy the generated values
5. Update the following values in `src/components/GiscusComments.js`:
   - `repo`: Your repository name (already set to "davidelettieri/davidelettieri.it")
   - `repoId`: Get from Giscus app configuration
   - `category`: Choose discussion category (currently "General")
   - `categoryId`: Get from Giscus app configuration

## Features

- Comments appear only on individual blog post pages (not on main blog listing)
- Automatic dark/light theme switching based on site theme
- Pathname-based mapping for unique discussions per post
- Lazy loading for better performance
- SSR-safe implementation using BrowserOnly wrapper

## Testing

Run `npm run build` to verify the build works, then `npm run serve` to test locally.