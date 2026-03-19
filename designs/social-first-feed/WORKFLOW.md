# PetBase Social-First Feed — Stitch Execution Workflow

This document contains the workflow for generating screens in Stitch via the web UI.

## Prerequisites

- A Google account with access to [stitch.withgoogle.com](https://stitch.withgoogle.com)
- All prompt files in `designs/social-first-feed/`

## Step 1: Create Project

1. Go to [stitch.withgoogle.com](https://stitch.withgoogle.com)
2. Create a new project titled **"PetBase Redesign — Social-First Feed"**

## Step 2: Apply Theme Settings

In the Stitch project settings, configure:
- **Font:** DM Sans
- **Roundness:** Medium
- **Custom color:** #FF6B6B
- **Color mode:** Dark

## Step 3: Generate Screens

For each screen, paste the prompt content from the corresponding file into the Stitch text generation field:

1. **Screen 1 — Social Feed:** paste from `screen-1-social-feed.prompt.md` (Prompt section)
2. **Screen 2 — Explore:** paste from `screen-2-explore.prompt.md`
3. **Screen 3 — Pet Profile:** paste from `screen-3-pet-profile.prompt.md`
4. **Screen 4 — Create Action Sheet:** paste from `screen-4-create-action-sheet.prompt.md`

Wait for each screen to generate before starting the next.

## Step 4: Generate Variants on Screen 1

Use Stitch's Variants feature on Screen 1 (Social Feed):
- **Creativity level:** Explore (~0.7)
- **Aspects:** Layout, Color Scheme

## Step 5: Collect Screen URLs

For each generated screen, copy the Stitch URL:
`https://stitch.withgoogle.com/projects/<ID>?node-id=<screenId>`

## Step 6: Update DESIGN.md

After all screens are generated, update DESIGN.md with actual project ID and screen URLs.
