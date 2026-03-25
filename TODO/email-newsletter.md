# Automated Email Newsletter

**Status:** PLANNED
**Priority:** LOW

## Requirements

- Weekly digest of published articles sent to subscribers
- Responsive HTML email templates (MJML or inline CSS)
- Subscriber management (sign-up form already exists on site)
- Unsubscribe handling
- Integration with Resend API (already used for weekly report)

## Implementation notes

- New workflow: `.github/workflows/newsletter.yml`
- Runs weekly (Saturday morning, after weekly report)
- Builds digest from `topics_history.json` and `post_index.json`
- Uses Resend API with audience/contact list features
- Template stored in `pipeline/templates/newsletter.html`
