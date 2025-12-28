import Event from '../models/Event.js';

// Default event image marker - frontend will replace with local default.png
const DEFAULT_EVENT_IMAGE = 'default';

class EventController {
    // Create new event
    async createEvent(req, res) {
        try {
            console.log('📝 Creating event - Request body:', JSON.stringify(req.body, null, 2));
            console.log('👤 Admin info:', req.admin);
            
            const { eventName, description, date, eventType, status, imageUrl, referenceUrl } = req.body;
            
            // Validate required fields (imageUrl is optional - uses default if not provided)
            if (!eventName || !description || !date || !eventType) {
                console.log('❌ Validation failed - Missing fields:', {
                    eventName: !!eventName,
                    description: !!description,
                    date: !!date,
                    eventType: !!eventType
                });
                return res.status(400).json({ 
                    message: 'Missing required fields: eventName, description, date, eventType are required' 
                });
            }
            
            const eventData = {
                eventName,
                description,
                date,
                eventType,
                status: status || 'upcoming',
                imageUrl: imageUrl || DEFAULT_EVENT_IMAGE,
                ...(referenceUrl && { referenceUrl }),
                createdBy: req.admin?.id
            };
            
            console.log('📦 Event data to save:', JSON.stringify(eventData, null, 2));
            
            const newEvent = new Event(eventData);
            await newEvent.save();
            
            console.log('✅ Event saved successfully:', newEvent._id);
            
            // Return event in the format matching your data structure
            const eventResponse = {
                id: newEvent._id,
                eventName: newEvent.eventName,
                description: newEvent.description,
                date: newEvent.date,
                eventType: newEvent.eventType,
                status: newEvent.status,
                imageUrl: newEvent.imageUrl,
                ...(newEvent.referenceUrl && { referenceUrl: newEvent.referenceUrl })
            };
            
            res.status(201).json({ 
                message: 'Event created successfully', 
                event: eventResponse 
            });
        } catch (error) {
            console.error('❌ Error creating event:', error);
            res.status(500).json({ message: 'Error creating event', error: error.message });
        }
    }

    // Get all events - returns array of event objects
    async getAllEvents(req, res) {
        try {
            const events = await Event.find().sort({ date: -1 }); // Sort by date, newest first
            
            // Transform events to match your required format
            const eventsData = events.map(event => ({
                id: event._id,
                eventName: event.eventName,
                description: event.description,
                date: event.date,
                eventType: event.eventType,
                status: event.status,
                imageUrl: event.imageUrl,
                ...(event.referenceUrl && { referenceUrl: event.referenceUrl })
            }));
            
            res.status(200).json(eventsData);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching events', error: error.message });
        }
    }

    // Get events by status (past/upcoming)
    async getEventsByStatus(req, res) {
        try {
            const { status } = req.params;
            
            // Validate status parameter
            if (!['past', 'upcoming'].includes(status)) {
                return res.status(400).json({ 
                    message: 'Invalid status. Must be either "past" or "upcoming"' 
                });
            }
            
            const events = await Event.find({ status }).sort({ date: -1 });
            
            // Transform events to match your required format
            const eventsData = events.map(event => ({
                id: event._id,
                eventName: event.eventName,
                description: event.description,
                date: event.date,
                eventType: event.eventType,
                status: event.status,
                imageUrl: event.imageUrl,
                ...(event.referenceUrl && { referenceUrl: event.referenceUrl })
            }));
            
            res.status(200).json(eventsData);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching events', error: error.message });
        }
    }

    // Update event
    async updateEvent(req, res) {
        try {
            const { id } = req.params;
            const { eventName, description, date, eventType, status, imageUrl, referenceUrl } = req.body;
            
            // Prepare update data, only including provided fields
            const updateData = {};
            if (eventName) updateData.eventName = eventName;
            if (description) updateData.description = description;
            if (date) updateData.date = date;
            if (eventType) updateData.eventType = eventType;
            if (status) updateData.status = status;
            if (imageUrl) updateData.imageUrl = imageUrl;
            if (referenceUrl !== undefined) updateData.referenceUrl = referenceUrl; // Allow empty string to remove
            
            const updatedEvent = await Event.findByIdAndUpdate(id, updateData, { new: true });
            if (!updatedEvent) {
                return res.status(404).json({ message: 'Event not found' });
            }
            
            // Return updated event in the correct format
            const eventResponse = {
                id: updatedEvent._id,
                eventName: updatedEvent.eventName,
                description: updatedEvent.description,
                date: updatedEvent.date,
                eventType: updatedEvent.eventType,
                status: updatedEvent.status,
                imageUrl: updatedEvent.imageUrl,
                ...(updatedEvent.referenceUrl && { referenceUrl: updatedEvent.referenceUrl })
            };
            
            res.status(200).json({ 
                message: 'Event updated successfully', 
                event: eventResponse 
            });
        } catch (error) {
            res.status(500).json({ message: 'Error updating event', error: error.message });
        }
    }

    // Get single event by ID
    async getEventById(req, res) {
        try {
            const { id } = req.params;
            const event = await Event.findById(id);
            
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }
            
            // Transform event to match your required format
            const eventData = {
                id: event._id,
                eventName: event.eventName,
                description: event.description,
                date: event.date,
                eventType: event.eventType,
                status: event.status,
                imageUrl: event.imageUrl,
                ...(event.referenceUrl && { referenceUrl: event.referenceUrl })
            };
            
            res.status(200).json(eventData);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching event', error: error.message });
        }
    }

    // Delete event
    async deleteEvent(req, res) {
        try {
            const { id } = req.params;
            const deletedEvent = await Event.findByIdAndDelete(id);
            if (!deletedEvent) {
                return res.status(404).json({ message: 'Event not found' });
            }
            res.status(200).json({ message: 'Event deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Error deleting event', error: error.message });
        }
    }
}

export default new EventController();