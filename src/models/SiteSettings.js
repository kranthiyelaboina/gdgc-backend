import mongoose from 'mongoose';

const siteSettingsSchema = new mongoose.Schema({
    settingKey: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    settingValue: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    lastUpdatedBy: {
        type: String,
        default: 'system'
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

siteSettingsSchema.statics.getSetting = async function(key, defaultValue = null) {
    const setting = await this.findOne({ settingKey: key });
    return setting ? setting.settingValue : defaultValue;
};

siteSettingsSchema.statics.setSetting = async function(key, value, description = '', updatedBy = 'system') {
    console.log('🔧 SiteSettings.setSetting called with:', { key, value, description, updatedBy });
    try {
        const result = await this.findOneAndUpdate(
            { settingKey: key },
            { 
                settingValue: value, 
                description: description,
                lastUpdatedBy: updatedBy,
                lastUpdated: new Date()
            },
            { upsert: true, new: true, runValidators: true }
        );
        console.log('🔧 SiteSettings.setSetting result:', result);
        return result;
    } catch (error) {
        console.error('🔧 SiteSettings.setSetting error:', error);
        throw error;
    }
};

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

export default SiteSettings;
