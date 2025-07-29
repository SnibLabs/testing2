class GameManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.width = 800;
        this.height = 480;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.gameState = 'menu'; // menu, flying, finished
        this.score = 0;
        this.highScore = 0;
        this.obstacles = [];
        this.boostPads = [];
        this.cannon = null;
        this.man = null;

        this.menuDiv = null;

        this.lastFrame = 0;

        this.init();
    }

    init() {
        this.showMenu();
        this.canvas.addEventListener('mousedown', (e) => this.handleInput(e));
        window.addEventListener('keydown', (e) => this.handleInput(e));
    }

    showMenu() {
        if (!this.menuDiv) {
            this.menuDiv = document.createElement('div');
            this.menuDiv.id = 'gameMenu';
            this.menuDiv.innerHTML = `
                <h1>Cannon Man</h1>
                <p>Shoot the man as far as you can!<br>
                Avoid obstacles and hit boost pads to go further.<br>
                <b>Click</b> or press <b>Space</b> to launch.</p>
                <button id="startBtn">Start Game</button>
                <p id="scoreText" style="margin-top:16px"></p>
            `;
            this.container.appendChild(this.menuDiv);
        }
        const scoreText = this.menuDiv.querySelector('#scoreText');
        scoreText.textContent = (this.highScore > 0) ? `High Score: ${this.highScore} m` : '';
        document.getElementById('startBtn').onclick = () => this.startGame();
    }

    hideMenu() {
        if (this.menuDiv) this.menuDiv.style.display = 'none';
    }

    startGame() {
        this.hideMenu();
        this.resetGame();
        this.render(); // Immediate visual feedback
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    resetGame() {
        this.score = 0;
        this.gameState = 'flying';
        this.scrollX = 0;

        this.cannon = {
            x: 80,
            y: this.height - 80,
            angle: Math.PI/4, // 45deg
            power: 16
        };

        this.man = {
            x: this.cannon.x + Math.cos(this.cannon.angle)*58,
            y: this.cannon.y - Math.sin(this.cannon.angle)*58,
            vx: 0,
            vy: 0,
            radius: 18,
            flying: false,
            rotation: 0,
            distance: 0,
            color: '#da6f2b'
        };

        this.obstacles = [];
        this.boostPads = [];
        // Place obstacles and boosts along the "distance"
        let px = 600;
        while(px < 4000) {
            if (Math.random() < 0.21) {
                this.obstacles.push({
                    x: px,
                    y: this.height - 60 - randomInt(0,80),
                    w: randomInt(28,42),
                    h: randomInt(32,44),
                    color: '#455a64'
                });
            } else if (Math.random() < 0.18) {
                this.boostPads.push({
                    x: px,
                    y: this.height - 43,
                    w: 48,
                    h: 14,
                    color: '#33c6ff'
                });
            }
            px += randomInt(90, 170);
        }
        this.groundY = this.height - 36;
    }

    handleInput(e) {
        if (this.gameState === 'menu' || this.gameState === 'finished') {
            // Only allow start in menu/finished
            if ((e.type === 'mousedown') ||
                (e.type === 'keydown' && (e.code === 'Space' || e.key === ' '))) {
                this.startGame();
                e.preventDefault();
            }
            return;
        }
        if (this.gameState === 'flying' && !this.man.flying) {
            // Launch the man!
            this.man.flying = true;
            this.man.vx = Math.cos(this.cannon.angle) * this.cannon.power;
            this.man.vy = -Math.sin(this.cannon.angle) * this.cannon.power;
        }
    }

    gameLoop(ts) {
        this.update();
        this.render();
        if (this.gameState !== 'menu') {
            requestAnimationFrame((t) => this.gameLoop(t));
        }
    }

    update() {
        if (this.gameState !== 'flying') return;

        if (this.man.flying) {
            // Gravity
            this.man.vy += 0.44;
            // Air drag
            this.man.vx *= 0.995;

            // Move
            this.man.x += this.man.vx;
            this.man.y += this.man.vy;
            this.man.distance = Math.max(this.man.distance, Math.floor(this.man.x - 80));
            this.score = Math.floor(this.man.x / 10);

            // Camera follows man
            this.scrollX = clamp(this.man.x - 180, 0, 99999);

            // Collision with ground
            if (this.man.y + this.man.radius > this.groundY) {
                this.man.y = this.groundY - this.man.radius;
                if (this.man.vy > 4) {
                    // Bounce (dampen)
                    this.man.vy = -this.man.vy * 0.43;
                    this.man.vx *= 0.84;
                } else {
                    this.man.vy = 0;
                    this.man.vx *= 0.92;
                    if (Math.abs(this.man.vx) < 0.8) {
                        this.endGame();
                    }
                }
            }

            // Collisions with obstacles
            for (let obs of this.obstacles) {
                let rx = obs.x - this.scrollX;
                if (circleRectCollide(this.man.x, this.man.y, this.man.radius, obs.x, obs.y, obs.w, obs.h)) {
                    // Stop the man hard
                    this.man.vx *= 0.45;
                    this.man.vy = Math.min(-4, -Math.abs(this.man.vy)*0.45);
                    // Bump man slightly up to avoid getting stuck
                    this.man.y = obs.y - this.man.radius - 2;
                }
            }
            // Collisions with boost pads
            for (let pad of this.boostPads) {
                if (!pad.used && circleRectCollide(this.man.x, this.man.y, this.man.radius, pad.x, pad.y, pad.w, pad.h)) {
                    this.man.vx *= 1.35;
                    this.man.vy = -Math.abs(this.man.vy)*0.7 - randomInt(6,12);
                    pad.used = true;
                }
            }

            // Rotate the man
            this.man.rotation += this.man.vx * 0.04;
        } else {
            // At cannon, can aim
            // Animate cannon barrel up/down with arrow keys
            // (Optional: implement aiming with arrow keys)
        }
    }

    endGame() {
        this.gameState = 'finished';
        if (this.score > this.highScore) this.highScore = this.score;
        setTimeout(() => {
            this.menuDiv.style.display = '';
            this.showMenu();
        }, 1100);
    }

    render() {
        // Clear
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw ground
        this.ctx.save();
        this.ctx.fillStyle = "#58733d";
        this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);
        this.ctx.restore();

        // Draw obstacles
        for (let obs of this.obstacles) {
            let rx = obs.x - this.scrollX;
            if (rx > -48 && rx < this.width + 48) {
                this.ctx.save();
                this.ctx.fillStyle = obs.color;
                this.ctx.fillRect(rx, obs.y, obs.w, obs.h);
                // Shadow
                this.ctx.globalAlpha = 0.35;
                this.ctx.fillStyle = "#222";
                this.ctx.fillRect(rx, obs.y+obs.h, obs.w, 8);
                this.ctx.globalAlpha = 1.0;
                this.ctx.restore();
            }
        }
        // Draw boost pads
        for (let pad of this.boostPads) {
            let rx = pad.x - this.scrollX;
            if (rx > -48 && rx < this.width + 48) {
                this.ctx.save();
                this.ctx.fillStyle = pad.used ? "#9be6ff" : pad.color;
                this.ctx.fillRect(rx, pad.y, pad.w, pad.h);
                this.ctx.restore();
                // Lightning bolt
                this.ctx.save();
                this.ctx.strokeStyle = "#fff";
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(rx+12, pad.y+3);
                this.ctx.lineTo(rx+24, pad.y+pad.h-2);
                this.ctx.lineTo(rx+30, pad.y+7);
                this.ctx.stroke();
                this.ctx.restore();
            }
        }

        // Draw cannon
        let cx = this.cannon.x - this.scrollX;
        let cy = this.cannon.y;
        // Barrel
        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.rotate(-this.cannon.angle);
        this.ctx.fillStyle = "#444";
        this.ctx.fillRect(-14, -14, 68, 28);
        this.ctx.restore();
        // Base
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(cx, cy+18, 36, 0, Math.PI, true);
        this.ctx.fillStyle = "#3b2520";
        this.ctx.fill();
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = "#222";
        this.ctx.stroke();
        this.ctx.restore();

        // Draw man
        let manX = this.man.x - this.scrollX;
        let manY = this.man.y;
        this.ctx.save();
        this.ctx.translate(manX, manY);
        this.ctx.rotate(this.man.rotation);
        // Body
        this.ctx.fillStyle = this.man.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.man.radius, 0, 2 * Math.PI);
        this.ctx.fill();
        // Face
        this.ctx.save();
        this.ctx.rotate(-this.man.rotation);
        this.ctx.fillStyle = "#ffe8b4";
        this.ctx.beginPath();
        this.ctx.arc(4, -4, 7, 0, 2 * Math.PI);
        this.ctx.fill();
        // Eyes
        this.ctx.fillStyle = "#222";
        this.ctx.beginPath();
        this.ctx.arc(7, -6, 1.4, 0, 2*Math.PI);
        this.ctx.arc(3, -7, 1.1, 0, 2*Math.PI);
        this.ctx.fill();
        // Smile
        this.ctx.strokeStyle = "#b84a0a";
        this.ctx.lineWidth = 1.2;
        this.ctx.beginPath();
        this.ctx.arc(5, -2, 2.5, 0, Math.PI/2);
        this.ctx.stroke();
        this.ctx.restore();
        // Arms/legs
        this.ctx.strokeStyle = "#612b07";
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(-7, 12); this.ctx.lineTo(-17, 28); // left leg
        this.ctx.moveTo(7, 12); this.ctx.lineTo(17, 28); // right leg
        this.ctx.moveTo(-8, -8); this.ctx.lineTo(-18, -18); // left arm
        this.ctx.moveTo(8, -8); this.ctx.lineTo(18, -18); // right arm
        this.ctx.stroke();
        this.ctx.restore();

        // Draw UI
        this.ctx.save();
        // Distance
        this.ctx.fillStyle = "#222";
        this.ctx.font = "22px Segoe UI, Arial";
        this.ctx.fillText(`Distance: ${this.score} m`, 24, 36);
        if (this.highScore > 0) {
            this.ctx.fillStyle = "#446";
            this.ctx.font = "16px Segoe UI, Arial";
            this.ctx.fillText(`High Score: ${this.highScore} m`, 24, 60);
        }
        // Instructions
        if (!this.man.flying && this.gameState === 'flying') {
            this.ctx.font = "20px Segoe UI, Arial";
            this.ctx.fillStyle = "#1d4a25";
            this.ctx.fillText("Click or press SPACE to launch!", this.width/2-124, this.height-40);
        }
        this.ctx.restore();
    }
}

// --- Initialization ---
function initGame() {
    new GameManager('gameContainer');
}

window.addEventListener('DOMContentLoaded', initGame);