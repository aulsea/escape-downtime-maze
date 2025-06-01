class MazeGame {
    constructor() {
        this.canvas = document.getElementById('mazeCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.mazeSize = 16;
        this.cellSize = 46;
        this.wallThickness = 2;
        this.playerSize = 10;
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
        
        // New maze elements
        this.bonusItems = []; // 💾 Backup, ⚡️ Failover, ☁️ Cloud switch
        this.obstacles = [];  // 🟥 Downtime Trap, ⛔️ Data Loss Wall, 💣 System Crash
        this.collectedItems = [];
        this.score = 0;
        this.retryCount = 0;
        
        // Animation timing
        this.animationTime = 0;
        
        // Two paths to finish
        this.safePath = [];
        this.dangerPath = [];
        this.pathChosen = null;
        
        // Set canvas size based on device
        this.setupCanvasSize();
        
        // Initialize game state
        this.maze = [];
        this.playerPos = { ...this.startPosition };
        this.trail = [{ ...this.startPosition }];
        this.targetPos = { ...this.startPosition };
        this.endPos = { 
            x: (this.mazeSize - 2) * this.cellSize + this.cellSize / 2, // Back to corner
            y: (this.mazeSize - 2) * this.cellSize + this.cellSize / 2
        };
        this.isGameComplete = false;
        this.isGameOver = false;
        this.showGameOverScreen = false;
        this.showSuccessScreen = false;
        this.canMove = false;
        this.lastTime = performance.now();
        
        // Generate the maze with new elements
        this.generateMaze();
        this.generateTwoPaths();
        this.generateMazeElements();
        
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

    generateTwoPaths() {
        // Create two distinct paths to the end - one safe, one dangerous
        const endX = this.mazeSize - 2;
        const endY = this.mazeSize - 2;
        
        // Create safe path (upper route)
        for (let x = Math.floor(this.mazeSize/2); x < endX; x++) {
            this.maze[Math.floor(this.mazeSize/3)][x] = 0;
        }
        for (let y = Math.floor(this.mazeSize/3); y < endY; y++) {
            this.maze[y][endX - 1] = 0;
        }
        
        // Create dangerous path (lower route)
        for (let x = Math.floor(this.mazeSize/2); x < endX; x++) {
            this.maze[Math.floor(this.mazeSize * 2/3)][x] = 0;
        }
        for (let y = Math.floor(this.mazeSize * 2/3); y < endY; y++) {
            this.maze[y][endX - 1] = 0;
        }
        
        // Mark path areas for obstacle placement
        this.safePath = [];
        this.dangerPath = [];
        
        // Safe path coordinates
        for (let x = Math.floor(this.mazeSize/2); x < endX; x++) {
            this.safePath.push({x, y: Math.floor(this.mazeSize/3)});
        }
        
        // Danger path coordinates  
        for (let x = Math.floor(this.mazeSize/2); x < endX; x++) {
            this.dangerPath.push({x, y: Math.floor(this.mazeSize * 2/3)});
        }
    }

    generateMazeElements() {
        // Clear existing elements
        this.bonusItems = [];
        this.obstacles = [];
        this.collectedItems = [];
        
        // Generate bonus items in random open spaces (not on paths)
        const bonusTypes = ['backup', 'failover', 'cloud'];
        const bonusCount = Math.floor(this.mazeSize * 0.15);
        
        let bonusPlaced = 0;
        while (bonusPlaced < bonusCount) {
            const x = Math.floor(Math.random() * (this.mazeSize - 2)) + 1;
            const y = Math.floor(Math.random() * (this.mazeSize - 2)) + 1;
            
            // Check if position is open and not on special paths
            if (this.maze[y][x] === 0 && 
                this.getDistance(x, y, 1, 1) > 2 && // Not near start
                this.getDistance(x, y, this.mazeSize-2, this.mazeSize-2) > 2 && // Not near end
                !this.isOnPath(x, y)) { // Not on special paths
                
                const type = bonusTypes[bonusPlaced % bonusTypes.length];
                this.bonusItems.push({
                    x: x * this.cellSize + this.cellSize / 2,
                    y: y * this.cellSize + this.cellSize / 2,
                    type: type,
                    collected: false,
                    animationOffset: Math.random() * Math.PI * 2
                });
                bonusPlaced++;
            }
        }
        
        // Place obstacles ONLY on the danger path
        const obstacleTypes = ['downtime', 'dataloss', 'crash'];
        let obstacleIndex = 0;
        
        for (let i = 1; i < this.dangerPath.length - 1; i += 2) { // Every other position
            const pathPoint = this.dangerPath[i];
            const type = obstacleTypes[obstacleIndex % obstacleTypes.length];
            
            this.obstacles.push({
                x: pathPoint.x * this.cellSize + this.cellSize / 2,
                y: pathPoint.y * this.cellSize + this.cellSize / 2,
                type: type,
                active: true,
                animationOffset: Math.random() * Math.PI * 2
            });
            obstacleIndex++;
        }
        
        // Add bonus items on the safe path
        for (let i = 1; i < this.safePath.length - 1; i += 3) { // Every third position
            const pathPoint = this.safePath[i];
            const type = bonusTypes[i % bonusTypes.length];
            
            this.bonusItems.push({
                x: pathPoint.x * this.cellSize + this.cellSize / 2,
                y: pathPoint.y * this.cellSize + this.cellSize / 2,
                type: type,
                collected: false,
                animationOffset: Math.random() * Math.PI * 2
            });
        }
    }

    isOnPath(x, y) {
        return this.safePath.some(p => p.x === x && p.y === y) ||
               this.dangerPath.some(p => p.x === x && p.y === y);
    }

    getDistance(x1, y1, x2, y2) {
        return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
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

        // Update animation timing
        this.animationTime += deltaTime * 0.002;

        // First, check if player is currently in a wall and push them out
        if (this.checkWallCollision(this.playerPos.x, this.playerPos.y)) {
            this.pushPlayerOutOfWall();
        }

        // Calculate direction to target
        const dx = this.targetPos.x - this.playerPos.x;
        const dy = this.targetPos.y - this.playerPos.y;
        
        // Calculate distance to target
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0.1) {
            // Limit maximum movement per frame to prevent jumping through walls
            const maxMovePerFrame = this.cellSize * 0.25;
            
            // Calculate movement this frame
            let moveX = dx * this.moveSpeed;
            let moveY = dy * this.moveSpeed;
            
            // Cap the movement if it's too large
            const moveDistance = Math.sqrt(moveX * moveX + moveY * moveY);
            if (moveDistance > maxMovePerFrame) {
                const ratio = maxMovePerFrame / moveDistance;
                moveX *= ratio;
                moveY *= ratio;
            }
            
            // Calculate new position
            let newX = this.playerPos.x + moveX;
            let newY = this.playerPos.y + moveY;
            
            // Check collision for both axes and handle them separately
            const canMoveX = !this.checkWallCollision(newX, this.playerPos.y);
            const canMoveY = !this.checkWallCollision(this.playerPos.x, newY);
            const canMoveBoth = !this.checkWallCollision(newX, newY);
            
            // Determine final position based on collision results
            if (canMoveBoth) {
                // No collision, move normally
                this.playerPos.x = newX;
                this.playerPos.y = newY;
            } else if (canMoveX && !canMoveY) {
                // Can move horizontally but not vertically - slide along wall
                this.playerPos.x = newX;
                // Keep Y position, stop vertical movement
                this.targetPos.y = this.playerPos.y;
            } else if (canMoveY && !canMoveX) {
                // Can move vertically but not horizontally - slide along wall
                this.playerPos.y = newY;
                // Keep X position, stop horizontal movement
                this.targetPos.x = this.playerPos.x;
            } else {
                // Cannot move in either direction - try smaller movements
                const smallMoveX = moveX * 0.1;
                const smallMoveY = moveY * 0.1;
                
                if (!this.checkWallCollision(this.playerPos.x + smallMoveX, this.playerPos.y)) {
                    this.playerPos.x += smallMoveX;
                } else if (!this.checkWallCollision(this.playerPos.x, this.playerPos.y + smallMoveY)) {
                    this.playerPos.y += smallMoveY;
                } else {
                    // Completely blocked, stop movement
                    this.targetPos = { ...this.playerPos };
                }
            }
            
            // Check collisions with bonus items
            this.checkBonusItemCollisions();
            
            // Check collisions with obstacles
            this.checkObstacleCollisions();
            
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

            // Check for win condition at Zephyrus Hub (center)
            const distanceToEnd = Math.sqrt(
                Math.pow(this.playerPos.x - this.endPos.x, 2) + 
                Math.pow(this.playerPos.y - this.endPos.y, 2)
            );
            
            if (distanceToEnd < this.cellSize * 0.6) {
                this.isGameComplete = true;
                this.canMove = false;
                this.targetPos = { ...this.playerPos };
                this.showSuccessModal();
            }
        }
    }

    checkBonusItemCollisions() {
        for (let item of this.bonusItems) {
            if (!item.collected) {
                const distance = Math.sqrt(
                    Math.pow(this.playerPos.x - item.x, 2) + 
                    Math.pow(this.playerPos.y - item.y, 2)
                );
                
                if (distance < this.playerSize + 12) { // Collection radius
                    item.collected = true;
                    this.collectedItems.push(item);
                    this.score += 100;
                    
                    // Add collection effect (could add sound here)
                    this.createCollectionEffect(item.x, item.y, item.type);
                }
            }
        }
    }

    checkObstacleCollisions() {
        for (let obstacle of this.obstacles) {
            if (obstacle.active) {
                const distance = Math.sqrt(
                    Math.pow(this.playerPos.x - obstacle.x, 2) + 
                    Math.pow(this.playerPos.y - obstacle.y, 2)
                );
                
                if (distance < this.playerSize + 8) { // Collision radius
                    // Handle different obstacle types
                    switch (obstacle.type) {
                        case 'downtime':
                            this.handleDowntimeTrap();
                            break;
                        case 'dataloss':
                            this.handleDataLossWall();
                            break;
                        case 'crash':
                            this.handleSystemCrash();
                            break;
                    }
                    obstacle.active = false; // Deactivate after collision
                }
            }
        }
    }

    handleDowntimeTrap() {
        // Slow player temporarily
        this.moveSpeed *= 0.5;
        setTimeout(() => {
            this.moveSpeed = 0.15; // Reset to normal speed
        }, 2000);
        
        this.createObstacleEffect('downtime');
    }

    handleDataLossWall() {
        // Push player back and reset some progress
        this.pushPlayerBack();
        this.score = Math.max(0, this.score - 50);
        
        this.createObstacleEffect('dataloss');
    }

    handleSystemCrash() {
        // Reset to start position
        this.resetPlayerPosition();
        this.retryCount++;
        
        this.createObstacleEffect('crash');
    }

    pushPlayerBack() {
        // Push player back towards start
        const backDistance = this.cellSize * 0.5;
        const dx = this.startPosition.x - this.playerPos.x;
        const dy = this.startPosition.y - this.playerPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const ratio = backDistance / distance;
            this.playerPos.x += dx * ratio;
            this.playerPos.y += dy * ratio;
            this.targetPos = { ...this.playerPos };
        }
    }

    createCollectionEffect(x, y, type) {
        // Visual feedback for collecting items
        // Could be enhanced with particles or animations
        console.log(`Collected ${type} bonus!`);
    }

    createObstacleEffect(type) {
        // Visual feedback for obstacle collisions
        // Could be enhanced with screen shake or color effects
        console.log(`Hit ${type} obstacle!`);
    }

    pushPlayerOutOfWall() {
        // Find the nearest valid position
        const searchRadius = this.playerSize * 2;
        const step = 2; // Small step size for searching
        
        // Try to find a nearby position that's not in a wall
        for (let radius = step; radius <= searchRadius; radius += step) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
                const testX = this.playerPos.x + Math.cos(angle) * radius;
                const testY = this.playerPos.y + Math.sin(angle) * radius;
                
                // Make sure the position is within bounds
                if (testX > this.cellSize && testX < (this.mazeSize - 1) * this.cellSize &&
                    testY > this.cellSize && testY < (this.mazeSize - 1) * this.cellSize) {
                    
                    if (!this.checkWallCollision(testX, testY)) {
                        // Found a valid position, move player there
                        this.playerPos.x = testX;
                        this.playerPos.y = testY;
                        this.targetPos = { ...this.playerPos };
                        return;
                    }
                }
            }
        }
        
        // If no valid position found, reset to start position
        this.resetPlayerPosition();
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

        // Reset game state
        this.currentLevel = 1;
        this.score = 0;
        this.retryCount = 0;
        this.collectedItems = [];
        this.moveSpeed = 0.15; // Reset speed in case it was slowed
        
        // Regenerate maze and elements
        this.generateMaze();
        this.generateTwoPaths();
        this.generateMazeElements();

        // Reset game flags
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
            const sizeMultiplier = 1 - (index / segments.length) * 0.6;
            const pulseEffect = 0.8 + Math.sin(currentTime * 0.005 + index * 0.2) * 0.2;
            const size = this.playerSize * 0.8 * sizeMultiplier * pulseEffect;
            
            // Draw dot with enhanced glow
            this.ctx.shadowColor = `rgba(255, 255, 255, ${smoothOpacity * 0.7})`;
            this.ctx.shadowBlur = 15;
            
            // Draw larger outer glow
            this.ctx.beginPath();
            this.ctx.arc(
                this.canvasOffset.x + segment.x,
                this.canvasOffset.y + segment.y,
                size * 1.5,
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
            
            gradient.addColorStop(0, `rgba(255, 255, 255, ${smoothOpacity * 0.9})`);
            gradient.addColorStop(1, `rgba(255, 255, 255, ${smoothOpacity * 0.3})`);
            
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

        // Highlight the two paths with different colors
        this.drawPathHighlights();

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

        // Draw bonus items with retro styling
        this.drawBonusItems();
        
        // Draw obstacles with warning effects
        this.drawObstacles();

        // Draw trail
        this.drawTrail();

        // Draw finish point with Zephyrus-styled flag
        this.drawZephyrusFlag();

        // Draw player with enhanced glow
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
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
        
        // Draw UI elements
        this.drawUI();
    }

    drawPathHighlights() {
        // Draw safe path highlight (subtle green)
        this.ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
        for (const point of this.safePath) {
            this.ctx.fillRect(
                this.canvasOffset.x + point.x * this.cellSize,
                this.canvasOffset.y + point.y * this.cellSize,
                this.cellSize,
                this.cellSize
            );
        }

        // Draw danger path highlight (subtle red)
        this.ctx.fillStyle = 'rgba(244, 67, 54, 0.1)';
        for (const point of this.dangerPath) {
            this.ctx.fillRect(
                this.canvasOffset.x + point.x * this.cellSize,
                this.canvasOffset.y + point.y * this.cellSize,
                this.cellSize,
                this.cellSize
            );
        }
    }

    drawZephyrusFlag() {
        const flagX = this.canvasOffset.x + this.endPos.x;
        const flagY = this.canvasOffset.y + this.endPos.y;
        
        // Draw stylish flag pole with Zephyrus gradient
        const poleGradient = this.ctx.createLinearGradient(
            flagX - 2, flagY - this.playerSize * 2,
            flagX + 2, flagY + this.playerSize * 2
        );
        poleGradient.addColorStop(0, '#ffffff');
        poleGradient.addColorStop(0.3, '#8db3ad');
        poleGradient.addColorStop(0.7, '#689a94');
        poleGradient.addColorStop(1, '#5a8579');
        
        this.ctx.fillStyle = poleGradient;
        this.ctx.fillRect(flagX - 2, flagY - this.playerSize * 2, 4, this.playerSize * 4);
        
        // Add pole highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillRect(flagX - 1, flagY - this.playerSize * 2, 1, this.playerSize * 4);

        // Draw stylish flag with Zephyrus colors and animation
        const flagWidth = this.playerSize * 3.5;
        const flagHeight = this.playerSize * 2;
        const time = performance.now() * 0.003;
        
        // Create flag shape with wave effect
        this.ctx.beginPath();
        this.ctx.moveTo(flagX, flagY - this.playerSize * 2);
        
        // Top edge with wave
        for (let i = 0; i <= flagWidth; i += 4) {
            const waveOffset = Math.sin(time + i * 0.1) * 2;
            this.ctx.lineTo(flagX + i, flagY - this.playerSize * 2 + waveOffset);
        }
        
        // Right edge
        this.ctx.lineTo(flagX + flagWidth, flagY - this.playerSize);
        
        // Bottom edge with wave
        for (let i = flagWidth; i >= 0; i -= 4) {
            const waveOffset = Math.sin(time + i * 0.1 + Math.PI) * 2;
            this.ctx.lineTo(flagX + i, flagY + waveOffset);
        }
        
        this.ctx.closePath();
        
        // Create Zephyrus flag gradient
        const flagGradient = this.ctx.createLinearGradient(
            flagX, flagY - this.playerSize * 2,
            flagX + flagWidth, flagY
        );
        flagGradient.addColorStop(0, '#8db3ad');
        flagGradient.addColorStop(0.3, '#76a89f');
        flagGradient.addColorStop(0.6, '#689a94');
        flagGradient.addColorStop(1, '#5a8579');
        
        // Add flag glow
        this.ctx.shadowColor = 'rgba(104, 154, 148, 0.6)';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        // Fill flag
        this.ctx.fillStyle = flagGradient;
        this.ctx.fill();
        
        // Reset shadow for flag details
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Add Zephyrus logo on flag
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `bold ${this.playerSize}px Hero_title`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Z', flagX + flagWidth/2, flagY - this.playerSize/2);
        
        // Add flag details (stripes)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        
        // Horizontal stripes
        for (let i = 1; i < 3; i++) {
            const stripeY = flagY - this.playerSize * 2 + (flagHeight / 3) * i;
            this.ctx.moveTo(flagX, stripeY);
            for (let j = 0; j <= flagWidth; j += 4) {
                const waveOffset = Math.sin(time + j * 0.1) * 1.5;
                this.ctx.lineTo(flagX + j, stripeY + waveOffset);
            }
        }
        this.ctx.stroke();
        
        // Add flag border
        this.ctx.beginPath();
        this.ctx.moveTo(flagX, flagY - this.playerSize * 2);
        
        // Recreate the flag shape for border
        for (let i = 0; i <= flagWidth; i += 4) {
            const waveOffset = Math.sin(time + i * 0.1) * 2;
            this.ctx.lineTo(flagX + i, flagY - this.playerSize * 2 + waveOffset);
        }
        this.ctx.lineTo(flagX + flagWidth, flagY - this.playerSize);
        for (let i = flagWidth; i >= 0; i -= 4) {
            const waveOffset = Math.sin(time + i * 0.1 + Math.PI) * 2;
            this.ctx.lineTo(flagX + i, flagY + waveOffset);
        }
        this.ctx.closePath();
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        
        // Add flag highlight
        this.ctx.beginPath();
        this.ctx.moveTo(flagX, flagY - this.playerSize * 2);
        for (let i = 0; i <= flagWidth * 0.3; i += 2) {
            const waveOffset = Math.sin(time + i * 0.1) * 1;
            this.ctx.lineTo(flagX + i, flagY - this.playerSize * 2 + waveOffset + i * 0.1);
        }
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawBonusItems() {
        const time = this.animationTime;
        
        for (let item of this.bonusItems) {
            if (!item.collected) {
                const bounce = Math.sin(time + item.animationOffset) * 3;
                const glow = Math.sin(time * 2 + item.animationOffset) * 0.3 + 0.7;
                
                this.ctx.save();
                this.ctx.translate(this.canvasOffset.x + item.x, this.canvasOffset.y + item.y + bounce);
                
                // Draw glow effect
                this.ctx.shadowColor = this.getBonusColor(item.type);
                this.ctx.shadowBlur = 15 * glow;
                this.ctx.globalAlpha = glow;
                
                // Draw icon based on type
                this.drawBonusIcon(item.type);
                
                this.ctx.restore();
            }
        }
    }

    drawBonusIcon(type) {
        const size = 12;
        this.ctx.fillStyle = this.getBonusColor(type);
        
        switch (type) {
            case 'backup':
                // 💾 Backup - Draw a floppy disk style icon
                this.ctx.fillRect(-size/2, -size/2, size, size);
                this.ctx.fillStyle = '#0a0a0a';
                this.ctx.fillRect(-size/3, -size/3, size/1.5, size/4);
                this.ctx.fillStyle = this.getBonusColor(type);
                this.ctx.fillRect(-size/4, size/3, size/2, size/6);
                break;
                
            case 'failover':
                // ⚡️ Failover - Draw a lightning bolt
                this.ctx.beginPath();
                this.ctx.moveTo(-size/3, -size/2);
                this.ctx.lineTo(size/6, -size/6);
                this.ctx.lineTo(-size/6, -size/6);
                this.ctx.lineTo(size/3, size/2);
                this.ctx.lineTo(-size/6, size/6);
                this.ctx.lineTo(size/6, size/6);
                this.ctx.closePath();
                this.ctx.fill();
                break;
                
            case 'cloud':
                // ☁️ Cloud switch - Draw a cloud
                this.ctx.beginPath();
                this.ctx.arc(-size/4, 0, size/3, 0, Math.PI * 2);
                this.ctx.arc(size/4, 0, size/3, 0, Math.PI * 2);
                this.ctx.arc(0, -size/4, size/2.5, 0, Math.PI * 2);
                this.ctx.fill();
                break;
        }
    }

    getBonusColor(type) {
        switch (type) {
            case 'backup': return '#4CAF50';   // Green
            case 'failover': return '#FFC107'; // Yellow/Gold
            case 'cloud': return '#2196F3';    // Blue
            default: return '#ffffff';
        }
    }

    drawObstacles() {
        const time = this.animationTime;
        
        for (let obstacle of this.obstacles) {
            if (obstacle.active) {
                const pulse = Math.sin(time * 3 + obstacle.animationOffset) * 0.2 + 0.8;
                const rotation = time * 0.5 + obstacle.animationOffset;
                
                this.ctx.save();
                this.ctx.translate(this.canvasOffset.x + obstacle.x, this.canvasOffset.y + obstacle.y);
                this.ctx.rotate(rotation);
                this.ctx.scale(pulse, pulse);
                
                // Draw warning glow
                this.ctx.shadowColor = this.getObstacleColor(obstacle.type);
                this.ctx.shadowBlur = 20;
                this.ctx.globalAlpha = pulse;
                
                // Draw obstacle icon
                this.drawObstacleIcon(obstacle.type);
                
                this.ctx.restore();
            }
        }
    }

    drawObstacleIcon(type) {
        const size = 10;
        this.ctx.fillStyle = this.getObstacleColor(type);
        
        switch (type) {
            case 'downtime':
                // 🟥 Downtime Trap - Draw a warning square
                this.ctx.fillRect(-size/2, -size/2, size, size);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = `bold ${size}px monospace`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText('!', 0, size/4);
                break;
                
            case 'dataloss':
                // ⛔️ Data Loss Wall - Draw a prohibition sign
                this.ctx.beginPath();
                this.ctx.arc(0, 0, size/2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(-size/3, -size/3);
                this.ctx.lineTo(size/3, size/3);
                this.ctx.stroke();
                break;
                
            case 'crash':
                // 💣 System Crash - Draw an X pattern
                this.ctx.strokeStyle = this.getObstacleColor(type);
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(-size/2, -size/2);
                this.ctx.lineTo(size/2, size/2);
                this.ctx.moveTo(size/2, -size/2);
                this.ctx.lineTo(-size/2, size/2);
                this.ctx.stroke();
                break;
        }
    }

    getObstacleColor(type) {
        switch (type) {
            case 'downtime': return '#FF5722';  // Red-Orange
            case 'dataloss': return '#F44336';  // Red
            case 'crash': return '#9C27B0';     // Purple
            default: return '#ffffff';
        }
    }

    drawUI() {
        // Draw score and collected items in top corners
        this.ctx.save();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `${this.cellSize/2}px Hero_title`;
        this.ctx.textAlign = 'left';
        
        // Score display
        this.ctx.fillText(`Score: ${this.score}`, 10, 30);
        
        // Collected items counter
        this.ctx.fillText(`Items: ${this.collectedItems.length}/${this.bonusItems.length}`, 10, 60);
        
        // Speed indicator when slowed
        if (this.moveSpeed < 0.15) {
            this.ctx.fillStyle = '#FF5722';
            this.ctx.fillText('SLOWED!', 10, 90);
        }
        
        this.ctx.restore();
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
        let timeLeft = 20; // 20 seconds for auto-redirect

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
        countdown.textContent = `Auto-redirect to prize page in\n${timeLeft} seconds`;

        // Update countdown every second
        this.countdownInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft >= 0) {
                countdown.textContent = `Auto-redirect to prize page in\n${timeLeft} seconds`;
            }
        }, 1000);

        // Set timeout to auto-redirect to prize page
        this.modalTimeout = setTimeout(() => {
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
            // Auto-redirect to the prize page
            window.open('https://www.intelssoft.com', '_blank');
        }, 20000); // 20 seconds
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new MazeGame();
}); 