class Slime {
    constructor(id, playerId, x, y, color, size = 30) {
        this.id = id;
        this.playerId = playerId;
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.selected = false;
        this.targetX = null;
        this.targetY = null;
        this.speed = 100; // pixels per second
    }
    
    update(deltaTime) {
        // Move towards target if one exists
        if (this.targetX !== null && this.targetY !== null) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 1) {
                // Close enough to target, stop moving
                this.x = this.targetX;
                this.y = this.targetY;
                this.targetX = null;
                this.targetY = null;
            } else {
                // Move towards target
                const moveDistance = Math.min(distance, this.speed * deltaTime);
                const angle = Math.atan2(dy, dx);
                this.x += Math.cos(angle) * moveDistance;
                this.y += Math.sin(angle) * moveDistance;
            }
        }
    }
    
    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }
    
    toggleSelection() {
        this.selected = !this.selected;
        return this.selected;
    }
    
    deselect() {
        this.selected = false;
    }
}
