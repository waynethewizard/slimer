// File: server.js
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8081 });

// Game state
const world = {
    players: {},
    slimes: {},
    width: 800,
    height: 600
};

// Helper functions
function generateRandomColor() {
    const r = Math.floor(Math.random() * 200) + 55; // 55-255
    const g = Math.floor(Math.random() * 200) + 55;
    const b = Math.floor(Math.random() * 200) + 55;
    return `rgb(${r}, ${g}, ${b})`;
}

function createSlime(x, y, ownerId) {
    const slimeId = uuidv4();
    const size = 20 + Math.random() * 15; // 20-35
    const speed = 30 + Math.random() * 20; // 30-50
    
    const slime = {
        id: slimeId,
        x: x,
        y: y,
        color: generateRandomColor(),
        size: size,
        speed: speed,
        direction: Math.random() * Math.PI * 2,
        traits: {},
        ownerId: ownerId
    };
    
    // Small chance for initial traits
    if (Math.random() < 0.3) {
        const traitNames = ['sticky', 'bouncy', 'glowing', 'spiky', 'transparent'];
        const trait = traitNames[Math.floor(Math.random() * traitNames.length)];
        slime.traits[trait] = Math.random();
    }
    
    return slime;
}

function parseColor(color) {
    // Handle different color formats
    if (color.startsWith('rgb')) {
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
            return {
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3])
            };
        }
    }
    
    // Default fallback
    return { r: 100, g: 100, b: 100 };
}

// Connection handler
wss.on('connection', (ws) => {
    // Generate player ID
    const playerId = uuidv4();
    
    // Initial player data
    let player = null;
    
    console.log(`New connection: ${playerId}`);
    
    // Message handler
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, playerId, data);
        } catch (error) {
            console.error('Invalid message:', error);
        }
    });
    
    // Close handler
    ws.on('close', () => {
        console.log(`Connection closed: ${playerId}`);
        
        if (player) {
            // Remove player from world
            delete world.players[playerId];
            
            // Remove their slimes
            Object.keys(world.slimes).forEach(slimeId => {
                if (world.slimes[slimeId].ownerId === playerId) {
                    delete world.slimes[slimeId];
                }
            });
            
            // Broadcast player left
            broadcast({
                type: 'player_left',
                playerId: playerId
            });
        }
    });
    
    // Error handler
    ws.on('error', (error) => {
        console.error(`Connection error: ${playerId}`, error);
    });
    
    // Handle client messages
    function handleMessage(ws, playerId, data) {
        switch (data.type) {
            case 'join_game':
                player = {
                    id: playerId,
                    name: data.playerName || 'Guest',
                    x: Math.random() * world.width,
                    y: Math.random() * world.height,
                    color: generateRandomColor()
                };
                
                // Add to world
                world.players[playerId] = player;
                
                // Create initial slimes (2 random ones)
                for (let i = 0; i < 2; i++) {
                    const slime = createSlime(
                        Math.random() * world.width,
                        Math.random() * world.height,
                        playerId
                    );
                    world.slimes[slime.id] = slime;
                    
                    // Notify all clients
                    broadcast({
                        type: 'slime_created',
                        slime: slime
                    });
                }
                
                // Send join confirmation
                ws.send(JSON.stringify({
                    type: 'player_joined',
                    player: player
                }));
                
                // Send current world state
                ws.send(JSON.stringify({
                    type: 'world_update',
                    world: world
                }));
                
                // Broadcast new player to others
                broadcast({
                    type: 'player_joined',
                    player: player
                }, [playerId]);
                
                break;
                
            case 'player_position':
                if (!player) return;
                
                // Update player position
                player.x = data.x;
                player.y = data.y;
                
                // Broadcast update
                broadcast({
                    type: 'player_position',
                    playerId: playerId,
                    x: data.x,
                    y: data.y
                }, [playerId]);
                
                break;
                
            case 'create_slime':
                if (!player) return;
                
                // Check if player has resources to create a slime
                const playerSlimes = Object.values(world.slimes).filter(
                    slime => slime.ownerId === playerId
                );
                
                // Limit number of slimes per player (max 10)
                if (playerSlimes.length >= 10) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Maximum slimes reached (10)'
                    }));
                    return;
                }
                
                // Create new slime
                const newSlime = createSlime(data.x, data.y, playerId);
                world.slimes[newSlime.id] = newSlime;
                
                // Broadcast new slime
                broadcast({
                    type: 'slime_created',
                    slime: newSlime
                });
                
                break;
                
            case 'breed_slimes':
                if (!player) return;
                
                // Find parent slimes
                const parent1 = world.slimes[data.slimeId1];
                const parent2 = world.slimes[data.slimeId2];
                
                if (!parent1 || !parent2) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid slimes for breeding'
                    }));
                    return;
                }
                
                // Check if both slimes belong to player
                if (parent1.ownerId !== playerId || parent2.ownerId !== playerId) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'You can only breed your own slimes'
                    }));
                    return;
                }
                
                // Check if player has resources to create a slime
                const currentSlimes = Object.values(world.slimes).filter(
                    slime => slime.ownerId === playerId
                );
                
                // Limit number of slimes per player (max 10)
                if (currentSlimes.length >= 10) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Maximum slimes reached (10)'
                    }));
                    return;
                }
                
                // Create child slime
                const childSlime = breedSlimes(parent1, parent2, playerId);
                world.slimes[childSlime.id] = childSlime;
                
                // Broadcast new slime
                broadcast({
                    type: 'slime_created',
                    slime: childSlime
                });
                
                break;
                
            case 'slime_target':
                if (!player) return;
                
                // Find slime
                const slime = world.slimes[data.slimeId];
                
                if (!slime) {
                    return;
                }
                
                // Check if slime belongs to player
                if (slime.ownerId !== playerId) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'You can only control your own slimes'
                    }));
                    return;
                }
                
                // Update slime target
                slime.targetX = data.x;
                slime.targetY = data.y;
                
                // Broadcast slime update
                broadcast({
                    type: 'slime_update',
                    slime: {
                        id: slime.id,
                        targetX: slime.targetX,
                        targetY: slime.targetY
                    }
                });
                
                break;
                
            default:
                console.log('Unknown message type:', data.type);
        }
    }
});

// Broadcast to all or filtered clients
function broadcast(data, excludeIds = []) {
    const message = JSON.stringify(data);
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && 
            (!excludeIds.includes(client.playerId))) {
            client.send(message);
        }
    });
}

// Game loop
const fps = 20;
const updateInterval = 1000 / fps;

setInterval(() => {
    // Update slimes
    Object.values(world.slimes).forEach(slime => {
        // If slime has a target, move toward it
        if (slime.targetX !== undefined && slime.targetY !== undefined) {
            const dx = slime.targetX - slime.x;
            const dy = slime.targetY - slime.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                slime.direction = Math.atan2(dy, dx);
                
                // Move toward target
                const moveSpeed = slime.speed / fps;
                slime.x += Math.cos(slime.direction) * moveSpeed;
                slime.y += Math.sin(slime.direction) * moveSpeed;
            } else {
                // Target reached
                slime.targetX = undefined;
                slime.targetY = undefined;
                // Random new direction
                slime.direction = Math.random() * Math.PI * 2;
            }
        } else {
            // Random movement
            // Random direction change occasionally
            if (Math.random() < 0.02) {
                slime.direction += (Math.random() - 0.5) * Math.PI / 2;
            }
            
            // Move
            const moveSpeed = slime.speed / fps;
            slime.x += Math.cos(slime.direction) * moveSpeed;
            slime.y += Math.sin(slime.direction) * moveSpeed;
        }
        
        // Bounce off world boundaries
        if (slime.x < slime.size) {
            slime.x = slime.size;
            slime.direction = Math.PI - slime.direction;
        } else if (slime.x > world.width - slime.size) {
            slime.x = world.width - slime.size;
            slime.direction = Math.PI - slime.direction;
        }
        
        if (slime.y < slime.size) {
            slime.y = slime.size;
            slime.direction = -slime.direction;
        } else if (slime.y > world.height - slime.size) {
            slime.y = world.height - slime.size;
            slime.direction = -slime.direction;
        }
    });
    
    // Broadcast world update (just the slimes for now)
    broadcast({
        type: 'world_update',
        world: {
            slimes: world.slimes
        }
    });
}, updateInterval);

console.log('WebSocket server running on port 8081');

function breedSlimes(parent1, parent2, ownerId) {
    // Set position between parents
    const x = (parent1.x + parent2.x) / 2;
    const y = (parent1.y + parent2.y) / 2;
    
    // Generate ID
    const slimeId = uuidv4();
    
    // Blend colors
    const color1 = parseColor(parent1.color);
    const color2 = parseColor(parent2.color);
    
    // Blend with slight randomness
    const r = Math.floor((color1.r + color2.r) / 2 * (0.9 + Math.random() * 0.2));
    const g = Math.floor((color1.g + color2.g) / 2 * (0.9 + Math.random() * 0.2));
    const b = Math.floor((color1.b + color2.b) / 2 * (0.9 + Math.random() * 0.2));
    
    let color = `rgb(${r}, ${g}, ${b})`;
    
    // Small chance for a mutation
    if (Math.random() < 0.1) {
        color = generateRandomColor();
    }
    
    // Inherit traits with mutations
    const size = (parent1.size + parent2.size) / 2 * (0.9 + Math.random() * 0.2);
    const speed = (parent1.speed + parent2.speed) / 2 * (0.9 + Math.random() * 0.2);
    
    // Inherit and possibly mutate traits
    const traits = {};
    const allTraitKeys = new Set([...Object.keys(parent1.traits), ...Object.keys(parent2.traits)]);
    
    allTraitKeys.forEach(trait => {
        // 80% chance to inherit, 20% chance for mutation
        if (Math.random() < 0.8) {
            // Choose trait from either parent
            traits[trait] = Math.random() < 0.5 ? 
                parent1.traits[trait] || 0 : 
                parent2.traits[trait] || 0;
        } else {
            // Mutation - new random value
            traits[trait] = Math.random();
        }
    });
    
    // Small chance for a new trait
    if (Math.random() < 0.1) {
        const traitNames = ['sticky', 'bouncy', 'glowing', 'spiky', 'transparent'];
        const newTrait = traitNames[Math.floor(Math.random() * traitNames.length)];
        traits[newTrait] = Math.random();
    }
    
    const slime = {
        id: slimeId,
        x: x,
        y: y,
        color: color,
        size: size,
        speed: speed,
        direction: Math.random() * Math.PI * 2,
        traits: traits,
        ownerId: ownerId
    };
    
    return slime;
}
