document.addEventListener('DOMContentLoaded', () => {
    /* ----------------------------------------------------------------------
       1. Utilities & Initialization
    ---------------------------------------------------------------------- */
    const formatNumber = num => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    let currentResults = null;

    /* ----------------------------------------------------------------------
       2. Theme Toggling
    ---------------------------------------------------------------------- */
    const themeBtn = document.getElementById('theme-btn');
    const iconSun = document.getElementById('icon-sun');
    const iconMoon = document.getElementById('icon-moon');
    const htmlEl = document.documentElement;

    // Detect system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        setTheme('light');
    } else {
        setTheme('dark');
    }

    function setTheme(theme) {
        htmlEl.setAttribute('data-theme', theme);
        if (theme === 'light') {
            iconSun.style.display = 'none';
            iconMoon.style.display = 'block';
        } else {
            iconSun.style.display = 'block';
            iconMoon.style.display = 'none';
        }
        if (currentResults) renderChart(currentResults); // Re-render chart colors
    }

    themeBtn.addEventListener('click', () => {
        const currentTheme = htmlEl.getAttribute('data-theme');
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });

    /* ----------------------------------------------------------------------
       3. PUF Sliders & Warning System
    ---------------------------------------------------------------------- */
    const sliders = document.querySelectorAll('.custom-slider');
    const xorWarning = document.getElementById('xor-warning');

    sliders.forEach(slider => {
        const updateSlider = () => {
            const val = parseFloat(slider.value);
            const min = parseFloat(slider.min) || 0;
            const max = parseFloat(slider.max) || 100;
            const percentage = ((val - min) / (max - min)) * 100;
            
            const parent = slider.closest('.slider-container');
            const themeColor = getComputedStyle(parent).getPropertyValue('--theme-color').trim();
            const trackBg = getComputedStyle(htmlEl).getPropertyValue('--track-bg').trim();
            
            slider.style.background = `linear-gradient(to right, ${themeColor} 0%, ${themeColor} ${percentage}%, ${trackBg} ${percentage}%, ${trackBg} 100%)`;
            
            const displayEl = document.getElementById(slider.id + '-val');
            if (displayEl) {
                displayEl.textContent = slider.step === '0.01' ? val.toFixed(2) : formatNumber(val);
                displayEl.classList.remove('value-pulse');
                void displayEl.offsetWidth; // trigger reflow
                displayEl.classList.add('value-pulse');
            }

            // XOR Warning Logic
            if (slider.id === 'xor-level') {
                if (val > 2) xorWarning.classList.remove('hidden');
                else xorWarning.classList.add('hidden');
            }
        };

        updateSlider();
        slider.addEventListener('input', updateSlider);
    });

    /* ----------------------------------------------------------------------
       4. Tooltips
    ---------------------------------------------------------------------- */
    const tooltip = document.getElementById('custom-tooltip');
    document.querySelectorAll('[data-tooltip]').forEach(el => {
        el.addEventListener('mouseenter', () => {
            tooltip.textContent = el.getAttribute('data-tooltip');
            tooltip.classList.add('visible');
            const rect = el.getBoundingClientRect();
            let top = rect.top - tooltip.offsetHeight - 10;
            let left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2);
            if (top < 10) top = rect.bottom + 10;
            tooltip.style.top = top + window.scrollY + 'px';
            tooltip.style.left = Math.max(10, left) + window.scrollX + 'px';
        });
        el.addEventListener('mouseleave', () => tooltip.classList.remove('visible'));
    });

    /* ----------------------------------------------------------------------
       5. Tabs & Mode Toggle
    ---------------------------------------------------------------------- */
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    let activeModelId = 'lr';

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
            activeModelId = document.getElementById(targetId).getAttribute('data-model-id');
        });
    });

    const modeToggle = document.getElementById('config-mode-toggle');
    modeToggle.addEventListener('change', (e) => {
        const isCustom = e.target.checked;
        document.querySelectorAll('.tab-content input, .tab-content select').forEach(input => {
            if (isCustom) {
                input.removeAttribute('readonly');
                input.removeAttribute('disabled');
            } else {
                if (input.tagName === 'SELECT') input.setAttribute('disabled', 'true');
                else input.setAttribute('readonly', 'true');
            }
        });
    });

    /* ----------------------------------------------------------------------
       6. Simulation Engine
    ---------------------------------------------------------------------- */
    const getPufParams = () => ({
        delayStages: parseInt(document.getElementById('delay-stages').value),
        xorLevel: parseInt(document.getElementById('xor-level').value),
        noise: parseFloat(document.getElementById('noise-level').value),
        crpCount: parseInt(document.getElementById('crp-count').value),
        randomSeed: parseInt(document.getElementById('random-seed').value)
    });

    const simulateTraining = async (modelId, pufParams) => {
        // Base simulate time based on CRPs (100k CRPs = ~1s wait)
        const waitTime = Math.max(500, (pufParams.crpCount / 100000) * 1000 + (Math.random() * 500));
        await new Promise(r => setTimeout(r, waitTime));

        let accuracy = 0;
        let baseAcc = 98 - (pufParams.noise * 50); // Noise degrades max possible

        switch(modelId) {
            case 'lr':
                // Linear model fails hard on XOR > 2
                if (pufParams.xorLevel > 2) accuracy = 50 + (Math.random() * 5); 
                else accuracy = baseAcc - (pufParams.xorLevel * 2);
                break;
            case 'svm':
                // RBF kernel handles non-linear better
                if (pufParams.xorLevel > 4) accuracy = 60 + (Math.random() * 10);
                else accuracy = baseAcc - (pufParams.xorLevel * 1.5);
                break;
            case 'rf':
                // Ensemble handles high XOR, but needs more data
                accuracy = baseAcc - (pufParams.xorLevel * 1.2);
                if (pufParams.crpCount < 50000 && pufParams.xorLevel > 3) accuracy -= 15;
                break;
            case 'mlp':
                // NN handles high XOR best, but needs lots of data
                accuracy = baseAcc - (pufParams.xorLevel * 0.5);
                if (pufParams.crpCount < 100000 && pufParams.xorLevel > 4) accuracy -= 20;
                break;
        }

        // Clamp accuracy
        accuracy = Math.max(45, Math.min(99.9, accuracy));
        
        return {
            model: modelId.toUpperCase(),
            accuracy: accuracy.toFixed(2),
            timeMs: Math.round(waitTime * 1.2) // mock total time
        };
    };

    /* ----------------------------------------------------------------------
       7. Execution Handlers
    ---------------------------------------------------------------------- */
    const btnRunSelected = document.getElementById('btn-run-selected');
    const btnRunAll = document.getElementById('btn-run-all');
    const loadingOverlay = document.getElementById('chart-loading');

    btnRunSelected.addEventListener('click', async () => {
        startLoading('Training Selected Model...');
        const pufParams = getPufParams();
        const result = await simulateTraining(activeModelId, pufParams);
        currentResults = [result];
        renderChart(currentResults);
        renderMetrics(currentResults);
        stopLoading();
    });

    btnRunAll.addEventListener('click', async () => {
        startLoading('Training & Comparing All Models...');
        const pufParams = getPufParams();
        // Run sequentially or promise.all (we'll do all for faster perceived demo, but cumulative time)
        const models = ['lr', 'svm', 'rf', 'mlp'];
        const results = await Promise.all(models.map(m => simulateTraining(m, pufParams)));
        currentResults = results;
        renderChart(currentResults);
        renderMetrics(currentResults);
        stopLoading();
    });

    const startLoading = (text) => {
        document.getElementById('loading-text').textContent = text;
        loadingOverlay.classList.remove('hidden');
    };
    const stopLoading = () => loadingOverlay.classList.add('hidden');

    /* ----------------------------------------------------------------------
       8. Visualization (Custom VU Meter Gauges)
    ---------------------------------------------------------------------- */
    const renderChart = (results) => {
        const wrapper = document.getElementById('gauges-wrapper');
        wrapper.innerHTML = '';
        const isDark = htmlEl.getAttribute('data-theme') === 'dark';

        results.forEach(result => {
            const box = document.createElement('div');
            box.className = 'gauge-box';
            
            const canvas = document.createElement('canvas');
            canvas.className = 'gauge-canvas';
            const dpr = window.devicePixelRatio || 1;
            const logicalW = 320;
            const logicalH = 220;
            canvas.width = logicalW * dpr;
            canvas.height = logicalH * dpr;
            canvas.style.width = `${logicalW}px`;
            canvas.style.height = `${logicalH}px`;
            
            box.appendChild(canvas);
            wrapper.appendChild(box);
            
            let currentVal = 0;
            const targetVal = parseFloat(result.accuracy);
            
            const animate = () => {
                const diff = targetVal - currentVal;
                currentVal += diff * 0.08; 
                if (Math.abs(diff) < 0.1) currentVal = targetVal;
                
                drawGlowingGauge(canvas, currentVal, result.model, isDark);
                
                if (currentVal !== targetVal) {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        });
    };

    function drawGlowingGauge(canvas, value, title, isDark) {
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const W = canvas.width / dpr;
        const H = canvas.height / dpr;
        
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, W, H);
        
        const cx = W / 2;
        const cy = H * 0.72;
        const R = W * 0.35;
        
        const minAngle = Math.PI; 
        const maxAngle = Math.PI * 2;
        
        // Title
        ctx.fillStyle = isDark ? '#e6edf3' : '#1f2328';
        ctx.textAlign = 'center';
        ctx.font = 'bold 15px Inter, sans-serif';
        ctx.fillText(title, cx, 30);
        
        const getColor = (t) => {
            const hue = (1 - t) * 130;
            return `hsl(${hue}, 100%, 55%)`;
        };

        const valT = Math.max(0, Math.min(100, value)) / 100;
        const numSegments = 28;

        for (let i = 0; i <= numSegments; i++) {
            const t = i / numSegments;
            const angle = minAngle + t * (maxAngle - minAngle);
            const color = getColor(t);
            
            const r1 = R;
            const r2 = R - 16;
            
            const x1 = cx + r1 * Math.cos(angle);
            const y1 = cy + r1 * Math.sin(angle);
            const x2 = cx + r2 * Math.cos(angle);
            const y2 = cy + r2 * Math.sin(angle);
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            
            const isActive = t <= valT;
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            
            if (isActive) {
                ctx.globalAlpha = 1.0;
                ctx.shadowColor = color;
                ctx.shadowBlur = 10;
            } else {
                ctx.globalAlpha = isDark ? 0.15 : 0.1;
                ctx.shadowBlur = 0;
            }
            
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
        
        // Labels
        ctx.fillStyle = isDark ? '#7d8590' : '#656d76';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        
        ctx.fillText('0%', cx - R - 12, cy + 18);
        ctx.fillText('50%', cx, cy - R - 15);
        ctx.fillText('100%', cx + R + 12, cy + 18);
        
        // Needle
        const needleAngle = minAngle + valT * (maxAngle - minAngle);
        const needleLength = R - 5;
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(needleAngle);
        
        ctx.beginPath();
        ctx.moveTo(0, -2.5);
        ctx.lineTo(needleLength, 0);
        ctx.lineTo(0, 2.5);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        
        ctx.fillStyle = isDark ? '#e6edf3' : '#1f2328';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fill();
        
        // Needle pivot
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Value Text
        const currentColor = getColor(valT);
        ctx.fillStyle = currentColor;
        ctx.shadowColor = currentColor;
        ctx.shadowBlur = 12;
        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.fillText(`${value.toFixed(2)}%`, cx, cy - 5);
        
        ctx.shadowBlur = 0;
        
        // Badge
        const isResistant = value < 65; 
        const badgeColor = isResistant ? '#00e676' : '#ff3d00';
        const badgeBg = isResistant ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 61, 0, 0.1)';
        const badgeText = isResistant ? 'RESISTANT' : 'VULNERABLE';
        
        const badgeW = 110;
        const badgeH = 26;
        const badgeX = cx - badgeW / 2;
        const badgeY = cy + 20;
        
        ctx.fillStyle = badgeBg;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 13);
        ctx.fill();
        
        ctx.strokeStyle = badgeColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = badgeColor;
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(badgeText, badgeX + 28, badgeY + 17);
        
        // Shield Icon
        ctx.save();
        ctx.translate(badgeX + 10, badgeY + 7);
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(10, 2.5);
        ctx.lineTo(10, 6.5);
        ctx.quadraticCurveTo(10, 11, 5, 13);
        ctx.quadraticCurveTo(0, 11, 0, 6.5);
        ctx.lineTo(0, 2.5);
        ctx.closePath();
        ctx.strokeStyle = badgeColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        
        ctx.beginPath();
        if (isResistant) {
            ctx.moveTo(2.5, 6.5);
            ctx.lineTo(4.5, 8.5);
            ctx.lineTo(7.5, 4.5);
        } else {
            ctx.moveTo(3, 4);
            ctx.lineTo(7, 9);
            ctx.moveTo(7, 4);
            ctx.lineTo(3, 9);
        }
        ctx.stroke();
        ctx.restore();
        
        ctx.restore();
    }

    const renderMetrics = (results) => {
        const container = document.getElementById('metrics-container');
        container.innerHTML = '';
        
        let bestModel = results.reduce((prev, current) => (parseFloat(prev.accuracy) > parseFloat(current.accuracy)) ? prev : current);
        let totalTime = results.reduce((sum, current) => sum + current.timeMs, 0);

        container.innerHTML = `
            <div class="metric-card">
                <h4>Best Model</h4>
                <div class="val" style="color: var(--neon-cyan)">${bestModel.model} (${bestModel.accuracy}%)</div>
            </div>
            <div class="metric-card">
                <h4>Total Training Time</h4>
                <div class="val">${(totalTime / 1000).toFixed(2)}s</div>
            </div>
            <div class="metric-card">
                <h4>Data Efficiency</h4>
                <div class="val">${formatNumber(Math.round(getPufParams().crpCount / totalTime * 1000))} <span style="font-size:0.7em;color:var(--text-muted);">CRPs/sec</span></div>
            </div>
        `;
    };

    /* ----------------------------------------------------------------------
       9. Export Functionality
    ---------------------------------------------------------------------- */
    const downloadBlob = (content, filename, contentType) => {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    document.getElementById('btn-export-json').addEventListener('click', () => {
        if (!currentResults) return alert('No results to export. Run an attack first.');
        const data = {
            pufSettings: getPufParams(),
            results: currentResults,
            timestamp: new Date().toISOString()
        };
        downloadBlob(JSON.stringify(data, null, 2), 'puf_experiment_results.json', 'application/json');
    });

    document.getElementById('btn-export-csv').addEventListener('click', () => {
        if (!currentResults) return alert('No results to export. Run an attack first.');
        let csv = 'Model,Accuracy (%),Time (ms)\n';
        currentResults.forEach(r => { csv += `${r.model},${r.accuracy},${r.timeMs}\n`; });
        downloadBlob(csv, 'puf_experiment_results.csv', 'text/csv');
    });
});
