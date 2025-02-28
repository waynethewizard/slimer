class GameManager {
    constructor(canvas) {
        console.log('GameManager constructor called');
        this.canvas = canvas;
        console.log('Canvas dimensions:', this.canvas.width, 'x', this.canvas.height);
        this.renderer = new Renderer(canvas);
        console.log('Renderer created');
        this.world = { slimes: {} }; // Initialize the world
        this.lastTime = 0;
        
        // Game state
        this.world = {
            players: {},
            slimes: {},
            width: this.canvas.width,
            height: this.canvas.height
        };
        console.log('World initialized with dimensions:', this.world.width, 'x', this.world.height);
        
        // Local player
        this.localPlayer = null;
        
        // Selected slimes (for breeding)
        this.selectedSlimes = [];
        
        // Network manager
        this.networkManager = new NetworkManager(this);
        console.log('NetworkManager created');
        
        // Input handling
        this.setupInput();
        console.log('Input handlers set up');
    }
    
    init() {
        console.log('GameManager.init() called');
        // Connect to server
        this.networkManager.connect('ws://localhost:8081');
        console.log('Connecting to WebSocket server...');
        
        // Load initial slimes
        console.log('Loading initial slimes...');
        this.loadInitialSlimes(5); // Load 5 slimes
        
        // Start the game loop
        console.log('Starting game loop...');
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    gameLoop(timestamp) {
        const deltaTime = (timestamp - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = timestamp;
        
        // Update game state
        this.update(deltaTime);
        
        // Render the world
        this.renderer.renderWorld(this.world);
        
        // Request the next frame
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    update(deltaTime) {
        // Update all slimes
        for (const slimeId in this.world.slimes) {
            const slime = this.world.slimes[slimeId];
            if (typeof slime.update === 'function') {
                slime.update(deltaTime);
            } else {
                console.error('Slime update method not found:', slime);
            }
        }
        
        // Update world dimensions
        this.world.width = this.canvas.width;
        this.world.height = this.canvas.height;
    }
    
    setupInput() {
        // Mouse click
        this.canvas.addEventListener('click', (event) => {
            console.log('Canvas clicked');
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            console.log('Click position:', mouseX, mouseY);

            for (const slimeId in this.world.slimes) {
                const slime = this.world.slimes[slimeId];
                const distance = Math.sqrt((slime.x - mouseX) ** 2 + (slime.y - mouseY) ** 2);
                if (distance < slime.size) {
                    console.log('Slime clicked:', slimeId);
                    slime.toggleSelection(); // Toggle selection on click
                    break;
                }
            }
        });
        
        // Right click to set target
        this.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            console.log('Right-click detected');
            
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            console.log('Target position:', x, y);
            
            // Set target for selected slimes
            this.selectedSlimes.forEach(slimeId => {
                console.log('Setting target for slime:', slimeId);
                this.networkManager.sendSlimeTarget(slimeId, x, y);
            });
        });
        
        // Keyboard
        document.addEventListener('keydown', (event) => {
            console.log('Key pressed:', event.key);
            // 'B' to breed selected slimes
            if (event.key === 'b' || event.key === 'B') {
                console.log('Breeding attempt with selected slimes:', this.selectedSlimes);
                if (this.selectedSlimes.length === 2) {
                    this.networkManager.breedSlimes(this.selectedSlimes[0], this.selectedSlimes[1]);
                    
                    // Deselect after breeding
                    this.selectedSlimes.forEach(slimeId => {
                        const slime = this.world.slimes[slimeId];
                        if (slime) {
                            slime.deselect();
                        }
                    });
                    this.selectedSlimes = [];
                }
            }
            
            // 'Escape' to deselect all
            if (event.key === 'Escape') {
                console.log('Deselecting all slimes');
                this.selectedSlimes.forEach(slimeId => {
                    const slime = this.world.slimes[slimeId];
                    if (slime) {
                        slime.deselect();
                    }
                });
                this.selectedSlimes = [];
            }
        });
    }
    
    // Network event handlers
    addPlayer(player) {
        console.log('Adding player:', player);
        this.world.players[player.id] = player;
    }
    
    removePlayer(playerId) {
        console.log('Removing player:', playerId);
        // Remove player's slimes
        if (this.world.players[playerId]) {
            const slimeIds = [...this.world.players[playerId].slimes];
            slimeIds.forEach(slimeId => {
                delete this.world.slimes[slimeId];
            });
        }
        
        // Remove player
        delete this.world.players[playerId];
    }
    
    setLocalPlayer(player) {
        console.log('Setting local player:', player);
        this.localPlayer = player;
    }
    
    updateWorld(world) {
        console.log('Updating world state, slime count:', Object.keys(world.slimes || {}).length);
        this.world = world;
        this.renderer.renderWorld(this.world);
        this.updateSlimeCountUI();
    }
    
    addSlime(slimeData) {
        console.log('Adding slime:', slimeData);
        const slime = new Slime(slimeData.id, slimeData.playerId, slimeData.x, slimeData.y, slimeData.color, slimeData.size);
        this.world.slimes[slime.id] = slime; // Add slime to the world
        console.log('Current slime count:', Object.keys(this.world.slimes).length);
    }
    
    moveSlime(slimeId, x, y) {
        console.log('Moving slime:', slimeId, 'to', x, y);
        const slime = this.world.slimes[slimeId];
        if (slime) {
            slime.setTarget(x, y);
        } else {
            console.error('Slime not found for movement:', slimeId);
        }
    }

    loadInitialSlimes(count) {
        console.log('Loading initial slimes:', count);
        
        // Define letters for random color generation
        const letters = '0123456789ABCDEF';
        
        for (let i = 0; i < count; i++) {
            const slimeData = {
                id: `slime${i}`,
                playerId: this.localPlayer ? this.localPlayer.id : 'guest',
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                color: this.getRandomColor(),
                size: 30
            };
            console.log('Created initial slime:', slimeData);
            this.addSlime(slimeData);
        }
    }

    getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    updateSlimeCountUI() {
        const slimeCountElement = document.getElementById('slimeCount');
        if (slimeCountElement) {
            const slimeCount = Object.keys(this.world.slimes).length;
            slimeCountElement.textContent = `Slimes: ${slimeCount}`;
            console.log('Updated UI slime count:', slimeCount);
        } else {
            console.error('Slime count element not found in DOM');
        }
    }
}