const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    // Group name (optional, can be auto-generated)
    name: {
        type: String,
        default: function() {
            return `Family ${this._id.toString().slice(-6).toUpperCase()}`;
        }
    },
    
    // Caretaker who created this group
    caretaker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Client(s) in this group
    clients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    // Group settings
    settings: {
        medicationReminderInterval: {
            type: Number,
            default: 5  // minutes
        },
        missedDoseThreshold: {
            type: Number,
            default: 30  // minutes after scheduled time
        },
        emergencyAlertEnabled: {
            type: Boolean,
            default: true
        }
    },
    
    // Active status
    isActive: {
        type: Boolean,
        default: true
    }
    
}, { timestamps: true });

// Index for efficient queries
groupSchema.index({ caretaker: 1 });
groupSchema.index({ clients: 1 });

// Instance method: Add client to group
groupSchema.methods.addClient = async function(clientId) {
    if (!this.clients.includes(clientId)) {
        this.clients.push(clientId);
        await this.save();
    }
    return this;
};

// Instance method: Remove client from group
groupSchema.methods.removeClient = async function(clientId) {
    this.clients = this.clients.filter(id => !id.equals(clientId));
    await this.save();
    return this;
};

// Static method: Get group members
groupSchema.statics.getMembers = async function(groupId) {
    const group = await this.findById(groupId)
        .populate('caretaker', 'name email role')
        .populate('clients', 'name email role');
    
    return {
        caretaker: group.caretaker,
        clients: group.clients,
        allMembers: [group.caretaker, ...group.clients]
    };
};

module.exports = mongoose.model('Group', groupSchema);
