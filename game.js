class MazeGame {
    constructor() {
        this.canvas = document.getElementById('mazeCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Mobile detection and performance optimization
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        this.isIPhone = /iPhone/i.test(navigator.userAgent);
        this.isTablet = /(iPad|Android(?=.*Tablet)|Windows Phone|webOS)/i.test(navigator.userAgent) || (window.innerWidth >= 768 && window.innerWidth <= 1024);
        
        this.mazeSize = 16;
        this.cellSize = 46;
        this.wallThickness = 2;
        this.playerSize = 10;
        
        // Much faster movement speeds for responsive gameplay
        if (this.isIPhone) {
            this.moveSpeed = 0.7; // Significantly increased for smooth gameplay
            this.responsiveMultiplier = 2.5; // Very responsive
        } else if (this.isTablet) {
            this.moveSpeed = 0.8; // Fast and smooth for tablets
            this.responsiveMultiplier = 2.8; // Very responsive
        } else if (this.isMobile) {
            this.moveSpeed = 0.8; // Fast and smooth for mobile
            this.responsiveMultiplier = 2.8; // Very responsive
        } else {
            this.moveSpeed = 0.6; // Good desktop speed
            this.responsiveMultiplier = 2.2; // Very responsive for desktop
        }
        
        // Fixed icon sizes that don't change during zoom with iPhone optimizations
        if (this.isIPhone) {
            this.fixedBonusIconSize = 10; // Smaller for better performance
            this.fixedObstacleIconSize = 8; // Smaller for better performance
        } else if (this.isTablet) {
            this.fixedBonusIconSize = 14;
            this.fixedObstacleIconSize = 12;
        } else if (this.isMobile) {
            this.fixedBonusIconSize = 12;
            this.fixedObstacleIconSize = 10;
        } else {
            this.fixedBonusIconSize = 12;
            this.fixedObstacleIconSize = 10;
        }
        
        this.targetPos = { x: 0, y: 0 };
        this.trail = [];
        
        // Performance optimizations for mobile with aggressive iPhone settings
        if (this.isIPhone) {
            this.maxTrailLength = 6; // Very short trail for iPhone performance
            this.trailDuration = 200; // Very fast trail decay on iPhone
            this.trailSegmentSpacing = 25; // Very few trail segments for iPhone
        } else if (this.isMobile) {
            this.maxTrailLength = 10; // Short trail for mobile performance
            this.trailDuration = 400; // Fast trail decay on mobile
            this.trailSegmentSpacing = 15; // Few trail segments for mobile
        } else {
        this.maxTrailLength = 35;
        this.trailDuration = 1000;
        this.trailSegmentSpacing = 6;
        }
        
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
        
        // Animation frame management
        this.animationFrame = null;
        this.lastAnimationTime = 0;
        
        // Improved animation throttle for different devices with iPhone optimization
        if (this.isIPhone) {
            this.animationThrottle = 20; // 50fps on iPhone for smoother performance while conserving battery
        } else if (this.isTablet) {
            this.animationThrottle = 16; // 60fps on tablets for smooth movement
        } else if (this.isMobile) {
            this.animationThrottle = 16; // 60fps on mobile phones for smooth movement
        } else {
            this.animationThrottle = 16; // 60fps on desktop
        }
        
        // New maze elements
        this.bonusItems = []; 
        this.obstacles = [];  
        this.collectedItems = [];
        this.score = 0;
        this.retryCount = 0;
        
        // Animation timing
        this.animationTime = 0;
        
        // Two paths to finish
        this.safePath = [];
        this.dangerPath = [];
        this.pathChosen = null;
        
        // Collection effects - aggressive reduction for iPhone
        this.collectionEffects = [];
        if (this.isIPhone) {
            this.maxCollectionEffects = 2; // Very few effects on iPhone
        } else if (this.isMobile) {
            this.maxCollectionEffects = 3;
        } else {
            this.maxCollectionEffects = 8;
        }
        
        // Explosion effects - aggressive reduction for iPhone
        this.explosionEffects = [];
        if (this.isIPhone) {
            this.maxExplosionEffects = 3; // Very few effects on iPhone
        } else if (this.isMobile) {
            this.maxExplosionEffects = 5;
        } else {
            this.maxExplosionEffects = 15;
        }
        this.gameOverDelay = null;
        
        // Set canvas size based on device
        this.setupCanvasSize();
        
        // Initialize game state
        this.maze = [];
        this.playerPos = { ...this.startPosition };
        this.trail = [{ ...this.startPosition }];
        this.targetPos = { ...this.startPosition };
        this.endPos = null; // Will be set after maze generation
        this.isGameComplete = false;
        this.isGameOver = false;
        this.showGameOverScreen = false;
        this.showSuccessScreen = false;
        this.canMove = false;
        this.lastTime = performance.now();
        
        // Generate the maze with new elements
        this.generateMaze();
        this.generateTwoPaths();
        this.generateRandomEndPosition(); // Set random flag position
        this.generateMazeElements();
        
        // Set up touch controls
        this.setupControls();
        
        // Set up welcome modal
        this.setupWelcomeModal();
        
        // Start the game loop
        this.animate();

        // Handle window resize with improved debouncing
        this.resizeTimeout = null;
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('orientationchange', () => {
            // Wait for orientation change to complete
            setTimeout(() => this.handleResize(), 150);
        });

        // Show welcome modal initially
        this.showWelcomeModal();

        this.finishPattern = this.createFinishPattern();
    }

    setupCanvasSize() {
        const container = document.getElementById('maze-container');
        
        // Get viewport dimensions and detect zoom level
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Get computed CSS custom properties for scaling
        const computedStyle = getComputedStyle(document.documentElement);
        const deviceScale = parseFloat(computedStyle.getPropertyValue('--device-scale')) || 1;
        
        // Calculate base container size with conservative approach
        let baseSize;
        if (viewportWidth < 768) {
            // Phone: Use larger percentage for bigger maze
            if (this.isIPhone) {
                // iPhone: Slightly smaller for better performance
                baseSize = Math.min(viewportHeight * 0.6, viewportWidth * 0.8);
        } else {
                baseSize = Math.min(viewportHeight * 0.65, viewportWidth * 0.85);
            }
        } else if (viewportWidth <= 1024) {
            // Tablet: Use larger percentage for bigger maze
            baseSize = Math.min(viewportHeight * 0.75, viewportWidth * 0.80);
        } else {
            // Desktop: Conservative sizing
            baseSize = Math.min(viewportHeight * 0.6, viewportWidth * 0.55);
        }
        
        // Apply device scale but keep it conservative
        const finalContainerSize = Math.max(320, baseSize * deviceScale);
        
        // Set container size explicitly in pixels
        container.style.width = finalContainerSize + 'px';
        container.style.height = finalContainerSize + 'px';
        
        // Calculate game elements size based on container with larger cells for mobile
        const availableSize = finalContainerSize - 20; // Leave padding
        
        if (viewportWidth < 768) {
            // Phone: Larger cell size for better visibility
            if (this.isIPhone) {
                // iPhone: Optimized cell size for performance
                this.cellSize = Math.max(20, Math.floor(availableSize / this.mazeSize));
            } else {
                this.cellSize = Math.max(22, Math.floor(availableSize / this.mazeSize));
            }
        } else if (viewportWidth <= 1024) {
            // Tablet: Larger cell size for better visibility  
            this.cellSize = Math.max(26, Math.floor(availableSize / this.mazeSize));
        } else {
            // Desktop: Standard size
            this.cellSize = Math.max(20, Math.floor(availableSize / this.mazeSize));
        }
        
        // Set element sizes based on cell size
        if (viewportWidth < 768) {
            this.wallThickness = 2;
            if (this.isIPhone) {
                // iPhone: Smaller player for better performance
                this.playerSize = Math.max(4, Math.floor(this.cellSize * 0.20));
            } else {
                this.playerSize = Math.max(5, Math.floor(this.cellSize * 0.22));
            }
        } else if (viewportWidth <= 1024) {
            this.wallThickness = 2;
            this.playerSize = Math.max(7, Math.floor(this.cellSize * 0.18));
        } else {
            this.wallThickness = 3;
            this.playerSize = Math.max(8, Math.floor(this.cellSize * 0.16));
        }
        
        // Calculate actual game area size
        const gameAreaSize = this.mazeSize * this.cellSize;
        const totalCanvasSize = gameAreaSize + (this.wallThickness * 4);
        
        // Set canvas dimensions to exact pixel values
        this.canvas.width = totalCanvasSize;
        this.canvas.height = totalCanvasSize;
        
        // Remove any existing transforms that might interfere
        this.canvas.style.transform = 'none';
        this.canvas.style.transformOrigin = 'center center';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.maxHeight = '100%';
        this.canvas.style.objectFit = 'contain';
        
        // Set canvas offset for centering the maze
        this.canvasOffset = {
            x: this.wallThickness * 2,
            y: this.wallThickness * 2
        };

        // Store the canvas scale for coordinate calculations
        this.canvasScale = finalContainerSize / totalCanvasSize;
        
        // Update game positions only if this is initial setup
        if (!this.gameStarted) {
        this.startPosition = {
            x: this.cellSize * 1.5,
            y: this.cellSize * 1.5
        };
            
            this.playerPos = { ...this.startPosition };
            this.targetPos = { ...this.startPosition };
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
        
        // First, ensure we have a valid end position that's reachable
        this.generateRandomEndPosition();
        
        // Find all critical path cells that must remain obstacle-free
        this.criticalPathCells = this.findCriticalPathCells();
        
        // Generate bonus items in random open spaces (not on paths)
        const bonusTypes = ['backup', 'failover', 'cloud'];
        const bonusCount = Math.floor(this.mazeSize * 0.15);
        
        let bonusPlaced = 0;
        let attempts = 0;
        const maxAttempts = 200;
        
        while (bonusPlaced < bonusCount && attempts < maxAttempts) {
            const x = Math.floor(Math.random() * (this.mazeSize - 2)) + 1;
            const y = Math.floor(Math.random() * (this.mazeSize - 2)) + 1;
            
            // Check if position is open and not on special paths
            if (this.maze[y][x] === 0 && 
                this.getDistance(x, y, 1, 1) > 2 && // Not near start
                !this.isOnCriticalPath(x, y) && // Not on critical path
                !this.isOnPath(x, y) && // Not on special paths
                !this.isPositionOccupied(x, y, 1.5)) { // Not too close to existing items
                
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
        
        // Place obstacles only in very safe areas that don't block passages
        const obstacleTypes = ['downtime', 'dataloss', 'crash'];
        const obstacleCount = Math.floor(Math.random() * 2) + 1; // Reduced to 1-2 obstacles
        
        let obstaclesPlaced = 0;
        let obstacleAttempts = 0;
        const maxObstacleAttempts = 200;
        
        while (obstaclesPlaced < obstacleCount && obstacleAttempts < maxObstacleAttempts) {
            const x = Math.floor(Math.random() * (this.mazeSize - 4)) + 2; // More conservative bounds
            const y = Math.floor(Math.random() * (this.mazeSize - 4)) + 2;
            
            // Much more strict checking for obstacle placement
            if (this.maze[y][x] === 0 && 
                this.getDistance(x, y, 1, 1) > 4 && // Further from start
                this.getDistance(x, y, this.mazeSize-2, this.mazeSize-2) > 3 && // Not too close to typical end area
                !this.isOnCriticalPath(x, y) && // Never place on critical path
                !this.isPositionOccupied(x, y, 3.0) && // Larger spacing from other items
                this.hasMultiplePathsAround(x, y) && // Ensure multiple paths around this position
                !this.wouldCreateChokePoint(x, y)) { // Don't create chokepoints
                
                // Final check: temporarily place obstacle and verify connectivity
                const tempObstacle = {
                    gridX: x,
                    gridY: y
                };
                this.obstacles.push(tempObstacle);
                
                // Check if all critical areas are still reachable
                if (this.verifyConnectivityWithObstacles()) {
                    // Safe to place - replace temp with real obstacle
                    this.obstacles.pop();
                    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
                    this.obstacles.push({
                        x: x * this.cellSize + this.cellSize / 2,
                        y: y * this.cellSize + this.cellSize / 2,
                        type: type,
                        active: true,
                        animationOffset: Math.random() * Math.PI * 2,
                        gridX: x,
                        gridY: y
                    });
                    obstaclesPlaced++;
                } else {
                    // Remove temp obstacle - it would block passage
                    this.obstacles.pop();
                }
            }
            obstacleAttempts++;
        }
        
        // Add some bonus items on the safe path for guaranteed collection opportunities
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

    findCriticalPathCells() {
        // Find all cells that are critical for maintaining connectivity
        const criticalCells = new Set();
        const startX = 1;
        const startY = 1;
        const endX = Math.floor(this.endPos.x / this.cellSize);
        const endY = Math.floor(this.endPos.y / this.cellSize);
        
        // For each open cell, check if removing it would disconnect start from end
        for (let y = 1; y < this.mazeSize - 1; y++) {
            for (let x = 1; x < this.mazeSize - 1; x++) {
                if (this.maze[y][x] === 0) {
                    // Temporarily block this cell
                    this.maze[y][x] = 1;
                    
                    // Check if path still exists
                    if (!this.canReachDestination(startX, startY, endX, endY)) {
                        criticalCells.add(`${x},${y}`);
                    }
                    
                    // Restore the cell
                    this.maze[y][x] = 0;
                }
            }
        }
        
        return criticalCells;
    }

    canReachDestination(startX, startY, endX, endY) {
        const queue = [[startX, startY]];
        const visited = new Set();
        visited.add(`${startX},${startY}`);
        
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        while (queue.length > 0) {
            const [x, y] = queue.shift();
            
            if (x === endX && y === endY) {
                return true;
            }
            
            for (const [dx, dy] of directions) {
                const newX = x + dx;
                const newY = y + dy;
                const key = `${newX},${newY}`;
                
                if (newX >= 0 && newX < this.mazeSize && 
                    newY >= 0 && newY < this.mazeSize &&
                    !visited.has(key) &&
                    this.maze[newY][newX] === 0) {
                    
                    visited.add(key);
                    queue.push([newX, newY]);
                }
            }
        }
        
        return false;
    }

    isOnCriticalPath(x, y) {
        return this.criticalPathCells && this.criticalPathCells.has(`${x},${y}`);
    }

    isOnPath(x, y) {
        return this.safePath.some(p => p.x === x && p.y === y) ||
               this.dangerPath.some(p => p.x === x && p.y === y);
    }

    getDistance(x1, y1, x2, y2) {
        return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
    }

    checkWallCollision(x, y) {
        // First check if player is outside the playable area bounds
        const minBound = this.cellSize;
        const maxBound = (this.mazeSize - 1) * this.cellSize;
        
        if (x < minBound || x > maxBound || y < minBound || y > maxBound) {
            return true;
        }
        
        // Get the current cell and its neighbors
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        
        // Check bounds
        if (cellX < 0 || cellX >= this.mazeSize || cellY < 0 || cellY >= this.mazeSize) {
            return true;
        }
        
        // Check if the player center is in a wall cell
        if (this.maze[cellY][cellX] === 1) {
            return true;
        }
        
        // Enhanced collision detection with multiple radius checks
        const playerRadius = this.playerSize;
        
        // Multi-step collision checking for better accuracy
        // Check at multiple points around the player circle
        const checkPoints = [
            [x, y], // Center
            [x + playerRadius * 0.7, y], // Right
            [x - playerRadius * 0.7, y], // Left
            [x, y + playerRadius * 0.7], // Bottom
            [x, y - playerRadius * 0.7], // Top
            [x + playerRadius * 0.5, y + playerRadius * 0.5], // Bottom-right
            [x - playerRadius * 0.5, y + playerRadius * 0.5], // Bottom-left
            [x + playerRadius * 0.5, y - playerRadius * 0.5], // Top-right
            [x - playerRadius * 0.5, y - playerRadius * 0.5]  // Top-left
        ];
        
        for (const [checkX, checkY] of checkPoints) {
            const pointCellX = Math.floor(checkX / this.cellSize);
            const pointCellY = Math.floor(checkY / this.cellSize);
            
            // Check bounds for this point
            if (pointCellX >= 0 && pointCellX < this.mazeSize && 
                pointCellY >= 0 && pointCellY < this.mazeSize) {
                
                // If any check point is in a wall, return collision
                if (this.maze[pointCellY][pointCellX] === 1) {
                    return true;
                }
            }
        }
        
        // Additional refined collision detection for edge cases
        // Check each nearby cell that could contain a wall
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const checkCellX = cellX + dx;
                const checkCellY = cellY + dy;
                
                // Skip if outside maze bounds
                if (checkCellX < 0 || checkCellX >= this.mazeSize || 
                    checkCellY < 0 || checkCellY >= this.mazeSize) {
                    continue;
                }
                
                // If this is a wall cell, check for collision
                if (this.maze[checkCellY][checkCellX] === 1) {
                    const wallLeft = checkCellX * this.cellSize;
                    const wallRight = (checkCellX + 1) * this.cellSize;
                    const wallTop = checkCellY * this.cellSize;
                    const wallBottom = (checkCellY + 1) * this.cellSize;
                    
                    // Check if player circle intersects with wall rectangle
                    const closestX = Math.max(wallLeft, Math.min(x, wallRight));
                    const closestY = Math.max(wallTop, Math.min(y, wallBottom));
                    
                    const distanceX = x - closestX;
                    const distanceY = y - closestY;
                    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
                    
                    // Use conservative collision radius to prevent getting stuck
                    const effectiveRadius = playerRadius * 0.8; // Even more conservative
                    if (distanceSquared < (effectiveRadius * effectiveRadius)) {
                        return true;
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

        // Enhanced collision checking with additional safety
        if (this.checkWallCollision(this.playerPos.x, this.playerPos.y)) {
            this.pushPlayerOutOfWall();
            return; // Exit early if we had to push out of wall
        }

        // Calculate direction to target
        const dx = this.targetPos.x - this.playerPos.x;
        const dy = this.targetPos.y - this.playerPos.y;
        
        // Calculate distance to target
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0.05) { // Reduced threshold for more responsive movement
            // Much higher maximum movement per frame for smooth gameplay
            let maxMovePerFrame;
            if (this.isIPhone) {
                maxMovePerFrame = this.cellSize * 0.4; // Much faster movement
            } else if (this.isMobile) {
                maxMovePerFrame = this.cellSize * 0.45; // Very smooth movement
            } else {
                maxMovePerFrame = this.cellSize * 0.5; // Fast desktop movement
            }
            
            // Calculate movement this frame with reduced responsiveness
            let moveX = dx * this.moveSpeed * this.responsiveMultiplier;
            let moveY = dy * this.moveSpeed * this.responsiveMultiplier;
            
            // Cap the movement aggressively
            const moveDistance = Math.sqrt(moveX * moveX + moveY * moveY);
            if (moveDistance > maxMovePerFrame) {
                const ratio = maxMovePerFrame / moveDistance;
                moveX *= ratio;
                moveY *= ratio;
            }
            
            // Calculate potential new position
            let newX = this.playerPos.x + moveX;
            let newY = this.playerPos.y + moveY;
            
            // Multi-step movement validation for maximum safety
            // First, try the full movement
            if (!this.checkWallCollision(newX, newY)) {
                this.playerPos.x = newX;
                this.playerPos.y = newY;
            } else {
                // If full movement fails, try axis-separated movement
                const canMoveX = !this.checkWallCollision(newX, this.playerPos.y);
                const canMoveY = !this.checkWallCollision(this.playerPos.x, newY);
                
                if (canMoveX && !canMoveY) {
                    // Can move horizontally but not vertically
                    this.playerPos.x = newX;
                    this.targetPos.y = this.playerPos.y; // Stop vertical movement
                } else if (canMoveY && !canMoveX) {
                    // Can move vertically but not horizontally
                    this.playerPos.y = newY;
                    this.targetPos.x = this.playerPos.x; // Stop horizontal movement
                } else {
                    // Try very small incremental movements as last resort
                    let foundValidMove = false;
                    
                    // Try progressively smaller movements
                    for (let scale = 0.5; scale >= 0.1 && !foundValidMove; scale -= 0.1) {
                        const smallMoveX = moveX * scale;
                        const smallMoveY = moveY * scale;
                        
                        // Try both axes together first
                        if (!this.checkWallCollision(this.playerPos.x + smallMoveX, this.playerPos.y + smallMoveY)) {
                            this.playerPos.x += smallMoveX;
                            this.playerPos.y += smallMoveY;
                            foundValidMove = true;
                        } 
                        // Try horizontal only
                        else if (!this.checkWallCollision(this.playerPos.x + smallMoveX, this.playerPos.y)) {
                            this.playerPos.x += smallMoveX;
                            foundValidMove = true;
                        }
                        // Try vertical only
                        else if (!this.checkWallCollision(this.playerPos.x, this.playerPos.y + smallMoveY)) {
                            this.playerPos.y += smallMoveY;
                            foundValidMove = true;
                        }
                    }
                    
                    if (!foundValidMove) {
                        // Completely blocked - stop movement and ensure we're not stuck
                        this.targetPos = { ...this.playerPos };
                        
                        // Double-check we're not in a wall after stopping
                        if (this.checkWallCollision(this.playerPos.x, this.playerPos.y)) {
                            this.pushPlayerOutOfWall();
                        }
                    }
                }
            }
        }
        
        // Verify final position is safe
        if (this.checkWallCollision(this.playerPos.x, this.playerPos.y)) {
            this.pushPlayerOutOfWall();
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

        // Check for win condition at Zephyrus Hub (center) - only if all bonus items collected
        const allBonusItemsCollected = this.bonusItems.every(item => item.collected);
        if (allBonusItemsCollected) {
            const distanceToEnd = Math.sqrt(
                Math.pow(this.playerPos.x - this.endPos.x, 2) + 
                Math.pow(this.playerPos.y - this.endPos.y, 2)
            );
            
            if (distanceToEnd < this.cellSize * 0.6) {
                this.isGameComplete = true;
                this.canMove = false;
                this.targetPos = { ...this.playerPos };
                
                // Clear game timer since player won
                if (this.gameTimer) {
                    clearTimeout(this.gameTimer);
                    this.gameTimer = null;
                }
                
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
                    
                    // Add collection effect
                    this.createCollectionEffect(item.x, item.y, item.type);
                    
                    // Ensure game continues normally
                    break; // Only collect one item per frame to prevent issues
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
                    // Create explosion effect at collision point
                    this.createExplosionEffect(obstacle.x, obstacle.y);
                    
                    // Clear game timer since player lost
                    if (this.gameTimer) {
                        clearTimeout(this.gameTimer);
                        this.gameTimer = null;
                    }
                    
                    // Stop player movement and trigger game over immediately
                this.isGameOver = true;
                this.canMove = false;
                    this.targetPos = { ...this.playerPos };
                    obstacle.active = false; // Deactivate after collision
                    
                    // Show game over screen immediately
                this.drawGameOverScreen();
                    
                    return; // Exit early since collision occurred
                }
            }
        }
    }

    createCollectionEffect(x, y, type) {
        // Limit number of active effects for mobile performance
        if (this.collectionEffects.length >= this.maxCollectionEffects) {
            this.collectionEffects.shift(); // Remove oldest effect
        }
        
        const color = this.getBonusColor(type);
        
        // iPhone-specific particle count optimization
        let particleCount;
        if (this.isIPhone) {
            particleCount = 4; // Very few particles on iPhone
        } else if (this.isMobile) {
            particleCount = 8; // Fewer particles on mobile
        } else {
            particleCount = 12; // Standard particles on desktop
        }
        
        this.collectionEffects.push({
            x: x,
            y: y,
            type: type,
            startTime: performance.now(),
            color: color,
            particles: particleCount
        });
    }

    createExplosionEffect(x, y) {
        // Limit number of active effects for mobile performance  
        if (this.explosionEffects.length >= this.maxExplosionEffects) {
            this.explosionEffects.shift(); // Remove oldest effect
        }
        
        const explosionParticles = [];
        
        // iPhone-specific particle count and speed optimization
        let particleCount, speed;
        if (this.isIPhone) {
            particleCount = 4; // Very few particles on iPhone
            speed = 20; // Slower particles on iPhone
        } else if (this.isMobile) {
            particleCount = 6; // Fewer particles on mobile
            speed = 30; // Slower particles on mobile
        } else {
            particleCount = 12; // Standard particles on desktop
            speed = 50; // Standard speed on desktop
        }
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            explosionParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed * (0.5 + Math.random() * 0.5),
                vy: Math.sin(angle) * speed * (0.5 + Math.random() * 0.5),
                life: 1.0,
                size: this.isIPhone ? 2 : (this.isMobile ? 3 : 4) // Smaller particles on iPhone
            });
        }
        
        // iPhone-specific duration optimization
        const duration = this.isIPhone ? 600 : (this.isMobile ? 800 : 1200);
        
        this.explosionEffects.push({
            x: x,
            y: y,
            startTime: performance.now(),
            particles: explosionParticles,
            duration: duration
        });
    }

    getExplosionColor(index, total) {
        // Create fire-like colors for explosion
        const colors = ['#FF1744', '#FF5722', '#FF9800', '#FFC107', '#FFEB3B'];
        return colors[index % colors.length];
    }

    drawCollectionEffects() {
        if (this.collectionEffects.length === 0) return;
        
        // Save the entire canvas state before drawing any effects
        this.ctx.save();
        
        const currentTime = performance.now();
        
        // Draw all active collection effects
        for (let i = this.collectionEffects.length - 1; i >= 0; i--) {
            const effect = this.collectionEffects[i];
            const effectAge = currentTime - effect.startTime;
            const effectDuration = this.isMobile ? 600 : 1000;
            
            if (effectAge >= effectDuration) {
                this.collectionEffects.splice(i, 1);
                continue;
            }
            
            // Calculate effect parameters
            const progress = effectAge / effectDuration;
            const alpha = 1 - progress;
            const scale = 1 + progress * 0.5;
            
            // Draw simplified particle burst
            for (let j = 0; j < effect.particles; j++) {
                const angle = (j / effect.particles) * Math.PI * 2;
                const distance = progress * 30; // Particles move outward
                const particleX = effect.x + Math.cos(angle) * distance;
                const particleY = effect.y + Math.sin(angle) * distance;
                
                // iPhone-specific size optimization
                let baseSize;
                if (this.isIPhone) {
                    baseSize = 1.5; // Very small particles on iPhone
                } else if (this.isMobile) {
                    baseSize = 2;
                } else {
                    baseSize = 3;
                }
                const size = baseSize * (1 - progress);
                
                if (size > 0.5) {
                    this.ctx.save();
                    this.ctx.globalAlpha = alpha;
                    this.ctx.fillStyle = effect.color;
                    this.ctx.shadowColor = effect.color;
                    
                    // iPhone-specific blur optimization
                    const shadowBlur = this.isIPhone ? 3 : (this.isMobile ? 5 : 8);
                    this.ctx.shadowBlur = shadowBlur;
                    
                    this.ctx.beginPath();
                    this.ctx.arc(
                        this.canvasOffset.x + particleX,
                        this.canvasOffset.y + particleY,
                        size,
                        0,
                        Math.PI * 2
                    );
                    this.ctx.fill();
                    this.ctx.restore();
                }
            }
        }
        
        // Restore the entire canvas state
        this.ctx.restore();
    }

    drawExplosionEffects() {
        if (this.explosionEffects.length === 0) return;
        
        // Save the entire canvas state before drawing any effects
        this.ctx.save();
        
        const currentTime = performance.now();
        
        // Draw all active explosion effects
        for (let i = this.explosionEffects.length - 1; i >= 0; i--) {
            const effect = this.explosionEffects[i];
            const effectAge = currentTime - effect.startTime;
            
            if (effectAge >= effect.duration) {
                this.explosionEffects.splice(i, 1);
                continue;
            }
            
            // Calculate effect parameters
            const progress = effectAge / effect.duration;
            const alpha = 1 - progress;
            
            // Draw explosive particle burst
            for (const particle of effect.particles) {
                const particleProgress = effectAge / effect.duration;
                if (particleProgress >= particle.life) continue;
                
                // Update particle position
                const currentX = particle.x + particle.vx * particleProgress;
                const currentY = particle.y + particle.vy * particleProgress + (particleProgress * particleProgress * 20); // Gravity
                const size = particle.size * (1 - particleProgress);
                const particleAlpha = alpha * (1 - particleProgress);
                
                if (size > 0.5 && particleAlpha > 0.1) {
                    this.ctx.save();
                    this.ctx.globalAlpha = particleAlpha;
                    this.ctx.fillStyle = this.getExplosionColor(Math.floor(particleProgress * 3), 3);
                    this.ctx.shadowColor = '#FF4C4C';
                    
                    // iPhone-specific shadow blur optimization
                    const shadowBlur = this.isIPhone ? 5 : (this.isMobile ? 8 : 15);
                    this.ctx.shadowBlur = shadowBlur;
                    
                    this.ctx.beginPath();
                    this.ctx.arc(
                        this.canvasOffset.x + currentX,
                        this.canvasOffset.y + currentY,
                        size,
                        0,
                        Math.PI * 2
                    );
                    this.ctx.fill();
                    this.ctx.restore();
                }
            }
        }
        
        // Restore the entire canvas state
        this.ctx.restore();
    }

    pushPlayerOutOfWall() {
        // Unified wall escape method for all platforms
        const cellX = Math.floor(this.playerPos.x / this.cellSize);
        const cellY = Math.floor(this.playerPos.y / this.cellSize);
        
        // Strategy 1: Try to move to nearest open cell center (closest safe position)
        const directions = [
            [0, 0],   // Current cell center
            [0, 1], [1, 0], [0, -1], [-1, 0],  // Adjacent cells
            [1, 1], [-1, -1], [1, -1], [-1, 1] // Diagonal cells
        ];
        
        for (const [dx, dy] of directions) {
            const testCellX = cellX + dx;
            const testCellY = cellY + dy;
            
            // Check if this cell is valid and open
            if (testCellX >= 1 && testCellX < this.mazeSize - 1 &&
                testCellY >= 1 && testCellY < this.mazeSize - 1 &&
                this.maze[testCellY][testCellX] === 0) {
                
                const newX = (testCellX + 0.5) * this.cellSize;
                const newY = (testCellY + 0.5) * this.cellSize;
                
                // Verify this position is actually safe
                if (!this.checkWallCollision(newX, newY)) {
                    this.playerPos.x = newX;
                    this.playerPos.y = newY;
                    this.targetPos = { ...this.playerPos };
                    return;
                }
            }
        }
        
        // Strategy 2: If cell center approach fails, try radial search for nearest safe position
        const searchRadius = this.cellSize * 2;
        const step = 4; // Reasonable step size for searching
        
        for (let radius = step; radius <= searchRadius; radius += step) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
                const testX = this.playerPos.x + Math.cos(angle) * radius;
                const testY = this.playerPos.y + Math.sin(angle) * radius;
                
                // Make sure the position is within bounds
                const minBound = this.cellSize + this.playerSize;
                const maxBound = (this.mazeSize - 1) * this.cellSize - this.playerSize;
                
                if (testX >= minBound && testX <= maxBound &&
                    testY >= minBound && testY <= maxBound) {
                    
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
        
        // Strategy 3: Emergency fallback - scan for any open cell systematically
        for (let y = 1; y < this.mazeSize - 1; y++) {
            for (let x = 1; x < this.mazeSize - 1; x++) {
                if (this.maze[y][x] === 0) {
                    const testX = (x + 0.5) * this.cellSize;
                    const testY = (y + 0.5) * this.cellSize;
                    
                    if (!this.checkWallCollision(testX, testY)) {
                        this.playerPos.x = testX;
                        this.playerPos.y = testY;
                        this.targetPos = { ...this.playerPos };
                        return;
                    }
                }
            }
        }
        
        // Strategy 4: Absolute last resort - reset to start position
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
            
            // Calculate the target position with much more conservative bounds checking
            const padding = this.playerSize + 8; // Much larger padding to prevent wall clipping
            const minBound = this.cellSize + padding;
            const maxBound = (this.mazeSize - 1) * this.cellSize - padding;
            
            let targetX = pos.x - this.canvasOffset.x;
            let targetY = pos.y - this.canvasOffset.y;
            
            // Constrain to playable area with larger padding
            targetX = Math.max(minBound, Math.min(targetX, maxBound));
            targetY = Math.max(minBound, Math.min(targetY, maxBound));
            
            // Enhanced collision checking before setting target
            if (!this.checkWallCollision(targetX, targetY)) {
                // Additional safety check - verify the target is in an open cell
                const targetCellX = Math.floor(targetX / this.cellSize);
                const targetCellY = Math.floor(targetY / this.cellSize);
                
                if (targetCellX >= 1 && targetCellX < this.mazeSize - 1 &&
                    targetCellY >= 1 && targetCellY < this.mazeSize - 1 &&
                    this.maze[targetCellY][targetCellX] === 0) {
                    
                    this.targetPos = { x: targetX, y: targetY };
                } else {
                    // Target cell is not safe, try to find a nearby safe position
                    this.findNearestSafeTarget(targetX, targetY);
                }
            } else {
                // If direct path is blocked, find a nearby safe position
                this.findNearestSafeTarget(targetX, targetY);
            }
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
        
        // Start 45-second game timer
        this.gameTimer = setTimeout(() => {
            if (!this.isGameComplete && !this.isGameOver) {
                // Time's up - trigger game over
                this.isGameOver = true;
                this.canMove = false;
                this.targetPos = { ...this.playerPos };
                this.drawGameOverScreen();
            }
        }, 45000); // 45 seconds
        
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
        // Clear any existing timeouts and intervals
        if (this.modalTimeout) {
            clearTimeout(this.modalTimeout);
            this.modalTimeout = null;
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        if (this.gameOverDelay) {
            clearTimeout(this.gameOverDelay);
            this.gameOverDelay = null;
        }
        if (this.gameTimer) {
            clearTimeout(this.gameTimer);
            this.gameTimer = null;
        }
        
        // Cancel animation frame
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Clear all effects arrays for memory optimization
        this.collectionEffects.length = 0;
        this.explosionEffects.length = 0;
        this.trail.length = 0;

        // Reset game state
        this.isGameComplete = false;
        this.isGameOver = false;
        this.showGameOverScreen = false;
        this.showSuccessScreen = false;
        this.canMove = false;
        this.gameStarted = false;
        this.retryCount = 0;
        this.score = 0;
        this.collectedItems = [];
        
        // Clear maze arrays
        this.bonusItems.length = 0;
        this.obstacles.length = 0;
        this.safePath.length = 0;
        this.dangerPath.length = 0;
        this.pathChosen = null;
        
        // Generate new maze
        this.generateMaze();
        this.generateTwoPaths();
        this.generateRandomEndPosition();
        this.generateMazeElements();
        
        // Reset player position
        this.resetPlayerPosition();
        
        // Restart animation with fresh timestamp
        this.lastTime = performance.now();
        this.lastAnimationTime = 0;
        this.animate(this.lastTime);
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
            gameOverModal.className = 'modal failure-modal';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'failure-content';
            
            const heading = document.createElement('h2');
            heading.className = 'failure-heading';
            heading.innerHTML = '⚠️ DATA DID NOT SURVIVE';
            
            const subtitle = document.createElement('div');
            subtitle.className = 'failure-subtitle';
            subtitle.textContent = 'Mission failed';
            
            const button = document.createElement('button');
            button.id = 'startOverButton';
            button.className = 'failure-button';
            button.textContent = 'TRY AGAIN';
            
            modalContent.appendChild(heading);
            modalContent.appendChild(subtitle);
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
            const heading = gameOverModal.querySelector('.failure-heading');
            const subtitle = gameOverModal.querySelector('.failure-subtitle');
            if (heading) {
                heading.innerHTML = '⚠️ DATA DID NOT SURVIVE';
            }
            if (subtitle) {
                subtitle.textContent = 'Mission failed';
            }
            const button = gameOverModal.querySelector('button');
            if (button) {
                button.textContent = 'TRY AGAIN';
            }
        }

        // Trigger glitch effect
        if (gameOverModal.querySelector('.failure-heading')) {
            gameOverModal.querySelector('.failure-heading').classList.add('glitch-effect');
            setTimeout(() => {
                if (gameOverModal.querySelector('.failure-heading')) {
                    gameOverModal.querySelector('.failure-heading').classList.remove('glitch-effect');
                }
            }, 1000);
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
        // Clear canvas with very dark background for better contrast
        this.ctx.fillStyle = '#111111';
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

        // Draw walls with lighter charcoal and 3D effect
        this.ctx.strokeStyle = '#666666';
        this.ctx.lineWidth = this.wallThickness;
        this.ctx.lineCap = 'square';
        this.ctx.lineJoin = 'miter';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 3;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;
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

        // Reset shadow for other elements
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        // Draw bonus items with retro styling
        this.drawBonusItems();
        
        // Draw obstacles with warning effects
        this.drawObstacles();

        // Draw trail
        this.drawTrail();

        // Draw collection effects (before player to avoid covering)
        this.drawCollectionEffects();

        // Draw explosion effects (for dramatic impact)
        this.drawExplosionEffects();

        // Draw finish point with Zephyrus-styled flag and pulsing glow
        this.drawZephyrusFlag();

        // Reset canvas state before drawing player
        this.ctx.globalAlpha = 1.0;
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;

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
        
        // Final comprehensive canvas state reset
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.globalAlpha = 1.0;
    }

    drawUI() {
        // UI elements removed - no score or items display
    }

    drawZephyrusFlag() {
        // Only show the flag if all bonus items have been collected
        const allBonusItemsCollected = this.bonusItems.every(item => item.collected);
        if (!allBonusItemsCollected) {
            return; // Don't draw the flag until all bonus items are collected
        }
        
        const flagX = this.canvasOffset.x + this.endPos.x;
        const flagY = this.canvasOffset.y + this.endPos.y;
        const time = performance.now() * 0.003;
        
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
        
        // Fill flag
        this.ctx.fillStyle = flagGradient;
        this.ctx.fill();
        
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
        const size = this.fixedBonusIconSize;
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
        const size = this.fixedObstacleIconSize;
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
            case 'downtime': return '#FF4C4C';  // Dangerous red
            case 'dataloss': return '#F44336';  // Dangerous red
            case 'crash': return '#FF1744';     // Dangerous red (was purple, now red)
            default: return '#FF4C4C';
        }
    }

    animate(currentTime) {
        // Throttle animation frame rate for mobile performance
        if (currentTime - this.lastAnimationTime < this.animationThrottle) {
            this.animationFrame = requestAnimationFrame((time) => this.animate(time));
            return;
        }
        
        this.lastAnimationTime = currentTime;
        
        // Calculate delta time
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update player position
        if (!this.isGameOver && !this.isGameComplete) {
            this.updatePlayerPosition(deltaTime);
        }

        this.drawMaze();
        
        // Store animation frame reference for cleanup
        this.animationFrame = requestAnimationFrame((time) => this.animate(time));
    }

    showSuccessModal() {
        const modal = document.getElementById('successModal');
        const overlay = document.getElementById('modalOverlay');
        const countdown = document.getElementById('countdown');
        let timeLeft = 30; // 30 seconds for auto-restart

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

        // Set up REPLAY MISSION button
        let replayBtn = document.getElementById('replayButton');
        if (replayBtn) {
            replayBtn.onclick = () => {
                this.restart();
                this.hideModals();
                this.showWelcomeModal();
            };
        }

        // Initial countdown display
        countdown.textContent = `🔄 Game will restart automatically in ${timeLeft} seconds.`;

        // Update countdown every second
        this.countdownInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft >= 0) {
                countdown.textContent = `🔄 Game will restart automatically in ${timeLeft} seconds.`;
            }
        }, 1000);

        // Set timeout to auto-restart game
        this.modalTimeout = setTimeout(() => {
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
            // Auto-restart the game
            this.restart();
            this.hideModals();
            this.showWelcomeModal();
        }, 30000); // 30 seconds
    }

    isPositionOccupied(x, y, minDistance) {
        // Check if there's already a bonus item within the minimum distance
        for (let item of this.bonusItems) {
            const itemGridX = item.gridX || Math.floor((item.x - this.cellSize / 2) / this.cellSize);
            const itemGridY = item.gridY || Math.floor((item.y - this.cellSize / 2) / this.cellSize);
            
            if (this.getDistance(x, y, itemGridX, itemGridY) < minDistance) {
                return true;
            }
        }
        
        // Check if there's already an obstacle within the minimum distance
        for (let obstacle of this.obstacles) {
            const obstacleGridX = obstacle.gridX || Math.floor((obstacle.x - this.cellSize / 2) / this.cellSize);
            const obstacleGridY = obstacle.gridY || Math.floor((obstacle.y - this.cellSize / 2) / this.cellSize);
            
            if (this.getDistance(x, y, obstacleGridX, obstacleGridY) < minDistance) {
                return true;
            }
        }
        
        return false;
    }

    // Keep these methods for backward compatibility but make them use the new method
    isObstacleNearby(x, y) {
        return this.isPositionOccupied(x, y, 2.0);
    }

    isBonusItemNearby(x, y) {
        return this.isPositionOccupied(x, y, 1.5);
    }

    generateRandomEndPosition() {
        // Find a random valid position for the flag that's reachable
        let attempts = 0;
        const maxAttempts = 200;
        
        while (attempts < maxAttempts) {
            const x = Math.floor(Math.random() * (this.mazeSize - 2)) + 1;
            const y = Math.floor(Math.random() * (this.mazeSize - 2)) + 1;
            
            // Check if position is valid for flag placement
            if (this.maze[y][x] === 0 && // Open space
                this.getDistance(x, y, 1, 1) > 4 && // Not too close to start (at least 4 cells away)
                this.canReachDestination(1, 1, x, y)) { // Must be reachable from start
                
                this.endPos = {
                    x: x * this.cellSize + this.cellSize / 2,
                    y: y * this.cellSize + this.cellSize / 2
                };
                
                // Double-check that this position is in a well-connected area
                // Count the number of open adjacent cells
                let openAdjacent = 0;
                const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                for (const [dx, dy] of directions) {
                    const adjX = x + dx;
                    const adjY = y + dy;
                    if (adjX >= 0 && adjX < this.mazeSize && 
                        adjY >= 0 && adjY < this.mazeSize &&
                        this.maze[adjY][adjX] === 0) {
                        openAdjacent++;
                    }
                }
                
                // Only accept positions with at least 2 open adjacent cells
                // This ensures the flag isn't in a dead end
                if (openAdjacent >= 2) {
                    return;
                }
            }
            attempts++;
        }
        
        // Fallback strategy: find the most connected reachable position
        let bestPosition = null;
        let bestConnectivity = 0;
        
        for (let y = 1; y < this.mazeSize - 1; y++) {
            for (let x = 1; x < this.mazeSize - 1; x++) {
                if (this.maze[y][x] === 0 && 
                    this.getDistance(x, y, 1, 1) > 3 &&
                    this.canReachDestination(1, 1, x, y)) {
                    
                    // Count connectivity of this position
                    let connectivity = 0;
                    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                    for (const [dx, dy] of directions) {
                        const adjX = x + dx;
                        const adjY = y + dy;
                        if (adjX >= 0 && adjX < this.mazeSize && 
                            adjY >= 0 && adjY < this.mazeSize &&
                            this.maze[adjY][adjX] === 0) {
                            connectivity++;
                        }
                    }
                    
                    if (connectivity > bestConnectivity) {
                        bestConnectivity = connectivity;
                        bestPosition = { x, y };
                    }
                }
            }
        }
        
        if (bestPosition) {
            this.endPos = {
                x: bestPosition.x * this.cellSize + this.cellSize / 2,
                y: bestPosition.y * this.cellSize + this.cellSize / 2
            };
        } else {
            // Final fallback to original corner position
            this.endPos = {
                x: (this.mazeSize - 2) * this.cellSize + this.cellSize / 2,
                y: (this.mazeSize - 2) * this.cellSize + this.cellSize / 2
            };
        }
    }

    handleResize() {
        // Debounce resize events to prevent excessive calls
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            // Store current game state before resize
            const wasGameStarted = this.gameStarted;
            const oldGameAreaSize = this.mazeSize * this.cellSize;
            
            // Store relative positions before resize
            let relativePlayerPos = null;
            let relativeEndPos = null;
            let relativeBonusItems = [];
            let relativeObstacles = [];
            let relativeTrail = [];
            
            if (wasGameStarted && oldGameAreaSize > 0) {
                // Calculate relative positions (0-1 scale)
                if (this.playerPos) {
                    relativePlayerPos = {
                        x: this.playerPos.x / oldGameAreaSize,
                        y: this.playerPos.y / oldGameAreaSize
                    };
                }
                
                if (this.endPos) {
                    relativeEndPos = {
                        x: this.endPos.x / oldGameAreaSize,
                        y: this.endPos.y / oldGameAreaSize
                    };
                }
                
                if (this.bonusItems) {
                    relativeBonusItems = this.bonusItems.map(item => ({
                        ...item,
                        x: item.x / oldGameAreaSize,
                        y: item.y / oldGameAreaSize
                    }));
                }
                
                if (this.obstacles) {
                    relativeObstacles = this.obstacles.map(obstacle => ({
                        ...obstacle,
                        x: obstacle.x / oldGameAreaSize,
                        y: obstacle.y / oldGameAreaSize
                    }));
                }
                
                if (this.trail && this.trail.length > 0) {
                    relativeTrail = this.trail.map(pos => ({
                        x: pos.x / oldGameAreaSize,
                        y: pos.y / oldGameAreaSize,
                        timestamp: pos.timestamp
                    }));
                }
            }
            
            // Update canvas size - this calculates new cellSize and gameAreaSize
            this.setupCanvasSize();
            
            // Restore positions using new game area size
            const newGameAreaSize = this.mazeSize * this.cellSize;
            
            if (wasGameStarted && relativePlayerPos) {
                this.playerPos.x = relativePlayerPos.x * newGameAreaSize;
                this.playerPos.y = relativePlayerPos.y * newGameAreaSize;
                this.targetPos = { ...this.playerPos };
            }
            
            if (wasGameStarted && relativeEndPos) {
                this.endPos.x = relativeEndPos.x * newGameAreaSize;
                this.endPos.y = relativeEndPos.y * newGameAreaSize;
            }
            
            if (wasGameStarted && relativeBonusItems.length > 0) {
                this.bonusItems = relativeBonusItems.map(item => ({
                    ...item,
                    x: item.x * newGameAreaSize,
                    y: item.y * newGameAreaSize
                }));
            }
            
            if (wasGameStarted && relativeObstacles.length > 0) {
                this.obstacles = relativeObstacles.map(obstacle => ({
                    ...obstacle,
                    x: obstacle.x * newGameAreaSize,
                    y: obstacle.y * newGameAreaSize
                }));
            }
            
            if (wasGameStarted && relativeTrail.length > 0) {
                this.trail = relativeTrail.map(pos => ({
                    x: pos.x * newGameAreaSize,
                    y: pos.y * newGameAreaSize,
                    timestamp: pos.timestamp
                }));
            }
            
            // Force immediate redraw
            this.drawMaze();
            
        }, 100); // Reduced debounce time for more responsive scaling
    }

    wouldBlockPath(x, y) {
        // Temporarily place a wall at this position and check if path still exists
        const originalValue = this.maze[y][x];
        this.maze[y][x] = 1; // Temporarily block
        
        const startX = 1;
        const startY = 1;
        const endX = Math.floor(this.endPos.x / this.cellSize);
        const endY = Math.floor(this.endPos.y / this.cellSize);
        
        const pathExists = this.canReachDestination(startX, startY, endX, endY);
        
        // Restore original value
        this.maze[y][x] = originalValue;
        
        return !pathExists; // Return true if placing item would block path
    }

    hasAlternativePath(x, y) {
        // Check if there are multiple paths around this position
        // This ensures we don't place obstacles on narrow corridors
        
        const adjacentPaths = [];
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        for (const [dx, dy] of directions) {
            const checkX = x + dx;
            const checkY = y + dy;
            
            if (checkX >= 0 && checkX < this.mazeSize && 
                checkY >= 0 && checkY < this.mazeSize &&
                this.maze[checkY][checkX] === 0) {
                
                // Check if this adjacent cell has multiple connections
                let connections = 0;
                for (const [dx2, dy2] of directions) {
                    const checkX2 = checkX + dx2;
                    const checkY2 = checkY + dy2;
                    
                    if (checkX2 >= 0 && checkX2 < this.mazeSize && 
                        checkY2 >= 0 && checkY2 < this.mazeSize &&
                        this.maze[checkY2][checkX2] === 0) {
                        connections++;
                    }
                }
                
                if (connections >= 2) {
                    adjacentPaths.push({x: checkX, y: checkY, connections});
                }
            }
        }
        
        // Return true if there are multiple well-connected adjacent paths
        return adjacentPaths.length >= 2;
    }

    improvedCanReachDestination(startX, startY, endX, endY, avoidObstacles = false) {
        // Enhanced pathfinding that can optionally avoid obstacle positions
        const queue = [[startX, startY]];
        const visited = new Set();
        visited.add(`${startX},${startY}`);
        
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        while (queue.length > 0) {
            const [x, y] = queue.shift();
            
            if (x === endX && y === endY) {
                return true;
            }
            
            for (const [dx, dy] of directions) {
                const newX = x + dx;
                const newY = y + dy;
                const key = `${newX},${newY}`;
                
                if (newX >= 0 && newX < this.mazeSize && 
                    newY >= 0 && newY < this.mazeSize &&
                    !visited.has(key) &&
                    this.maze[newY][newX] === 0) {
                    
                    // If avoiding obstacles, check if there's an obstacle here
                    if (avoidObstacles) {
                        const hasObstacle = this.obstacles.some(obs => 
                            Math.floor((obs.x - this.cellSize / 2) / this.cellSize) === newX &&
                            Math.floor((obs.y - this.cellSize / 2) / this.cellSize) === newY
                        );
                        if (hasObstacle) continue;
                    }
                    
                    visited.add(key);
                    queue.push([newX, newY]);
                }
            }
        }
        
        return false;
    }

    findNearestSafeTarget(requestedX, requestedY) {
        // Try to find a nearby safe position for targeting
        const searchRadius = this.playerSize * 3;
        const steps = 16; // Try more directions for better coverage
        const padding = this.playerSize + 8;
        const minBound = this.cellSize + padding;
        const maxBound = (this.mazeSize - 1) * this.cellSize - padding;
        
        // Try concentric circles of increasing radius
        for (let radius = this.playerSize; radius <= searchRadius; radius += this.playerSize / 2) {
            for (let i = 0; i < steps; i++) {
                const angle = (i / steps) * Math.PI * 2;
                const offsetX = Math.cos(angle) * radius;
                const offsetY = Math.sin(angle) * radius;
                
                const altTargetX = requestedX + offsetX;
                const altTargetY = requestedY + offsetY;
                
                // Check bounds
                if (altTargetX >= minBound && altTargetX <= maxBound &&
                    altTargetY >= minBound && altTargetY <= maxBound) {
                    
                    // Check if this position is safe
                    if (!this.checkWallCollision(altTargetX, altTargetY)) {
                        // Additional verification - check if it's in an open cell
                        const cellX = Math.floor(altTargetX / this.cellSize);
                        const cellY = Math.floor(altTargetY / this.cellSize);
                        
                        if (cellX >= 1 && cellX < this.mazeSize - 1 &&
                            cellY >= 1 && cellY < this.mazeSize - 1 &&
                            this.maze[cellY][cellX] === 0) {
                            
                            this.targetPos = { x: altTargetX, y: altTargetY };
                            return; // Found a safe target
                        }
                    }
                }
            }
        }
        
        // If no safe alternative found, keep current target (don't update it)
        // This prevents the player from trying to move into walls
    }

    hasMultiplePathsAround(x, y) {
        // Check if there are multiple paths around this position
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        let paths = 0;
        for (const [dx, dy] of directions) {
            if (this.maze[y + dy] && this.maze[y + dy][x + dx] === 0) {
                paths++;
            }
        }
        return paths >= 2;
    }

    wouldCreateChokePoint(x, y) {
        // Check if placing an obstacle here would create a choke point
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        let blocked = 0;
        for (const [dx, dy] of directions) {
            if (this.maze[y + dy] && this.maze[y + dy][x + dx] === 1) {
                blocked++;
            }
        }
        return blocked >= 3;
    }

    verifyConnectivityWithObstacles() {
        // Check if all critical areas are still reachable
        const criticalCells = this.findCriticalPathCells();
        for (const cell of criticalCells) {
            const [x, y] = cell.split(',').map(Number);
            if (this.maze[y][x] === 1) {
                return false;
            }
        }
        return true;
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new MazeGame();
}); 