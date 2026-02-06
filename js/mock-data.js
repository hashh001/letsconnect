/**
 * Mock Data for ECA-Connect
 */

const currentUser = {
    id: 'u1',
    name: 'John Doe',
    location: { lat: 28.6139, lng: 77.2090 }, // India Gate, Delhi

    // Search preferences
    radius: 5, // Default search radius in km

    // Interests
    interests: ['Badminton', 'Coding', 'Hiking'],

    // Skill levels per interest
    skillLevels: {
        'Badminton': 'intermediate',
        'Coding': 'intermediate',
        'Hiking': 'beginner'
    },

    // Availability windows (when user is free)
    availability: [
        { day: 'Saturday', startTime: '18:00', endTime: '21:00' }, // 6-9 PM
        { day: 'Sunday', startTime: '09:00', endTime: '13:00' }    // 9 AM - 1 PM
    ],

    // Language preferences
    preferredLanguages: ['English', 'Hindi'],

    // Optional preferences
    preferredGender: null // null = no preference
};

const mockGroups = [
    {
        id: 'g1',
        name: 'Evening Badminton',
        category: 'Sports',
        description: 'Looking for intermediate players for a quick match.',
        imageColor: '#10B981', // Emerald

        // Interest tags for matching
        tags: ['Badminton', 'Sports', 'Fitness'],

        // Skill requirement
        skillLevel: 'intermediate',

        // Privacy setting
        privacy: 'Open', // Open, Approval, or Invite

        // Language
        language: 'English',

        // Schedule
        schedule: {
            recurring: true,
            frequency: 'Weekly',
            dayOfWeek: 'Saturday',
            startTime: '18:30',
            endTime: '20:30'
        },

        // Legacy fields (keep for compatibility)
        day: 'Saturday',
        startTime: '18:30',
        endTime: '20:30',

        // Location
        location: { lat: 28.6200, lng: 77.2167 }, // Connaught Place, ~1km from India Gate
        locationName: 'Connaught Place Sports Complex',

        // Health metrics (activity indicators)
        healthMetrics: {
            messagesPerDay: 45,
            eventsPerMonth: 8,
            averageAttendance: 10,
            lastActivityDate: new Date('2026-02-04')
        },

        // Legacy compatibility fields
        matchScore: 98,
        distance: 1.2,
        members: 12,
        nextSession: 'Sat, 6:30 PM'
    },
    {
        id: 'g2',
        name: 'Coffee & Code',
        category: 'Education',
        description: 'Casual coding session at Starbucks.',
        imageColor: '#6366F1', // Indigo

        tags: ['Coding', 'Programming', 'Tech', 'Education'],
        skillLevel: 'beginner',
        privacy: 'Open',
        language: 'English',

        schedule: {
            recurring: true,
            frequency: 'Weekly',
            dayOfWeek: 'Saturday',
            startTime: '19:00',
            endTime: '21:00'
        },

        day: 'Saturday',
        startTime: '19:00',
        endTime: '21:00',
        location: { lat: 28.5355, lng: 77.3910 }, // Noida Sector 18, ~20km
        locationName: 'Starbucks, Noida Sector 18',

        healthMetrics: {
            messagesPerDay: 12,
            eventsPerMonth: 4,
            averageAttendance: 4,
            lastActivityDate: new Date('2026-02-03')
        },

        matchScore: 85,
        distance: 20.5,
        members: 5,
        nextSession: 'Sat, 7:00 PM'
    },
    {
        id: 'g3',
        name: 'Sunday Hiking',
        category: 'Sports',
        description: 'Easy trail hike for beginners.',
        imageColor: '#F59E0B', // Amber

        tags: ['Hiking', 'Outdoors', 'Nature', 'Fitness'],
        skillLevel: 'beginner',
        privacy: 'Open',
        language: 'English',

        schedule: {
            recurring: true,
            frequency: 'Weekly',
            dayOfWeek: 'Sunday',
            startTime: '09:00',
            endTime: '12:00'
        },

        day: 'Sunday',
        startTime: '09:00',
        endTime: '12:00',
        location: { lat: 28.4595, lng: 77.0266 }, // Gurgaon, ~30km
        locationName: 'Aravalli Biodiversity Park, Gurgaon',

        healthMetrics: {
            messagesPerDay: 25,
            eventsPerMonth: 4,
            averageAttendance: 15,
            lastActivityDate: new Date('2026-02-02')
        },

        matchScore: 40,
        distance: 28.5,
        members: 20,
        nextSession: 'Sun, 9:00 AM'
    },
    {
        id: 'g4',
        name: 'Board Game Night',
        category: 'Social',
        description: 'Catan, Ticket to Ride, and more!',
        imageColor: '#EC4899', // Pink

        tags: ['Board Games', 'Social', 'Gaming', 'Fun'],
        skillLevel: 'beginner',
        privacy: 'Open',
        language: 'English',

        schedule: {
            recurring: true,
            frequency: 'Weekly',
            dayOfWeek: 'Friday',
            startTime: '19:00',
            endTime: '23:00'
        },

        day: 'Friday',
        startTime: '19:00',
        endTime: '23:00',
        location: { lat: 28.6280, lng: 77.2200 }, // Kashmere Gate, ~2km
        locationName: 'The Game Cafe, Kashmere Gate',

        healthMetrics: {
            messagesPerDay: 8,
            eventsPerMonth: 4,
            averageAttendance: 6,
            lastActivityDate: new Date('2026-01-30')
        },

        matchScore: 65,
        distance: 2.1,
        members: 8,
        nextSession: 'Fri, 7:00 PM'
    },
    {
        id: 'g5',
        name: 'Advanced Tennis Club',
        category: 'Sports',
        description: 'Competitive tennis for advanced players only.',
        imageColor: '#14B8A6', // Teal

        tags: ['Tennis', 'Sports', 'Competitive'],
        skillLevel: 'advanced',
        privacy: 'Approval',
        language: 'English',

        schedule: {
            recurring: true,
            frequency: 'Weekly',
            dayOfWeek: 'Saturday',
            startTime: '17:00',
            endTime: '19:00'
        },

        day: 'Saturday',
        startTime: '17:00',
        endTime: '19:00',
        location: { lat: 28.6100, lng: 77.2300 }, // Near India Gate, ~3km
        locationName: 'Delhi Lawn Tennis Association',

        healthMetrics: {
            messagesPerDay: 30,
            eventsPerMonth: 8,
            averageAttendance: 8,
            lastActivityDate: new Date('2026-02-05')
        },

        matchScore: 35,
        distance: 3.2,
        members: 10,
        nextSession: 'Sat, 5:00 PM'
    },
    {
        id: 'g6',
        name: 'Morning Yoga & Meditation',
        category: 'Wellness',
        description: 'Start your Sunday with peaceful yoga and meditation.',
        imageColor: '#8B5CF6', // Purple

        tags: ['Yoga', 'Meditation', 'Wellness', 'Mindfulness'],
        skillLevel: 'beginner',
        privacy: 'Open',
        language: 'Hindi',

        schedule: {
            recurring: true,
            frequency: 'Weekly',
            dayOfWeek: 'Sunday',
            startTime: '07:00',
            endTime: '08:30'
        },

        day: 'Sunday',
        startTime: '07:00',
        endTime: '08:30',
        location: { lat: 28.6150, lng: 77.2100 }, // Very close, ~0.5km
        locationName: 'Lodhi Garden',

        healthMetrics: {
            messagesPerDay: 18,
            eventsPerMonth: 4,
            averageAttendance: 12,
            lastActivityDate: new Date('2026-02-04')
        },

        matchScore: 20,
        distance: 0.6,
        members: 15,
        nextSession: 'Sun, 7:00 AM'
    }
];

export { currentUser, mockGroups };
