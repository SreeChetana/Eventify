const Event = require('../models/Event');

// @desc    Get all events (with optional search/filter)
// @route   GET /api/events
// @access  Public
const getEvents = async (req, res, next) => {
  try {
    const { search, category } = req.query;
    let query = {};

    // Search by title or location
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by category
    if (category && category !== 'All') {
      query.category = category;
    }

    const events = await Event.find(query)
      .populate('createdBy', 'name email')
      .sort({ date: 1 }); // Soonest first

    res.json(events);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public
const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('createdBy', 'name email');

    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    res.json(event);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new event
// @route   POST /api/events
// @access  Private
const createEvent = async (req, res, next) => {
  try {
    const { title, description, date, location, category } = req.body;

    // If an image was uploaded, store its path
    const image = req.file ? `/uploads/${req.file.filename}` : '';

    const event = await Event.create({
      title,
      description,
      date,
      location,
      category,
      image,
      createdBy: req.user._id,
    });

    const populated = await event.populate('createdBy', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private (owner only)
const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    // Ensure the logged-in user owns the event
    if (event.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this event');
    }

    const { title, description, date, location, category } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : event.image;

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      { title, description, date, location, category, image },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Private (owner only)
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    // Ensure the logged-in user owns the event
    if (event.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this event');
    }

    await event.deleteOne();
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get events created by the logged-in user
// @route   GET /api/events/my-events
// @access  Private
const getMyEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ createdBy: req.user._id })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    next(error);
  }
};

module.exports = { getEvents, getEventById, createEvent, updateEvent, deleteEvent, getMyEvents };