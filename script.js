document-addEventListener('DOMContentLoaded', () => {
    initTheme();
    initCalculator();
});

function initTheme() {
    const themeToggle = document.querySelector('.theme-toggle');
    if (!themeToggle) return;

    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-toggle i') || document.querySelector('.theme-toggle span');
    if (!icon) return;
    icon.textContent = theme === 'light' ? '🌙' : '☀️';
}

function initCalculator() {
    const form = document.querySelector('.calc-form');
    const resultArea = document.querySelector('.result-area');
    
    if (!form || !resultArea) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const calcType = form.getAttribute('data-type');
        calculate(calcType);
    });

    // Instant calculation for numeric inputs if needed
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            if (form.getAttribute('data-instant') === 'true') {
                calculate(form.getAttribute('data-type'));
            }
        });
    });
}

function calculate(type) {
    const resultValue = document.querySelector('.result-value');
    const resultArea = document.querySelector('.result-area');
    const formData = new FormData(document.querySelector('.calc-form'));
    const data = Object.fromEntries(formData.entries());

    let result = null;

    try {
        switch (type) {
            case 'imc':
                const weight = parseFloat(data.poids);
                const height = parseFloat(data.taille) / 100;
                if (weight > 0 && height > 0) {
                    result = (weight / (height * height)).toFixed(1);
                    showIMCStatus(result);
                }
                break;
            case 'pourcentage':
                const val = parseFloat(data.valeur);
                const pct = parseFloat(data.pourcentage);
                result = ((val * pct) / 100).toFixed(2);
                break;
            case 'tva':
                const ht = parseFloat(data.montant_ht);
                const rate = parseFloat(data.taux_tva);
                result = (ht * (1 + rate / 100)).toFixed(2);
                break;
            case 'moyenne':
                const nums = data.nombres.split(/[\s,;]+/).map(n => parseFloat(n)).filter(n => !isNaN(n));
                if (nums.length > 0) {
                    result = (nums.reduce((a, b) => a + b) / nums.length).toFixed(2);
                }
                break;
            case 'm2':
                const l = parseFloat(data.longueur);
                const w = parseFloat(data.largeur);
                result = (l * w).toFixed(2);
                break;
            case 'm3':
                const l3 = parseFloat(data.longueur);
                const w3 = parseFloat(data.largeur);
                const h3 = parseFloat(data.hauteur);
                result = (l3 * w3 * h3).toFixed(2);
                break;
            case 'salaire':
                const brut = parseFloat(data.brut);
                const typeSalarie = data.type_salarie; // prive, public, cadre
                let ratio = 0.77; // 23% charges for private
                if (typeSalarie === 'public') ratio = 0.85;
                if (typeSalarie === 'cadre') ratio = 0.75;
                result = (brut * ratio).toFixed(2);
                break;
            case 'grossesse':
                const ddr = new Date(data.ddr);
                if (!isNaN(ddr.getTime())) {
                    const dpa = new Date(ddr.getTime() + (280 * 24 * 60 * 60 * 1000));
                    result = dpa.toLocaleDateString('fr-FR');
                }
                break;
            case 'entre-deux-dates':
                const d1 = new Date(data.date1);
                const d2 = new Date(data.date2);
                if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                    const diffTime = Math.abs(d2 - d1);
                    result = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + ' jours';
                }
                break;
            case 'heure-de-travail':
                const start = data.debut.split(':');
                const end = data.fin.split(':');
                const pause = parseFloat(data.pause) || 0;
                if (start.length === 2 && end.length === 2) {
                    let minStart = parseInt(start[0]) * 60 + parseInt(start[1]);
                    let minEnd = parseInt(end[0]) * 60 + parseInt(end[1]);
                    let diff = minEnd - minStart - pause;
                    let h = Math.floor(diff / 60);
                    let m = diff % 60;
                    result = `${h}h${m.toString().padStart(2, '0')}`;
                }
                break;
            case 'heure':
                const h1 = data.h1.split(':');
                const h2 = data.h2.split(':');
                const op = data.op;
                if (h1.length === 2 && h2.length === 2) {
                    let m1 = parseInt(h1[0]) * 60 + parseInt(h1[1]);
                    let m2 = parseInt(h2[0]) * 60 + parseInt(h2[1]);
                    let resM = op === '+' ? m1 + m2 : m1 - m2;
                    let h = Math.floor(Math.abs(resM) / 60);
                    let m = Math.abs(resM) % 60;
                    result = (resM < 0 ? '-' : '') + `${h}:${m.toString().padStart(2, '0')}`;
                }
                break;
            case 'cycle-du-sommeil':
                const wakeTime = data.wake_time.split(':'); // Format HH:MM
                if (wakeTime.length === 2) {
                    let mWake = parseInt(wakeTime[0]) * 60 + parseInt(wakeTime[1]);
                    // Suggest 5 or 6 cycles of 90 min before wake time
                    let cycle5 = (mWake - 450 + 1440) % 1440;
                    let cycle6 = (mWake - 540 + 1440) % 1440;
                    const f = (m) => `${Math.floor(m/60)}h${(m%60).toString().padStart(2,'0')}`;
                    result = `Idéal : ${f(cycle6)} ou ${f(cycle5)}`;
                }
                break;
            case 'ovulation':
                const ddrO = new Date(data.ddr);
                const cycleLen = parseInt(data.cycle) || 28;
                if (!isNaN(ddrO.getTime())) {
                    // Ovulation is roughly cycle length - 14 days after DDR
                    const ovulDate = new Date(ddrO.getTime() + ((cycleLen - 14) * 24 * 60 * 60 * 1000));
                    result = ovulDate.toLocaleDateString('fr-FR');
                }
                break;
            case 'volume':
                const shape = data.forme;
                if (shape === 'cube') {
                    result = (parseFloat(data.v_longueur) * parseFloat(data.v_largeur) * parseFloat(data.v_hauteur)).toFixed(3);
                } else if (shape === 'cylindre') {
                    result = (Math.PI * Math.pow(parseFloat(data.v_rayon), 2) * parseFloat(data.v_hauteur)).toFixed(3);
                } else if (shape === 'sphere') {
                    result = ((4/3) * Math.PI * Math.pow(parseFloat(data.v_rayon), 3)).toFixed(3);
                }
                break;
            case 'metabolisme-basal':
                const sex = data.sexe;
                const p = parseFloat(data.poids);
                const t = parseFloat(data.taille);
                const a = parseFloat(data.age);
                if (sex === 'homme') {
                    result = (88.362 + (13.397 * p) + (4.799 * t) - (5.677 * a)).toFixed(0);
                } else {
                    result = (447.593 + (9.247 * p) + (3.098 * t) - (4.330 * a)).toFixed(0);
                }
                break;
            case 'chomage':
                const sMoyen = parseFloat(data.salaire_moyen);
                result = (sMoyen * 0.57).toFixed(2);
                break;
            case 'frais-kilometrique':
                const dK = parseFloat(data.distance);
                const cv = parseInt(data.puissance);
                let rateK = 0.6; // Simplified average
                if (cv < 4) rateK = 0.5;
                if (cv > 6) rateK = 0.7;
                result = (dK * rateK).toFixed(2);
                break;
            case 'signe-chinois':
                const year = parseInt(data.annee);
                const signs = ["Singe", "Coq", "Chien", "Cochon", "Rat", "Boeuf", "Tigre", "Lapin", "Dragon", "Serpent", "Cheval", "Chèvre"];
                result = signs[year % 12];
                break;
            case 'itineraire':
                const dist = parseFloat(data.distance);
                const vit = parseFloat(data.vitesse);
                if (dist > 0 && vit > 0) {
                    let totalHours = dist / vit;
                    let h = Math.floor(totalHours);
                    let m = Math.round((totalHours - h) * 60);
                    result = `${h}h${m.toString().padStart(2, '0')}min`;
                }
                break;
            case 'litteral':
                const typeL = data.type_litteral;
                const aVal = data.val_a;
                const bVal = data.val_b;
                if (typeL === 'plus') {
                    result = `(${aVal})² + 2(${aVal})(${bVal}) + (${bVal})²`;
                } else if (typeL === 'moins') {
                    result = `(${aVal})² - 2(${aVal})(${bVal}) + (${bVal})²`;
                } else {
                    result = `(${aVal})² - (${bVal})²`;
                }
                break;
            case 'renaux':
                const d1r = parseFloat(data.dim1);
                const d2r = parseFloat(data.dim2);
                if (d1r > 0 && d2r > 0) {
                    // Ellipsoid approx: 0.523 * L * W * H (assume H = W)
                    result = (0.523 * d1r * d2r * d2r).toFixed(1);
                }
                break;
            case 'biliaire':
                const d_bil = parseFloat(data.diam_bil);
                if (d_bil > 0) {
                    result = ((4/3) * Math.PI * Math.pow(d_bil / 2, 3)).toFixed(1);
                }
                break;
            case 'signe-lunaire':
                const d_lunaire = new Date(data.date_naissance);
                const moonSigns = ["Bélier", "Taureau", "Gémeaux", "Cancer", "Lion", "Vierge", "Balance", "Scorpion", "Sagittaire", "Capricorne", "Verseau", "Poissons"];
                // Very crude approximation based on day of century
                let dayOfCentury = Math.floor((d_lunaire - new Date(2000,0,1)) / (86400000));
                let moonIndex = Math.floor((dayOfCentury % 27.32) / 2.27) % 12;
                result = moonSigns[Math.abs(moonIndex)];
                break;
            case 'ascendant':
                const hBirth = data.heure_naissance.split(':');
                const ascendants = ["Bélier", "Taureau", "Gémeaux", "Cancer", "Lion", "Vierge", "Balance", "Scorpion", "Sagittaire", "Capricorne", "Verseau", "Poissons"];
                if (hBirth.length === 2) {
                    // Extremely simplified: based on hour of day (2h blocks)
                    let hour = parseInt(hBirth[0]);
                    let indexA = Math.floor((hour + 4) % 24 / 2) % 12;
                    result = ascendants[indexA];
                }
                break;
            case 'semaine-grossesse':
                const ddrS = new Date(data.ddr);
                if (!isNaN(ddrS.getTime())) {
                    const diffDays = Math.floor((new Date() - ddrS) / (86400000));
                    const sa = Math.floor(diffDays / 7);
                    const saDays = diffDays % 7;
                    const sg = sa - 2;
                    result = `${sa} SA + ${saDays}j (soit ${sg < 0 ? 0 : sg} SG)`;
                }
                break;
            case 'pct-augmentation':
                const v1 = parseFloat(data.valeur_initiale);
                const v2 = parseFloat(data.valeur_finale);
                result = (((v2 - v1) / v1) * 100).toFixed(2) + '%';
                break;
            // Add other cases as needed...
            default:
                console.log('Calculator type not implemented yet: ' + type);
        }

        if (result !== null) {
            resultValue.textContent = result;
            resultArea.classList.add('active');
            scrollToResult();
        }
    } catch (err) {
        console.error(err);
        alert('Erreur dans le calcul. Veuillez vérifier vos entrées.');
    }
}

function showIMCStatus(imc) {
    const statusEl = document.querySelector('.result-status');
    if (!statusEl) return;
    let status = '';
    if (imc < 18.5) status = 'Insuffisance pondérale';
    else if (imc < 25) status = 'Poids normal';
    else if (imc < 30) status = 'Surpoids';
    else status = 'Obésité';
    statusEl.textContent = status;
}

function scrollToResult() {
    const resultArea = document.querySelector('.result-area');
    resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
