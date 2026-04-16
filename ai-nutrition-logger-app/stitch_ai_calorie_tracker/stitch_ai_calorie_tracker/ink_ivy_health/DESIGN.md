# Design System Document: The Analog Health Ledger

## 1. Overview & Creative North Star: "The Digital Sketchbook"
The North Star of this design system is **"The Living Journal."** Most health apps feel like clinical instruments—cold, rigid, and demanding. This system rejects that sterile perfection in favor of a human, tactile, and low-pressure environment. It reimagines the interface as a physical sketchbook where the user is "writing" their health journey rather than "inputting data."

To break the "template" look, we utilize **Intentional Imperfection.** We replace surgical precision with hand-drawn paths, variable stroke weights, and asymmetric containers. By pairing high-contrast black and white with a clean, informal sans-serif, we achieve a look that is "High-End Brutalist" yet approachable.

## 2. Colors & Tonal Depth
The palette is rooted in a stark, monochromatic foundation, punctuated by a singular, deep botanical green (`secondary`).

### The Palette
- **Core Neutral:** `surface` (#f9f9f9) acts as the "paper."
- **High Contrast:** `on_surface` (#2d3435) provides the "ink."
- **The Signature Accent:** `secondary` (#4e6455) is used sparingly for moments of growth or health-positive feedback.

### The "No-Line" Rule (Standard) vs. The "Ink-Line" Rule (Contextual)
While standard UI relies on 1px solid grey lines, this system prohibits them. 
1. **Primary Separation:** Boundaries are defined by shifting from `surface` to `surface_container_low`.
2. **Decorative Separation:** Where a border is stylistically required to maintain the "sketch" feel, use a **SVG Hand-Drawn Path** utilizing the `outline` (#757c7d) token. Never use a CSS `border: 1px solid`.

### Surface Hierarchy & Nesting
Treat the UI as stacked sheets of vellum. 
- **Base Layer:** `surface`
- **Grouped Content:** `surface_container_low`
- **Interactive Cards:** `surface_container_lowest` (Pure White) to create a subtle "pop" against the off-white paper.

## 3. Typography: The "Plus Jakarta Sans" Editorial Scale
We use **Plus Jakarta Sans** for its clean geometry softened by slightly informal, modern curves. 

*   **Display (Display-LG/MD):** Used for "Big Numbers" (e.g., daily step count). Tight tracking (-2%) to emphasize the compact nature.
*   **Headlines (Headline-SM):** Used for section titles. These should be paired with a "Doodle" underline icon to emphasize the journal feel.
*   **Body (Body-MD/SM):** Set with generous line height (1.6) but kept in small, compact blocks. Avoid long paragraphs; use bulleted lists or "Post-it" style containers.
*   **Labels (Label-MD):** All-caps with increased letter spacing (+5%) for a "technical notation" look within a sketchbook.

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are forbidden. They feel too "software-native."

*   **The Layering Principle:** Use `surface_container_highest` for elements that need to feel "recessed" into the paper (like an input field).
*   **The "Sketch Shadow":** To lift an element, use a **Hard Offset Shadow**. Instead of a blur, use a solid block of `surface_container_high` offset by 4px down and 4px right to mimic a thick paper edge.
*   **Glassmorphism:** For floating action buttons or navigation bars, use `surface_container_lowest` at 80% opacity with a `backdrop-filter: blur(12px)`. This suggests a translucent tracing paper effect.

## 5. Components

### Buttons
*   **Primary:** Solid `primary` (#5e5e5e) background with `on_primary` text. The shape should have a `DEFAULT` (0.25rem) radius, but the border-box should be wrapped in a hand-drawn SVG "sketchy" outline that slightly overshoots the corners.
*   **Secondary:** No background. A "Doodle" style border using the `secondary` (#4e6455) token. 

### Input Fields
*   **Styling:** A simple bottom-border using a "rough" hand-drawn line. The label (Label-SM) sits above the line in `on_surface_variant`.
*   **States:** On focus, the bottom line thickens and shifts to `secondary`.

### Cards & Lists
*   **The Divider Rule:** Forbid 1px horizontal lines. Use 24px of `whitespace` or a subtle background shift to `surface_container_low`.
*   **Compact Usage:** Lists should be dense. Use `body-sm` for list items to maintain the "ledger" aesthetic, ensuring high contrast (`on_surface`) for legibility.

### Health-Specific Components
*   **The "Mood Doodle":** Instead of standard radio buttons, use a set of 5 hand-drawn faces. When selected, the icon scales up by 10% and gains a `secondary_container` circular background.
*   **The Progress "Ink-Smudge":** Progress bars should look like a highlighter stroke. Use `secondary_fixed` for the track and `secondary` for the fill, with "rough" ends rather than perfect radii.

## 6. Do’s and Don’ts

### Do:
*   **Use Asymmetry:** It’s okay if a "hand-drawn" box is 2 pixels wider on one side. It adds to the soul of the system.
*   **Embrace Whitespace:** Because the text is compact, let the layout breathe. High-end design lives in the gaps.
*   **Use Micro-Animations:** When an item is checked, use a "scribble-out" animation or a "hand-drawn" checkmark appearing.

### Don't:
*   **No Photographs:** If a visual is needed, commission a doodle-style illustration using only the `primary` and `secondary` color tokens.
*   **No Geometric Icons:** Never use standard Material or FontAwesome icons. Use custom, variable-width stroke icons that look like they were drawn with a 0.5mm felt-tip pen.
*   **No Perfect Circles:** Even for radio buttons or profile pictures, use a "squircle" or a slightly wobbly hand-drawn circle.