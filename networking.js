class NetworkManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.socket = null;
        this.connected = false;
        this.playerId = null;
    }
    
    connect(serverUrl) {
        this.socket = new WebSocket(serverUrl);
        
        this.socket.onopen = () => {
            console.log('Connected to server');
            this.connected = true;
        };
        
        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };
        
        this.socket.onclose = () => {
            console.log('Disconnected from server');
            this.connected = false;
        };
        
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }
    
    handleMessage(message) {
        switch (message.type) {
            case 'player_joined':
                this.gameManager.addPlayer(message.player);
                if (message.player.id === this.playerId) {
                    this.gameManager.setLocalPlayer(message.player);
                }
                break;
                
            case 'player_left':
                this.gameManager.removePlayer(message.playerId);
                break;
                
            case 'world_update':
                this.gameManager.updateWorld(message.world);
                break;
                
            case 'slime_created':
                this.gameManager.addSlime(message.slime);
                break;
                
            case 'slime_moved':
                this.gameManager.moveSlime(message.slimeId, message.x, message.y);
                break;
                
            case 'slime_bred':
                this.gameManager.addSlime(message.newSlime);
                break;
        }
    }
    
    createSlime(x, y) {
        if (!this.connected) return;
        
        this.send({
            type: 'create_slime',
            x: x,
            y: y
        });
    }
    
    breedSlimes(slimeId1, slimeId2) {
        if (!this.connected) return;
        
        this.send({
            type: 'breed_slimes',
            slimeId1: slimeId1,
            slimeId2: slimeId2
        });
    }
    
    sendSlimeTarget(slimeId, x, y) {
        if (!this.connected) return;
        
        this.send({
            type: 'slime_target',
            slimeId: slimeId,
            x: x,
            y: y
        });
    }
    
    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        }
    }
} 