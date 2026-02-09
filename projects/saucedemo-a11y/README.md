# SauceDemo Accessibility Automation Framework

This framework runs **industry-standard automated accessibility checks** for SauceDemo using:
- **Playwright** (E2E browser automation)
- **axe-core** (WCAG rules engine)

## Coverage
- Login page
- Inventory page
- Cart page
- Checkout step one page

Rules scanned:
- `wcag2a`
- `wcag2aa`
- `wcag21aa`

## Run
```bash
cd /home/vnc/.openclaw/workspace/projects/saucedemo-a11y
npm install
npx playwright install chromium
npm run test:a11y
```

## Reports
After run:
- JSON: `reports/results.json`
- HTML: `reports/playwright-html/index.html`

Open report:
```bash
npm run report
```

## Notes
- Tests fail if any accessibility violations are detected.
- Artifacts on failure: screenshot, video, trace.
- Extend easily by adding more pages/workflows in `tests/a11y.spec.ts`.
