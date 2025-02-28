class Player {
    constructor(id, name, color) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.slimes = [];
    }
    
    addSlime(slimeId) {
        if (!this.slimes.includes(slimeId)) {
            this.slimes.push(slimeId);
        }
    }
    
    removeSlime(slimeId) {
        const index = this.slimes.indexOf(slimeId);
        if (index !== -1) {
            this.slimes.splice(index, 1);
        }
    }
}
