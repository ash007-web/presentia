import { Student, Presentation, Cycle, Settings, Timetable, Override } from './src/models/index.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    await Presentation.deleteMany({});
    
    let cycles = await Cycle.find();
    if (cycles.length === 0) {
      const newCycle = await Cycle.create({ cycleNumber: 1, semester: 'Semester 1', startDate: new Date() });
      cycles = [newCycle];
    }
    const cycle = cycles[cycles.length - 1]; // Keep latest
    await Cycle.deleteMany({ _id: { $ne: cycle._id } });
    const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
    if (settings) {
        settings.currentCycle = cycle._id;
        settings.activeSession = {
            state: 'Idle',
            presentation: null,
            accumulatedTime: 0,
            lastUnpausedAt: null
        };
        await settings.save();
    }
    console.log('Reset complete');
    process.exit(0);
}).catch(console.error);
