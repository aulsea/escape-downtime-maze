class MazeGame {
    constructor() {
        this.canvas = document.getElementById('mazeCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.mazeSize = 16; // Changed from 15 to 16
        this.cellSize = 46;  // Slightly adjusted for 16x16
        this.wallThickness = 2; // Thinner walls for outline style
        this.playerSize = 10;  // Reduced from 14
        this.moveSpeed = 0.15;
        this.targetPos = { x: 0, y: 0 };
        this.trail = [];
        this.maxTrailLength = 35;
        this.trailDuration = 1000;
        this.trailSegmentSpacing = 6;
        this.trailColors = {
            primary: { r: 255, g: 255, b: 255 },
            secondary: { r: 255, g: 255, b: 255 }
        };
        this.modalTimeout = null;
        this.countdownInterval = null;
        this.gameStarted = false;
        this.currentLevel = 1;
        this.startPosition = {
            x: this.cellSize * 1.5,
            y: this.cellSize * 1.5
        };
        this.canvasOffset = { x: 0, y: 0 };
        this.buttonScale = 1;
        
        // Set canvas size based on device
        this.setupCanvasSize();
        
        // Initialize game state
        this.maze = [];
        this.playerPos = { ...this.startPosition };
        this.trail = [{ ...this.startPosition }];
        this.targetPos = { ...this.startPosition };
        this.endPos = { 
            x: (this.mazeSize - 2) * this.cellSize + this.cellSize / 2,
            y: (this.mazeSize - 2) * this.cellSize + this.cellSize / 2
        };
        this.isGameComplete = false;
        this.isGameOver = false;
        this.showGameOverScreen = false;
        this.showSuccessScreen = false; // Add success screen flag
        this.canMove = false;
        this.lastTime = performance.now();
        
        // Generate the maze
        this.generateMaze();
        
        // Set up touch controls
        this.setupControls();
        
        // Set up welcome modal
        this.setupWelcomeModal();
        
        // Start the game loop
        this.animate();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.setupCanvasSize();
        });

        // Show welcome modal initially
        this.showWelcomeModal();

        this.finishPattern = this.createFinishPattern();
    }

    setupCanvasSize() {
        const container = document.getElementById('maze-container');
        
        const isTablet = ('ontouchstart' in window) && window.innerWidth >= 768;
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        
        let containerSize;
        if (isTablet) {
            containerSize = Math.min(window.innerHeight * 0.7, window.innerWidth * 0.8);
            this.cellSize = 52; // Adjusted for tablet
            this.wallThickness = 10;
            this.playerSize = 12;
        } else if (isTouch) {
            containerSize = Math.min(window.innerHeight * 0.7, window.innerWidth * 0.95);
            this.cellSize = 42; // Adjusted for phone
            this.wallThickness = 8;
            this.playerSize = 10;
        } else {
            containerSize = Math.min(window.innerHeight * 0.75, window.innerWidth * 0.6);
            this.cellSize = 32; // Adjusted for desktop
            this.wallThickness = 6;
            this.playerSize = 8;
        }

        // Set container size
        container.style.width = containerSize + 'px';
        container.style.height = containerSize + 'px';

        // Calculate the total maze size including padding
        const totalMazeSize = (this.mazeSize * this.cellSize) + (this.wallThickness * 4);
        
        // Set canvas size
        this.canvas.width = totalMazeSize;
        this.canvas.height = totalMazeSize;
        
        // Center the maze in the canvas
        this.canvasOffset = {
            x: this.wallThickness * 2,
            y: this.wallThickness * 2
        };

        // Update positions with new cell size
        this.startPosition = {
            x: this.cellSize * 1.5,
            y: this.cellSize * 1.5
        };
        this.endPos = {
            x: (this.mazeSize - 2) * this.cellSize + this.cellSize / 2,
            y: (this.mazeSize - 2) * this.cellSize + this.cellSize / 2
        };
        
        // Scale UI elements based on device type
        this.buttonScale = isTablet ? 2 : (isTouch ? 1.5 : 1);
        
        if (this.playerPos) {
            this.resetPlayerPosition();
        }
    }

    generateMaze() {
        // Initialize maze with walls
        for (let y = 0; y < this.mazeSize; y++) {
            this.maze[y] = [];
            for (let x = 0; x < this.mazeSize; x++) {
                this.maze[y][x] = 1;
            }
        }

        const stack = [[1, 1]];
        this.maze[1][1] = 0;
        
        // Direction arrays with balanced weights
        const directions = [
            [2, 0], [0, 2], [-2, 0], [0, -2]
        ];

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const [x, y] = current;
            
            // Simple random shuffle
            const shuffledDirections = [...directions].sort(() => Math.random() - 0.5);
            
            let foundPath = false;
            for (const [dx, dy] of shuffledDirections) {
                const newX = x + dx;
                const newY = y + dy;

                if (newX > 0 && newX < this.mazeSize - 1 && 
                    newY > 0 && newY < this.mazeSize - 1 && 
                    this.maze[newY][newX] === 1) {
                    
                    this.maze[y + dy/2][x + dx/2] = 0;
                    this.maze[newY][newX] = 0;
                    stack.push([newX, newY]);
                    foundPath = true;
                    break;
                }
            }

            if (!foundPath) {
                stack.pop();
            }
        }

        // Add more shortcuts for easier navigation
        const numShortcuts = Math.floor(this.mazeSize * 0.3); // Even more shortcuts
        let shortcutsAdded = 0;
        
        while (shortcutsAdded < numShortcuts) {
            const x = 1 + Math.floor(Math.random() * (this.mazeSize - 2));
            const y = 1 + Math.floor(Math.random() * (this.mazeSize - 2));
            
            if (this.maze[y][x] === 1) {
                let pathCount = 0;
                
                // Simple path check
                for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
                    const checkX = x + dx;
                    const checkY = y + dy;
                    if (this.maze[checkY]?.[checkX] === 0) {
                        pathCount++;
                    }
                }
                
                if (pathCount >= 1) {
                this.maze[y][x] = 0;
                    shortcutsAdded++;
                }
            }
        }

        // Create more open areas near start and end
        for (let y = 1; y <= 2; y++) {
            for (let x = 1; x <= 2; x++) {
                this.maze[y][x] = 0;
            }
        }

        // More open end area
        for (let y = this.mazeSize - 3; y <= this.mazeSize - 2; y++) {
            for (let x = this.mazeSize - 3; x <= this.mazeSize - 2; x++) {
                this.maze[y][x] = 0;
            }
        }
    }

    checkWallCollision(x, y) {
        // Collision detection disabled - player can move through walls
        return false;
    }

    updatePlayerPosition(deltaTime) {
        // Don't update position if movement is disabled
        if (!this.canMove || !this.gameStarted || this.isGameComplete || this.isGameOver) return;

        // Calculate direction to target
        const dx = this.targetPos.x - this.playerPos.x;
        const dy = this.targetPos.y - this.playerPos.y;
        
        // Calculate distance to target
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0.1) {
            // Calculate movement this frame
            const moveX = dx * this.moveSpeed;
            const moveY = dy * this.moveSpeed;
            
            // Calculate new position
            const newX = this.playerPos.x + moveX;
            const newY = this.playerPos.y + moveY;
            
            // Only update if no collision
            if (!this.checkWallCollision(newX, newY)) {
                this.playerPos.x = newX;
                this.playerPos.y = newY;
                
                // Add new position to trail with timestamp
                const currentTime = performance.now();
                this.trail.push({
                    x: this.playerPos.x,
                    y: this.playerPos.y,
                    timestamp: currentTime
                });
                
                // Remove old trail segments
                const cutoffTime = currentTime - this.trailDuration;
                while (this.trail.length > 0 && this.trail[0].timestamp < cutoffTime) {
                    this.trail.shift();
                }

                // Check for win condition
                const distanceToEnd = Math.sqrt(
                    Math.pow(this.playerPos.x - this.endPos.x, 2) + 
                    Math.pow(this.playerPos.y - this.endPos.y, 2)
                );
                
                if (distanceToEnd < this.cellSize * 0.5) {
                    this.isGameComplete = true;
                    this.canMove = false;
                    this.targetPos = { ...this.playerPos };
                    this.showSuccessModal();
                }
            } else {
                // If collision, stop movement and show game over
                this.targetPos = { ...this.playerPos };
                this.isGameOver = true;
                this.canMove = false;
                this.drawGameOverScreen();
            }
        }
    }

    setupControls() {
        let isDragging = false;
        let canStartDrag = false;

        const getCanvasPoint = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            const point = e.touches ? e.touches[0] : e;
            return {
                x: (point.clientX - rect.left) * scaleX,
                y: (point.clientY - rect.top) * scaleY
            };
        };

        const isClickOnPlayer = (pos) => {
            const dx = pos.x - (this.canvasOffset.x + this.playerPos.x);
            const dy = pos.y - (this.canvasOffset.y + this.playerPos.y);
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= this.playerSize * 2.5;
        };

        const startDragging = (e) => {
            const pos = getCanvasPoint(e);
            
            if (this.canMove && this.gameStarted && !this.isGameComplete && !this.isGameOver) {
                if (isClickOnPlayer(pos)) {
                    isDragging = true;
                    canStartDrag = true;
                    movePlayer(e);
                }
            }
        };

        const movePlayer = (e) => {
            if (!isDragging || !this.gameStarted || this.isGameComplete || this.isGameOver || !this.canMove || !canStartDrag) {
                return;
            }
            
            const pos = getCanvasPoint(e);
            
            this.targetPos = {
                x: Math.max(this.cellSize, Math.min(pos.x - this.canvasOffset.x, (this.mazeSize - 1) * this.cellSize)),
                y: Math.max(this.cellSize, Math.min(pos.y - this.canvasOffset.y, (this.mazeSize - 1) * this.cellSize))
            };
        };

        const stopDragging = () => {
            if (isDragging) {
                isDragging = false;
                canStartDrag = false;
                // Stop player movement by setting target to current position
                this.targetPos = { ...this.playerPos };
            }
        };

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startDragging(e);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            movePlayer(e);
        }, { passive: false });

        this.canvas.addEventListener('touchend', stopDragging);
        this.canvas.addEventListener('touchcancel', stopDragging);

        // Mouse events
        this.canvas.addEventListener('mousedown', startDragging);
        this.canvas.addEventListener('mousemove', movePlayer);
        this.canvas.addEventListener('mouseup', stopDragging);
        this.canvas.addEventListener('mouseleave', stopDragging);
    }

    setupWelcomeModal() {
        const startButton = document.getElementById('startButton');
        startButton.addEventListener('click', () => {
            document.getElementById('welcomeModal').style.display = 'none';
            document.getElementById('modalOverlay').style.display = 'none';
            this.startGame();
        });
    }

    showWelcomeModal() {
        const modal = document.getElementById('welcomeModal');
        const overlay = document.getElementById('modalOverlay');
        modal.style.display = 'block';
        overlay.style.display = 'block';
        this.gameStarted = false;
        this.canMove = false;
    }

    startGame() {
        this.resetPlayerPosition();
        this.gameStarted = true;
        this.isGameOver = false;
        this.isGameComplete = false;
        this.showGameOverScreen = false;
        this.showSuccessScreen = false;
        this.canMove = false;
        
        // Set initial target position to player position
        this.targetPos = { ...this.startPosition };
        
        // Enable movement after a delay to prevent unwanted movement
        setTimeout(() => {
            this.resetPlayerPosition();
            this.canMove = true;
        }, 500);
    }

    resetPlayerPosition() {
        this.playerPos = { ...this.startPosition };
        this.targetPos = { ...this.startPosition };
        // Reset trail with timestamp
        this.trail = [{
            ...this.startPosition,
            timestamp: performance.now()
        }];
    }

    restart() {
        // Clear any existing timeouts/intervals
        if (this.modalTimeout) {
            clearTimeout(this.modalTimeout);
            this.modalTimeout = null;
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        // Hide all modals
        this.hideModals();

        // Keep current level if game over, reset to 1 if completing the game
        if (!this.isGameComplete) {
            // Keep the current level
            this.generateMaze();
        } else {
            // Reset to level 1 only if completed successfully
            this.currentLevel = 1;
            this.generateMaze();
        }

        // Reset game state
        this.canMove = false;
        this.gameStarted = false;
        this.isGameOver = false;
        this.isGameComplete = false;
        this.resetPlayerPosition();
    }

    hideModals() {
        // Hide all modals and overlay
        const modals = document.querySelectorAll('.modal');
        const overlay = document.getElementById('modalOverlay');
        
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    drawGameOverScreen() {
        // Create game over modal if it doesn't exist
        let gameOverModal = document.getElementById('gameOverModal');
        let modalOverlay = document.getElementById('modalOverlay');
        
        // Create overlay if it doesn't exist
        if (!modalOverlay) {
            modalOverlay = document.createElement('div');
            modalOverlay.id = 'modalOverlay';
            modalOverlay.className = 'modal-overlay';
            document.getElementById('modal-container').appendChild(modalOverlay);
        }

        if (!gameOverModal) {
            gameOverModal = document.createElement('div');
            gameOverModal.id = 'gameOverModal';
            gameOverModal.className = 'modal';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            
            const heading = document.createElement('h2');
            heading.textContent = 'Data did not survive';
            
            const levelText = document.createElement('p');
            levelText.textContent = `Level ${this.currentLevel}`;
            levelText.style.color = '#9ab3f5';
            levelText.style.marginBottom = '1rem';
            
            const button = document.createElement('button');
            button.id = 'startOverButton';
            button.className = 'start-button';
            button.textContent = 'Try Again';
            
            modalContent.appendChild(heading);
            modalContent.appendChild(levelText);
            modalContent.appendChild(button);
            gameOverModal.appendChild(modalContent);
            document.getElementById('modal-container').appendChild(gameOverModal);

            // Add event listener to the button
            button.addEventListener('click', () => {
                this.hideModals();
                this.restart();
                this.startGame();
            });
        } else {
            // Update existing modal text
            const heading = gameOverModal.querySelector('h2');
            const levelText = gameOverModal.querySelector('p');
            if (heading) {
                heading.textContent = 'Data did not survive';
            }
            if (levelText) {
                levelText.textContent = `Level ${this.currentLevel}`;
            }
            const button = gameOverModal.querySelector('button');
            if (button) {
                button.textContent = 'Try Again';
            }
        }

        // Show modal and overlay
        modalOverlay.style.display = 'block';
        gameOverModal.style.display = 'block';
    }

    drawSuccessScreen() {
        // Use same styling as game over screen
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const fontSize = Math.max(32, Math.floor(32 * this.buttonScale));
        const buttonWidth = Math.max(200, Math.floor(200 * this.buttonScale));
        const buttonHeight = Math.max(80, Math.floor(80 * this.buttonScale));

        const messageY = this.canvas.height / 2 - buttonHeight * 1.5;
        const buttonY = messageY + buttonHeight * 1.5;

        this.ctx.fillStyle = '#9ab3f5';
        this.ctx.font = `bold ${fontSize}px Inter`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Data passed successfully!', this.canvas.width / 2, messageY);

        const buttonX = this.canvas.width / 2 - buttonWidth / 2;
        
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowOffsetY = 6;
        
        const gradient = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
        gradient.addColorStop(0, '#4a5fc1');
        gradient.addColorStop(1, '#3d4fa3');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
        this.ctx.fill();
        
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;
        
        const buttonFontSize = Math.max(28, Math.floor(28 * this.buttonScale));
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `bold ${buttonFontSize}px Inter`;
        this.ctx.fillText('Play Again', this.canvas.width / 2, buttonY + buttonHeight/2 + buttonFontSize/3);

        this.playAgainButton = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
    }

    createFinishPattern() {
        // Create a pattern canvas
        const patternCanvas = document.createElement('canvas');
        const size = 6; // Size of each stripe
        patternCanvas.width = size * 4;  // Make pattern wider for flag look
        patternCanvas.height = size * 4;
        const pctx = patternCanvas.getContext('2d');

        // Draw red and white stripes
        pctx.fillStyle = '#ff0000';  // Base red color
        pctx.fillRect(0, 0, size * 4, size * 4);

        // Draw diagonal stripes
        pctx.fillStyle = '#ffffff';  // White stripes
        for (let i = -4; i < 8; i++) {
            pctx.beginPath();
            pctx.moveTo(i * size, 0);
            pctx.lineTo((i + 2) * size, 0);
            pctx.lineTo(0, (2 - i) * size);
            pctx.lineTo(0, (-i) * size);
            pctx.fill();
        }

        // Create and return pattern
        return this.ctx.createPattern(patternCanvas, 'repeat');
    }

    drawTrail() {
        if (this.trail.length < 2) return;
        
        const currentTime = performance.now();
        
        // Create segments for dotted trail effect
        let segments = [];
        for (let i = 0; i < this.trail.length - 1; i++) {
            const segment = this.trail[i];
            const nextSegment = this.trail[i + 1];
            
            // Calculate points between segments
            const dx = nextSegment.x - segment.x;
            const dy = nextSegment.y - segment.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const steps = Math.max(1, Math.floor(distance / this.trailSegmentSpacing));
            
            for (let j = 0; j < steps; j++) {
                const t = j / steps;
                segments.push({
                    x: segment.x + dx * t,
                    y: segment.y + dy * t,
                    timestamp: segment.timestamp + (nextSegment.timestamp - segment.timestamp) * t
                });
            }
        }
        
        // Draw trail segments
        segments.forEach((segment, index) => {
            const age = currentTime - segment.timestamp;
            const opacity = Math.max(0, 1 - (age / this.trailDuration));
            const smoothOpacity = Math.pow(Math.sin((opacity * Math.PI) / 2), 1.5);
            
            // Calculate size based on age and position
            const sizeMultiplier = 1 - (index / segments.length) * 0.6; // Reduced size decrease
            const pulseEffect = 0.8 + Math.sin(currentTime * 0.005 + index * 0.2) * 0.2;
            const size = this.playerSize * 0.8 * sizeMultiplier * pulseEffect; // Increased base size multiplier
            
            // Draw dot with enhanced glow
            this.ctx.shadowColor = `rgba(255, 255, 255, ${smoothOpacity * 0.7})`; // Increased glow opacity
            this.ctx.shadowBlur = 15;
            
            // Draw larger outer glow
            this.ctx.beginPath();
            this.ctx.arc(
                this.canvasOffset.x + segment.x,
                this.canvasOffset.y + segment.y,
                size * 1.5, // Larger outer glow
                0,
                Math.PI * 2
            );
            
            const outerGradient = this.ctx.createRadialGradient(
                this.canvasOffset.x + segment.x,
                this.canvasOffset.y + segment.y,
                0,
                this.canvasOffset.x + segment.x,
                this.canvasOffset.y + segment.y,
                size * 1.5
            );
            
            outerGradient.addColorStop(0, `rgba(255, 255, 255, ${smoothOpacity * 0.3})`);
            outerGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
            
            this.ctx.fillStyle = outerGradient;
            this.ctx.fill();
            
            // Draw main dot
            this.ctx.beginPath();
            this.ctx.arc(
                this.canvasOffset.x + segment.x,
                this.canvasOffset.y + segment.y,
                size,
                0,
                Math.PI * 2
            );
            
            const gradient = this.ctx.createRadialGradient(
                this.canvasOffset.x + segment.x,
                this.canvasOffset.y + segment.y,
                0,
                this.canvasOffset.x + segment.x,
                this.canvasOffset.y + segment.y,
                size
            );
            
            gradient.addColorStop(0, `rgba(255, 255, 255, ${smoothOpacity * 0.9})`); // Increased core opacity
            gradient.addColorStop(1, `rgba(255, 255, 255, ${smoothOpacity * 0.3})`); // Increased edge opacity
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        });
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
    }

    drawMaze() {
        // Clear canvas with dark background
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw paths with subtle background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        for (let y = 0; y < this.mazeSize; y++) {
            for (let x = 0; x < this.mazeSize; x++) {
                if (this.maze[y][x] === 0) {
                    this.ctx.fillRect(
                        this.canvasOffset.x + x * this.cellSize,
                        this.canvasOffset.y + y * this.cellSize,
                        this.cellSize,
                        this.cellSize
                    );
                }
            }
        }

        // Draw walls
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = this.wallThickness;
        this.ctx.lineCap = 'square';
        this.ctx.lineJoin = 'miter';
        this.ctx.beginPath();

        for (let y = 0; y < this.mazeSize; y++) {
            for (let x = 0; x < this.mazeSize; x++) {
                if (this.maze[y][x] === 1) {
                    const cellX = this.canvasOffset.x + x * this.cellSize;
                    const cellY = this.canvasOffset.y + y * this.cellSize;
                    
                    if (y === 0 || this.maze[y-1][x] === 0) {
                        this.ctx.moveTo(cellX, cellY);
                        this.ctx.lineTo(cellX + this.cellSize, cellY);
                    }
                    if (y === this.mazeSize-1 || this.maze[y+1][x] === 0) {
                        this.ctx.moveTo(cellX, cellY + this.cellSize);
                        this.ctx.lineTo(cellX + this.cellSize, cellY + this.cellSize);
                    }
                    if (x === 0 || this.maze[y][x-1] === 0) {
                        this.ctx.moveTo(cellX, cellY);
                        this.ctx.lineTo(cellX, cellY + this.cellSize);
                    }
                    if (x === this.mazeSize-1 || this.maze[y][x+1] === 0) {
                        this.ctx.moveTo(cellX + this.cellSize, cellY);
                        this.ctx.lineTo(cellX + this.cellSize, cellY + this.cellSize);
                    }
                }
            }
        }
        this.ctx.stroke();

        // Draw trail
        this.drawTrail();

        // Draw finish point
        const flagX = this.canvasOffset.x + this.endPos.x;
        const flagY = this.canvasOffset.y + this.endPos.y;
        
        // Draw flag pole
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.lineWidth = 2;
            this.ctx.beginPath();
        this.ctx.moveTo(flagX, flagY + this.playerSize * 2);
        this.ctx.lineTo(flagX, flagY - this.playerSize * 2);
        this.ctx.stroke();

        // Draw flag
        const flagWidth = this.playerSize * 3;
        const flagHeight = this.playerSize * 2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(flagX, flagY - this.playerSize * 2);
        this.ctx.lineTo(flagX + flagWidth, flagY - this.playerSize);
        this.ctx.lineTo(flagX, flagY);
        this.ctx.closePath();
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Draw player with enhanced glow
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.7)'; // Increased player glow
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
        this.ctx.arc(
            this.canvasOffset.x + this.playerPos.x,
            this.canvasOffset.y + this.playerPos.y,
            this.playerSize,
            0,
            Math.PI * 2
        );
            this.ctx.fill();
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
    }

    animate(currentTime) {
        // Calculate delta time
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update player position
        if (!this.isGameOver && !this.isGameComplete) {
            this.updatePlayerPosition(deltaTime);
        }

        this.drawMaze();
        requestAnimationFrame((time) => this.animate(time));
    }

    showSuccessModal() {
        const modal = document.getElementById('successModal');
        const overlay = document.getElementById('modalOverlay');
        const countdown = document.getElementById('countdown');
        let timeLeft = 15; // Increased from 10 to 15 seconds

        // If this is level 1, proceed to level 2
        if (this.currentLevel === 1) {
            this.currentLevel = 2;
            this.canMove = false;
            this.gameStarted = false;
            this.generateMaze();
            this.resetPlayerPosition();
            
            // Create level 2 modal
            let levelMsg = document.getElementById('level2Modal');
            if (!levelMsg) {
                levelMsg = document.createElement('div');
                levelMsg.id = 'level2Modal';
                levelMsg.className = 'modal';
                levelMsg.innerHTML = '<h2>Level 2</h2>';
                document.getElementById('modal-container').appendChild(levelMsg);
            }
            
            // Show level 2 modal
            document.getElementById('modalOverlay').style.display = 'block';
            levelMsg.style.display = 'block';
            
            setTimeout(() => {
                levelMsg.style.display = 'none';
                document.getElementById('modalOverlay').style.display = 'none';
                this.gameStarted = true;
                this.isGameComplete = false;
                this.canMove = true;
            }, 800);
            
            return;
        }

        // Clear any existing timeouts/intervals
        if (this.modalTimeout) {
            clearTimeout(this.modalTimeout);
            this.modalTimeout = null;
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        // Show modal and overlay
        modal.style.display = 'block';
        overlay.style.display = 'block';

        // Reset player position immediately
        this.resetPlayerPosition();
        this.canMove = false;

        // Initial countdown display
        countdown.textContent = `The game will restart in ${timeLeft} seconds`;

        // Update countdown every second
        this.countdownInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft >= 0) {
                countdown.textContent = `The game will restart in ${timeLeft} seconds`;
            }
        }, 1000);

        // Set timeout to reload the page
        this.modalTimeout = setTimeout(() => {
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
            window.location.reload();
        }, 15000); // Increased to 15 seconds (15000ms)
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new MazeGame();
}); 