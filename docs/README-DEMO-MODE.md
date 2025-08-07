# Demo Mode Readme

This document explains how to enable and preview content notification emails. Terminology has been updated:

- Pages
- Blogs
- GBP Posts
- SEO Changes (formerly Improvements)

Use the preview endpoint:

POST /api/email/preview/content with body { taskType, title, url }

Accepted taskType values include: page, blog, gbp_post, gbp-post, improvement, maintenance, seochange
