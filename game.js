(function(j, u) {
    let word = "", idx = 0, score = 0, total = 0, correct = 0, time = 60, maxTime = 60;
    let timer, active = false, miss = false, combo = 0, maxCombo = 0, totalKeys = 0;
    const wrongWords = new Set();
    let audioCtx = null;

    function playSound(type) {
        if (u('#set-sound').first().value === 'off') return;
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        
        if (type === 'ok') {
            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(850, audioCtx.currentTime + 0.04);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        } else if (type === 'ng') {
            osc.type = 'triangle'; osc.frequency.setValueAtTime(140, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        } else if (type === 'clear') {
            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
            osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.07);
            osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.14);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        } else if (type === 'bonus') {
            // 【新音源】時間追加時の高音ピピ音
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            osc.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        }
        let duration = type === 'ng' ? 0.12 : type === 'clear' ? 0.25 : type === 'bonus' ? 0.1 : 0.04;
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.start(); osc.stop(audioCtx.currentTime + duration);
    }

    function showScreen(id) { 
        j('.screen').removeClass('active').hide();
        j('#' + id).addClass('active').fadeIn(200); 
    }

    function start() {
        score = total = correct = combo = maxCombo = totalKeys = 0;
        maxTime = time = parseInt(j('#set-time').val());
        wrongWords.clear(); active = true;
        
        u('#t-score').text(0); u('#t-time').text(time); u('#t-acc').text('100%'); u('#t-wpm').text(0);
        u('#game-progress').first().style.width = '100%';
        
        next(); showScreen('scr-play');
        
        timer = setInterval(() => {
            time--; u('#t-time').text(time);
            updateProgressBar();
            let elapsed = (maxTime - time) / 60;
            if(elapsed > 0) u('#t-wpm').text(Math.round((totalKeys / 5) / elapsed));
            if (time <= 0) end();
        }, 1000);
    }

    function updateProgressBar() {
        let percent = (time / maxTime) * 100;
        if (percent > 100) percent = 100; // 時間が初期値を超えた場合のカンスト処理
        u('#game-progress').first().style.width = percent + '%';
    }

    function next() { 
        word = TYPING_WORDS[Math.floor(Math.random() * TYPING_WORDS.length)]; 
        idx = 0; miss = false; render(); 
    }

    function render() {
        let h = "";
        for (let i = 0; i < word.length; i++) {
            h += `<span class="${i < idx ? 'ok' : i === idx ? (miss ? 'ng' : 'next') : 'wait'}">${word[i]}</span>`;
        }
        u('#w-box').html(h);
    }

    function end() {
        active = false; clearInterval(timer);
        u('#r-score').text(score); u('#r-maxcombo').text(maxCombo);
        
        let acc = total ? Math.round((correct / total) * 100) : 100;
        u('#r-acc').text(acc + "%");
        
        let elapsedSeconds = maxTime - time;
        if (elapsedSeconds <= 0) elapsedSeconds = maxTime; 
        let wpm = Math.round((totalKeys / 5) / (elapsedSeconds / 60));
        u('#r-wpm').text(wpm + " WPM");
        
        let r = wpm >= 180 && acc >= 95 ? "S+ 👑" : wpm >= 130 && acc >= 90 ? "S" : wpm >= 80 ? "A" : wpm >= 40 ? "B" : "C";
        u('#r-rank').text(r);
        
        if (wrongWords.size > 0) {
            u('#wrong-list').html(Array.from(wrongWords).map(w => `<span class="wrong-tag">${w}</span>`).join(''));
            j('#weakness-box').slideDown(200);
        } else {
            j('#weakness-box').hide();
        }
        
        j('#combo-badge').addClass('combo-hidden'); 
        showScreen('scr-res');
    }

    j(window).on('keydown', e => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        
        if (e.key === "Escape" && active) {
            e.preventDefault();
            playSound('ng');
            end();
            return;
        }
        
        if (e.key === " " && (j('#scr-start').is(':visible') || j('#scr-res').is(':visible'))) { 
            j(e.target).blur();
            e.preventDefault(); start(); return; 
        }
        if (!active || e.key.length !== 1) return;
        total++; totalKeys++;
        
        if (e.key === word[idx]) {
            correct++; idx++; miss = false; combo++; if (combo > maxCombo) maxCombo = combo;
            playSound('ok');
            
            // 【新機能】10コンボごとに時間を1秒追加
            if (combo > 0 && combo % 10 === 0) {
                time += 1;
                u('#t-time').text(time);
                playSound('bonus');
                
                // メメーターを緑色にフラッシュさせる演出クラスを付与
                j('.progress-bar-container').addClass('time-bonus-flash');
                setTimeout(() => j('.progress-bar-container').removeClass('time-bonus-flash'), 400);
                updateProgressBar();
            }

            if (combo >= 3) j('#combo-badge').text(combo + " COMBO 🔥").removeClass('combo-hidden');
            if (idx >= word.length) { score++; u('#t-score').text(score); playSound('clear'); next(); } else render();
        } else {
            miss = true; combo = 0; j('#combo-badge').addClass('combo-hidden'); wrongWords.add(word); playSound('ng');
            j('body').css('background-color', '#2d1419').animate({ backgroundColor: '#0f172a' }, 100);
            render();
        }
        u('#t-acc').text(Math.round((correct / total) * 100) + "%");
    });

    j('.btn-start').on('click', start);

})(jQuery, u);
