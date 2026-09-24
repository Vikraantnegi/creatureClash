import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTrainerRepository } from './repository';

export const trainerRepository = createTrainerRepository(AsyncStorage);
