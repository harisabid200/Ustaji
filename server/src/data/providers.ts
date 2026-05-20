import { Provider } from '../utils/types';

// Islamabad sector coordinates for realistic distances
const LOCATIONS: Record<string, { lat: number; lng: number }> = {
  'G-11': { lat: 33.6844, lng: 72.9906 },
  'G-13': { lat: 33.6651, lng: 72.9648 },
  'G-9':  { lat: 33.6938, lng: 73.0103 },
  'F-6':  { lat: 33.7294, lng: 73.0631 },
  'F-8':  { lat: 33.7100, lng: 73.0350 },
  'F-10': { lat: 33.6975, lng: 73.0156 },
  'I-8':  { lat: 33.6700, lng: 73.0700 },
  'I-10': { lat: 33.6550, lng: 73.0400 },
  'E-11': { lat: 33.6900, lng: 72.9800 },
  'H-13': { lat: 33.6500, lng: 72.9700 },
  'Blue Area': { lat: 33.7150, lng: 73.0550 },
  'Rawalpindi': { lat: 33.5651, lng: 73.0169 },
  // Major Pakistan Cities
  'Lahore': { lat: 31.5204, lng: 74.3587 },
  'Karachi': { lat: 24.8607, lng: 67.0011 },
  'Peshawar': { lat: 34.0151, lng: 71.5249 },
  'Quetta': { lat: 30.1798, lng: 66.9750 },
};

export const mockProviders: Provider[] = [
  {
    id: 'prov-001', name: 'Ahmed Khan', phone: '+92-300-1234567',
    location: { ...LOCATIONS['G-11'], area: 'G-11', city: 'Islamabad', formatted_address: 'G-11 Markaz, Islamabad' },
    service_types: ['ac_repair', 'ac_installation'],
    skills: ['split_ac', 'window_ac', 'central_ac', 'gas_refill', 'compressor_repair'],
    certifications: ['HVAC Certified', 'Daikin Authorized'],
    experience_years: 12, gender: 'male', verified: true, max_jobs_per_day: 4,
    languages: ['urdu', 'english'],
    availability: {
      monday: ['09:00-13:00', '14:00-18:00'], tuesday: ['09:00-13:00', '14:00-18:00'],
      wednesday: ['09:00-13:00', '14:00-18:00'], thursday: ['09:00-13:00', '14:00-18:00'],
      friday: ['14:00-18:00'], saturday: ['09:00-14:00'], sunday: [],
    },
    rate_card: { ac_general_service: 2000, ac_gas_refill: 3500, ac_installation: 5000, ac_compressor: 8000 },
    stats: { total_jobs: 342, completed_jobs: 335, on_time_percentage: 95, cancellation_rate: 2, avg_rating: 4.8, rating_count: 280 },
    reviews: [
      { id: 'r1', user_name: 'Ali R.', rating: 5, text: 'Best AC technician! Fixed my split AC in 30 minutes.', service_category: 'ac_repair', sentiment_score: 0.95, created_at: '2026-05-10' },
      { id: 'r2', user_name: 'Sara K.', rating: 5, text: 'Very professional, arrived on time. Highly recommend for AC issues.', service_category: 'ac_repair', sentiment_score: 0.92, created_at: '2026-05-08' },
      { id: 'r3', user_name: 'Usman T.', rating: 4, text: 'Good work, slightly expensive but quality is there.', service_category: 'ac_installation', sentiment_score: 0.7, created_at: '2026-05-01' },
    ],
    bio: 'Daikin authorized AC specialist with 12 years experience in Islamabad.',
  },
  {
    id: 'prov-002', name: 'Bilal Hussain', phone: '+92-301-2345678',
    location: { ...LOCATIONS['G-13'], area: 'G-13', city: 'Islamabad', formatted_address: 'G-13/1, Islamabad' },
    service_types: ['ac_repair', 'electrical', 'home_appliance'],
    skills: ['split_ac', 'window_ac', 'wiring', 'fan_repair', 'washing_machine'],
    certifications: [], experience_years: 5, gender: 'male', verified: true, max_jobs_per_day: 5,
    languages: ['urdu', 'punjabi'],
    availability: {
      monday: ['08:00-18:00'], tuesday: ['08:00-18:00'], wednesday: ['08:00-18:00'],
      thursday: ['08:00-18:00'], friday: ['08:00-12:00'], saturday: ['08:00-16:00'], sunday: ['10:00-14:00'],
    },
    rate_card: { ac_general_service: 1500, ac_gas_refill: 2800, electrical_wiring: 1200, appliance_repair: 1000 },
    stats: { total_jobs: 180, completed_jobs: 165, on_time_percentage: 78, cancellation_rate: 8, avg_rating: 3.9, rating_count: 120 },
    reviews: [
      { id: 'r4', user_name: 'Hamza M.', rating: 4, text: 'Affordable and gets the job done.', service_category: 'ac_repair', sentiment_score: 0.65, created_at: '2026-05-12' },
      { id: 'r5', user_name: 'Fatima N.', rating: 2, text: 'Came late and had to reschedule. Not reliable.', service_category: 'electrical', sentiment_score: 0.2, created_at: '2026-05-05' },
      { id: 'r6', user_name: 'Zain A.', rating: 5, text: 'Fixed my washing machine cheaply. Good value.', service_category: 'home_appliance', sentiment_score: 0.88, created_at: '2026-04-20' },
    ],
    bio: 'General handyman covering AC, electrical, and home appliances.',
  },
  {
    id: 'prov-003', name: 'Rashid Mehmood', phone: '+92-302-3456789',
    location: { ...LOCATIONS['F-8'], area: 'F-8', city: 'Islamabad', formatted_address: 'F-8/3, Islamabad' },
    service_types: ['plumbing'],
    skills: ['pipe_repair', 'tap_fix', 'toilet_repair', 'water_heater', 'drainage'],
    certifications: ['Master Plumber'], experience_years: 18, gender: 'male', verified: true, max_jobs_per_day: 5,
    languages: ['urdu', 'english', 'pashto'],
    availability: {
      monday: ['07:00-17:00'], tuesday: ['07:00-17:00'], wednesday: ['07:00-17:00'],
      thursday: ['07:00-17:00'], friday: ['14:00-17:00'], saturday: ['08:00-14:00'], sunday: [],
    },
    rate_card: { plumbing_tap_fix: 800, plumbing_pipe: 2000, plumbing_drainage: 2500, plumbing_toilet: 1500, plumbing_heater: 3000 },
    stats: { total_jobs: 520, completed_jobs: 510, on_time_percentage: 92, cancellation_rate: 1.5, avg_rating: 4.7, rating_count: 400 },
    reviews: [
      { id: 'r7', user_name: 'Imran S.', rating: 5, text: 'Excellent plumber. Fixed a major leak in no time.', service_category: 'plumbing', sentiment_score: 0.95, created_at: '2026-05-11' },
      { id: 'r8', user_name: 'Nadia B.', rating: 5, text: 'Very experienced, fair pricing.', service_category: 'plumbing', sentiment_score: 0.9, created_at: '2026-05-03' },
    ],
    bio: '18 years master plumber serving F-sectors and G-sectors.',
  },
  {
    id: 'prov-004', name: 'Tariq Aziz', phone: '+92-303-4567890',
    location: { ...LOCATIONS['I-8'], area: 'I-8', city: 'Islamabad', formatted_address: 'I-8/2, Islamabad' },
    service_types: ['electrical'],
    skills: ['wiring', 'panel_installation', 'ups_repair', 'generator', 'smart_home'],
    certifications: ['Licensed Electrician', 'Solar Panel Certified'], experience_years: 15, gender: 'male', verified: true, max_jobs_per_day: 3,
    languages: ['urdu', 'english'],
    availability: {
      monday: ['09:00-17:00'], tuesday: ['09:00-17:00'], wednesday: ['09:00-17:00'],
      thursday: ['09:00-17:00'], friday: ['09:00-12:00'], saturday: ['10:00-15:00'], sunday: [],
    },
    rate_card: { electrical_wiring: 2000, electrical_panel: 5000, electrical_ups: 3000, electrical_generator: 4000 },
    stats: { total_jobs: 290, completed_jobs: 285, on_time_percentage: 96, cancellation_rate: 1, avg_rating: 4.9, rating_count: 250 },
    reviews: [
      { id: 'r9', user_name: 'Kashif R.', rating: 5, text: 'Top-notch electrician. Did full house rewiring flawlessly.', service_category: 'electrical', sentiment_score: 0.97, created_at: '2026-05-09' },
    ],
    bio: 'Licensed electrician specializing in smart home and solar systems.',
  },
  {
    id: 'prov-005', name: 'Kamran Shah', phone: '+92-304-5678901',
    location: { ...LOCATIONS['G-9'], area: 'G-9', city: 'Islamabad', formatted_address: 'G-9 Markaz, Islamabad' },
    service_types: ['ac_repair', 'ac_installation'],
    skills: ['split_ac', 'inverter_ac', 'gas_refill'],
    certifications: [], experience_years: 3, gender: 'male', verified: false, max_jobs_per_day: 6,
    languages: ['urdu'],
    availability: {
      monday: ['08:00-20:00'], tuesday: ['08:00-20:00'], wednesday: ['08:00-20:00'],
      thursday: ['08:00-20:00'], friday: ['08:00-20:00'], saturday: ['08:00-20:00'], sunday: ['10:00-18:00'],
    },
    rate_card: { ac_general_service: 1200, ac_gas_refill: 2500, ac_installation: 3500 },
    stats: { total_jobs: 85, completed_jobs: 72, on_time_percentage: 70, cancellation_rate: 15, avg_rating: 3.5, rating_count: 50 },
    reviews: [
      { id: 'r10', user_name: 'Waqas H.', rating: 2, text: 'Cancelled on me twice. Very unreliable.', service_category: 'ac_repair', sentiment_score: 0.1, created_at: '2026-05-13' },
      { id: 'r11', user_name: 'Sana M.', rating: 4, text: 'Cheap rates, decent work for basic service.', service_category: 'ac_repair', sentiment_score: 0.65, created_at: '2026-04-28' },
    ],
    bio: 'Budget-friendly AC technician available all week.',
  },
  {
    id: 'prov-006', name: 'Ayesha Malik', phone: '+92-305-6789012',
    location: { ...LOCATIONS['F-6'], area: 'F-6', city: 'Islamabad', formatted_address: 'F-6/1, Islamabad' },
    service_types: ['beauty', 'cleaning'],
    skills: ['bridal_makeup', 'facial', 'hair_styling', 'mehndi', 'deep_cleaning'],
    certifications: ['Certified Beautician'], experience_years: 8, gender: 'female', verified: true, max_jobs_per_day: 3,
    languages: ['urdu', 'english'],
    availability: {
      monday: ['10:00-18:00'], tuesday: ['10:00-18:00'], wednesday: ['10:00-18:00'],
      thursday: ['10:00-18:00'], friday: [], saturday: ['10:00-20:00'], sunday: ['12:00-18:00'],
    },
    rate_card: { beauty_facial: 2000, beauty_bridal: 15000, beauty_hair: 3000, beauty_mehndi: 5000, cleaning_deep: 4000 },
    stats: { total_jobs: 200, completed_jobs: 198, on_time_percentage: 98, cancellation_rate: 1, avg_rating: 4.9, rating_count: 180 },
    reviews: [
      { id: 'r12', user_name: 'Hira Z.', rating: 5, text: 'Amazing bridal makeup! Everyone loved it.', service_category: 'beauty', sentiment_score: 0.98, created_at: '2026-05-07' },
    ],
    bio: 'Professional beautician specializing in bridal services.',
  },
  {
    id: 'prov-007', name: 'Faisal Iqbal', phone: '+92-306-7890123',
    location: { ...LOCATIONS['I-10'], area: 'I-10', city: 'Islamabad', formatted_address: 'I-10/4, Islamabad' },
    service_types: ['carpentry', 'painting'],
    skills: ['furniture_repair', 'kitchen_cabinets', 'door_fix', 'wall_painting', 'wood_polish'],
    certifications: [], experience_years: 10, gender: 'male', verified: true, max_jobs_per_day: 2,
    languages: ['urdu', 'punjabi'],
    availability: {
      monday: ['08:00-17:00'], tuesday: ['08:00-17:00'], wednesday: ['08:00-17:00'],
      thursday: ['08:00-17:00'], friday: ['14:00-17:00'], saturday: ['08:00-14:00'], sunday: [],
    },
    rate_card: { carpentry_repair: 2500, carpentry_cabinets: 8000, painting_room: 5000, painting_full: 25000 },
    stats: { total_jobs: 150, completed_jobs: 145, on_time_percentage: 85, cancellation_rate: 3, avg_rating: 4.4, rating_count: 100 },
    reviews: [
      { id: 'r13', user_name: 'Omar F.', rating: 4, text: 'Good carpenter, takes a bit long but quality work.', service_category: 'carpentry', sentiment_score: 0.72, created_at: '2026-05-06' },
    ],
    bio: 'Furniture repair and home painting specialist.',
  },
  {
    id: 'prov-008', name: 'Hassan Ali', phone: '+92-307-8901234',
    location: { ...LOCATIONS['G-13'], area: 'G-13', city: 'Islamabad', formatted_address: 'G-13/2, Islamabad' },
    service_types: ['ac_repair'],
    skills: ['split_ac', 'window_ac', 'gas_refill', 'pcb_repair'],
    certifications: ['Haier Authorized Technician'], experience_years: 7, gender: 'male', verified: true, max_jobs_per_day: 5,
    languages: ['urdu', 'english'],
    availability: {
      monday: ['08:00-17:00'], tuesday: ['08:00-17:00'], wednesday: ['08:00-17:00'],
      thursday: ['08:00-17:00'], friday: ['14:00-17:00'], saturday: ['09:00-15:00'], sunday: [],
    },
    rate_card: { ac_general_service: 1800, ac_gas_refill: 3200, ac_pcb_repair: 4500 },
    stats: { total_jobs: 210, completed_jobs: 205, on_time_percentage: 91, cancellation_rate: 2.5, avg_rating: 4.6, rating_count: 170 },
    reviews: [
      { id: 'r14', user_name: 'Rehan K.', rating: 5, text: 'Fixed PCB board issue that others couldnt diagnose.', service_category: 'ac_repair', sentiment_score: 0.93, created_at: '2026-05-11' },
      { id: 'r15', user_name: 'Amir L.', rating: 4, text: 'Good technician, reasonable prices.', service_category: 'ac_repair', sentiment_score: 0.75, created_at: '2026-05-02' },
    ],
    bio: 'Haier authorized AC technician in G-13 area.',
  },
  {
    id: 'prov-009', name: 'Naveed Butt', phone: '+92-308-9012345',
    location: { ...LOCATIONS['Rawalpindi'], area: 'Saddar', city: 'Rawalpindi', formatted_address: 'Saddar, Rawalpindi' },
    service_types: ['mechanic'],
    skills: ['car_repair', 'oil_change', 'brake_repair', 'engine_tune', 'ac_car'],
    certifications: ['Toyota Certified'], experience_years: 20, gender: 'male', verified: true, max_jobs_per_day: 4,
    languages: ['urdu', 'punjabi', 'english'],
    availability: {
      monday: ['08:00-18:00'], tuesday: ['08:00-18:00'], wednesday: ['08:00-18:00'],
      thursday: ['08:00-18:00'], friday: ['14:00-18:00'], saturday: ['08:00-16:00'], sunday: [],
    },
    rate_card: { mechanic_oil_change: 1500, mechanic_brake: 3000, mechanic_engine: 5000, mechanic_ac: 2500 },
    stats: { total_jobs: 600, completed_jobs: 590, on_time_percentage: 88, cancellation_rate: 1.5, avg_rating: 4.5, rating_count: 450 },
    reviews: [
      { id: 'r16', user_name: 'Adeel S.', rating: 5, text: 'Best mechanic in Rawalpindi. Honest and skilled.', service_category: 'mechanic', sentiment_score: 0.96, created_at: '2026-05-10' },
    ],
    bio: '20 years experience as Toyota certified mechanic.',
  },
  {
    id: 'prov-010', name: 'Sadia Parveen', phone: '+92-309-0123456',
    location: { ...LOCATIONS['F-10'], area: 'F-10', city: 'Islamabad', formatted_address: 'F-10 Markaz, Islamabad' },
    service_types: ['tutoring'],
    skills: ['math', 'physics', 'chemistry', 'o_levels', 'a_levels'],
    certifications: ['MSc Mathematics', 'B.Ed'], experience_years: 10, gender: 'female', verified: true, max_jobs_per_day: 4,
    languages: ['urdu', 'english'],
    availability: {
      monday: ['14:00-20:00'], tuesday: ['14:00-20:00'], wednesday: ['14:00-20:00'],
      thursday: ['14:00-20:00'], friday: [], saturday: ['10:00-18:00'], sunday: ['10:00-16:00'],
    },
    rate_card: { tutoring_hourly: 2000, tutoring_monthly: 15000 },
    stats: { total_jobs: 180, completed_jobs: 178, on_time_percentage: 99, cancellation_rate: 0.5, avg_rating: 4.9, rating_count: 160 },
    reviews: [
      { id: 'r17', user_name: 'Maham A.', rating: 5, text: 'My daughter went from C to A* in math. Amazing teacher!', service_category: 'tutoring', sentiment_score: 0.98, created_at: '2026-05-08' },
    ],
    bio: 'O/A Levels Math and Science specialist with 10 years experience.',
  },
  {
    id: 'prov-011', name: 'Zubair Ahmed', phone: '+92-310-1234567',
    location: { ...LOCATIONS['E-11'], area: 'E-11', city: 'Islamabad', formatted_address: 'E-11/2, Islamabad' },
    service_types: ['plumbing', 'home_appliance'],
    skills: ['pipe_repair', 'geyser_repair', 'water_pump', 'tap_fix'],
    certifications: [], experience_years: 6, gender: 'male', verified: false, max_jobs_per_day: 6,
    languages: ['urdu'],
    availability: {
      monday: ['07:00-19:00'], tuesday: ['07:00-19:00'], wednesday: ['07:00-19:00'],
      thursday: ['07:00-19:00'], friday: ['07:00-19:00'], saturday: ['07:00-19:00'], sunday: ['09:00-17:00'],
    },
    rate_card: { plumbing_tap_fix: 600, plumbing_pipe: 1500, plumbing_geyser: 2000, appliance_repair: 800 },
    stats: { total_jobs: 120, completed_jobs: 108, on_time_percentage: 75, cancellation_rate: 10, avg_rating: 3.7, rating_count: 80 },
    reviews: [
      { id: 'r18', user_name: 'Tahir K.', rating: 3, text: 'Work is okay but not very punctual.', service_category: 'plumbing', sentiment_score: 0.4, created_at: '2026-05-12' },
    ],
    bio: 'Budget plumbing and appliance repair services.',
  },
  {
    id: 'prov-012', name: 'Waqar Younis', phone: '+92-311-2345678',
    location: { ...LOCATIONS['H-13'], area: 'H-13', city: 'Islamabad', formatted_address: 'H-13, Islamabad' },
    service_types: ['driving'],
    skills: ['sedan', 'suv', 'airport_pickup', 'monthly_driver'],
    certifications: ['Commercial License'], experience_years: 8, gender: 'male', verified: true, max_jobs_per_day: 3,
    languages: ['urdu', 'english', 'punjabi'],
    availability: {
      monday: ['06:00-22:00'], tuesday: ['06:00-22:00'], wednesday: ['06:00-22:00'],
      thursday: ['06:00-22:00'], friday: ['06:00-22:00'], saturday: ['06:00-22:00'], sunday: ['08:00-20:00'],
    },
    rate_card: { driving_hourly: 500, driving_airport: 2500, driving_daily: 3500, driving_monthly: 40000 },
    stats: { total_jobs: 350, completed_jobs: 345, on_time_percentage: 94, cancellation_rate: 1.5, avg_rating: 4.7, rating_count: 300 },
    reviews: [
      { id: 'r19', user_name: 'Salma K.', rating: 5, text: 'Very safe driver, always on time.', service_category: 'driving', sentiment_score: 0.94, created_at: '2026-05-09' },
    ],
    bio: 'Professional driver with clean record. Airport specialist.',
  },
  {
    id: 'prov-013', name: 'Sheraz Akbar', phone: '+92-312-3456789',
    location: { ...LOCATIONS['Lahore'], area: 'DHA Phase 5', city: 'Lahore', formatted_address: 'DHA Phase 5, Lahore' },
    service_types: ['ac_repair', 'electrical'],
    skills: ['split_ac', 'inverter', 'ups_repair'],
    certifications: ['Certified Electrician'], experience_years: 9, gender: 'male', verified: true, max_jobs_per_day: 4,
    languages: ['urdu', 'punjabi'],
    availability: {
      monday: ['09:00-18:00'], tuesday: ['09:00-18:00'], wednesday: ['09:00-18:00'],
      thursday: ['09:00-18:00'], friday: ['09:00-13:00'], saturday: ['10:00-16:00'], sunday: [],
    },
    rate_card: { ac_general_service: 2200, ac_gas_refill: 4000, electrical_wiring: 2500 },
    stats: { total_jobs: 410, completed_jobs: 400, on_time_percentage: 97, cancellation_rate: 1, avg_rating: 4.8, rating_count: 320 },
    reviews: [
      { id: 'r20', user_name: 'Saad M.', rating: 5, text: 'Excellent AC service in Lahore!', service_category: 'ac_repair', sentiment_score: 0.96, created_at: '2026-05-15' },
    ],
    bio: 'Top rated AC technician in DHA Lahore.',
  },
  {
    id: 'prov-014', name: 'Tariq Jamil', phone: '+92-313-4567890',
    location: { ...LOCATIONS['Karachi'], area: 'Clifton', city: 'Karachi', formatted_address: 'Clifton, Karachi' },
    service_types: ['plumbing'],
    skills: ['water_motor', 'pipe_leak', 'tank_cleaning'],
    certifications: [], experience_years: 15, gender: 'male', verified: true, max_jobs_per_day: 5,
    languages: ['urdu', 'sindhi'],
    availability: {
      monday: ['08:00-20:00'], tuesday: ['08:00-20:00'], wednesday: ['08:00-20:00'],
      thursday: ['08:00-20:00'], friday: ['08:00-20:00'], saturday: ['08:00-20:00'], sunday: [],
    },
    rate_card: { plumbing_tap_fix: 1000, plumbing_pipe: 2500 },
    stats: { total_jobs: 850, completed_jobs: 830, on_time_percentage: 90, cancellation_rate: 4, avg_rating: 4.5, rating_count: 600 },
    reviews: [
      { id: 'r21', user_name: 'Farhan K.', rating: 4, text: 'Fixed the water line quickly.', service_category: 'plumbing', sentiment_score: 0.8, created_at: '2026-05-12' },
    ],
    bio: 'Expert plumber in Clifton and DHA Karachi.',
  },
];

// Service catalog for NLU mapping
export const SERVICE_CATALOG: Record<string, { display_name: string; display_name_ur: string; subtypes: string[] }> = {
  ac_repair: { display_name: 'AC Repair', display_name_ur: 'اے سی مرمت', subtypes: ['general_service', 'gas_refill', 'compressor_repair', 'pcb_repair'] },
  ac_installation: { display_name: 'AC Installation', display_name_ur: 'اے سی لگوانا', subtypes: ['split_ac', 'window_ac', 'central_ac'] },
  plumbing: { display_name: 'Plumbing', display_name_ur: 'پلمبنگ', subtypes: ['tap_fix', 'pipe_repair', 'drainage', 'toilet', 'water_heater', 'geyser'] },
  electrical: { display_name: 'Electrical', display_name_ur: 'بجلی کا کام', subtypes: ['wiring', 'panel', 'ups', 'generator', 'fan', 'smart_home'] },
  carpentry: { display_name: 'Carpentry', display_name_ur: 'بڑھئی', subtypes: ['furniture_repair', 'cabinets', 'door_fix', 'wood_polish'] },
  painting: { display_name: 'Painting', display_name_ur: 'پینٹنگ', subtypes: ['room', 'full_house', 'touch_up'] },
  cleaning: { display_name: 'Cleaning', display_name_ur: 'صفائی', subtypes: ['deep_cleaning', 'regular', 'move_in'] },
  tutoring: { display_name: 'Tutoring', display_name_ur: 'ٹیوشن', subtypes: ['math', 'science', 'english', 'o_levels', 'a_levels'] },
  beauty: { display_name: 'Beauty Services', display_name_ur: 'بیوٹی سروسز', subtypes: ['facial', 'bridal', 'hair', 'mehndi'] },
  driving: { display_name: 'Driver', display_name_ur: 'ڈرائیور', subtypes: ['hourly', 'daily', 'airport', 'monthly'] },
  mechanic: { display_name: 'Mechanic', display_name_ur: 'مکینک', subtypes: ['oil_change', 'brake', 'engine', 'car_ac'] },
  home_appliance: { display_name: 'Home Appliance', display_name_ur: 'گھریلو آلات', subtypes: ['washing_machine', 'refrigerator', 'microwave', 'iron'] },
};

// NLU keyword mappings for colloquial terms
export const COLLOQUIAL_MAPPINGS: Record<string, string> = {
  'plomber': 'plumbing', 'plumber': 'plumbing', 'nalkay': 'plumbing', 'paani': 'plumbing', 'leak': 'plumbing',
  'bijli': 'electrical', 'mistri': 'electrical', 'electrician': 'electrical', 'wiring': 'electrical', 'light': 'electrical',
  'ac': 'ac_repair', 'air conditioner': 'ac_repair', 'cooling': 'ac_repair', 'thanda': 'ac_repair',
  'makanik': 'mechanic', 'gaari': 'mechanic', 'car': 'mechanic', 'brake': 'mechanic',
  'safai': 'cleaning', 'cleaning': 'cleaning', 'jharu': 'cleaning',
  'tutor': 'tutoring', 'teacher': 'tutoring', 'padhai': 'tutoring', 'tution': 'tutoring',
  'makeup': 'beauty', 'parlour': 'beauty', 'beautician': 'beauty', 'mehndi': 'beauty', 'facial': 'beauty',
  'paint': 'painting', 'rang': 'painting', 'distemper': 'painting',
  'carpenter': 'carpentry', 'lakri': 'carpentry', 'furniture': 'carpentry', 'darwaza': 'carpentry',
  'driver': 'driving', 'gaari chalana': 'driving', 'airport': 'driving',
};

export function getProvidersByService(serviceType: string): Provider[] {
  return mockProviders.filter(p => p.service_types.includes(serviceType as any));
}

export function getProviderById(id: string): Provider | undefined {
  return mockProviders.find(p => p.id === id);
}
