# Astro to fumadocs Layout Migration Guide

This guide explains how to migrate your Astro layouts to the new fumadocs-compatible React layouts.

## 🔄 Layout Mapping

| Astro Layout | fumadocs Equivalent | Purpose |
|--------------|-------------------|---------|
| `BaseLayout.astro` | `BaseLayout` | Foundation layout with nav/footer |
| `RightSidebarLayout.astro` | `RightSidebarLayout` | Two-column layout with right sidebar |
| `BlogLayout.astro` | `BlogLayout` | Blog posts with TOC, author, pagination |
| `InfoPagesLayout.astro` | `InfoPagesLayout` | Info pages with breadcrumbs, TOC |
| `DocsLayout.astro` | `DocsLayout` (converted) | Documentation with mobile/desktop bars, sidebar |

## 📦 Available Layouts

### 1. BaseLayout

**Purpose**: Foundation layout equivalent to your Astro BaseLayout.astro

```tsx
import { BaseLayout } from '@/components/layouts/base-layout';

export default function MyPage() {
  return (
    <BaseLayout hideNav={false} hideFooter={false}>
      <div>Your page content</div>
    </BaseLayout>
  );
}
```

**Props**:
- `hideNav?: boolean` - Hide navigation bar
- `hideFooter?: boolean` - Hide footer  
- `className?: string` - Additional CSS classes
- `children: ReactNode` - Page content

### 2. RightSidebarLayout

**Purpose**: Two-column layout with main content and right sidebar

```tsx
import { RightSidebarLayout } from '@/components/layouts/right-sidebar-layout';

const TableOfContents = () => (
  <div>
    <h4>On this page</h4>
    <nav>
      <a href="#section1">Section 1</a>
      <a href="#section2">Section 2</a>
    </nav>
  </div>
);

export default function MyPage() {
  return (
    <RightSidebarLayout sidebar={<TableOfContents />}>
      <article>Your main content</article>
    </RightSidebarLayout>
  );
}
```

**Props**:
- `children: ReactNode` - Main content
- `sidebar?: ReactNode` - Right sidebar content
- `className?: string` - Additional CSS classes

### 3. BlogLayout

**Purpose**: Complete blog post layout with author, TOC, navigation, and related posts

```tsx
import { BlogLayout } from '@/components/layouts/blog-layout';
import type { BlogFrontmatter, TeamMember, TocHeading, BlogNavItem } from '@/components/layouts/blog-layout';

// Your blog page component
export default function BlogPost({ 
  frontmatter, 
  team, 
  headings, 
  previous, 
  next, 
  relatedPosts 
}: {
  frontmatter: BlogFrontmatter;
  team?: TeamMember;
  headings?: TocHeading[];
  previous?: BlogNavItem;
  next?: BlogNavItem;
  relatedPosts?: BlogNavItem[];
}) {
  return (
    <BlogLayout
      frontmatter={frontmatter}
      team={team}
      headings={headings}
      previous={previous}
      next={next}
      relatedPosts={relatedPosts}
    >
      <div>Your blog post content</div>
    </BlogLayout>
  );
}
```

**Key Interfaces**:

```tsx
interface BlogFrontmatter {
  page: string;          // Page title
  title: string;         // Post title  
  description: string;   // Post description
  pubDate: string;       // Publication date
  image: {               // Featured image
    url: string;
    alt: string;
  };
  tags: string[];        // Post tags
  team?: string;         // Team member slug
  category?: string;     // Category
}

interface TeamMember {
  slug: string;
  data: {
    name: string;
    role: string;
    image?: { url: string; alt: string; };
  };
}

interface TocHeading {
  depth: number;         // Heading level (2 or 3)
  slug: string;          // URL fragment
  text: string;          // Heading text
}
```

### 4. DocsLayout (Converted from Astro)

**Purpose**: Documentation layout with mobile/desktop navigation bars and sidebar

```tsx
import { DocsLayout } from '@/components/layouts';

export default function DocsPage({ pageTree, children }) {
  return (
    <DocsLayout tree={pageTree}>
      <div>Your documentation content</div>
    </DocsLayout>
  );
}
```

**Key Features**:
- **BaseLayout foundation** with hidden nav/footer (like Astro version)
- **MobileTopBar** for mobile navigation
- **DesktopTopBar** for desktop navigation  
- **Sidebar** with full-height navigation
- **Responsive layout** with proper breakpoints
- **Integration** with fumadocs TreeContextProvider

**Props**:
- `tree: PageTree.Root` - Page tree for navigation
- `children: ReactNode` - Documentation content
- `className?: string` - Additional CSS classes

### 5. InfoPagesLayout

**Purpose**: Information pages with breadcrumbs, header, and navigation

```tsx
import { InfoPagesLayout } from '@/components/layouts/info-pages-layout';
import type { InfoPageFrontmatter, BreadcrumbItem, TocHeading, InfoNavItem } from '@/components/layouts/info-pages-layout';

export default function InfoPage({ 
  frontmatter, 
  headings, 
  previous, 
  next, 
  breadcrumbs 
}: {
  frontmatter: InfoPageFrontmatter;
  headings?: TocHeading[];
  previous?: InfoNavItem;
  next?: InfoNavItem;
  breadcrumbs?: BreadcrumbItem[];
}) {
  return (
    <InfoPagesLayout
      frontmatter={frontmatter}
      headings={headings}
      previous={previous}
      next={next}
      breadcrumbs={breadcrumbs}
    >
      <div>Your info page content</div>
    </InfoPagesLayout>
  );
}
```

**Key Interfaces**:

```tsx
interface InfoPageFrontmatter {
  page: string;          // Page title
  description?: string;  // Page description
  pubDate: string;       // Last updated date
  category?: string;     // Category
}

interface BreadcrumbItem {
  label: string;         // Display text
  href: string;          // Link URL
}
```

## 🛠️ Migration Steps

### Step 1: Install Dependencies

Ensure you have the required dependencies:

```bash
npm install class-variance-authority tailwind-merge
```

### Step 2: Copy Layout Files

Copy the new layout files to your project:

- `apps/docs-2/src/components/layouts/base-layout.tsx`
- `apps/docs-2/src/components/layouts/right-sidebar-layout.tsx`
- `apps/docs-2/src/components/layouts/blog-layout.tsx`
- `apps/docs-2/src/components/layouts/info-pages-layout.tsx`

### Step 3: Update Your Pages

Replace Astro layout usage with React layout usage:

**Before (Astro)**:
```astro
---
import BlogLayout from "~/layouts/BlogLayout.astro";
const { frontmatter, previous, next, headings = [] } = Astro.props;
---

<BlogLayout>
  <div slot="main">
    <h1>{frontmatter.title}</h1>
    <slot />
  </div>
  <div slot="rightAside">
    <!-- TOC content -->
  </div>
</BlogLayout>
```

**After (React)**:
```tsx
import { BlogLayout } from '@/components/layouts/blog-layout';

export default function BlogPost({ frontmatter, previous, next, headings, content }) {
  return (
    <BlogLayout
      frontmatter={frontmatter}
      previous={previous}
      next={next}
      headings={headings}
    >
      <h1>{frontmatter.title}</h1>
      {content}
    </BlogLayout>
  );
}
```

### Step 4: Update Data Structures

Ensure your data matches the expected interfaces:

```tsx
// Convert Astro frontmatter to typed interfaces
const blogFrontmatter: BlogFrontmatter = {
  page: astroProps.frontmatter.page,
  title: astroProps.frontmatter.title,
  description: astroProps.frontmatter.description,
  pubDate: astroProps.frontmatter.pubDate,
  image: astroProps.frontmatter.image,
  tags: astroProps.frontmatter.tags,
  team: astroProps.frontmatter.team,
  category: astroProps.frontmatter.category
};
```

### Step 5: Customize Styling

Update the CSS classes in the layouts to match your design system:

```tsx
// In base-layout.tsx, update the Navigation and Footer components
function Navigation() {
  return (
    <nav className="your-custom-nav-classes">
      {/* Your navigation content */}
    </nav>
  );
}
```

## 🎨 Styling Notes

### Color Scheme

The layouts use a neutral color scheme that works with dark mode:

- **Gray scales**: `gray-50` to `gray-900`
- **Primary accent**: `blue-500`, `blue-600`
- **Dark mode**: Uses `dark:` prefixes

### Responsive Design

All layouts are mobile-first and responsive:

- **Mobile**: Single column, hidden sidebars
- **Tablet**: `md:` breakpoint adaptations
- **Desktop**: `lg:` full layout with sidebars

### Typography

Uses Tailwind's typography plugin (`prose` classes) for content areas.

## 🔧 Known Issues

### React Type Conflicts

You may see TypeScript warnings about ReactNode types. This is due to React 19 type definitions conflicts and doesn't affect functionality.

**Temporary Workaround**: Add to your tsconfig.json:
```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

### Missing Icons

Some icon placeholders are included. Replace with your preferred icon library:

```tsx
// Replace basic SVG icons with your icon library
import { ChevronRightIcon } from '@heroicons/react/24/outline';
```

## 📚 Usage Examples

### Basic Blog Migration

```tsx
// pages/blog/[slug].tsx
import { BlogLayout } from '@/components/layouts/blog-layout';
import { getPostData, getTeamMember, getRelatedPosts } from '@/lib/content';

export default async function BlogPost({ params }) {
  const post = await getPostData(params.slug);
  const team = post.frontmatter.team ? await getTeamMember(post.frontmatter.team) : undefined;
  const relatedPosts = await getRelatedPosts(post.frontmatter.tags);

  return (
    <BlogLayout
      frontmatter={post.frontmatter}
      team={team}
      headings={post.headings}
      relatedPosts={relatedPosts}
    >
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </BlogLayout>
  );
}
```

### Custom Breadcrumbs

```tsx
const customBreadcrumbs = [
  { label: 'Home', href: '/' },
  { label: 'Documentation', href: '/docs' },
  { label: 'API Reference', href: '/docs/api' },
  { label: 'Current Page', href: '#' }
];

<InfoPagesLayout breadcrumbs={customBreadcrumbs}>
  {/* content */}
</InfoPagesLayout>
```

## 🚀 Next Steps

1. **Test the layouts** with your existing content
2. **Customize styling** to match your brand
3. **Add missing components** (icons, navigation, footer)
4. **Optimize performance** with proper image loading
5. **Add analytics** and other tracking as needed

## 💡 Tips

- Use the `withRightSidebar` HOC for quick sidebar integration
- Implement table of contents generation from your markdown headings
- Add loading states for dynamic content
- Consider using Suspense boundaries for async components

---

This migration provides feature parity with your Astro layouts while leveraging fumadocs' powerful documentation features. 