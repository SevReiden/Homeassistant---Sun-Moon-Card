# Lovelace Sun & Moon Arc Card

A minimalist, highly customizable Home Assistant Lovelace card to visualize the positions of the Sun and the Moon along a 180-degree bogen path. 

This card is designed to blend perfectly with modern, dark-mode dashboards (glassmorphism-friendly) and supports custom glowing icons, a twilight color-fading arc, twinkling stars at night, and a clean digital clock.

---

## Features

- 🌓 **Dynamic Twilight Arc**: The arc seamlessly cross-fades from a warm sun gradient (daytime) to a cool moon-silver gradient (nighttime) during twilight (based on sun elevation between $+10^\circ$ and $-5^\circ$).
- 🕰️ **Live Digital Clock**: Centered perfectly above the peak of the arc.
- 🎨 **Custom Images Override**: Easily replace the default sun and moon vectors with custom images (e.g. glowing neon icons).
- ✨ **Twinkling Starry Sky**: Stars fade in and twinkle softly when night falls.
- 📐 **Super Compact Layout**: The horizon separator line, lower dashed arc, and textual info grid can be toggled on/off independently. If disabled, the card reduces to a flat, sleek arc that takes up minimal space.
- 🇩🇪🇬🇧 **Bilingual**: Supports German (`de`) and English (`en`) out of the box (auto-detects from Home Assistant settings).

---
<img width="379" height="227" alt="moon" src="https://github.com/user-attachments/assets/cd45895d-b67f-4825-b9f8-8e4d12dc1b76" />
<img width="361" height="343" alt="sun and moon" src="https://github.com/user-attachments/assets/78523dda-bf4c-40e7-b954-6450e5606827" />
<img width="360" height="412" alt="full" src="https://github.com/user-attachments/assets/bf8516d8-ef9d-4d2c-941a-0d822aa2bfa1" />

---

## Installation

### Option 1: Manual Installation

1. Download the [sun-moon-card.js](sun-moon-card.js) file.
2. Copy it into your Home Assistant config folder under `www/` (e.g., `config/www/sun-moon-card.js`).
3. Add the resource reference in Home Assistant:
   - Go to **Settings** -> **Dashboards** -> Click the three dots -> **Resources**.
   - Add a new resource:
     - **URL**: `/local/sun-moon-card.js?v=1.1.6`
     - **Type**: `JavaScript Module`

*(Tip: If you update the code, always increase the `?v=X.X.X` query parameter to bypass the browser cache!)*

### Option 2: HACS Custom Repository

1. Go to HACS in your Home Assistant.
2. Click the three dots in the top right corner and select **Custom repositories**.
3. Paste your GitHub repository URL, select **Lovelace** as the category, and click **Add**.
4. Install the card from HACS.

---

## Custom Icons (Optional)

To use custom glowing icons, copy your image files (e.g. `sun_icon.png` and `moon_icon.png`) to your `config/www/` folder, then reference them in your card configuration:

```yaml
sun_image: /local/sun_icon.png
moon_image: /local/moon_icon.png
```

---

## Configuration Examples

### 1. Minimalistic Arc (Clock only)
```yaml
type: custom:sun-moon-card
show_time: true
```

### 2. Custom Images & Clock
```yaml
type: custom:sun-moon-card
show_time: true
sun_image: /local/sun_icon.png
moon_image: /local/moon_icon.png
```

### 3. Full Config (With Info Grid & Horizon Line)
```yaml
type: custom:sun-moon-card
title: "Sonne & Mond"
show_time: true
show_glow: true
show_line: true
show_info: true
sun_image: /local/sun_icon.png
moon_image: /local/moon_icon.png
```

---

## Configuration Variables

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `type` | string | **Required** | `custom:sun-moon-card` |
| `title` | string | `""` | Optional title displayed at the top left. |
| `sun_entity` | string | `sun.sun` | Sun entity ID. |
| `moon_entity` | string | `sensor.moon` | Moon entity ID. |
| `language` | string | `auto` | UI language (`de` or `en`). Defaults to HA language. |
| `show_time` | boolean | `false` | Shows a live clock above the arc. |
| `show_glow` | boolean | `true` | Shows a soft background gradient glow. |
| `show_line` | boolean | `false` | Shows the horizon line, lower shading, and dashed circle. |
| `show_info` | boolean | `false` | Shows the bottom text grid with times and angles. |
| `show_stars` | boolean | `true` | Shows twinkling stars at night. |
| `sun_image` | string | `""` | Path to custom sun image (e.g. `/local/sun_icon.png`). |
| `moon_image` | string | `""` | Path to custom moon image (e.g. `/local/moon_icon.png`). |

---

## Development Notes

This card is built using vanilla web components and uses standard SVG paths for rendering.
The positions of the sun and moon are interpolated using time-based progress relative to the actual sunrise and sunset times (making it mathematically robust against asynchronous Home Assistant state updates).
