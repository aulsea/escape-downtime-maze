class MazeGame {
    constructor() {
        this.canvas = document.getElementById('mazeCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.mazeSize = 15;
        this.cellSize = 60;  // Significantly increased base cell size
        this.wallThickness = 8;  // Thicker walls
        this.playerSize = 16;  // Larger player
        this.moveSpeed = 0.15;
        this.targetPos = { x: 0, y: 0 };
        this.trail = [];
        this.maxTrailLength = 35;
        this.trailDuration = 1000;
        this.trailColors = {
            outer: { r: 74, g: 95, b: 193 },
            inner: { r: 255, g: 255, b: 255 }
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
        
        // Force a minimum size for tablets
        const minSize = Math.max(window.innerWidth * 0.9, 600);
        container.style.width = minSize + 'px';
        container.style.height = minSize + 'px';
        
        const containerWidth = minSize;
        const containerHeight = minSize;

        // Calculate cell size to fit the container
        const cellSize = Math.floor((Math.min(containerWidth, containerHeight) - 40) / this.mazeSize);
        this.cellSize = Math.max(60, cellSize); // Ensure minimum cell size of 60px
        
        // Scale other dimensions based on cell size
        this.wallThickness = Math.max(8, Math.floor(this.cellSize * 0.15));
        this.playerSize = Math.max(16, Math.floor(this.cellSize * 0.3));

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
        
        // Scale UI elements based on cell size
        this.buttonScale = Math.max(1.5, this.cellSize / 40); // Increased minimum scale
        
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

        // Create paths using recursive backtracking
        const stack = [[1, 1]];
        this.maze[1][1] = 0;
        
        // Direction arrays for normal moves
        const directions = [
            [2, 0], [-2, 0], [0, 2], [0, -2]
        ];

        while (stack.length > 0) {
            const [x, y] = stack[stack.length - 1];
            
            // Shuffle directions randomly
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

        // Add a few strategic shortcuts (much fewer than before)
        const numShortcuts = Math.floor(this.mazeSize * 0.4); // Reduced number of shortcuts
        let shortcutsAdded = 0;
        
        while (shortcutsAdded < numShortcuts) {
            const x = 1 + Math.floor(Math.random() * (this.mazeSize - 2));
            const y = 1 + Math.floor(Math.random() * (this.mazeSize - 2));
            
            if (this.maze[y][x] === 1) {
                // Count adjacent paths
                let pathCount = 0;
                for (const [dx, dy] of directions) {
                    const checkX = x + dx/2;
                    const checkY = y + dy/2;
                    if (checkX > 0 && checkX < this.mazeSize - 1 &&
                        checkY > 0 && checkY < this.mazeSize - 1 &&
                        this.maze[checkY][checkX] === 0) {
                        pathCount++;
                    }
                }
                
                // Only create a shortcut if it connects existing paths
                if (pathCount >= 2) {
                this.maze[y][x] = 0;
                    shortcutsAdded++;
                }
            }
        }

        // Ensure start area is clear
        this.maze[1][1] = 0;
        this.maze[1][2] = 0;
        this.maze[2][1] = 0;

        // Ensure end area is clear and has limited approach paths
        this.maze[this.mazeSize - 2][this.mazeSize - 2] = 0;
        this.maze[this.mazeSize - 3][this.mazeSize - 2] = 0;
        this.maze[this.mazeSize - 2][this.mazeSize - 3] = 0;
    }

    checkWallCollision(x, y) {
        // Get the current cell and its neighbors
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        
        // Check each wall that could be near the player
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const checkX = cellX + dx;
                const checkY = cellY + dy;
                
                // Skip if outside maze
                if (checkX < 0 || checkX >= this.mazeSize || 
                    checkY < 0 || checkY >= this.mazeSize) {
                    continue;
                }
                
                // If this is a wall cell
                if (this.maze[checkY][checkX] === 1) {
                    // Get wall edges
                    const wallLeft = checkX * this.cellSize;
                    const wallRight = (checkX + 1) * this.cellSize;
                    const wallTop = checkY * this.cellSize;
                    const wallBottom = (checkY + 1) * this.cellSize;
                    
                    // Check if wall exists in each direction
                    const hasTopWall = checkY === 0 || this.maze[checkY-1][checkX] === 0;
                    const hasBottomWall = checkY === this.mazeSize-1 || this.maze[checkY+1][checkX] === 0;
                    const hasLeftWall = checkX === 0 || this.maze[checkY][checkX-1] === 0;
                    const hasRightWall = checkX === this.mazeSize-1 || this.maze[checkY][checkX+1] === 0;
                    
                    // Only check collision with walls that exist
                    if (hasTopWall) {
                        const dist = Math.abs(y - wallTop);
                        if (dist < this.playerSize && x >= wallLeft && x <= wallRight) {
                            return true;
                        }
                    }
                    if (hasBottomWall) {
                        const dist = Math.abs(y - wallBottom);
                        if (dist < this.playerSize && x >= wallLeft && x <= wallRight) {
                            return true;
                        }
                    }
                    if (hasLeftWall) {
                        const dist = Math.abs(x - wallLeft);
                        if (dist < this.playerSize && y >= wallTop && y <= wallBottom) {
                            return true;
                        }
                    }
                    if (hasRightWall) {
                        const dist = Math.abs(x - wallRight);
                        if (dist < this.playerSize && y >= wallTop && y <= wallBottom) {
                            return true;
                        }
                    }
                }
            }
        }
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
                // If collision, stop movement and reset target to current position
                this.targetPos = { ...this.playerPos };
                this.isGameOver = true;
                this.showGameOverScreen = true;
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

        const isClickOnButton = (pos) => {
            if (!this.showGameOverScreen && !this.showSuccessScreen) return false;

            // Calculate scaled button dimensions
            const buttonWidth = Math.max(140, Math.floor(140 * this.buttonScale));
            const buttonHeight = Math.max(50, Math.floor(50 * this.buttonScale));
            const buttonX = this.canvas.width / 2 - buttonWidth / 2;
            const buttonY = this.canvas.height / 2 - buttonHeight / 2;

            return pos.x >= buttonX && 
                   pos.x <= buttonX + buttonWidth && 
                   pos.y >= buttonY && 
                   pos.y <= buttonY + buttonHeight;
        };

        const startDragging = (e) => {
            const pos = getCanvasPoint(e);
            
            if (isClickOnButton(pos)) {
                this.restart();
                setTimeout(() => this.startGame(), 100);
                return;
            }
            
            if (this.canMove && this.gameStarted && !this.isGameComplete && !this.isGameOver && isClickOnPlayer(pos)) {
                isDragging = true;
                canStartDrag = true;
                movePlayer(e);
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
            isDragging = false;
            canStartDrag = false;
            this.targetPos = { ...this.playerPos };
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

        // Mouse events
        this.canvas.addEventListener('mousedown', startDragging);
        this.canvas.addEventListener('mousemove', movePlayer);
        this.canvas.addEventListener('mouseup', stopDragging);
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

        // Hide all modals and overlay
        const successModal = document.getElementById('successModal');
        const welcomeModal = document.getElementById('welcomeModal');
        const overlay = document.getElementById('modalOverlay');
        successModal.style.display = 'none';
        welcomeModal.style.display = 'none';
        overlay.style.display = 'none';

        // Reset to level 1
        this.currentLevel = 1;
        this.mazeSize = 15;
        this.moveSpeed = 0.15;

        // Reset game state
        this.canMove = false;
        this.gameStarted = false;
            this.resetPlayerPosition();
        this.generateMaze();
    }

    drawGameOverScreen() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; // Darker overlay
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Scale text and button based on cell size
        const fontSize = Math.max(32, Math.floor(32 * this.buttonScale));
        const buttonWidth = Math.max(200, Math.floor(200 * this.buttonScale));
        const buttonHeight = Math.max(80, Math.floor(80 * this.buttonScale));

        // Position message and button with more space
        const messageY = this.canvas.height / 2 - buttonHeight * 1.5;
        const buttonY = messageY + buttonHeight * 1.5;

        // Draw message
        this.ctx.fillStyle = '#9ab3f5';
        this.ctx.font = `bold ${fontSize}px Inter`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Keep trying!', this.canvas.width / 2, messageY);

        // Draw "Play Again" button with consistent styling
        const buttonX = this.canvas.width / 2 - buttonWidth / 2;
        
        // Enhanced button shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowOffsetY = 6;
        
        // Button background with gradient
        const gradient = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
        gradient.addColorStop(0, '#4a5fc1');
        gradient.addColorStop(1, '#3d4fa3');
        
        // Draw button background
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
        this.ctx.fill();
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Draw button text
        const buttonFontSize = Math.max(28, Math.floor(28 * this.buttonScale));
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `bold ${buttonFontSize}px Inter`;
        this.ctx.fillText('Play Again', this.canvas.width / 2, buttonY + buttonHeight/2 + buttonFontSize/3);

        // Store button position for hit detection
        this.playAgainButton = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
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

    drawMaze() {
        // Clear canvas with darker background
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw paths with lighter color
        this.ctx.fillStyle = '#4a5fc1';
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

        // Draw walls with increased thickness
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = this.wallThickness;
        this.ctx.lineCap = 'square';
        this.ctx.lineJoin = 'miter';
        this.ctx.beginPath();

        // Draw walls with proper positioning
        for (let y = 0; y < this.mazeSize; y++) {
            for (let x = 0; x < this.mazeSize; x++) {
                if (this.maze[y][x] === 1) {
                    const cellX = this.canvasOffset.x + x * this.cellSize;
                    const cellY = this.canvasOffset.y + y * this.cellSize;
                    
                    // Draw horizontal walls
                    if (y === 0 || this.maze[y-1][x] === 0) {
                        this.ctx.moveTo(cellX, cellY);
                        this.ctx.lineTo(cellX + this.cellSize, cellY);
                    }
                    if (y === this.mazeSize-1 || this.maze[y+1][x] === 0) {
                        this.ctx.moveTo(cellX, cellY + this.cellSize);
                        this.ctx.lineTo(cellX + this.cellSize, cellY + this.cellSize);
                    }
                    
                    // Draw vertical walls
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

        // Draw trail with enhanced effects
        if (this.trail.length > 1) {
            const currentTime = performance.now();
            
            // Draw outer glow
            for (let i = 0; i < this.trail.length - 1; i++) {
                const segment = this.trail[i];
                const nextSegment = this.trail[i + 1];
                
                const age = currentTime - segment.timestamp;
                const opacity = Math.max(0, 1 - (age / this.trailDuration));
                const smoothOpacity = Math.pow(Math.sin((opacity * Math.PI) / 2), 1.5); // Smoother fade
                
                // Outer glow
                this.ctx.shadowColor = `rgba(${this.trailColors.outer.r}, ${this.trailColors.outer.g}, ${this.trailColors.outer.b}, ${smoothOpacity * 0.3})`;
                this.ctx.shadowBlur = 20;
                this.ctx.strokeStyle = `rgba(${this.trailColors.outer.r}, ${this.trailColors.outer.g}, ${this.trailColors.outer.b}, ${smoothOpacity * 0.1})`;
                this.ctx.lineWidth = this.playerSize * 2;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                
        this.ctx.beginPath();
                this.ctx.moveTo(
                    this.canvasOffset.x + segment.x,
                    this.canvasOffset.y + segment.y
                );
                this.ctx.lineTo(
                    this.canvasOffset.x + nextSegment.x,
                    this.canvasOffset.y + nextSegment.y
                );
                this.ctx.stroke();
            }
            
            // Reset shadow for middle layer
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
            
            // Draw middle layer
            for (let i = 0; i < this.trail.length - 1; i++) {
                const segment = this.trail[i];
                const nextSegment = this.trail[i + 1];
                
                const age = currentTime - segment.timestamp;
                const opacity = Math.max(0, 1 - (age / this.trailDuration));
                const smoothOpacity = Math.pow(Math.sin((opacity * Math.PI) / 2), 1.5);
                
                // Create gradient for middle layer
                const gradient = this.ctx.createLinearGradient(
                    this.canvasOffset.x + segment.x,
                    this.canvasOffset.y + segment.y,
                    this.canvasOffset.x + nextSegment.x,
                    this.canvasOffset.y + nextSegment.y
                );
                
                gradient.addColorStop(0, `rgba(${this.trailColors.outer.r}, ${this.trailColors.outer.g}, ${this.trailColors.outer.b}, ${smoothOpacity * 0.2})`);
                gradient.addColorStop(1, `rgba(${this.trailColors.outer.r}, ${this.trailColors.outer.g}, ${this.trailColors.outer.b}, ${smoothOpacity * 0.1})`);
                
                this.ctx.strokeStyle = gradient;
                this.ctx.lineWidth = this.playerSize * 1.2;
                
                this.ctx.beginPath();
                this.ctx.moveTo(
                    this.canvasOffset.x + segment.x,
                    this.canvasOffset.y + segment.y
                );
                this.ctx.lineTo(
                    this.canvasOffset.x + nextSegment.x,
                    this.canvasOffset.y + nextSegment.y
                );
                this.ctx.stroke();
            }
            
            // Draw inner trail
            for (let i = 0; i < this.trail.length - 1; i++) {
                const segment = this.trail[i];
                const nextSegment = this.trail[i + 1];
                
                const age = currentTime - segment.timestamp;
                const opacity = Math.max(0, 1 - (age / this.trailDuration));
                const smoothOpacity = Math.pow(Math.sin((opacity * Math.PI) / 2), 1.5);
                
                // Create gradient for inner trail
                const gradient = this.ctx.createLinearGradient(
                    this.canvasOffset.x + segment.x,
                    this.canvasOffset.y + segment.y,
                    this.canvasOffset.x + nextSegment.x,
                    this.canvasOffset.y + nextSegment.y
                );
                
                gradient.addColorStop(0, `rgba(${this.trailColors.inner.r}, ${this.trailColors.inner.g}, ${this.trailColors.inner.b}, ${smoothOpacity * 0.4})`);
                gradient.addColorStop(1, `rgba(${this.trailColors.outer.r}, ${this.trailColors.outer.g}, ${this.trailColors.outer.b}, ${smoothOpacity * 0.2})`);
                
                this.ctx.strokeStyle = gradient;
                this.ctx.lineWidth = this.playerSize * 0.6;
                
                this.ctx.beginPath();
                this.ctx.moveTo(
                    this.canvasOffset.x + segment.x,
                    this.canvasOffset.y + segment.y
                );
                this.ctx.lineTo(
                    this.canvasOffset.x + nextSegment.x,
                    this.canvasOffset.y + nextSegment.y
                );
                this.ctx.stroke();
            }
        }

        // Draw flag at end point
        this.ctx.save();
        
        // Draw flag pole
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvasOffset.x + this.endPos.x, this.canvasOffset.y + this.endPos.y + this.playerSize * 2);
        this.ctx.lineTo(this.canvasOffset.x + this.endPos.x, this.canvasOffset.y + this.endPos.y - this.playerSize * 2);
        this.ctx.stroke();

        // Draw flag
        const flagWidth = this.playerSize * 3;
        const flagHeight = this.playerSize * 2;
        const flagX = this.canvasOffset.x + this.endPos.x;
        const flagY = this.canvasOffset.y + this.endPos.y - this.playerSize * 2;

        this.ctx.beginPath();
        this.ctx.moveTo(flagX, flagY);
        this.ctx.lineTo(flagX + flagWidth, flagY + flagHeight/2);
        this.ctx.lineTo(flagX, flagY + flagHeight);
        this.ctx.closePath();

        // Fill flag with red color
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fill();

        // Add flag glow
        this.ctx.shadowColor = '#ff0000';
        this.ctx.shadowBlur = 10;
        this.ctx.strokeStyle = '#cc0000';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        this.ctx.restore();

        // Draw player
        this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
        this.ctx.arc(
            this.canvasOffset.x + this.playerPos.x,
            this.canvasOffset.y + this.playerPos.y,
            this.playerSize,
            0,
            Math.PI * 2
        );
            this.ctx.fill();

        // Draw game over or success screen if needed
        if (this.showGameOverScreen) {
            this.drawGameOverScreen();
        } else if (this.showSuccessScreen) {
            this.drawSuccessScreen();
        }
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
        let timeLeft = 10;

        // If this is level 1, proceed to level 2
        if (this.currentLevel === 1) {
            this.currentLevel = 2;
            
            // Disable movement during transition
            this.canMove = false;
            this.gameStarted = false;
            
            // Generate new maze and reset position first
            this.generateMaze();
            this.resetPlayerPosition();
            
            // Short delay to ensure maze is drawn
            setTimeout(() => {
                // Show level 2 message
                const levelMsg = document.createElement('div');
                levelMsg.style.position = 'fixed';
                levelMsg.style.top = '50%';
                levelMsg.style.left = '50%';
                levelMsg.style.transform = 'translate(-50%, -50%)';
                levelMsg.style.backgroundColor = 'rgba(26, 26, 46, 0.95)';
                levelMsg.style.color = 'white';
                levelMsg.style.padding = '20px';
                levelMsg.style.borderRadius = '10px';
                levelMsg.style.textAlign = 'center';
                levelMsg.style.zIndex = '1000';
                levelMsg.style.border = '2px solid #4a5fc1';
                levelMsg.innerHTML = '<h2>Level 2</h2>';
                document.body.appendChild(levelMsg);
                
                // Remove message and enable movement after short delay
                setTimeout(() => {
                    document.body.removeChild(levelMsg);
                    this.gameStarted = true;
                    this.isGameComplete = false;
                    this.canMove = true;
                }, 800);
            }, 100);
            
            return;
        }

        // Clear any existing timeouts/intervals
        if (this.modalTimeout) {
            clearTimeout(this.modalTimeout);
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        // Show modal and overlay
        modal.style.display = 'block';
        overlay.style.display = 'block';

        // Reset player position immediately
        this.resetPlayerPosition();
        this.canMove = false;

        // Update countdown every second
        this.countdownInterval = setInterval(() => {
            countdown.textContent = `Page will reload in ${timeLeft} seconds`;
            timeLeft--;

            if (timeLeft < 0) {
                clearInterval(this.countdownInterval);
            }
        }, 1000);

        // Set timeout to reload the page
        this.modalTimeout = setTimeout(() => {
            window.location.reload();
        }, 10000);
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new MazeGame();
}); 