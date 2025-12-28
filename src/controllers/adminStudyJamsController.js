import multer from 'multer';
import xlsx from 'xlsx';
import createError from 'http-errors';
// Corrected casing to match original
import StudyJamParticipant from '../models/StudyJamParticipant.js'; 
import SiteSettings from '../models/SiteSettings.js';

// --- Multer Configuration ---
// Set up multer for in-memory file storage
const storage = multer.memoryStorage();
export const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Accept only .xlsx and .csv files
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.mimetype === 'text/csv') {
            cb(null, true);
        } else {
            cb(new createError(400, 'Invalid file type. Only .xlsx and .csv files are allowed.'), false);
        }
    }
});

// --- (EXISTING) Controller for ENROLLING new participants ---
export const uploadStudyJams = async (req, res, next) => {
    try {
        // 1. Check if file exists
        if (!req.file) {
            console.error('File upload attempt with no file.');
            return next(createError(400, 'No file uploaded. Please attach a .csv or .xlsx file.'));
        }

        console.log(`Processing file: ${req.file.originalname} (${req.file.mimetype})`);

        // --- 2. Parse the file buffer ---
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // --- 3. Convert sheet to JSON ---
        const data = xlsx.utils.sheet_to_json(sheet, {
            raw: false, // Interpret dates and times as strings
            defval: null // Default value for blank cells
        });

        if (!data || data.length === 0) {
            console.warn('Uploaded file is empty or could not be parsed.');
            return next(createError(400, 'File is empty or data could not be read.'));
        }

        // --- 4. Validate and Clean Headers ---
        let originalHeaders = Object.keys(data[0]);
        let cleanedHeaders = originalHeaders.map(h => h.replace(/^\uFEFF/, '').trim());
        
        console.log('Detected headers (raw):', originalHeaders);
        console.log('Detected headers (cleaned):', cleanedHeaders);

        // We must now re-map the data to use the cleaned keys
        const cleanedData = data.map(row => {
            const newRow = {};
            Object.keys(row).forEach(originalKey => {
                const cleanedKey = originalKey.replace(/^\uFEFF/, '').trim();
                newRow[cleanedKey] = row[originalKey] ? String(row[originalKey]).trim() : null;
            });
            return newRow;
        });

        // Check for essential headers using the *cleaned* list
        if (!cleanedHeaders.includes('User Name') || !cleanedHeaders.includes('User Email')) {
            console.error('File headers validation failed. Missing "User Name" or "User Email".');
            return next(createError(400, 'File is missing required headers: "User Name" or "User Email".'));
        }

        // --- 5. Map data to MongoDB schema ---
        const operations = cleanedData.map(row => {
            const userName = row['User Name'];
            const userEmail = row['User Email'];
            const profileURL = row['Google Cloud Skills Boost Profile URL'];

            // Skip rows without an email
            if (!userEmail) {
                return null;
            }

            // Create the $set object with all fields from the CSV
            // This dynamically handles all columns you provided
            const updateData = {
                userName: userName,
                userEmail: userEmail,
                googleCloudSkillsBoostProfileURL: profileURL,
                // Add other fields from your CSV, converting headers to camelCase
                skillBadgesCompleted: row['# of Skill Badges Completed'] ? parseInt(row['# of Skill Badges Completed'], 10) : 0,
                arcadeGamesCompleted: row['# of Arcade Games Completed'] ? parseInt(row['# of Arcade Games Completed'], 10) : 0,
                team: row['Team'] ? parseInt(row['Team'], 10) : 0, // Ensure team is a number
                isLead: row['Lead'] ? (row['Lead'].toUpperCase() === 'Y' || row['Lead'].toUpperCase() === 'YES') : false,
                lastUpdated: new Date()
            };

            // Return the operation for bulkWrite
            return {
                updateOne: {
                    filter: { userEmail: userEmail }, // Use email as the unique identifier
                    update: { $set: updateData },
                    upsert: true // This will insert a new document if no email matches
                }
            };
        }).filter(op => op !== null); // Filter out any null rows

        if (operations.length === 0) {
            console.warn('No valid data rows found in the file.');
            return next(createError(400, 'No valid participant data found in the file. Check for empty rows or missing emails.'));
        }

        // --- 6. Execute bulk write to MongoDB ---
        console.log(`Attempting to process ${operations.length} operations...`);
        const result = await StudyJamParticipant.bulkWrite(operations);
        console.log('Bulk write successful:', result);

        // --- 7. Send success response ---
        const message = `Successfully processed ${operations.length} participants.`;
        res.status(200).json({
            success: true,
            message: message,
            results: {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
                upsertedCount: result.upsertedCount
            }
        });

    } catch (error) {
        // Handle errors
        console.error('Error in uploadStudyJams:', error);
        if (!error.status) {
            // If it's not a pre-made HTTP error, treat it as a server error
            next(createError(500, error.message || 'An internal server error occurred during file processing.'));
        } else {
            // Forward the pre-made error (e.g., from multer)
            next(error);
        }
    }
};


// --- (EXISTING) Controller for UPDATING participant progress ---
export const updateStudyJamsProgress = async (req, res, next) => {
    try {
        // 1. Check if file exists
        if (!req.file) {
            console.error('File upload attempt with no file.');
            return next(createError(400, 'No file uploaded. Please attach a .csv or .xlsx file.'));
        }

        console.log(`Processing progress file: ${req.file.originalname} (${req.file.mimetype})`);

        // --- 2. Parse the file buffer ---
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // --- 3. Convert sheet to JSON ---
        const data = xlsx.utils.sheet_to_json(sheet, {
            raw: false,
            defval: null
        });

        if (!data || data.length === 0) {
            console.warn('Uploaded progress file is empty or could not be parsed.');
            return next(createError(400, 'File is empty or data could not be read.'));
        }

        // --- 4. Validate and Clean Headers ---
        let originalHeaders = Object.keys(data[0]);
        let cleanedHeaders = originalHeaders.map(h => h.replace(/^\uFEFF/, '').trim());
        
        console.log('Detected headers (raw):', originalHeaders);
        console.log('Detected headers (cleaned):', cleanedHeaders);

        const cleanedData = data.map(row => {
            const newRow = {};
            Object.keys(row).forEach(originalKey => {
                const cleanedKey = originalKey.replace(/^\uFEFF/, '').trim();
                newRow[cleanedKey] = row[originalKey] ? String(row[originalKey]).trim() : null;
            });
            return newRow;
        });

        // Check for essential headers using the *cleaned* list
        // The progress report also has these headers
        if (!cleanedHeaders.includes('User Name') || !cleanedHeaders.includes('User Email')) {
            console.error('File headers validation failed. Missing "User Name" or "User Email".');
            return next(createError(400, 'File is missing required headers: "User Name" or "User Email".'));
        }

        // --- 5. Map data to MongoDB schema for UPDATE ONLY ---
        const operations = cleanedData.map(row => {
            const userEmail = row['User Email'];

            // Skip rows without an email
            if (!userEmail) {
                return null;
            }

            // Create the $set object with ONLY the fields to update
            const updateData = {
                skillBadgesCompleted: row['# of Skill Badges Completed'] ? parseInt(row['# of Skill Badges Completed'], 10) : 0,
                arcadeGamesCompleted: row['# of Arcade Games Completed'] ? parseInt(row['# of Arcade Games Completed'], 10) : 0,
                lastUpdated: new Date()
                // We intentionally do NOT include userName, team, isLead, etc.
                // This ensures we only update progress.
            };

            // Return the operation for bulkWrite
            return {
                updateOne: {
                    filter: { userEmail: userEmail }, // Use email as the unique identifier
                    update: { $set: updateData },
                    upsert: false // DO NOT create new users from a progress report
                }
            };
        }).filter(op => op !== null); // Filter out any null rows

        if (operations.length === 0) {
            console.warn('No valid data rows found in the progress file.');
            return next(createError(400, 'No valid participant data found in the file. Check for empty rows or missing emails.'));
        }

        // --- 6. Execute bulk write to MongoDB ---
        console.log(`Attempting to update progress for ${operations.length} operations...`);
        const result = await StudyJamParticipant.bulkWrite(operations);
        console.log('Bulk progress update successful:', result);

        // --- 7. Send success response ---
        const message = `Successfully updated progress for ${result.matchedCount} participants.`;
        res.status(200).json({
            success: true,
            message: message,
            results: {
                matchedCount: result.matchedCount, // How many users were found
                modifiedCount: result.modifiedCount, // How many users actually had their scores changed
                upsertedCount: result.upsertedCount // Will be 0, as upsert is false
            }
        });

    } catch (error) {
        // Handle errors
        console.error('Error in updateStudyJamsProgress:', error);
        if (!error.status) {
            next(createError(500, error.message || 'An internal server error occurred during file processing.'));
        } else {
            next(error);
        }
    }
};

// --- (UPDATED) Controller to GET selected participant data ---
// This function now groups data by team and includes team stats and rank.
export const getParticipantData = async (req, res, next) => {
    try {
        const aggregationPipeline = [
            // 1. Sort participants to prepare for grouping.
            // This ensures leads appear first and members are sorted by name.
            {
                $sort: {
                    team: 1,        // Sort by team number
                    isLead: -1,     // Sort leads (true) before members (false)
                    userName: 1     // Sort members by name
                }
            },
            // 2. Group all participants by their team number
            {
                $group: {
                    _id: "$team", // Group by the team number
                    // Push all pre-sorted participant documents into an array
                    participants: { $push: "$$ROOT" }, 
                    // Calculate team totals
                    totalSkillBadges: { $sum: "$skillBadgesCompleted" },
                    totalArcadeGames: { $sum: "$arcadeGamesCompleted" },
                    memberCount: { $sum: 1 }
                }
            },
            // 3. Calculate team totals, averages
            {
                $addFields: {
                    totalScore: { $add: ["$totalSkillBadges", "$totalArcadeGames"] },
                    // Safely calculate averages, avoiding division by zero
                    averageSkillBadges: { 
                        $cond: { 
                            if: { $eq: ["$memberCount", 0] }, 
                            then: 0, 
                            else: { $divide: ["$totalSkillBadges", "$memberCount"] }
                        } 
                    },
                    averageArcadeGames: { 
                        $cond: { 
                            if: { $eq: ["$memberCount", 0] }, 
                            then: 0, 
                            else: { $divide: ["$totalArcadeGames", "$memberCount"] }
                        } 
                    }
                }
            },
            // 4. Add the team's rank based on its totalScore
            {
                $setWindowFields: {
                    partitionBy: null, // Partition by null to rank across all teams
                    sortBy: { totalScore: -1 }, // Rank highest score first
                    output: {
                        teamRank: { $denseRank: {} } // Assign rank
                    }
                }
            },
            // 5. Sort by team number (which is the _id at this stage)
            {
                $sort: { _id: 1 }
            },
            // 6. Reshape the output to be clean and separate leads/members
            {
                $project: {
                    _id: 0, // Exclude the group _id
                    team: { $toString: "$_id" }, // Convert team number back to string
                    teamRank: 1,
                    totalScore: 1,
                    memberCount: 1,
                    // Round averages to 2 decimal places
                    averageSkillBadges: { $round: ["$averageSkillBadges", 2] },
                    averageArcadeGames: { $round: ["$averageArcadeGames", 2] },
                    totalSkillBadges: 1,
                    totalArcadeGames: 1,
                    // Find the first participant (who is a lead, thanks to $sort)
                    lead: {
                        $arrayElemAt: [
                            { $filter: { input: "$participants", as: "p", cond: { $eq: ["$$p.isLead", true] } } }, 0
                        ]
                    },
                    // Create an array of all participants who are not leads
                    members: {
                        $filter: {
                            input: "$participants",
                            as: "p",
                            cond: { $eq: ["$$p.isLead", false] }
                        }
                    }
                }
            }
        ];

        const teams = await StudyJamParticipant.aggregate(aggregationPipeline);

        // Handle cases where a "lead" might not be found (e.g., team has no lead)
        teams.forEach(team => {
            if (!team.lead) {
                team.lead = null; // Set lead to null if no lead was found
            }
        });

        res.status(200).json({
            success: true,
            count: teams.length, // This is now the count of *teams*
            data: teams // The data is now the array of grouped teams
        });

    } catch (error) {
        console.error('Error in getParticipantData:', error);
        // Use createError for consistency
        next(createError(500, error.message || 'An internal server error occurred while retrieving participants.'));
    }
};


// --- (NEW) Controller for DELETING a single participant ---
export const deleteParticipant = async (req, res, next) => {
    try {
        const { email } = req.params;
        
        // Check if email parameter is provided
        if (!email) {
            return next(createError(400, 'User email is required as a URL parameter.'));
        }

        // Find and delete the participant by their email
        const result = await StudyJamParticipant.findOneAndDelete({ userEmail: email });

        // Check if a participant was actually found and deleted
        if (!result) {
            return next(createError(404, 'Participant not found with that email.'));
        }

        // Send success response
        res.status(200).json({
            success: true,
            message: 'Participant successfully deleted.',
            deletedParticipant: result
        });

    } catch (error) {
        // Handle errors
        console.error('Error in deleteParticipant:', error);
        next(createError(500, error.message || 'An internal server error occurred while deleting the participant.'));
    }
};

// --- (NEW) Controller for DELETING ALL participants ---
export const deleteAllParticipants = async (req, res, next) => {
    try {
        // Delete all documents from the collection
        const result = await StudyJamParticipant.deleteMany({});

        // Send success response
        res.status(200).json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} participants. The collection is now empty.`,
            deletedCount: result.deletedCount
        });

    } catch (error) {
        // Handle errors
        console.error('Error in deleteAllParticipants:', error);
        next(createError(500, error.message || 'An internal server error occurred while clearing participants.'));
    }
};

// --- Study Jams Visibility Settings ---

/**
 * GET /api/admin/studyjams-visibility
 * Get the current visibility setting for Study Jams in navbar (public endpoint)
 */
export const getStudyJamsVisibility = async (req, res, next) => {
    try {
        const isVisible = await SiteSettings.getSetting('studyJamsNavbarVisible', true);
        res.status(200).json({
            success: true,
            visible: isVisible
        });
    } catch (error) {
        console.error('Error getting Study Jams visibility:', error);
        next(createError(500, 'Failed to retrieve Study Jams visibility setting.'));
    }
};

/**
 * POST /api/admin/studyjams-visibility
 * Set the visibility of Study Jams in navbar (admin only)
 */
export const setStudyJamsVisibility = async (req, res, next) => {
    try {
        console.log('📝 setStudyJamsVisibility called');
        console.log('📝 Request body:', JSON.stringify(req.body));
        console.log('📝 Admin from request:', JSON.stringify(req.admin));
        console.log('📝 Content-Type:', req.headers['content-type']);
        
        const { visible } = req.body;
        
        console.log('📝 Parsed visible value:', visible, 'Type:', typeof visible);
        
        if (typeof visible !== 'boolean') {
            console.log('❌ Invalid visible value:', visible, typeof visible);
            return res.status(400).json({
                success: false,
                message: `Invalid request. "visible" must be a boolean value. Received: ${typeof visible}`
            });
        }

        const adminEmail = req.admin?.email || req.admin?.username || 'admin';
        console.log('📝 Admin email for update:', adminEmail);
        
        console.log('📝 About to call SiteSettings.setSetting...');
        const result = await SiteSettings.setSetting(
            'studyJamsNavbarVisible',
            visible,
            'Controls whether Study Jams link is visible in the navbar',
            adminEmail
        );
        
        console.log('✅ Setting saved successfully:', JSON.stringify(result));

        res.status(200).json({
            success: true,
            message: `Study Jams navbar visibility set to ${visible ? 'visible' : 'hidden'}.`,
            visible: visible
        });
    } catch (error) {
        console.error('❌ Error setting Study Jams visibility:', error.message);
        console.error('❌ Full error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update Study Jams visibility setting.',
            error: error.message
        });
    }
};

