class Renderer {
    constructor(canvas) {
        console.log('Renderer constructor called');
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        console.log('Canvas context created:', this.ctx ? 'success' : 'failed');
    }
    
    renderWorld(world) {
        // console.log('Rendering world, slime count:', Object.keys(world.slimes || {}).length);
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw slimes
        for (const slimeId in world.slimes) {
            const slime = world.slimes[slimeId];
            // console.log('Rendering slime:', slimeId, 'at', slime.x, slime.y);
            this.renderSlime(slime);
        }
    }
    
    renderSlime(slime) {
        if (!slime) {
            console.error('Attempted to render undefined slime');
            return;
        }
        
        const ctx = this.ctx;
        
        // Draw body
        ctx.beginPath();
        ctx.arc(slime.x, slime.y, slime.size, 0, Math.PI * 2);
        ctx.fillStyle = slime.color;
        ctx.fill();
        
        // Draw outline
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw eyes
        const eyeSize = slime.size * 0.2;
        const eyeOffset = slime.size * 0.3;
        
        // Left eye
        ctx.beginPath();
        ctx.arc(slime.x - eyeOffset, slime.y - eyeOffset, eyeSize, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(slime.x - eyeOffset, slime.y - eyeOffset, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        
        // Right eye
        ctx.beginPath();
        ctx.arc(slime.x + eyeOffset, slime.y - eyeOffset, eyeSize, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(slime.x + eyeOffset, slime.y - eyeOffset, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        
        // Draw selection indicator if selected
        if (slime.selected) {
            ctx.beginPath();
            ctx.arc(slime.x, slime.y, slime.size + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        
        // Draw target if moving
        if (slime.targetX !== null && slime.targetY !== null) {
            ctx.beginPath();
            ctx.arc(slime.targetX, slime.targetY, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(slime.x, slime.y);
            ctx.lineTo(slime.targetX, slime.targetY);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}
