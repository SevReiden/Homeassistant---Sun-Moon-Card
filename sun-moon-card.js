// Custom Lovelace Card: Sun and Moon Arc Visualization
// Registers in window.customCards to show in the HA Card Picker

const TRANSLATIONS = {
  de: {
    sunrise: 'Sonnenaufgang',
    sunset: 'Sonnenuntergang',
    elevation: 'Höhenwinkel',
    azimuth: 'Azimut',
    moon: 'Mond',
    moon_phase: 'Mondphase',
    position: 'Position',
    illuminated: 'Beleuchtet',
    daylight: 'Tageslicht',
    night: 'Nacht',
    next: 'nächster',
    at: 'um',
    phases: {
      new_moon: 'Neumond',
      warning_crescent: 'Abnehmende Sichel',
      waxing_crescent: 'Zunehmende Sichel',
      first_quarter: 'Erstes Viertel (Halbmond)',
      waxing_gibbous: 'Zunehmender Mond',
      full_moon: 'Vollmond',
      waning_gibbous: 'Abnehmender Mond',
      last_quarter: 'Letztes Viertel (Halbmond)',
      waning_crescent: 'Abnehmende Sichel'
    }
  },
  en: {
    sunrise: 'Sunrise',
    sunset: 'Sunset',
    elevation: 'Elevation',
    azimuth: 'Azimuth',
    moon: 'Moon',
    moon_phase: 'Moon Phase',
    position: 'Position',
    illuminated: 'Illuminated',
    daylight: 'Daylight',
    night: 'Night',
    next: 'next',
    at: 'at',
    phases: {
      new_moon: 'New Moon',
      waxing_crescent: 'Waxing Crescent',
      first_quarter: 'First Quarter',
      waxing_gibbous: 'Waxing Gibbous',
      full_moon: 'Full Moon',
      waning_gibbous: 'Waning Gibbous',
      last_quarter: 'Last Quarter',
      waning_crescent: 'Waning Crescent'
    }
  }
};

const MOON_PATHS = {
  'new_moon': '',
  'waxing_crescent': 'M 12 2 A 10 10 0 0 1 12 22 A 5 10 0 0 1 12 2 Z',
  'first_quarter': 'M 12 2 A 10 10 0 0 1 12 22 Z',
  'waxing_gibbous': 'M 12 2 A 10 10 0 0 1 12 22 A 5 10 0 0 0 12 2 Z',
  'full_moon': 'M 12 2 A 10 10 0 1 1 11.99 2 Z',
  'waning_gibbous': 'M 12 2 A 10 10 0 0 0 12 22 A 5 10 0 0 1 12 2 Z',
  'last_quarter': 'M 12 2 A 10 10 0 0 0 12 22 Z',
  'waning_crescent': 'M 12 2 A 10 10 0 0 0 12 22 A 5 10 0 0 0 12 2 Z'
};

const phaseFractions = {
  'new_moon': 0.0,
  'waxing_crescent': 0.125,
  'first_quarter': 0.25,
  'waxing_gibbous': 0.375,
  'full_moon': 0.5,
  'waning_gibbous': 0.625,
  'last_quarter': 0.75,
  'waning_crescent': 0.875
};

class SunMoonCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._initialized = false;
    this._clockInterval = null;
  }

  static getConfigElement() {
    return document.createElement('sun-moon-card-editor');
  }

  static getStubConfig() {
    return {
      title: 'Sonne & Mond',
      show_time: true,
      show_glow: true,
      show_line: false,
      show_info: false
    };
  }

  setConfig(config) {
    this.config = {
      title: '',
      sun_entity: 'sun.sun',
      moon_entity: 'sensor.moon',
      language: '',
      show_stars: true,
      show_info: false, // Default to false (hides bottom info grid)
      show_line: false, // Default to false (hides horizon separator line, dashed path & shading)
      show_time: false, // Default to false (can be enabled to show clock above arc)
      show_glow: true,  // Default to true (can be disabled to hide background glow)
      sun_image: '',     // Path to custom image for the sun
      moon_image: '',    // Path to custom image for the moon
      ...config
    };
    
    // Re-initialize DOM if configuration options affecting layout changed
    if (this._initialized) {
      this._initCard();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initCard();
    }
    this._updateCard();
  }

  connectedCallback() {
    this._startClock();
  }

  disconnectedCallback() {
    this._stopClock();
  }

  getCardSize() {
    return this.config.show_info ? 3 : 2;
  }

  _startClock() {
    this._stopClock();
    if (this.config.show_time) {
      this._updateClock();
      this._clockInterval = setInterval(() => this._updateClock(), 10000);
    }
  }

  _stopClock() {
    if (this._clockInterval) {
      clearInterval(this._clockInterval);
      this._clockInterval = null;
    }
  }

  _updateClock() {
    const timeEl = this.shadowRoot.getElementById('time-display');
    if (!timeEl) return;
    
    const now = new Date();
    const userLang = this.config.language || (this._hass && this._hass.language) || 'de';
    const lang = TRANSLATIONS[userLang] ? userLang : 'de';
    
    timeEl.textContent = now.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  }

  _initCard() {
    const showInfo = this.config.show_info;
    const showLine = this.config.show_line;
    const showTime = this.config.show_time;
    const showGlow = this.config.show_glow !== undefined ? this.config.show_glow : true;
    
    // Use taller SVG viewBox and aspect ratio only if show_line is active
    // height: 90 is required to show the full lower circle (up to Y=83)
    const useTallView = showLine;
    const viewBox = useTallView ? '0 0 100 90' : '0 0 100 48';
    const aspect = useTallView ? '1.15' : '2.1';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          position: relative;
          overflow: visible;
          padding: 16px;
          background: var(--ha-card-background, var(--card-background-color, rgba(255, 255, 255, 0.03)));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--ha-card-border-color, rgba(255, 255, 255, 0.1));
          border-radius: var(--ha-card-border-radius, 16px);
          box-shadow: var(--ha-card-box-shadow, 0 4px 20px rgba(0,0,0,0.15));
          transition: all 0.3s ease;
        }
        .card-header {
          font-size: 16px;
          font-weight: 600;
          color: var(--primary-text-color);
          padding: 0 0 10px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          letter-spacing: 0.5px;
        }
        .card-header:empty {
          display: none;
          padding: 0;
        }
        .visual-container {
          position: relative;
          width: 100%;
          aspect-ratio: ${aspect};
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: ${showTime ? '32px' : '0'};
        }
        .time-display {
          display: ${showTime ? 'block' : 'none'};
          position: absolute;
          top: -34px; /* Adjusted to give more breathing room at the top */
          font-size: 20px;
          font-weight: 500;
          color: var(--primary-text-color);
          z-index: 2;
          pointer-events: none;
          letter-spacing: 0.5px;
          text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .glow-bg {
          display: ${showGlow ? 'block' : 'none'};
          position: absolute;
          top: ${showTime ? '-32px' : '0'};
          left: 0;
          width: 100%;
          height: ${showTime ? 'calc(100% + 32px)' : '100%'};
          pointer-events: none;
          z-index: 0;
          transition: opacity 1.5s ease-in-out;
          opacity: 0;
        }
        .glow-bg.active {
          opacity: 1;
        }
        .glow-day {
          background: radial-gradient(circle at 50% 45%, rgba(255, 160, 0, 0.18) 0%, rgba(255, 210, 0, 0.06) 45%, rgba(0, 0, 0, 0) 70%);
        }
        .glow-night {
          background: radial-gradient(circle at 50% 45%, rgba(138, 43, 226, 0.12) 0%, rgba(255, 0, 128, 0.03) 50%, rgba(0, 0, 0, 0) 75%);
        }
        svg {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
        }
        
        /* Arcs */
        .sky-arc {
          transition: opacity 1.5s ease-in-out;
        }
        .day-arc {
          stroke: url(#dayArcGradient);
          stroke-width: 1.5;
        }
        .moon-arc {
          stroke: url(#moonArcGradient);
          stroke-width: 1.5;
        }
        
        .earth-arc {
          display: ${showLine ? 'block' : 'none'};
          stroke: var(--divider-color, rgba(255, 255, 255, 0.15));
          stroke-width: 1;
          stroke-dasharray: 2, 3;
        }

        .horizon-line {
          display: ${showLine ? 'block' : 'none'};
        }
        
        /* Twinkling Stars */
        .stars {
          opacity: 0;
          transition: opacity 1.5s ease;
        }
        .night-mode .stars {
          opacity: 0.85;
        }
        .star {
          fill: #ffffff;
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 1; }
        }
        .twinkle-1 { animation: twinkle 3s infinite ease-in-out; }
        .twinkle-2 { animation: twinkle 4s infinite ease-in-out; }
        .twinkle-3 { animation: twinkle 5.5s infinite ease-in-out; }

        /* Sun Styling */
        .sun-marker {
          transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .sun-glow {
          fill: rgba(255, 170, 0, 0.6);
          transition: fill 1.5s ease;
        }
        .sun-core {
          fill: #fffbeb;
          transition: fill 1.5s ease;
        }
        .night-mode .sun-glow {
          fill: rgba(255, 170, 0, 0.15);
        }
        .night-mode .sun-core {
          fill: rgba(255, 255, 255, 0.3);
        }

        /* Moon Styling - Always 100% visible (no day-mode or below-horizon dimming) */
        .moon-marker {
          transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
          opacity: 1 !important; /* Forces 100% opacity always */
        }
        .moon-glow {
          fill: rgba(226, 232, 240, 0.2);
          transition: fill 1.5s ease;
        }
        .night-mode .moon-glow {
          fill: rgba(226, 232, 240, 0.45);
        }
        
        /* Active status / Opacities based on elevation */
        .sun-marker.below-horizon {
          opacity: 0.35;
        }

        /* Info Grid Styling */
        .info-grid {
          display: ${showInfo ? 'grid' : 'none'};
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          margin-top: 14px;
          border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
          padding-top: 14px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .info-label {
          font-size: 10px;
          text-transform: uppercase;
          color: var(--secondary-text-color);
          margin-bottom: 4px;
          letter-spacing: 0.8px;
          font-weight: 500;
        }
        .info-value {
          font-size: 13px;
          font-weight: 600;
          color: var(--primary-text-color);
          display: flex;
          align-items: center;
          gap: 4px;
          height: 20px;
        }
        .info-sub {
          font-size: 10px;
          color: var(--secondary-text-color);
          margin-top: 2px;
          white-space: nowrap;
        }

        .highlight-sun {
          color: #ff9f00;
          text-shadow: 0 0 10px rgba(255, 159, 0, 0.2);
        }
        .highlight-moon {
          color: #a0aec0;
          text-shadow: 0 0 10px rgba(160, 174, 192, 0.2);
        }
        .night-mode .highlight-moon {
          color: #e2e8f0;
          text-shadow: 0 0 10px rgba(226, 232, 240, 0.3);
        }
      </style>
      <ha-card id="card-container">
        <div class="card-header" id="card-title"></div>
        <div class="visual-container">
          <div class="time-display" id="time-display"></div>
          <div class="glow-bg glow-day" id="glow-day"></div>
          <div class="glow-bg glow-night" id="glow-night"></div>
          
          <svg viewBox="${viewBox}" width="100%" height="100%">
            <defs>
              <linearGradient id="dayArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#ff6b00" />
                <stop offset="35%" stop-color="#ffaa00" />
                <stop offset="50%" stop-color="#ffea00" />
                <stop offset="65%" stop-color="#ffaa00" />
                <stop offset="100%" stop-color="#ff6b00" />
              </linearGradient>
              <linearGradient id="moonArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#94a3b8" stop-opacity="0.8" />
                <stop offset="50%" stop-color="#f1f5f9" stop-opacity="0.95" />
                <stop offset="100%" stop-color="#94a3b8" stop-opacity="0.8" />
              </linearGradient>
              <linearGradient id="nightArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#581c87" stop-opacity="0.7"/>
                <stop offset="50%" stop-color="#2e1065" stop-opacity="0.7"/>
                <stop offset="100%" stop-color="#581c87" stop-opacity="0.7"/>
              </linearGradient>
              <filter id="sunGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="moonGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            
            <!-- Twinkling stars in night mode -->
            <g class="stars" id="svg-stars">
              <circle cx="15" cy="14" r="0.4" class="star twinkle-1" />
              <circle cx="28" cy="22" r="0.3" class="star twinkle-2" />
              <circle cx="48" cy="10" r="0.5" class="star twinkle-3" />
              <circle cx="72" cy="18" r="0.4" class="star twinkle-1" />
              <circle cx="85" cy="12" r="0.3" class="star twinkle-2" />
              <circle cx="62" cy="26" r="0.4" class="star twinkle-3" />
              <circle cx="36" cy="13" r="0.3" class="star twinkle-2" />
            </g>

            <!-- Bottom ground shading removed -->

            <!-- Arcs -->
            <!-- Day Sky Arc (above horizon) - overlaps with moon-arc -->
            <path class="sky-arc day-arc" id="day-arc" d="M 12 45 A 38 38 0 0 1 88 45" fill="none" stroke-linecap="round" />
            <path class="sky-arc moon-arc" id="moon-arc" d="M 12 45 A 38 38 0 0 1 88 45" fill="none" stroke-linecap="round" />
            
            <!-- Earth Arc (below horizon) -->
            <path class="earth-arc" d="M 88 45 A 38 38 0 0 1 12 45" fill="none" stroke-linecap="round" />
            
            <!-- Horizon separator line -->
            <line class="horizon-line" x1="4" y1="45" x2="96" y2="45" stroke="var(--divider-color, rgba(255, 255, 255, 0.15))" stroke-width="0.8" />
            
            <!-- Celestial Bodies -->
            <!-- Sun Marker -->
            <g class="sun-marker" id="sun-marker">
              <g id="sun-graphic-container">
                <circle cx="0" cy="0" r="4.5" class="sun-glow" filter="url(#sunGlow)" />
                <circle cx="0" cy="0" r="3" class="sun-core" />
              </g>
            </g>

            <!-- Moon Marker -->
            <g class="moon-marker" id="moon-marker">
              <g id="moon-graphic-container">
                <!-- Nested Moon Phase path representation -->
                <g id="moon-vector-container">
                  <circle cx="0" cy="0" r="4.5" class="moon-glow" filter="url(#moonGlow)" />
                  <g transform="scale(0.35) translate(-12, -12)">
                    <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.08)"/>
                    <path id="moon-phase-path" fill="#e2e8f0" />
                  </g>
                </g>
              </g>
            </g>
          </svg>
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label" id="label-sunrise-sunset"></span>
            <span class="info-value highlight-sun" id="val-sunrise-sunset"></span>
            <span class="info-sub" id="sub-sunrise-sunset"></span>
          </div>
          <div class="info-item">
            <span class="info-label" id="label-position"></span>
            <span class="info-value" id="val-elevation"></span>
            <span class="info-sub" id="val-azimuth"></span>
          </div>
          <div class="info-item">
            <span class="info-label" id="label-moon"></span>
            <span class="info-value highlight-moon" id="val-moon-phase"></span>
            <span class="info-sub" id="val-moon-illum"></span>
          </div>
        </div>
      </ha-card>
    `;
    this._initialized = true;
    this._startClock();
  }

  _updateCard() {
    if (!this._hass) return;

    const sunEntity = this.config.sun_entity || 'sun.sun';
    const sunState = this._hass.states[sunEntity];
    if (!sunState) {
      this.shadowRoot.getElementById('card-title').textContent = `Entity not found: ${sunEntity}`;
      return;
    }

    // Determine current language
    const userLang = this.config.language || this._hass.language || this._hass.locale?.language || 'de';
    const lang = TRANSLATIONS[userLang] ? userLang : 'de';
    const t = TRANSLATIONS[lang];

    // Card title
    const titleEl = this.shadowRoot.getElementById('card-title');
    titleEl.textContent = this.config.title !== undefined ? this.config.title : '';

    // Extraction of Sun Attributes
    const elevation = parseFloat(sunState.attributes.elevation) || 0;
    const azimuth = parseFloat(sunState.attributes.azimuth) || 0;
    const nextRising = sunState.attributes.next_rising;
    const nextSetting = sunState.attributes.next_setting;
    const isDay = sunState.state === 'above_horizon';

    // Toggle Themes (Day / Night classes)
    const cardContainer = this.shadowRoot.getElementById('card-container');
    const glowDay = this.shadowRoot.getElementById('glow-day');
    const glowNight = this.shadowRoot.getElementById('glow-night');

    if (isDay) {
      cardContainer.className = 'day-mode';
      glowDay.classList.add('active');
      glowNight.classList.remove('active');
    } else {
      cardContainer.className = 'night-mode';
      glowDay.classList.remove('active');
      glowNight.classList.add('active');
    }

    // Update Arc Opacities (Dynamic twilight transition to moon color)
    const dayArc = this.shadowRoot.getElementById('day-arc');
    const moonArc = this.shadowRoot.getElementById('moon-arc');
    if (dayArc && moonArc) {
      let dayOpacity = 1;
      let moonOpacity = 0;
      
      // Interpolate colors between +10° and -5° sun elevation
      if (elevation > 10) {
        dayOpacity = 1;
        moonOpacity = 0;
      } else if (elevation < -5) {
        dayOpacity = 0;
        moonOpacity = 1;
      } else {
        dayOpacity = (elevation - (-5)) / 15;
        moonOpacity = 1 - dayOpacity;
      }
      
      dayArc.style.opacity = dayOpacity;
      moonArc.style.opacity = moonOpacity;
    }

    // SVG Geometry variables
    const Cx = 50;
    const Cy = 45;
    const R = 38;

    // Time calculations for position tracing
    const now = Date.now();
    let F_sun = 0.5; // defaults to left (sunrise)
    let sunriseTimeStr = '';
    let sunsetTimeStr = '';
    let isTimesAvailable = nextRising && nextSetting;

    if (isTimesAvailable) {
      const nextRisingMs = new Date(nextRising).getTime();
      const nextSettingMs = new Date(nextSetting).getTime();
      const isDayTime = nextSettingMs < nextRisingMs;

      // Format time strings based on locale
      sunriseTimeStr = new Date(isDayTime ? (nextRisingMs - 24 * 3600 * 1000) : nextRisingMs)
        .toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
      sunsetTimeStr = new Date(isDayTime ? nextSettingMs : (nextSettingMs - 24 * 3600 * 1000))
        .toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });

      if (isDayTime) {
        // Sun is up
        const todaySunrise = nextRisingMs - 24 * 60 * 60 * 1000;
        const todaySunset = nextSettingMs;
        const P_day = Math.max(0, Math.min(1, (now - todaySunrise) / (todaySunset - todaySunrise)));
        F_sun = 0.5 - 0.5 * P_day; // 0.5 (East) -> 0.0 (West)
      } else {
        // Sun is down
        const lastSunset = nextSettingMs - 24 * 60 * 60 * 1000;
        const nextSunrise = nextRisingMs;
        const P_night = Math.max(0, Math.min(1, (now - lastSunset) / (nextSunrise - lastSunset)));
        F_sun = 1.0 - 0.5 * P_night; // 1.0 (West below) -> 0.5 (East rising)
      }
    } else {
      // Polar Regions Fallback
      sunriseTimeStr = 'N/A';
      sunsetTimeStr = 'N/A';
      const hours = new Date().getHours() + new Date().getMinutes() / 60;
      F_sun = (18 - hours) / 24; // Simple time alignment
      if (F_sun < 0) F_sun += 1.0;
    }

    // Set Sun Position Coordinates
    const sunAngle = 2 * Math.PI * F_sun;
    const sunX = Cx + R * Math.cos(sunAngle);
    const sunY = Cy - R * Math.sin(sunAngle);

    // Update Sun marker
    const sunMarker = this.shadowRoot.getElementById('sun-marker');
    sunMarker.setAttribute('transform', `translate(${sunX}, ${sunY})`);
    if (isDay) {
      sunMarker.classList.remove('below-horizon');
    } else {
      sunMarker.classList.add('below-horizon');
    }

    // Apply custom sun image if configured
    const sunGraphic = this.shadowRoot.getElementById('sun-graphic-container');
    if (this.config.sun_image) {
      if (!sunGraphic.querySelector('image')) {
        sunGraphic.innerHTML = `<image href="${this.config.sun_image}" x="-6" y="-6" width="12" height="12" />`;
      } else {
        const img = sunGraphic.querySelector('image');
        if (img.getAttribute('href') !== this.config.sun_image) {
          img.setAttribute('href', this.config.sun_image);
        }
      }
    } else {
      // Restore default vector sun if image config is empty
      if (sunGraphic.querySelector('image')) {
        sunGraphic.innerHTML = `
          <circle cx="0" cy="0" r="4.5" class="sun-glow" filter="url(#sunGlow)" />
          <circle cx="0" cy="0" r="3" class="sun-core" />
        `;
      }
    }

    // Get Moon Data
    const moonData = this._getMoonData();
    const F_moon = (F_sun + moonData.fraction) % 1.0;

    // Set Moon Position Coordinates
    const moonAngle = 2 * Math.PI * F_moon;
    const moonX = Cx + R * Math.cos(moonAngle);
    const moonY = Cy - R * Math.sin(moonAngle);

    // Update Moon marker
    const moonMarker = this.shadowRoot.getElementById('moon-marker');
    moonMarker.setAttribute('transform', `translate(${moonX}, ${moonY})`);
    
    // Moon is always 100% visible, so below-horizon class does not affect opacity

    // Apply custom moon image if configured
    const moonGraphic = this.shadowRoot.getElementById('moon-graphic-container');
    if (this.config.moon_image) {
      // Hide standard vector moon drawing if custom image is used
      const vec = this.shadowRoot.getElementById('moon-vector-container');
      if (vec) vec.style.display = 'none';

      if (!moonGraphic.querySelector('image')) {
        moonGraphic.innerHTML += `<image href="${this.config.moon_image}" x="-6" y="-6" width="12" height="12" />`;
      } else {
        const img = moonGraphic.querySelector('image');
        if (img.getAttribute('href') !== this.config.moon_image) {
          img.setAttribute('href', this.config.moon_image);
        }
      }
    } else {
      // Restore default vector moon if image config is empty
      const img = moonGraphic.querySelector('image');
      if (img) img.remove();
      
      const vec = this.shadowRoot.getElementById('moon-vector-container');
      if (vec) vec.style.display = 'block';

      const moonPhasePath = this.shadowRoot.getElementById('moon-phase-path');
      if (moonPhasePath) {
        moonPhasePath.setAttribute('d', MOON_PATHS[moonData.phase] || '');
      }
    }

    // Update live clock if enabled
    if (this.config.show_time) {
      this._updateClock();
    }

    // If showing bottom info panel, update UI texts
    if (this.config.show_info) {
      const labelSunriseSunset = this.shadowRoot.getElementById('label-sunrise-sunset');
      const valSunriseSunset = this.shadowRoot.getElementById('val-sunrise-sunset');
      const subSunriseSunset = this.shadowRoot.getElementById('sub-sunrise-sunset');

      if (isDay) {
        labelSunriseSunset.textContent = t.sunset;
        valSunriseSunset.textContent = sunsetTimeStr;
        subSunriseSunset.textContent = `${t.sunrise}: ${sunriseTimeStr}`;
      } else {
        labelSunriseSunset.textContent = t.sunrise;
        valSunriseSunset.textContent = sunriseTimeStr;
        subSunriseSunset.textContent = `${t.sunset}: ${sunsetTimeStr}`;
      }

      this.shadowRoot.getElementById('label-position').textContent = t.position;
      this.shadowRoot.getElementById('val-elevation').textContent = `${elevation.toFixed(1)}°`;
      this.shadowRoot.getElementById('val-azimuth').textContent = `${t.azimuth}: ${azimuth.toFixed(1)}°`;

      this.shadowRoot.getElementById('label-moon').textContent = t.moon;
      this.shadowRoot.getElementById('val-moon-phase').textContent = t.phases[moonData.phase] || moonData.phase;
      this.shadowRoot.getElementById('val-moon-illum').textContent = `${t.illuminated}: ${moonData.illumination}%`;
    }
  }

  // Helper: Retrieve Moon State and properties
  _getMoonData() {
    const moonEntity = this.config.moon_entity || 'sensor.moon';
    const moonState = this._hass ? this._hass.states[moonEntity] : null;
    
    let phaseStr = null;
    let illumination = null;

    if (moonState) {
      const state = moonState.state;
      if (phaseFractions[state] !== undefined) {
        phaseStr = state;
        illumination = moonState.attributes.illumination !== undefined ? 
          parseFloat(moonState.attributes.illumination) : 
          this._calculateIllumination(phaseFractions[state]);
      } else if (!isNaN(state)) {
        illumination = parseFloat(state);
        phaseStr = this._getPhaseStrFromFraction(illumination / 100);
      }
    }

    // Fallback to local approximation based on the date
    if (!phaseStr) {
      const calculatedPhaseFraction = this._getApproxMoonPhaseFraction();
      phaseStr = this._getPhaseStrFromFraction(calculatedPhaseFraction);
      illumination = this._calculateIllumination(calculatedPhaseFraction);
    }

    return {
      phase: phaseStr,
      fraction: phaseFractions[phaseStr] || 0,
      illumination: Math.round(illumination)
    };
  }

  _calculateIllumination(fraction) {
    return 50 * (1 - Math.cos(2 * Math.PI * fraction));
  }

  _getApproxMoonPhaseFraction() {
    const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime();
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    const cycleLength = 29.530588853;
    const daysSince = (now - knownNewMoon) / msPerDay;
    let fraction = (daysSince / cycleLength) % 1;
    if (fraction < 0) fraction += 1.0;
    return fraction;
  }

  _getPhaseStrFromFraction(fraction) {
    if (fraction < 0.0625 || fraction >= 0.9375) return 'new_moon';
    if (fraction < 0.1875) return 'waxing_crescent';
    if (fraction < 0.3125) return 'first_quarter';
    if (fraction < 0.4375) return 'waxing_gibbous';
    if (fraction < 0.5625) return 'full_moon';
    if (fraction < 0.6875) return 'waning_gibbous';
    if (fraction < 0.8125) return 'last_quarter';
    return 'waning_crescent';
  }
}

customElements.define('sun-moon-card', SunMoonCard);

// Configure card in Card Picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'sun-moon-card',
  name: 'Sun & Moon Position Card',
  preview: true,
  description: 'A glowing, visual semi-circle tracking the paths and real-time positions of the Sun and the Moon.'
});

// Custom Card Editor Class for Visual Editing support in Home Assistant
class SunMoonCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._initialized = false;
  }

  setConfig(config) {
    this._config = config;
    this._updateInputs();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateHass();
  }

  connectedCallback() {
    if (!this._initialized) {
      this._init();
    }
  }

  _init() {
    this.shadowRoot.innerHTML = `
      <style>
        .card-config {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 8px 0;
        }
        .config-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .config-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        label {
          font-weight: 500;
          color: var(--primary-text-color);
          font-size: 14px;
        }
        .label-desc {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-top: -4px;
        }
        ha-textfield, ha-entity-picker {
          width: 100%;
        }
      </style>
      <div class="card-config">
        <div class="config-item">
          <label>Titel</label>
          <ha-textfield 
            config-value="title">
          </ha-textfield>
        </div>

        <div class="config-item">
          <label>Sonnen-Entität</label>
          <ha-entity-picker 
            config-value="sun_entity">
          </ha-entity-picker>
        </div>

        <div class="config-item">
          <label>Mond-Entität</label>
          <ha-entity-picker 
            config-value="moon_entity">
          </ha-entity-picker>
        </div>

        <hr style="border: 0; border-top: 1px solid var(--divider-color, rgba(255,255,255,0.1)); margin: 8px 0;" />

        <div class="config-row">
          <div class="config-item">
            <label>Uhrzeit anzeigen</label>
            <div class="label-desc">Blendet die Uhrzeit über dem Bogen ein</div>
          </div>
          <ha-switch 
            config-value="show_time">
          </ha-switch>
        </div>

        <div class="config-row">
          <div class="config-item">
            <label>Hintergrund-Schein anzeigen</label>
            <div class="label-desc">Aktiviert den farbigen Glow-Hintergrund</div>
          </div>
          <ha-switch 
            config-value="show_glow">
          </ha-switch>
        </div>

        <div class="config-row">
          <div class="config-item">
            <label>Trennlinie anzeigen</label>
            <div class="label-desc">Zeigt die Horizontlinie und den unteren gestrichelten Bogen</div>
          </div>
          <ha-switch 
            config-value="show_line">
          </ha-switch>
        </div>

        <div class="config-row">
          <div class="config-item">
            <label>Info-Gitter anzeigen</label>
            <div class="label-desc">Zeigt die Zeiten und Winkel am unteren Kartenrand</div>
          </div>
          <ha-switch 
            config-value="show_info">
          </ha-switch>
        </div>

        <div class="config-row">
          <div class="config-item">
            <label>Sternenhimmel anzeigen</label>
            <div class="label-desc">Zeigt funkelnde Sterne in der Nacht</div>
          </div>
          <ha-switch 
            config-value="show_stars">
          </ha-switch>
        </div>

        <hr style="border: 0; border-top: 1px solid var(--divider-color, rgba(255,255,255,0.1)); margin: 8px 0;" />

        <div class="config-item">
          <label>Eigenes Sonnen-Bild (URL)</label>
          <ha-textfield 
            config-value="sun_image" 
            placeholder="/local/sun_icon.png">
          </ha-textfield>
        </div>

        <div class="config-item">
          <label>Eigenes Mond-Bild (URL)</label>
          <ha-textfield 
            config-value="moon_image" 
            placeholder="/local/moon_icon.png">
          </ha-textfield>
        </div>
      </div>
    `;

    // Add event listeners
    const container = this.shadowRoot.querySelector('.card-config');

    container.querySelectorAll('ha-textfield').forEach(input => {
      input.addEventListener('input', (ev) => this._valueChanged(input.getAttribute('config-value'), ev.target.value));
    });

    container.querySelectorAll('ha-entity-picker').forEach(picker => {
      picker.addEventListener('value-changed', (ev) => this._valueChanged(picker.getAttribute('config-value'), ev.detail.value));
    });

    container.querySelectorAll('ha-switch').forEach(sw => {
      sw.addEventListener('change', (ev) => this._valueChanged(sw.getAttribute('config-value'), ev.target.checked));
    });

    // Set pickers domain filtering programmatically
    const sunPicker = this.shadowRoot.querySelector('ha-entity-picker[config-value="sun_entity"]');
    if (sunPicker) sunPicker.includeDomains = ['sun'];

    const moonPicker = this.shadowRoot.querySelector('ha-entity-picker[config-value="moon_entity"]');
    if (moonPicker) moonPicker.includeDomains = ['sensor'];

    this._initialized = true;
    this._updateInputs();
    this._updateHass();
  }

  _updateInputs() {
    if (!this._initialized || !this._config) return;

    // Update textfields without clearing focus or cursor position
    this.shadowRoot.querySelectorAll('ha-textfield').forEach(input => {
      const configVal = input.getAttribute('config-value');
      const val = this._config[configVal] || '';
      if (input.value !== val) {
        input.value = val;
      }
    });

    // Update entity pickers
    this.shadowRoot.querySelectorAll('ha-entity-picker').forEach(picker => {
      const configVal = picker.getAttribute('config-value');
      const val = this._config[configVal] || '';
      if (picker.value !== val) {
        picker.value = val;
      }
    });

    // Update switches
    this.shadowRoot.querySelectorAll('ha-switch').forEach(sw => {
      const configVal = sw.getAttribute('config-value');
      const val = this._config[configVal];
      
      let checked = false;
      if (configVal === 'show_glow' || configVal === 'show_stars') {
        checked = val !== false;
      } else {
        checked = val === true;
      }
      
      if (sw.checked !== checked) {
        sw.checked = checked;
      }
    });
  }

  _updateHass() {
    if (!this._initialized || !this._hass) return;

    // Pass the Home Assistant state object to entity pickers
    this.shadowRoot.querySelectorAll('ha-entity-picker').forEach(picker => {
      picker.hass = this._hass;
    });
  }

  _valueChanged(configValue, value) {
    if (!this._config) return;

    if (this._config[configValue] === value) return;

    const newConfig = {
      ...this._config,
      [configValue]: value
    };

    // Dispatch configuration change back to the dashboard editor
    const event = new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
}

customElements.define('sun-moon-card-editor', SunMoonCardEditor);
