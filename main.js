/* ============================================================
   HEXENÄSTHETIKEN – Motion Engine
   Editorial motion design: slow, cinematic, intentional.

   Four motion layers:
   1. ATMOSPHERE (static with slow self-movement)
   2. BACKGROUND (parallax, 0.2–0.3× scroll)
   3. FOREGROUND (normal scroll, with reveal staging)
   4. REACTION (event-driven: hover, scroll, cursor)

   Dependencies: none. Native IntersectionObserver + rAF only.
   ============================================================ */

(function () {
    'use strict';

    /* -------- Environment flags -------- */
    const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const IS_MOBILE = window.matchMedia('(max-width: 640px)').matches;


    /* ============================================================
       1. SCROLL REVEALS – staggered, proportional to position
       Each section's children animate in with slight offsets.
       Uses data-reveal-delay to allow author-set timing.
       ============================================================ */
    function initReveals() {
        const elements = document.querySelectorAll('.reveal');
        if (!elements.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;

                    const el = entry.target;
                    // Stagger siblings within the same parent
                    const siblings = Array.from(el.parentElement.children)
                        .filter(c => c.classList.contains('reveal'));
                    const index = siblings.indexOf(el);
                    const delay = Math.min(index * 80, 240); // cap at 240ms

                    el.style.transitionDelay = `${delay}ms`;
                    el.classList.add('is-visible');
                    observer.unobserve(el);
                });
            },
            {
                threshold: 0.12,
                rootMargin: '0px 0px -80px 0px'
            }
        );

        elements.forEach(el => observer.observe(el));
    }


    /* ============================================================
       2. PARALLAX – smooth lerped motion on hero backgrounds
       Uses linear interpolation for buttery movement, not
       instant scroll-tied position. Coefficient: 0.15 (subtle).
       ============================================================ */
    function initParallax() {
        if (REDUCED_MOTION || IS_MOBILE) return;

        const targets = [
            document.getElementById('heroBg'),
            document.getElementById('essayHeroBg')
        ].filter(Boolean);

        if (!targets.length) return;

        // Store current and target positions for each element
        const state = targets.map(el => ({
            el,
            current: 0,
            target: 0
        }));

        function updateTargets() {
            const scrollY = window.scrollY;
            state.forEach(s => {
                const rect = s.el.parentElement.getBoundingClientRect();
                if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
                // Subtle coefficient: 0.15 — slower than foreground
                s.target = scrollY * 0.15;
            });
        }

        function animate() {
            state.forEach(s => {
                // Lerp towards target for smoothness
                s.current += (s.target - s.current) * 0.1;
                // Round to avoid sub-pixel blur
                const y = Math.round(s.current * 100) / 100;
                s.el.style.transform = `translate3d(0, ${y}px, 0)`;
            });
            requestAnimationFrame(animate);
        }

        window.addEventListener('scroll', updateTargets, { passive: true });
        window.addEventListener('resize', updateTargets, { passive: true });
        updateTargets();
        animate();
    }


    /* ============================================================
       3. HERO FADE – extended progression over 70vh
       Title fades AND drifts upward as user scrolls away.
       Scroll-hint disappears faster (first 20vh).
       ============================================================ */
    function initHeroFade() {
        const heroInner = document.querySelector('.hero-inner');
        const scrollHint = document.querySelector('.hero-scroll-hint');
        const heroOverlay = document.querySelector('.hero-overlay');
        if (!heroInner) return;

        let ticking = false;
        function update() {
            const scrollY = window.scrollY;
            const vh = window.innerHeight;

            // Extended fade: 0 → 0.7vh instead of 0 → 0.5vh
            const progress = Math.min(scrollY / (vh * 0.7), 1);
            // Eased curve: slow start, then accelerating fade
            const eased = progress * progress;

            heroInner.style.opacity = String(1 - eased * 0.9);
            heroInner.style.transform = `translate3d(0, ${eased * -40}px, 0)`;

            if (scrollHint) {
                const hintProgress = Math.min(scrollY / (vh * 0.2), 1);
                scrollHint.style.opacity = String(Math.max(0, 1 - hintProgress));
            }

            // Overlay intensifies slightly as user scrolls
            if (heroOverlay) {
                heroOverlay.style.opacity = String(1 + progress * 0.15);
            }

            ticking = false;
        }

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });
    }


    /* ============================================================
       4. NAV – compacts on scroll (existing behavior, refined)
       Transition duration bumped for smoother feel.
       ============================================================ */
    function initNavScroll() {
        const nav = document.querySelector('.site-nav');
        if (!nav || nav.classList.contains('site-nav--essay')) return;

        let ticking = false;
        function update() {
            const scrolled = window.scrollY > 80;
            nav.classList.toggle('is-scrolled', scrolled);
            ticking = false;
        }

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });
    }


    /* ============================================================
       5. CURSOR LIGHT – Desktop only, hero only
       Very subtle radial glow that follows the cursor in the hero.
       Amplifies the sense of "something is there", without drama.
       Opacity capped at 0.08.
       ============================================================ */
    function initCursorLight() {
        if (REDUCED_MOTION) return;

        const hero = document.querySelector('.hero');
        const glass = document.querySelector('.hero-stained-glass');
        if (!hero) return;

        // Warm light overlay (desktop only)
        let light = null;
        if (!IS_TOUCH) {
            light = document.createElement('div');
            light.className = 'hero-cursor-light';
            hero.appendChild(light);
        }

        let currentX = 50, currentY = 50;
        let targetX = 50, targetY = 50;
        let active = false;

        // --- Desktop: mouse events ---
        hero.addEventListener('mouseenter', () => {
            active = true;
            if (light) light.style.opacity = '1';
            if (glass) glass.classList.add('is-active');
        });

        hero.addEventListener('mouseleave', () => {
            active = false;
            if (light) light.style.opacity = '0';
            if (glass) glass.classList.remove('is-active');
        });

        hero.addEventListener('mousemove', (e) => {
            const rect = hero.getBoundingClientRect();
            targetX = ((e.clientX - rect.left) / rect.width) * 100;
            targetY = ((e.clientY - rect.top) / rect.height) * 100;
        });

        // --- Mobile: touch events ---
        hero.addEventListener('touchstart', (e) => {
            active = true;
            if (glass) glass.classList.add('is-active');
            const touch = e.touches[0];
            const rect = hero.getBoundingClientRect();
            targetX = ((touch.clientX - rect.left) / rect.width) * 100;
            targetY = ((touch.clientY - rect.top) / rect.height) * 100;
        }, { passive: true });

        hero.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const rect = hero.getBoundingClientRect();
            targetX = ((touch.clientX - rect.left) / rect.width) * 100;
            targetY = ((touch.clientY - rect.top) / rect.height) * 100;
        }, { passive: true });

        hero.addEventListener('touchend', () => {
            // Keep visible for a moment, then fade
            setTimeout(() => {
                active = false;
                if (glass) glass.classList.remove('is-active');
            }, 1500);
        });

        function animate() {
            if (active) {
                currentX += (targetX - currentX) * 0.08;
                currentY += (targetY - currentY) * 0.08;

                // Warm light spill
                if (light) {
                    light.style.background = `
                        radial-gradient(
                            circle 550px at ${currentX}% ${currentY}%,
                            rgba(212, 160, 49, 0.07) 0%,
                            rgba(180, 120, 60, 0.04) 30%,
                            rgba(140, 80, 40, 0.02) 50%,
                            transparent 70%
                        )
                    `;
                }

                // Move stained glass mask
                if (glass) {
                    glass.style.setProperty('--glass-x', `${currentX}%`);
                    glass.style.setProperty('--glass-y', `${currentY}%`);
                }
            }
            requestAnimationFrame(animate);
        }
        animate();
    }


    /* ============================================================
       6. FULL-BLEED IMAGE BREATHING
       Subtle scale movement while image is in viewport.
       Tied to scroll position, not to time.
       Creates "living image" feel without zoom effects.
       ============================================================ */
    function initImageBreathing() {
        if (REDUCED_MOTION) return;

        const images = document.querySelectorAll('.essay-fullbleed-img');
        if (!images.length) return;

        const state = Array.from(images).map(img => ({ img, offset: 0 }));

        let ticking = false;
        function update() {
            const vh = window.innerHeight;

            state.forEach(s => {
                const rect = s.img.getBoundingClientRect();
                if (rect.bottom < 0 || rect.top > vh) return;

                // Progress: 0 when image enters bottom, 1 when exits top
                const progress = 1 - (rect.top + rect.height / 2) / vh;
                // Very subtle vertical drift: ±12px over full passage
                const drift = (progress - 0.5) * 24;
                s.img.style.transform = `translate3d(0, ${drift}px, 0) scale(1.04)`;
            });

            ticking = false;
        }

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });

        update();
    }


    /* ============================================================
       7. SMOOTH ANCHORS
       ============================================================ */
    function initSmoothAnchors() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href === '#' || href.length < 2) return;
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }


    /* ============================================================
       8. PROGRESSIVE IMAGE LOADING
       Fade-in for hero/full-bleed images when loaded.
       SVGs may report naturalHeight === 0, so we check
       img.complete as a sufficient condition.
       ============================================================ */
    function initImageLoading() {
        const images = document.querySelectorAll(
            '.hero-bg-img, .essay-hero-img, .essay-fullbleed-img'
        );
        images.forEach(img => {
            if (img.complete) {
                img.classList.add('is-loaded');
                return;
            }
            img.addEventListener('load', () => {
                img.classList.add('is-loaded');
            });
            img.addEventListener('error', () => {
                // Still show the image area even if load fails
                img.classList.add('is-loaded');
            });
        });
    }


    /* ============================================================
       9. MOBILE NAV TOGGLE
       Hamburger menu for small screens.
       ============================================================ */
    function initNavToggle() {
        const toggle = document.querySelector('.nav-toggle');
        const navLinks = document.querySelector('.nav-links');
        if (!toggle || !navLinks) return;

        toggle.addEventListener('click', () => {
            const expanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', String(!expanded));
            toggle.setAttribute('aria-label', expanded ? 'Menü öffnen' : 'Menü schließen');
            navLinks.classList.toggle('is-open', !expanded);
        });

        // Close on link click
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                toggle.setAttribute('aria-expanded', 'false');
                toggle.setAttribute('aria-label', 'Menü öffnen');
                navLinks.classList.remove('is-open');
            });
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks.classList.contains('is-open')) {
                toggle.setAttribute('aria-expanded', 'false');
                toggle.setAttribute('aria-label', 'Menü öffnen');
                navLinks.classList.remove('is-open');
                toggle.focus();
            }
        });
    }


    /* ============================================================
       10. HERO SPLIT TEXT — per-character entrance
       Wraps each letter in a <span> with staggered delay.
       ============================================================ */
    function initHeroSplitText() {
        if (REDUCED_MOTION || IS_MOBILE) return;

        const title = document.querySelector('.hero-title');
        if (!title) return;

        // Get raw text, strip the soft-hyphen entity
        const text = title.textContent.replace(/\u00AD/g, '');
        title.innerHTML = '';
        title.classList.add('is-split');

        let charIndex = 0;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const span = document.createElement('span');
            span.className = 'hero-char';

            if (ch === ' ' || ch === '\n') {
                span.classList.add('hero-char--space');
                span.innerHTML = '&nbsp;';
            } else {
                span.textContent = ch;
            }

            // Stagger: 40ms per char, base delay 400ms
            span.style.animationDelay = `${400 + charIndex * 40}ms`;
            title.appendChild(span);
            charIndex++;
        }
    }


    /* ============================================================
       11. SCROLL MARQUEE — horizontal text driven by scroll
       Moves the track left/right based on scroll position.
       ============================================================ */
    function initScrollMarquee() {
        // Marquees now run on a CSS keyframe animation (marquee-ltr / marquee-rtl).
        // This stub is kept in case we later want JS-driven behaviour
        // (e.g. pause-on-hover, reduced-motion toggles, etc.).
    }


    /* ============================================================
       10b. INTRO OVERLAY — art-house Eingangssequenz (30s)
       Choreographie:
         0.5s  : Overlay aktiviert — Buntglas/Sonne/Corona erscheinen, Skip sichtbar
         1-12s : Lade-Prozent 0 → 100 %, Mond wandert über die Sonne (Eclipse 0→1)
         10s   : Audio blendet ein (startet bei 01:10 des Songs)
         12s   : Logo-Video startet und fadet ein
         20s   : Willkommens-Titel fadet ein
         28s   : Overlay + Audio faden aus
         30s   : Overlay aus dem DOM-Fluss, body.intro-active entfernt
       ============================================================ */
    function initIntroOverlay() {
        const overlay = document.getElementById('introOverlay');
        if (!overlay) return;

        // Bei reduced-motion komplett überspringen
        if (REDUCED_MOTION) {
            overlay.remove();
            return;
        }

        // Wenn die Seite mit einem Anchor geladen wurde (z.B. #titelgeschichten
        // via Nav-Link), das Intro überspringen. Nur der reine Seitenstart
        // (ohne Hash) oder die explizite Rubrik #intro spielt die Sequenz.
        const hash = window.location.hash;
        if (hash && hash !== '#intro') {
            overlay.remove();
            return;
        }

        document.body.classList.add('intro-active');

        const percentEl = document.getElementById('introPercent');
        const logo = document.getElementById('introLogo');
        const audio = document.getElementById('introMusic');
        const skipBtn = document.getElementById('introSkip');
        const enterBtn = document.getElementById('introEnter');

        let ended = false;
        const timers = [];
        let rafLoad = null;

        function schedule(fn, delay) {
            timers.push(setTimeout(fn, delay));
        }

        // Unlock-Listener für geblocktes Autoplay; nur auf dem Overlay
        // registriert und wieder abgebaut, damit Audio NIE auf der
        // Hauptseite weiterläuft, wenn das Intro schon vorbei ist.
        let unlockHandler = null;
        function attachUnlock() {
            if (!audio || ended || unlockHandler) return;
            unlockHandler = () => {
                if (ended || !audio) return;
                audio.play().then(() => {
                    const t0 = performance.now();
                    (function vol(now) {
                        if (ended) return;
                        const pr = Math.min(1, (now - t0) / 3000);
                        audio.volume = pr * 0.85;
                        if (pr < 1) requestAnimationFrame(vol);
                    })(performance.now());
                }).catch(() => {});
                detachUnlock();
            };
            overlay.addEventListener('pointerdown', unlockHandler, { passive: true });
            overlay.addEventListener('touchstart', unlockHandler, { passive: true });
        }
        function detachUnlock() {
            if (!unlockHandler) return;
            overlay.removeEventListener('pointerdown', unlockHandler);
            overlay.removeEventListener('touchstart', unlockHandler);
            unlockHandler = null;
        }

        function stopAudioCompletely() {
            if (!audio) return;
            try {
                audio.pause();
                audio.currentTime = 0;
                audio.src = '';
                audio.removeAttribute('src');
                audio.load();
                audio.remove();
            } catch (_) { /* ignore */ }
        }

        function endIntro() {
            if (ended) return;
            ended = true;
            // Erst alle ausstehenden Intro-Timer canceln, DANN neue Cleanup-Timer starten
            timers.forEach(clearTimeout);
            timers.length = 0;
            if (rafLoad) cancelAnimationFrame(rafLoad);

            overlay.setAttribute('data-state', 'hidden');
            detachUnlock();

            // Audio sanft ausblenden und dann komplett abbrechen
            if (audio) {
                const start = audio.volume;
                const t0 = performance.now();
                (function step(now) {
                    if (!audio || !audio.isConnected) return;
                    const p = Math.min(1, (now - t0) / 900);
                    audio.volume = Math.max(0, start * (1 - p));
                    if (p < 1) requestAnimationFrame(step);
                    else stopAudioCompletely();
                })(performance.now());
            }

            setTimeout(() => {
                stopAudioCompletely();  // defensive
                overlay.remove();
                document.body.classList.remove('intro-active');
            }, 1400);
        }

        function startAudioWithFade() {
            if (!audio || ended) return;
            try {
                audio.currentTime = 70;
                audio.volume = 0;
                const p = audio.play();
                if (p && p.then) {
                    p.then(() => {
                        const t0 = performance.now();
                        (function vol(now) {
                            if (ended) return;
                            const pr = Math.min(1, (now - t0) / 4000);
                            audio.volume = pr * 0.85;
                            if (pr < 1) requestAnimationFrame(vol);
                        })(performance.now());
                    }).catch(() => {
                        // Autoplay blockiert — warte auf Tap/Click innerhalb des Intro-Overlays
                        attachUnlock();
                    });
                }
            } catch (_) { /* ignore */ }
        }

        skipBtn && skipBtn.addEventListener('click', endIntro);
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && !ended) endIntro();
        });

        // Overlay vorab sichtbar machen (Logo + Buntglas + Eintreten-Button)
        overlay.setAttribute('data-state', 'active');
        if (logo) overlay.setAttribute('data-logo-in', '');

        let started = false;
        function startIntroSequence() {
            if (started || ended) return;
            started = true;
            overlay.setAttribute('data-started', '');

            // Audio sofort starten — wir sind im User-Gesture-Kontext
            startAudioWithFade();

            // Loading-Counter über 22s
            const loadStart = performance.now() + 200;
            const loadDur   = 22000;
            (function loadTick(now) {
                if (ended) return;
                const t = Math.max(0, Math.min(1, (now - loadStart) / loadDur));
                if (percentEl) percentEl.textContent = Math.round(t * 100);
                if (t < 1) rafLoad = requestAnimationFrame(loadTick);
            })(performance.now());

            // Willkommen kommt früh (4.5s) und bleibt bis zum Ende sichtbar
            schedule(() => overlay.setAttribute('data-welcome-in', ''), 4500);

            // Ende — das gesamte Overlay fadet aus, Logo und Willkommen
            // verschwinden synchron über die Overlay-Opacity
            schedule(endIntro, 24000);
        }

        if (enterBtn) enterBtn.addEventListener('click', startIntroSequence, { once: true });

        // Falls der Nutzer den Eintreten-Button ignoriert: nach 15s einfach
        // ohne Musik weiterlaufen lassen (Safety).
        setTimeout(() => { if (!started && !ended) startIntroSequence(); }, 15000);

        // Safety-Net: nach spätestens 45 Sekunden ist das Intro weg,
        // unabhängig vom Zustand der Timeline.
        setTimeout(() => {
            if (!ended) endIntro();
            document.body.classList.remove('intro-active');
            const o = document.getElementById('introOverlay');
            if (o) o.remove();
        }, 45000);
    }


    /* ============================================================
       11c. CARD SPOTLIGHT — indirektes Scheinwerferlicht auf Essay-Bildern
       Setzt --spot-x / --spot-y je nach Cursorposition; CSS macht den Rest.
       ============================================================ */
    function initCardSpotlight() {
        if (IS_TOUCH) return;  // kein Spotlight auf Touch-Geräten
        const images = document.querySelectorAll('.essay-card-image');
        if (!images.length) return;

        images.forEach(img => {
            img.addEventListener('mousemove', e => {
                const rect = img.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                img.style.setProperty('--spot-x', x + '%');
                img.style.setProperty('--spot-y', y + '%');
            }, { passive: true });
        });
    }


    /* ============================================================
       11b. PARTICLE FIELDS — schwebende Lichtpartikel auf dunklen Sektionen
       Canvas-basiert, pausiert wenn nicht im Viewport, respektiert
       prefers-reduced-motion und visibilitychange.
       ============================================================ */
    function initParticleFields() {
        if (REDUCED_MOTION) return;

        const canvases = [...document.querySelectorAll('.particle-field')];
        if (!canvases.length) return;

        const fields = canvases.map(canvas => ({
            canvas,
            ctx: canvas.getContext('2d'),
            particles: [],
            w: 0,
            h: 0,
            visible: false
        }));

        function spawnParticle(field, initialLife = true) {
            return {
                x: Math.random() * field.w,
                y: initialLife ? Math.random() * field.h : field.h + Math.random() * 40,
                vx: (Math.random() - 0.5) * 0.08,
                vy: -(0.08 + Math.random() * 0.18),
                size: 0.4 + Math.random() * 1.8,
                drift: Math.random() * Math.PI * 2,
                life: initialLife ? Math.random() * 400 : 0,
                maxLife: 700 + Math.random() * 1000,
                tone: Math.random() > 0.35 ? 'gold' : 'cream'
            };
        }

        function resize(field) {
            const rect = field.canvas.parentElement.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            field.w = rect.width;
            field.h = rect.height;
            field.canvas.width = rect.width * dpr;
            field.canvas.height = rect.height * dpr;
            field.canvas.style.width = rect.width + 'px';
            field.canvas.style.height = rect.height + 'px';
            field.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const density = Math.min(70, Math.max(20, Math.floor((rect.width * rect.height) / 14000)));
            field.particles = Array.from({ length: density }, () => spawnParticle(field, true));
        }

        fields.forEach(resize);

        let rafId = null;
        let running = false;

        function step() {
            let anyVisible = false;
            const vh = window.innerHeight;
            fields.forEach(field => {
                const rect = field.canvas.getBoundingClientRect();
                const inView = rect.bottom > -200 && rect.top < vh + 200;
                field.visible = inView;
                if (!inView) return;
                anyVisible = true;

                const ctx = field.ctx;
                ctx.clearRect(0, 0, field.w, field.h);

                for (const p of field.particles) {
                    p.life++;
                    p.x += p.vx + Math.sin(p.drift + p.life * 0.008) * 0.12;
                    p.y += p.vy;

                    const t = p.life / p.maxLife;
                    let alpha;
                    if (t < 0.18) alpha = t / 0.18;
                    else if (t > 0.82) alpha = Math.max(0, (1 - t) / 0.18);
                    else alpha = 1;
                    alpha *= 0.55;

                    if (p.tone === 'gold') {
                        ctx.fillStyle = 'rgba(218, 172, 78, ' + alpha + ')';
                    } else {
                        ctx.fillStyle = 'rgba(232, 228, 223, ' + (alpha * 0.7) + ')';
                    }
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();

                    if (p.life > p.maxLife || p.y < -20 || p.x < -20 || p.x > field.w + 20) {
                        Object.assign(p, spawnParticle(field, false));
                    }
                }
            });

            if (anyVisible && !document.hidden) {
                rafId = requestAnimationFrame(step);
            } else {
                running = false;
                rafId = null;
            }
        }

        function start() {
            if (running || document.hidden) return;
            running = true;
            rafId = requestAnimationFrame(step);
        }

        function stop() {
            if (rafId !== null) cancelAnimationFrame(rafId);
            running = false;
            rafId = null;
        }

        // Resize handling — rAF-debounced
        let resizeRaf = null;
        window.addEventListener('resize', () => {
            if (resizeRaf) cancelAnimationFrame(resizeRaf);
            resizeRaf = requestAnimationFrame(() => {
                fields.forEach(resize);
                resizeRaf = null;
            });
        });

        // Pause when tab hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) stop();
            else start();
        });

        // Resume when section scrolls into view
        const io = new IntersectionObserver(entries => {
            const anyIntersecting = entries.some(e => e.isIntersecting);
            if (anyIntersecting) start();
        }, { rootMargin: '200px' });
        fields.forEach(field => io.observe(field.canvas));

        start();
    }


    /* ============================================================
       12. SECTION NUMBERS — oversized decorative parallax numbers
       Creates a <span> from data-section-number attribute.
       ============================================================ */
    function initSectionNumbers() {
        if (REDUCED_MOTION) return;

        const sections = document.querySelectorAll('[data-section-number]');
        if (!sections.length) return;

        const state = [];
        sections.forEach(section => {
            const num = section.getAttribute('data-section-number');
            const el = document.createElement('span');
            el.className = 'section-number-deco';
            el.textContent = num;
            el.setAttribute('aria-hidden', 'true');
            section.appendChild(el);
            state.push({ section, el, current: 0, target: 0 });
        });

        let ticking = false;
        function update() {
            const vh = window.innerHeight;
            state.forEach(s => {
                const rect = s.section.getBoundingClientRect();
                if (rect.bottom < -200 || rect.top > vh + 200) return;

                // Parallax: number moves at 0.08× scroll speed relative to section
                const sectionTop = rect.top;
                s.target = sectionTop * -0.08;
            });
            ticking = false;
        }

        function animate() {
            state.forEach(s => {
                s.current += (s.target - s.current) * 0.06;
                const y = Math.round(s.current * 10) / 10;
                s.el.style.transform = `translate3d(0, ${y}px, 0)`;
            });
            requestAnimationFrame(animate);
        }

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });

        update();
        animate();
    }


    /* ============================================================
       13. SCROLL SCALE — Perspectives grid zoom-in
       Also handles card alignment on scroll.
       ============================================================ */
    function initScrollEffects() {
        if (REDUCED_MOTION) return;

        // --- Perspectives scale ---
        const perspList = document.querySelector('.perspectives-list');

        // --- Card alignment ---
        const cards = document.querySelectorAll('.essay-card:nth-child(n+2)');

        if (!perspList && !cards.length) return;

        const perspObserver = perspList ? new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        perspList.classList.add('is-scaled');
                    }
                });
            },
            { threshold: 0.3 }
        ) : null;

        if (perspObserver && perspList) {
            perspObserver.observe(perspList);
        }

        // Card alignment observer
        if (cards.length) {
            const cardObserver = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('is-aligned');
                            cardObserver.unobserve(entry.target);
                        }
                    });
                },
                { threshold: 0.4 }
            );
            cards.forEach(card => cardObserver.observe(card));
        }
    }


    /* ============================================================
       14. FOCUS BACKDROP PARALLAX — "HEXE" text movement
       ============================================================ */
    function initFocusBackdrop() {
        if (REDUCED_MOTION || IS_MOBILE) return;

        const focusInner = document.querySelector('.focus-inner');
        if (!focusInner) return;

        let ticking = false;
        function update() {
            const rect = focusInner.getBoundingClientRect();
            const vh = window.innerHeight;
            if (rect.bottom < 0 || rect.top > vh) { ticking = false; return; }

            const progress = (vh - rect.top) / (vh + rect.height);
            // Drift the ::before pseudo via CSS custom property
            const y = (progress - 0.5) * 60;
            focusInner.style.setProperty('--backdrop-y', `${y}px`);
            ticking = false;
        }

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });
    }


    /* ============================================================
       15. WORD-SCRUB — scroll-driven word illumination
       Wörter in Projekt-Seiten-Absätzen starten gedimmt (0.18),
       leuchten sequenziell auf 1.0, wenn sie durchs Lesefenster
       wandern, fallen danach auf 0.4 zurück.
       Pro Frame nur ein getBoundingClientRect je Absatz; die Wörter
       eines nicht-sichtbaren Absatzes werden komplett übersprungen.
       Stop-Token: ticking-Flag + visibilitychange + reduced-motion.
       ============================================================ */
    function initWordScrub() {
        if (REDUCED_MOTION) return;

        // Greift auf:
        //   - .intro-section auf der Homepage ("Das Projekt"-Block)
        //   - #projekt-content auf projekt.html
        const paragraphs = document.querySelectorAll(
            '.intro-section .intro-inner > p, ' +
            '#projekt-content .projekt-section > p'
        );
        if (!paragraphs.length) return;

        const DIM_DEFAULT = 0.18;
        const DIM_AFTER   = 0.40;

        // Wrap each text-node word in a span without breaking inline elements
        function splitWords(el) {
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
            const textNodes = [];
            let node;
            while ((node = walker.nextNode())) {
                if (node.nodeValue.trim().length) textNodes.push(node);
            }
            const words = [];
            textNodes.forEach(tn => {
                // Split on regular whitespace; preserve nbsp inside words
                const parts = tn.nodeValue.split(/( +|\t+|\n+)/);
                const frag = document.createDocumentFragment();
                let producedWord = false;
                parts.forEach(part => {
                    if (!part.length) return;
                    if (/^[ \t\n]+$/.test(part)) {
                        frag.appendChild(document.createTextNode(part));
                    } else {
                        const span = document.createElement('span');
                        span.className = 'word-scrub';
                        span.textContent = part;
                        frag.appendChild(span);
                        words.push(span);
                        producedWord = true;
                    }
                });
                if (producedWord) tn.parentNode.replaceChild(frag, tn);
            });
            return words;
        }

        // Build paragraph state
        const state = [];
        paragraphs.forEach(p => {
            const words = splitWords(p);
            if (words.length) state.push({ p, words, lastBucket: null });
        });
        if (!state.length) return;

        let ticking = false;
        let pageVisible = !document.hidden;

        function setAll(words, value, key) {
            // Flush only if bucket changed — avoids touching DOM every offscreen frame
            for (let i = 0; i < words.length; i++) {
                words[i].style.opacity = value;
            }
            return key;
        }

        function update() {
            ticking = false;
            const vh = window.innerHeight;
            const revStart   = vh * 0.85;   // Wörter unterhalb dieser Linie: gedimmter Default
            const revFull    = vh * 0.42;   // ab hier voll erleuchtet
            const fadeBegin  = vh * 0.18;   // ab hier beginnt das Zurückfallen

            for (let s = 0; s < state.length; s++) {
                const entry = state[s];
                const pRect = entry.p.getBoundingClientRect();

                // Komplett unter dem Viewport → default-dim (only set once)
                if (pRect.top > vh + 50) {
                    if (entry.lastBucket !== 'below') {
                        entry.lastBucket = setAll(entry.words, String(DIM_DEFAULT), 'below');
                    }
                    continue;
                }
                // Komplett über dem Viewport → after-dim (only set once)
                if (pRect.bottom < -50) {
                    if (entry.lastBucket !== 'above') {
                        entry.lastBucket = setAll(entry.words, String(DIM_AFTER), 'above');
                    }
                    continue;
                }

                entry.lastBucket = 'live';
                const words = entry.words;
                for (let i = 0; i < words.length; i++) {
                    const w = words[i];
                    const top = w.getBoundingClientRect().top;
                    let opacity;
                    if (top > revStart) {
                        opacity = DIM_DEFAULT;
                    } else if (top > revFull) {
                        const t = (revStart - top) / (revStart - revFull);
                        opacity = DIM_DEFAULT + t * (1 - DIM_DEFAULT);
                    } else if (top > fadeBegin) {
                        opacity = 1;
                    } else {
                        const t = Math.min(1, (fadeBegin - top) / fadeBegin);
                        opacity = 1 - t * (1 - DIM_AFTER);
                    }
                    w.style.opacity = opacity.toFixed(3);
                }
            }
        }

        function schedule() {
            if (!ticking && pageVisible) {
                ticking = true;
                requestAnimationFrame(update);
            }
        }

        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule, { passive: true });
        document.addEventListener('visibilitychange', () => {
            pageVisible = !document.hidden;
            if (pageVisible) schedule();
        });

        // Initial paint
        update();
    }


    /* ============================================================
       INIT
       ============================================================ */
    document.addEventListener('DOMContentLoaded', () => {
        initHeroSplitText();
        initReveals();
        initParallax();
        initHeroFade();
        initNavScroll();
        initCursorLight();
        initImageBreathing();
        initSmoothAnchors();
        initImageLoading();
        initNavToggle();
        initIntroOverlay();
        initScrollMarquee();
        initParticleFields();
        initCardSpotlight();
        initSectionNumbers();
        initScrollEffects();
        initFocusBackdrop();
        initWordScrub();
    });

})();
